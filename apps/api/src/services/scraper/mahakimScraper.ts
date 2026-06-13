import { chromium, Browser, Page } from 'playwright'
import * as cheerio from 'cheerio'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()

const CONFIG = {
  BASE_URL: 'https://www.mahakim.ma',
  DELAY_MS: 2500,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000,
  USER_AGENT: 'MouraqibBot/1.0 (Lawyer deadline assistant; contact@mouraqib.ma)',
}

export interface EvenementBrut {
  texteArabe: string
  dateAudience?: Date
  datePublication: Date
  rawHtml?: string
}

export interface DossierData {
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  evenements: EvenementBrut[]
}

export class MahakimScraper {
  private browser: Browser | null = null

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    logger.info('Browser Playwright initialisé')
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async scrapeDossier(numeroDossier: string, tribunal: string): Promise<DossierData | null> {
    if (!this.browser) throw new Error('Browser non initialisé — appeler init() d\'abord')

    const page = await this.browser.newPage()

    try {
      await page.setExtraHTTPHeaders({ 'User-Agent': CONFIG.USER_AGENT })

      const url = `${CONFIG.BASE_URL}/fr/suivi-dossier?numero=${encodeURIComponent(numeroDossier)}&tribunal=${encodeURIComponent(tribunal)}`
      logger.debug(`Scraping: ${url}`)

      await page.goto(url, { waitUntil: 'networkidle', timeout: CONFIG.TIMEOUT_MS })

      // Attendre le contenu — adapter le sélecteur selon le HTML réel de mahakim.ma
      await page.waitForSelector('[data-dossier-content], .dossier-info, #dossier-details, table', {
        timeout: 10000,
      }).catch(() => logger.warn(`Sélecteur dossier non trouvé pour ${numeroDossier}`))

      const html = await page.content()
      return this.parseHtml(html, numeroDossier, tribunal)
    } catch (error) {
      logger.error(`Erreur scraping dossier ${numeroDossier}:`, error)
      return null
    } finally {
      await page.close()
      await sleep(CONFIG.DELAY_MS)
    }
  }

  // Adapter les sélecteurs CSS selon la structure HTML réelle de mahakim.ma
  private parseHtml(html: string, numeroDossier: string, tribunal: string): DossierData {
    const $ = cheerio.load(html)
    const evenements: EvenementBrut[] = []

    $('table.historique-audiences tr, .audience-row, [data-audience]').each((_, el) => {
      const row = $(el)

      const texteArabe = row.find('.mention-greffe, td:nth-child(3), [data-mention]').text().trim()
      const dateStr = row.find('.date-audience, td:nth-child(1), [data-date]').text().trim()
      const datePubStr = row.find('.date-publication, td:nth-child(2), [data-date-pub]').text().trim()

      if (!texteArabe) return

      evenements.push({
        texteArabe,
        dateAudience: parseDateMahakim(dateStr) ?? undefined,
        datePublication: parseDateMahakim(datePubStr) ?? new Date(),
        rawHtml: row.html() ?? undefined,
      })
    })

    const titreAffaire = $('[data-titre-affaire], .titre-affaire, .case-title').text().trim() || undefined

    return {
      numeroDossier,
      tribunal,
      titreAffaire,
      evenements: evenements.reverse(),
    }
  }

  async scraperTousDossiers(userId: string): Promise<void> {
    const dossiers = await prisma.dossier.findMany({
      where: { userId, estActif: true },
      include: {
        evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 1 },
      },
    })

    logger.info(`Scraping de ${dossiers.length} dossiers pour userId=${userId}`)

    for (const dossier of dossiers) {
      try {
        const data = await this.scrapeDossier(dossier.numeroDossier, dossier.tribunal)
        if (!data) continue

        const dernierDate = dossier.evenements[0]?.datePublicationGreffe
        await this.sauvegarderNouveaux(dossier.id, data.evenements, dernierDate)

        await prisma.dossier.update({
          where: { id: dossier.id },
          data: { derniereVerif: new Date() },
        })
      } catch (error) {
        logger.error(`Erreur traitement dossier ${dossier.numeroDossier}:`, error)
      }
    }
  }

  private async sauvegarderNouveaux(
    dossierId: string,
    evenements: EvenementBrut[],
    derniereDateConnue?: Date
  ): Promise<number> {
    let count = 0

    for (const ev of evenements) {
      if (derniereDateConnue && ev.datePublication <= derniereDateConnue) continue

      await prisma.evenement.create({
        data: {
          dossierId,
          texteArabe: ev.texteArabe,
          dateAudience: ev.dateAudience,
          datePublicationGreffe: ev.datePublication,
          raw: ev.rawHtml ? { html: ev.rawHtml } : undefined,
          estNouvel: true,
          estTraite: false,
        },
      })
      count++
    }

    if (count > 0) logger.info(`${count} nouveaux événements sauvegardés pour dossier ${dossierId}`)
    return count
  }
}

// Supporte JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ et chiffres arabes
export function parseDateMahakim(dateStr: string): Date | null {
  if (!dateStr) return null

  const normalized = dateStr
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .trim()

  const jmA = normalized.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (jmA) {
    const d = new Date(`${jmA[3]}-${jmA[2]}-${jmA[1]}`)
    if (!isNaN(d.getTime())) return d
  }

  const amj = normalized.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/)
  if (amj) {
    const d = new Date(`${amj[1]}-${amj[2]}-${amj[3]}`)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
