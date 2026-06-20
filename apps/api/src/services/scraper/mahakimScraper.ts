import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright'
import * as cheerio from 'cheerio'
import * as Prisma from '@prisma/client'
import { logger } from '../../utils/logger'

const prisma = new Prisma.PrismaClient()

const CONFIG = {
  // Application Angular en hash-routing : l'URL complète recharge directement la bonne vue
  SEARCH_URL: 'https://www.mahakim.ma/#/suivi/dossier-suivi',
  DELAY_MS: 150,
  TIMEOUT_MS: 30000,
  USER_AGENT: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // Active les screenshots de debug uniquement si la variable d'env est définie.
  DEBUG: !!process.env.SCRAPER_DEBUG,
  // headless contrôlable par env (par défaut true = rapide). Mettre SCRAPER_HEADLESS=false pour debugger visuellement.
  HEADLESS: process.env.SCRAPER_HEADLESS !== 'false',
  // Nombre de tentatives complètes par dossier (réseau, Angular non chargé, etc.)
  MAX_TENTATIVES: 3,
  // Dossiers traités en parallèle dans scraperTousDossiers (rester poli : 2-3 max).
  CONCURRENCE: 2,
}

// Ressources inutiles au scraping (le DOM HTML suffit pour cheerio).
// Bloquer images/fonts/media/CSS/analytics divise le temps de chargement.
// ⚠️ Ne JAMAIS bloquer 'script' ni 'xhr'/'fetch' : Angular + AJAX chargent لائحة الإجراءات.
const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet'])
const BLOCKED_URL_FRAGMENTS = [
  'google-analytics', 'googletagmanager', 'gtag', 'doubleclick',
  'facebook', 'hotjar', 'clarity.ms', '.woff', '.woff2', '.ttf',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
]

export interface EvenementBrut {
  texteArabe: string
  dateAudience?: Date
  datePublication: Date
  rawHtml?: string
}

export interface DossierPartie {
  qualite: string
  nom: string
  avocats: string
  delegues: string
  agents: string
  representants: string
}

export interface DossierRecours {
  type: string
  partie: string
  dateDepot: string
  numero: string
  numeroEnvoi: string
  dateEnvoi: string
  tribunal: string
}

export interface DossierLie {
  type: string
  numeroDossier: string
  dateInscription: string
  tribunal: string
}

export interface DossierData {
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  infosCarte: Record<string, string>
  evenements: EvenementBrut[]
  parties: DossierPartie[]
  expertises: string[]
  recours: DossierRecours[]
  dossiersLies: DossierLie[]
}

export class MahakimScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  async init(): Promise<void> {
    if (this.browser) return // déjà initialisé : ne pas relancer Chromium inutilement

    this.browser = await chromium.launch({
      headless: CONFIG.HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
      ],
    })

    // Un seul contexte réutilisé pour toutes les pages — beaucoup plus rapide
    // que de relancer un navigateur à chaque recherche.
    this.context = await this.browser.newContext({
      userAgent: CONFIG.USER_AGENT,
      viewport: { width: 1280, height: 900 },
      // On ne charge pas les ressources lourdes
      serviceWorkers: 'block',
    })

    // Blocage global des ressources inutiles au niveau du contexte
    await this.context.route('**/*', (route) => {
      const req = route.request()
      const type = req.resourceType()
      const url = req.url().toLowerCase()
      if (BLOCKED_RESOURCE_TYPES.has(type) || BLOCKED_URL_FRAGMENTS.some((f) => url.includes(f))) {
        return route.abort()
      }
      return route.continue()
    })

    logger.info(`Browser Playwright initialisé (headless=${CONFIG.HEADLESS})`)
  }

  /** Vérifie que le browser est vivant ; le relance s'il a crashé. */
  private async ensureBrowser(): Promise<void> {
    if (!this.browser || !this.browser.isConnected()) {
      logger.warn('Browser non connecté — réinitialisation')
      this.browser = null
      this.context = null
      await this.init()
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {})
      this.context = null
    }
    if (this.browser) {
      await this.browser.close().catch(() => {})
      this.browser = null
    }
  }

  private async takeDebugScreenshot(page: Page, numeroDossier: string, label: string): Promise<void> {
    if (!CONFIG.DEBUG) return // désactivé par défaut : les screenshots fullPage sont coûteux
    try {
      const screenshotDir = process.env.SCRAPER_SCREENSHOT_DIR || '.scraper-debug'
      await page.screenshot({ path: `${screenshotDir}/${label}-${Date.now()}.png`, fullPage: true })
    } catch {}
  }

  /**
   * Scrape un dossier avec retry complet (réseau, Angular non chargé, page sale…).
   * @param numeroDossier format "annee/code/numero", ex: "2023/1501/5697"
   * @param courAppel nom exact de la cour d'appel
   * @param tribunalPrimaire optionnel — nom exact du tribunal de première instance
   */
  async scrapeDossier(
    numeroDossier: string,
    courAppel: string,
    tribunalPrimaire?: string,
  ): Promise<DossierData | null> {
    let derniereErreur: unknown
    for (let tentative = 1; tentative <= CONFIG.MAX_TENTATIVES; tentative++) {
      try {
        const data = await this.scrapeDossierUneFois(numeroDossier, courAppel, tribunalPrimaire)
        // Succès "complet" = au moins la carte d'identité OU des événements.
        if (data && (Object.keys(data.infosCarte).length > 0 || data.evenements.length > 0)) {
          return data
        }
        // null = dossier introuvable CONFIRMÉ par le portail → pas de retry inutile.
        if (data === null) {
          logger.info(`Scrape ${numeroDossier} : aucun résultat (arrêt sans retry)`)
          return null
        }
        // data tronqué (sans infos ni événements) : on l'accepte dès la 2e tentative.
        if (tentative >= 2) return data
        logger.warn(`Scrape ${numeroDossier} incomplet (tentative ${tentative}/${CONFIG.MAX_TENTATIVES})`)
      } catch (err) {
        derniereErreur = err
        logger.warn(`Scrape ${numeroDossier} échoué (tentative ${tentative}/${CONFIG.MAX_TENTATIVES}):`, err)
        await this.ensureBrowser() // le browser a peut-être crashé
      }
      if (tentative < CONFIG.MAX_TENTATIVES) await sleep(tentative * 1000) // backoff 1s, 2s
    }
    logger.error(`Scrape ${numeroDossier} abandonné après ${CONFIG.MAX_TENTATIVES} tentatives`, derniereErreur)
    return null
  }

  /** Une seule tentative de scraping (ouvre/ferme une page). */
  private async scrapeDossierUneFois(
    numeroDossier: string,
    courAppel: string,
    tribunalPrimaire?: string,
  ): Promise<DossierData | null> {
    await this.ensureBrowser()
    if (!this.context) throw new Error('Context non initialisé — appeler init() d\'abord')

    const parsed = parseNumeroDossier(numeroDossier)
    if (!parsed) {
      logger.error(`Format de numéro de dossier invalide: ${numeroDossier} (attendu annee/code/numero)`)
      return null
    }

    const page = await this.context.newPage()
    page.setDefaultTimeout(CONFIG.TIMEOUT_MS)

    try {
      await page.goto(CONFIG.SEARCH_URL, { waitUntil: 'domcontentloaded' })

      // Attendre que le formulaire Angular soit réellement prêt plutôt qu'un délai fixe.
      const fieldAnnee = page.locator('input[formcontrolname="annee"], input[placeholder*="سنة"], input[placeholder*="Année"], input#annee, input[name="annee"], [ng-reflect-name="annee"] input, input[formControlName="annee"]').first()
      const fieldMark = page.locator('input[formcontrolname="mark"], input[placeholder*="رمز"], input#mark, input[name="mark"], [ng-reflect-name="mark"] input, input[formControlName="mark"]').first()
      const fieldNumero = page.locator('input[formcontrolname="numero"], input[placeholder*="رقم"], input#numero, input[name="numero"], input[formcontrolname="numDossier"], [ng-reflect-name="numero"] input, input[formControlName="numero"]').first()

      await fieldAnnee.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
        logger.warn(`Champ année non trouvé pour ${numeroDossier}`)
      })

      // S'assurer d'être sur l'onglet "ملف" (souvent par défaut)
      const dossierTab = page.locator('#Dossier, .dossier-tab, [data-tab="dossier"], a:has-text("ملف")')
      if (await dossierTab.count() > 0) {
        await dossierTab.first().click().catch(() => {})
      }

      await this.takeDebugScreenshot(page, numeroDossier, '02-before-fill')

      // fill() au lieu de type({delay:50}) — instantané, et on garde dispatchEvent
      // pour les listeners Angular qui n'écoutent pas toujours l'event natif.
      const fillField = async (field: Locator, value: string) => {
        await field.click()
        await field.fill(value)
        await field.dispatchEvent('input')
        await field.dispatchEvent('change')
      }
      await fillField(fieldAnnee, parsed.annee)
      await fillField(fieldMark, parsed.mark)
      await fillField(fieldNumero, parsed.numero)

      await this.takeDebugScreenshot(page, numeroDossier, '03-after-fill')

      // Sélection de la cour d'appel
      await selectPrimeDropdown(page, courAppel)
      await this.takeDebugScreenshot(page, numeroDossier, '04-after-ca-select')

      if (tribunalPrimaire) {
        // Cocher "هل تريد البحث بالمحاكم الابتدائية" — robuste : on tente plusieurs
        // façons de localiser la case (formcontrolname, label texte, p-checkbox proche).
        const coche = await cocherCaseTribunauxPrimaires(page)
        if (!coche) {
          logger.warn(`Impossible de cocher 'البحث بالمحاكم الابتدائية' pour ${numeroDossier}`)
        }

        // Attendre que le 2e dropdown apparaisse (preuve que la case est bien cochée).
        const dd2 = page.locator('p-dropdown[formcontrolname="tribunaux_primaires"], p-dropdown[ng-reflect-name="tribunaux_primaires"]')
        await dd2.first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => {
          logger.warn(`2e dropdown (tribunaux primaires) non apparu pour ${numeroDossier}`)
        })
        await selectPrimeDropdown(page, tribunalPrimaire)
        await this.takeDebugScreenshot(page, numeroDossier, '05-after-tp-select')
      }

      const submitBtn = page.locator('button:has-text("بحث"), input[value="بحث"], button:has-text("Rechercher"), .p-button:has-text("بحث")')
      await submitBtn.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        logger.warn(`Bouton recherche non trouvé pour ${numeroDossier}`)
      })
      await this.takeDebugScreenshot(page, numeroDossier, '06-before-submit')

      if (await submitBtn.count() > 0) {
        await submitBtn.first().click({ timeout: 5000 }).catch(() => {})
      }

      // Attendre soit le résultat, soit le message "aucun résultat".
      // Promise.race renvoie : 'found' | 'empty' | 'timeout'.
      const issue = await Promise.race([
        page.waitForSelector('app-resultat-normal', { timeout: CONFIG.TIMEOUT_MS }).then(() => 'found' as const).catch(() => 'timeout' as const),
        page.waitForSelector('text=لا توجد أية نتيجة للبحث', { timeout: CONFIG.TIMEOUT_MS }).then(() => 'empty' as const).catch(() => 'timeout' as const),
      ])

      // CAS 1 — "aucun résultat" confirmé par le portail : dossier introuvable.
      // Ce n'est PAS une erreur : on renvoie null sans retry inutile.
      if (issue === 'empty') {
        logger.info(`Aucun résultat (dossier introuvable) pour ${numeroDossier}`)
        await this.takeDebugScreenshot(page, numeroDossier, '08-no-result')
        return null
      }

      let resultFound = issue === 'found'

      if (!resultFound) {
        // CAS 2 — ni résultat ni message clair : possible lenteur → une 2e tentative.
        logger.warn(`Aucun résultat clair pour ${numeroDossier} — nouvelle tentative de soumission`)
        if (await submitBtn.count() > 0) {
          await submitBtn.first().click({ force: true, timeout: 5000 }).catch(() => {})
        }
        const retry = await Promise.race([
          page.waitForSelector('app-resultat-normal', { timeout: 20000 }).then(() => 'found' as const).catch(() => 'timeout' as const),
          page.waitForSelector('text=لا توجد أية نتيجة للبحث', { timeout: 20000 }).then(() => 'empty' as const).catch(() => 'timeout' as const),
        ])
        if (retry === 'empty') {
          logger.info(`Aucun résultat (dossier introuvable) pour ${numeroDossier}`)
          await this.takeDebugScreenshot(page, numeroDossier, '08-no-result')
          return null
        }
        resultFound = retry === 'found'
        if (!resultFound) {
          // CAS 3 — toujours rien : échec technique. On lève pour déclencher le retry global.
          await this.takeDebugScreenshot(page, numeroDossier, '08-no-result')
          throw new Error(`Aucun résultat ni message d'absence pour ${numeroDossier} (échec technique)`)
        }
      }

      // ── Rendu fiable du contenu avant lecture du DOM ──
      // 1) carte d'identité = dossier chargé
      await page.waitForSelector('.cm-child-dossier', { timeout: 8000 }).catch(() => {})
      // 2) barre d'onglets PrimeNG
      await page.waitForSelector('p-tabview a[role="tab"]', { timeout: 6000 }).catch(() => {})

      // 3) Forcer le rendu de لائحة الإجراءات : cliquer son onglet (PrimeNG lazy-render)
      const tabProc = page.locator('a[role="tab"]', { hasText: 'لائحة الإجراءات' })
      if (await tabProc.count() > 0) {
        await tabProc.first().click({ timeout: 4000 }).catch(() => {})
      }

      // 4) Attendre que le PANNEAU de لائحة الإجراءات ait des lignes, OU "لا توجد".
      //    Signal fiable de fin de chargement AJAX (et pas n'importe quel tbody).
      await page.waitForFunction(
        `(() => {
          var tabs = Array.prototype.slice.call(document.querySelectorAll('a[role="tab"]'));
          var tab = tabs.find(function(t){ return (t.textContent||'').replace(/\\s+/g,' ').trim() === 'لائحة الإجراءات'; });
          if (!tab) return false;
          var panelId = tab.getAttribute('aria-controls');
          var panel = panelId ? document.getElementById(panelId) : null;
          if (!panel) return false;
          var rows = panel.querySelectorAll('tbody tr');
          var txt = panel.textContent || '';
          return rows.length > 0 || /لا توجد/.test(txt);
        })()`,
        { timeout: 12000, polling: 400 },
      ).catch(() => {})
      await sleep(250)
      await this.takeDebugScreenshot(page, numeroDossier, '08-result-found')

      let html = await page.content()
      let parsed2 = this.parseHtml(html, numeroDossier, tribunalPrimaire ?? courAppel)

      // 5) Retry de RENDU : dossier chargé mais procédures vides → re-clic + ré-attente.
      if (parsed2.evenements.length === 0 && Object.keys(parsed2.infosCarte).length > 0) {
        logger.warn(`لائحة الإجراءات vide pour ${numeroDossier} — re-render`)
        const tabProc2 = page.locator('a[role="tab"]', { hasText: 'لائحة الإجراءات' })
        if (await tabProc2.count() > 0) await tabProc2.first().click({ timeout: 4000 }).catch(() => {})
        await page.waitForFunction(
          `(() => {
            var tabs = Array.prototype.slice.call(document.querySelectorAll('a[role="tab"]'));
            var tab = tabs.find(function(t){ return (t.textContent||'').replace(/\\s+/g,' ').trim() === 'لائحة الإجراءات'; });
            if (!tab) return false;
            var panel = document.getElementById(tab.getAttribute('aria-controls'));
            return !!panel && (panel.querySelectorAll('tbody tr').length > 0 || /لا توجد/.test(panel.textContent||''));
          })()`,
          { timeout: 8000, polling: 400 },
        ).catch(() => {})
        html = await page.content()
        parsed2 = this.parseHtml(html, numeroDossier, tribunalPrimaire ?? courAppel)
      }

      return parsed2
    } catch (error) {
      logger.error(`Erreur scraping dossier ${numeroDossier}:`, error)
      throw error // propagé pour déclencher le retry global
    } finally {
      await page.close().catch(() => {})
      await sleep(CONFIG.DELAY_MS)
    }
  }

  private parseHtml(html: string, numeroDossier: string, tribunal: string): DossierData {
    const $ = cheerio.load(html)

    // Normalise le texte d'une cellule : compacte les espaces/retours et
    // capture le texte des <p> imbriqués (ex: "حكم قطعي" + <p>رقم 5361</p>).
    const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim()

    // 1) Carte d'identité du dossier
    const infosCarte: Record<string, string> = {}
    $('.cm-child-dossier').each((_, el) => {
      const label = clean($(el).find('.cm-div-label label').text())
      const value = clean($(el).find('.cm-div-value p').text())
      if (label) infosCarte[label] = value
    })

    const titreAffaire = infosCarte['الموضوع'] || infosCarte['نوع الملف'] || undefined

    // Retrouve le PANNEAU d'un onglet par le texte de son label.
    const panelByTabText = (tabText: string): cheerio.Cheerio<any> => {
      let panelId: string | undefined
      $('a[role="tab"]').each((_, a) => {
        if (clean($(a).text()) === tabText) panelId = $(a).attr('aria-controls')
      })
      if (panelId) {
        const byId = $(`#${panelId}`)
        if (byId.length) return byId
      }
      let labelId: string | undefined
      $('a[role="tab"]').each((_, a) => {
        if (clean($(a).text()) === tabText) labelId = $(a).attr('id')
      })
      if (labelId) return $(`[aria-labelledby="${labelId}"]`)
      return $() // sélection vide
    }

    // 2) لائحة الإجراءات (événements)
    const evenements: EvenementBrut[] = []
    panelByTabText('لائحة الإجراءات').find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 4) return
      const dateAction = clean($(cells[0]).text())
      const typeAction = clean($(cells[1]).text())
      const decision = clean($(cells[2]).text())
      const dateProchaineAudience = clean($(cells[3]).text())
      if (!typeAction && !decision) return
      evenements.push({
        texteArabe: [typeAction, decision].filter(Boolean).join(' — '),
        dateAudience: parseDateMahakim(dateProchaineAudience) ?? undefined,
        datePublication: parseDateMahakim(dateAction) ?? new Date(),
        rawHtml: $(tr).html() ?? undefined,
      })
    })

    // 3) لائحة الأطراف
    const parties: DossierPartie[] = []
    panelByTabText('لائحة الأطراف').find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 6) return
      parties.push({
        qualite: clean($(cells[0]).text()),
        nom: clean($(cells[1]).text()),
        avocats: clean($(cells[2]).text()),
        delegues: clean($(cells[3]).text()),
        agents: clean($(cells[4]).text()),
        representants: clean($(cells[5]).text()),
      })
    })

    // 4) لائحة الخبرات
    const expertises: string[] = []
    const panelExp = panelByTabText('لائحة الخبرات')
    const expVide = panelExp.find('td').text().includes('لا توجد خبرات')
    if (!expVide) {
      panelExp.find('tbody tr').each((_, tr) => {
        if ($(tr).find('img[alt="image no_data"]').length) return
        const txt = clean($(tr).text())
        if (txt) expertises.push(txt)
      })
    }

    // 5) عرائض الطعن
    const recours: DossierRecours[] = []
    panelByTabText('عرائض الطعن').find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 7) return
      recours.push({
        type: clean($(cells[0]).text()),
        partie: clean($(cells[1]).text()),
        dateDepot: clean($(cells[2]).text()),
        numero: clean($(cells[3]).text()),
        numeroEnvoi: clean($(cells[4]).text()),
        dateEnvoi: clean($(cells[5]).text()),
        tribunal: clean($(cells[6]).text()),
      })
    })

    // 6) الملفات المرتبطة
    const dossiersLies: DossierLie[] = []
    panelByTabText('الملفات المرتبطة (ابتدائي/استئنافي-تبليغ/تنفيذ)').find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 4) return
      dossiersLies.push({
        type: clean($(cells[0]).text()),
        numeroDossier: clean($(cells[1]).text()),
        dateInscription: clean($(cells[2]).text()),
        tribunal: clean($(cells[3]).text()),
      })
    })

    return {
      numeroDossier,
      tribunal,
      titreAffaire,
      infosCarte,
      evenements: evenements.reverse(),
      parties,
      expertises,
      recours,
      dossiersLies,
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

    // Traitement par lots de CONFIG.CONCURRENCE (pages parallèles du même contexte).
    for (let i = 0; i < dossiers.length; i += CONFIG.CONCURRENCE) {
      const lot = dossiers.slice(i, i + CONFIG.CONCURRENCE)
      await Promise.all(lot.map(async (dossier) => {
        try {
          const { courAppel, tribunalPrimaire } = resolveTribunalNames(dossier.tribunal)
          const data = await this.scrapeDossier(dossier.numeroDossier, courAppel, tribunalPrimaire)
          if (!data) return

          const dernierDate = dossier.evenements[0]?.datePublicationGreffe
          await this.sauvegarderNouveaux(dossier.id, data.evenements, dernierDate)

          await prisma.dossier.update({
            where: { id: dossier.id },
            data: { derniereVerif: new Date() },
          })
        } catch (error) {
          logger.error(`Erreur traitement dossier ${dossier.numeroDossier}:`, error)
        }
      }))
    }
  }

  private async sauvegarderNouveaux(
    dossierId: string,
    evenements: EvenementBrut[],
    derniereDateConnue?: Date,
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

/**
 * Coche la case "هل تريد البحث بالمحاكم الابتدائية".
 * Essaie plusieurs façons de la localiser car le formcontrolname n'est pas fiable.
 * Retourne true si la case est cochée (vérifié), false sinon.
 */
async function cocherCaseTribunauxPrimaires(page: Page): Promise<boolean> {
  const LABEL = 'البحث بالمحاكم الابتدائية' // fragment du label (sans "هل تريد")

  // Vérifie si une p-checkbox est cochée (classe p-highlight de PrimeNG).
  const estCochee = async (): Promise<boolean> => {
    return await page.evaluate(() => {
      const d = (globalThis as any).document
      const boxes = Array.from(d.querySelectorAll('p-checkbox, .p-checkbox')) as any[]
      for (const b of boxes) {
        const box = b.querySelector('.p-checkbox-box') || b
        if (box && box.classList.contains('p-highlight')) return true
      }
      const inp = d.querySelector('input[type="checkbox"]:checked')
      return !!inp
    }).catch(() => false)
  }

  if (await estCochee()) return true

  // Stratégie 1 — par formcontrolname (si présent)
  const byFc = page.locator('p-checkbox[formcontrolname="si_tribunaux_primaires"] .p-checkbox-box, p-checkbox[ng-reflect-name="si_tribunaux_primaires"] .p-checkbox-box').first()
  if (await byFc.count() > 0) {
    await byFc.click({ timeout: 3000 }).catch(() => {})
    if (await estCochee()) return true
  }

  // Stratégie 2 — par le LABEL texte : trouver le label puis cliquer la checkbox associée.
  //   <label ...>هل تريد البحث بالمحاكم الابتدائية</label> est souvent à côté de la p-checkbox.
  const labelLoc = page.locator(`label:has-text("${LABEL}"), span:has-text("${LABEL}")`).first()
  if (await labelLoc.count() > 0) {
    // a) cliquer le label lui-même (souvent lié à la case)
    await labelLoc.click({ timeout: 3000 }).catch(() => {})
    if (await estCochee()) return true
    // b) cliquer la p-checkbox la plus proche du label
    const clicked = await page.evaluate((frag: string) => {
      const d = (globalThis as any).document
      const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim()
      const nodes = Array.from(d.querySelectorAll('label, span, div')) as any[]
      const lab = nodes.find((n) => norm(n.textContent || '').includes(frag))
      if (!lab) return false
      let container: any = lab
      for (let i = 0; i < 4 && container; i++) {
        const cb = container.querySelector('.p-checkbox-box, p-checkbox .p-checkbox-box, input[type="checkbox"]')
        if (cb) { cb.click(); return true }
        container = container.parentElement
      }
      return false
    }, LABEL).catch(() => false)
    if (clicked && await estCochee()) return true
  }

  // Stratégie 3 — input natif forcé
  const nativeInp = page.locator('p-checkbox[formcontrolname="si_tribunaux_primaires"] input[type="checkbox"], input[type="checkbox"]').first()
  if (await nativeInp.count() > 0) {
    await nativeInp.click({ force: true, timeout: 3000 }).catch(() => {})
    if (await estCochee()) return true
  }

  // Stratégie 4 — la 1ère p-checkbox visible de la page (dernier recours)
  const anyBox = page.locator('p-checkbox .p-checkbox-box').first()
  if (await anyBox.count() > 0) {
    await anyBox.click({ timeout: 3000 }).catch(() => {})
    if (await estCochee()) return true
  }

  return false
}

/**
 * Ouvre un p-dropdown PrimeNG et sélectionne l'option par texte.
 */
async function selectPrimeDropdown(page: Page, optionText: string): Promise<boolean> {
  const isCA = optionText.includes('محكمة الاستئناف')
  const isTP = optionText.includes('المحكمة الابتدائية')
  const formcontrol = isTP ? 'tribunaux_primaires' : isCA ? 'tribunal' : null
  const placeholderFragment = isCA ? 'محكمة الاستئناف' : isTP ? 'المحكمة الابتدائية' : null

  let pDropdown: Locator
  if (formcontrol) {
    pDropdown = page.locator(`p-dropdown[formcontrolname="${formcontrol}"]`)
    if (await pDropdown.count() === 0) {
      pDropdown = page.locator(`p-dropdown[ng-reflect-name="${formcontrol}"]`)
    }
  } else if (placeholderFragment) {
    pDropdown = page.locator('p-dropdown').filter({ has: page.locator(`input[placeholder*="${placeholderFragment}"]`) })
  } else {
    pDropdown = page.locator('p-dropdown').filter({ has: page.locator('input[role="combobox"]') }).last()
  }

  if (await pDropdown.count() === 0) {
    pDropdown = page.locator('p-dropdown').filter({ has: page.locator('input[role="combobox"]') }).last()
    if (await pDropdown.count() === 0) {
      logger.warn(`Aucun p-dropdown trouvé pour: ${optionText}`)
      return false
    }
  }

  const panelOpened = await openDropdownPanel(page, pDropdown, placeholderFragment ?? '')
  if (!panelOpened) {
    logger.warn(`Impossible d'ouvrir le dropdown pour: ${optionText}`)
    return false
  }

  // Attendre qu'au moins une option soit rendue dans le panneau.
  try {
    await page.waitForSelector('.p-dropdown-item, li[role="option"]', { timeout: 8000 })
  } catch {
    logger.warn(`Aucun item trouvé dans le panneau pour: ${optionText}`)
    return false
  }

  // Sélection par ÉGALITÉ EXACTE du texte (pas de filtre, pas de correspondance
  // partielle) pour ne JAMAIS sélectionner un tribunal au nom voisin.
  // On normalise uniquement les espaces/caractères invisibles, pas les lettres.
  const found = await page.evaluate(new Function('text', `
    return (async function() {
      var norm = function(s) {
        return (s || '')
          .replace(/[\\u00A0\\u200B-\\u200F\\u202A-\\u202E]/g, ' ') // espaces invisibles
          .replace(/\\s+/g, ' ')
          .trim();
      };
      var target = norm(text);
      var panel = document.querySelector('.p-dropdown-panel');
      var scroller = panel ? (panel.querySelector('.p-dropdown-items-wrapper') || panel) : null;

      var tryClick = function() {
        var items = document.querySelectorAll('.p-dropdown-item, li[role="option"]');
        for (var i = 0; i < items.length; i++) {
          if (norm(items[i].textContent) === target) {   // ÉGALITÉ STRICTE
            items[i].scrollIntoView({ block: 'center' });
            items[i].click();
            return true;
          }
        }
        return false;
      };

      if (tryClick()) return true;

      // Liste virtualisée : scroller progressivement pour charger toutes les options,
      // puis retenter l'égalité exacte à chaque palier.
      if (scroller) {
        for (var s = 0; s < 40; s++) {
          scroller.scrollTop = s * 180;
          await new Promise(function(r){ setTimeout(r, 60); });
          if (tryClick()) return true;
        }
      }
      return false;
    })();
  `) as any, optionText)

  if (!found) logger.warn(`Option exacte introuvable dans le dropdown: ${optionText}`)
  return found as boolean
}

async function openDropdownPanel(page: Page, pDropdown: Locator, placeholderFragment: string): Promise<boolean> {
  for (const sel of ['.p-dropdown-label', '.p-dropdown-trigger', '.p-dropdown', 'input[role="combobox"]']) {
    const el = pDropdown.locator(sel).first()
    if (await el.count() > 0) {
      try {
        await el.click({ timeout: 3000 })
        if (await isPanelVisible(page)) return true
      } catch {}
    }
  }

  const input = pDropdown.locator('input[role="combobox"]').first()
  if (await input.count() > 0) {
    try {
      await input.click({ force: true, timeout: 3000 })
      if (await isPanelVisible(page)) return true
    } catch {}
  }

  if (await input.count() > 0) {
    try {
      await input.focus()
      await page.keyboard.press('Space')
      if (await isPanelVisible(page)) return true
      await page.keyboard.press('ArrowDown')
      if (await isPanelVisible(page)) return true
      await page.keyboard.press('Enter')
      if (await isPanelVisible(page)) return true
    } catch {}
  }

  const hostOpened = await page.evaluate(new Function('fragment', `
    var tryOpen = function(el) {
      if (!el) return false;
      ['mousedown', 'mouseup', 'click'].forEach(function(type) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      });
      return true;
    };
    var sel = 'p-dropdown input[placeholder*="' + fragment + '"]';
    var input = document.querySelector(sel);
    if (input) { tryOpen(input); var host = input.closest('p-dropdown'); if (host) tryOpen(host); if (input.parentElement) tryOpen(input.parentElement); }
    return true;
  `) as any, placeholderFragment)
  if (hostOpened && await isPanelVisible(page)) return true

  return false
}

async function isPanelVisible(page: Page): Promise<boolean> {
  try {
    const panel = page.locator('.p-dropdown-panel').last()
    await panel.waitFor({ state: 'visible', timeout: 2000 })
    return true
  } catch {
    return false
  }
}

function parseNumeroDossier(numeroDossier: string): { annee: string; mark: string; numero: string } | null {
  const parts = numeroDossier.split('/').map((p) => p.trim())
  if (parts.length !== 3) return null
  const [annee, mark, numero] = parts
  if (!/^\d{4}$/.test(annee) || !/^\d{1,4}$/.test(mark) || !/^\d+$/.test(numero)) return null
  return { annee, mark, numero }
}

export function parseDateMahakim(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  const normalized = dateStr
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim()
  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/)
  if (!match) return null
  const [, jour, mois, an, heure, minute] = match
  const d = new Date(`${an}-${mois}-${jour}T${heure ?? '00'}:${minute ?? '00'}:00`)
  return isNaN(d.getTime()) ? null : d
}

export interface CourAppelEntry {
  code: string
  nomAr: string
  tribunauxPrimaires: { code: string; nomAr: string }[]
}

export const TRIBUNAUX_COMPLETS: CourAppelEntry[] = [
  {
    code: 'CA_RABAT',
    nomAr: 'محكمة الاستئناف بالرباط',
    tribunauxPrimaires: [
      { code: 'TPI_RABAT', nomAr: 'المحكمة الابتدائية بالرباط' },
      { code: 'TPI_SALE', nomAr: 'المحكمة الابتدائية بسلا' },
      { code: 'TPI_TEMARA', nomAr: 'المحكمة الابتدائية بتمارة' },
      { code: 'TPI_KHEMISSET', nomAr: 'المحكمة الابتدائية بالخميسات' },
      { code: 'TPI_TIFLET', nomAr: 'المحكمة الإبتدائية بتيفلت' },
      { code: 'TPI_ROMMANI', nomAr: 'المحكمة الابتدائية بالرماني' },
      { code: 'TPI_RABAT_FAMILLE', nomAr: 'المحكمة الابتدائية بالرباط - قسم قضاء الأسرة' },
      { code: 'TPI_SALE_FAMILLE', nomAr: 'المحكمة الابتدائية بسلا - قسم قضاء الأسرة' },
      { code: 'TPI_KHEMISSET_FAMILLE', nomAr: 'المحكمة الابتدائية بالخميسات - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_CASA',
    nomAr: 'محكمة الاستئناف بالدار البيضاء',
    tribunauxPrimaires: [
      { code: 'TPI_CASA_CIVIL', nomAr: 'المحكمة الابتدائية المدنية بالدار البيضاء' },
      { code: 'TPI_CASA_SOCIAL', nomAr: 'المحكمة الابتدائية الاجتماعية بالدار البيضاء' },
      { code: 'TPI_CASA_PENAL', nomAr: 'المحكمة الابتدائية الزجرية بالدار البيضاء' },
      { code: 'TPI_MOHAMMADIA', nomAr: 'المحكمة الابتدائية بالمحمدية' },
      { code: 'TPI_BENSLIMANE', nomAr: 'المحكمة الابتدائية ببنسليمان' },
      { code: 'TPI_BENSLIMANE_FAMILLE', nomAr: 'المحكمة الابتدائية ببنسليمان - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_AGADIR',
    nomAr: 'محكمة الاستئناف بأكادير',
    tribunauxPrimaires: [
      { code: 'TPI_AGADIR', nomAr: 'المحكمة الابتدائية بأكادير' },
      { code: 'TPI_INEZGANE', nomAr: 'المحكمة الابتدائية بانزكان' },
      { code: 'TPI_OUED_TAIMA', nomAr: 'المحكمة الابتدائية بأولاد تايمة' },
      { code: 'TPI_TIZNIT', nomAr: 'المحكمة الابتدائية بتيزنيت' },
      { code: 'TPI_TATA', nomAr: 'المحكمة الابتدائية بطاطا' },
      { code: 'TPI_TAROUDANT', nomAr: 'المحكمة الابتدائية بتارودانت' },
      { code: 'TPI_BIOUGRA', nomAr: 'المحكمة الابتدائية ببيوكرى' },
      { code: 'TPI_TAROUDANT_FAMILLE', nomAr: 'المحكمة الابتدائية بتارودانت - قسم قضاء الأسرة' },
      { code: 'TPI_TIZNIT_FAMILLE', nomAr: 'المحكمة الإبتدائية بتزنيت - قسم قضاء الأسرة' },
      { code: 'TPI_INEZGANE_FAMILLE', nomAr: 'المحكمة الابتدائية بانزكان - قسم قضاء الأسرة' },
      { code: 'TPI_BIOUGRA_FAMILLE', nomAr: 'المحكمة الابتدائية ببيوكرى - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_OUARZAZATE',
    nomAr: 'محكمة الاستئناف بورزازات',
    tribunauxPrimaires: [
      { code: 'TPI_OUARZAZATE', nomAr: 'المحكمة الابتدائية بورزازات' },
      { code: 'TPI_TINGHIR', nomAr: 'المحكمة الإبتدائية بتنغير' },
      { code: 'TPI_ZAGORA', nomAr: 'المحكمة الابتدائية بزاكورة' },
      { code: 'TPI_OUARZAZATE_FAMILLE', nomAr: 'المحكمة الابتدائية بورزازات - قسم قضاء الأسرة' },
      { code: 'TPI_ZAGORA_FAMILLE', nomAr: 'المحكمة الابتدائية بزاكورة - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_BENI_MELLAL',
    nomAr: 'محكمة الاستئناف ببني ملال',
    tribunauxPrimaires: [
      { code: 'TPI_BENI_MELLAL', nomAr: 'المحكمة الابتدائية ببني ملال' },
      { code: 'TPI_QASBAT_TADLA', nomAr: 'المحكمة الابتدائية بقصبة تادلة' },
      { code: 'TPI_FQUIH_BEN_SALEH', nomAr: 'المحكمة الابتدائية بالفقيه بن صالح' },
      { code: 'TPI_SUQ_SEBT', nomAr: 'المحكمة الإبتدائية بسوق السبت أولاد النمة' },
      { code: 'TPI_KHENIFRA', nomAr: 'المحكمة الابتدائية بخنيفرة' },
      { code: 'TPI_AZILAL', nomAr: 'المحكمة الابتدائية بأزيلال' },
      { code: 'TPI_BENI_MELLAL_FAMILLE', nomAr: 'المحكمة الابتدائية ببني ملال - قسم قضاء الأسرة' },
      { code: 'TPI_FQUIH_BEN_SALEH_FAMILLE', nomAr: 'المحكمة الابتدائية بالفقيه بن صالح - قسم قضاء الأسرة' },
      { code: 'TPI_KHENIFRA_FAMILLE', nomAr: 'المحكمة الابتدائية بخنيفرة - قسم قضاء الأسرة' },
      { code: 'TPI_QASBAT_TADLA_FAMILLE', nomAr: 'المحكمة الابتدائية بقصبة تادلة - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_MARRAKECH',
    nomAr: 'محكمة الاستئناف بمراكش',
    tribunauxPrimaires: [
      { code: 'TPI_MARRAKECH', nomAr: 'المحكمة الابتدائية بمراكش' },
      { code: 'TPI_AMTANOUT', nomAr: 'المحكمة الابتدائية بامنتانوت' },
      { code: 'TPI_EL_KELAA', nomAr: 'المحكمة الابتدائية بقلعة السراغنة' },
      { code: 'TPI_BEN_GUERIR', nomAr: 'المحكمة الابتدائية بابن جرير' },
      { code: 'TPI_MARRAKECH_FAMILLE', nomAr: 'المحكمة الابتدائية بمراكش - قسم قضاء الأسرة' },
      { code: 'TPI_EL_KELAA_FAMILLE', nomAr: 'المحكمة الابتدائية بقلعة السراغنة - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_GUELMIM',
    nomAr: 'محكمة الاستئناف بكلميم',
    tribunauxPrimaires: [
      { code: 'TPI_SIDI_IFNI', nomAr: 'المحكمةالابتدائية بسيدي افني' },
      { code: 'TPI_GUELMIM', nomAr: 'المحكمة الابتدائية بكلميم' },
      { code: 'TPI_ASSA_ZAG', nomAr: 'المحكمة الابتدائية بآسا الزاك' },
      { code: 'TPI_TAN_TAN', nomAr: 'المحكمة الابتدائية بطانطان' },
      { code: 'TPI_GUELMIM_FAMILLE', nomAr: 'المحكمة الابتدائية بكلميم - قسم قضاء الأسرة' },
      { code: 'TPI_TAN_TAN_FAMILLE', nomAr: 'المحكمة الابتدائية بطانطان - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_AL_HOCEIMA',
    nomAr: 'محكمة الاستئناف بالحسيمة',
    tribunauxPrimaires: [
      { code: 'TPI_AL_HOCEIMA', nomAr: 'المحكمة الابتدائية بالحسيمة' },
      { code: 'TPI_TARGUIST', nomAr: 'المحكمة الإبتدائية بتارجيست' },
      { code: 'TPI_TARGUIST_FAMILLE', nomAr: 'المحكمة الابتدائية بتارجيست - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_TAZA',
    nomAr: 'محكمة الاستئناف بتازة',
    tribunauxPrimaires: [
      { code: 'TPI_TAZA', nomAr: 'المحكمة الابتدائية بتازة' },
      { code: 'TPI_GUERCIF', nomAr: 'المحكمة الابتدائية بجرسيف' },
      { code: 'TPI_TAZA_FAMILLE', nomAr: 'المحكمة الابتدائية بتازة - قسم قضاء الأسرة' },
      { code: 'TPI_GUERCIF_FAMILLE', nomAr: 'المحكمة الابتدائية بجرسيف - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_MEKNES',
    nomAr: 'محكمة الاستئناف بمكناس',
    tribunauxPrimaires: [
      { code: 'TPI_MEKNES', nomAr: 'المحكمة الابتدائية بمكناس' },
      { code: 'TPI_EL_HAJEB', nomAr: 'المحكمة الابتدائية بالحاجب' },
      { code: 'TPI_AZROU', nomAr: 'المحكمة الابتدائية بآزرو' },
      { code: 'TPI_MEKNES_FAMILLE', nomAr: 'المحكمة الابتدائية بمكناس - قسم قضاء الأسرة' },
      { code: 'TPI_AZROU_FAMILLE', nomAr: 'المحكمة الابتدائية بآزرو - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_ERRACHIDIA',
    nomAr: 'محكمة الاستئناف بالرشيدية',
    tribunauxPrimaires: [
      { code: 'TPI_ERRACHIDIA', nomAr: 'المحكمة الابتدائية بالرشيدية' },
      { code: 'TPI_MIDELT', nomAr: 'المحكمة الابتدائية بميدلت' },
    ],
  },
  {
    code: 'CA_NADOR',
    nomAr: 'محكمة الاستئناف بالناضور',
    tribunauxPrimaires: [
      { code: 'TPI_NADOR', nomAr: 'المحكمة الابتدائية بالناضور' },
      { code: 'TPI_EDRICH', nomAr: 'المحكمة الإبتدائية بالدريوش' },
      { code: 'TPI_NADOR_FAMILLE', nomAr: 'المحكمة الابتدائية بالناضور - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_SAFI',
    nomAr: 'محكمة الاستئناف بآسفي',
    tribunauxPrimaires: [
      { code: 'TPI_SAFI', nomAr: 'المحكمة الابتدائية بآسفي' },
      { code: 'TPI_YOUSSOUFIA', nomAr: 'المحكمة الابتدائية باليوسفية' },
      { code: 'TPI_ESSAOUIRA', nomAr: 'المحكمة الابتدائية بالصويرة' },
      { code: 'TPI_SAFI_FAMILLE', nomAr: 'المحكمة الابتدائية بآسفي - قسم قضاء الأسرة' },
      { code: 'TPI_YOUSSOUFIA_FAMILLE', nomAr: 'المحكمة الابتدائية باليوسفية - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_KHOURIBGA',
    nomAr: 'محكمة الاستئناف بخريبكة',
    tribunauxPrimaires: [
      { code: 'TPI_KHOURIBGA', nomAr: 'المحكمة الابتدائية بخريبكة' },
      { code: 'TPI_OUED_ZEM', nomAr: 'المحكمة الابتدائية بواد زم' },
      { code: 'TPI_BEJAAD', nomAr: 'المحكمة الابتدائية بأبي الجعد' },
      { code: 'TPI_KHOURIBGA_FAMILLE', nomAr: 'المحكمة الابتدائية بخريبكة - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_TETOUAN',
    nomAr: 'محكمة الاستئناف بتطوان',
    tribunauxPrimaires: [
      { code: 'TPI_TETOUAN', nomAr: 'المحكمة الابتدائية بتطوان' },
      { code: 'TPI_CHEFCHAOUEN', nomAr: 'المحكمة الابتدائية بشفشاون' },
      { code: 'TPI_OUAZZANE', nomAr: 'المحكمة الابتدائية بوزان' },
      { code: 'TPI_OUAZZANE_FAMILLE', nomAr: 'المحكمة الابتدائية بوزان - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_FES',
    nomAr: 'محكمة الاستئناف بفاس',
    tribunauxPrimaires: [
      { code: 'TPI_FES', nomAr: 'المحكمة الابتدائية بفاس' },
      { code: 'TPI_SEFROU', nomAr: 'المحكمة الابتدائية بصفرو' },
      { code: 'TPI_BOULMANE', nomAr: 'المحكمة الإبتدائية لبولمان بميسور' },
      { code: 'TPI_TAOUNATE', nomAr: 'المحكمة الابتدائية بتاونات' },
      { code: 'TPI_FES_FAMILLE', nomAr: 'المحكمة الابتدائية بفاس - قسم قضاء الأسرة' },
      { code: 'TPI_BOULMANE_FAMILLE', nomAr: 'المحكمة الابتدائية لبولمان بميسور - قسم قضاء الأسرة' },
      { code: 'TPI_TAOUNATE_FAMILLE', nomAr: 'المحكمة الابتدائية بتاونات - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_TANGER',
    nomAr: 'محكمة الاستئناف بطنجة',
    tribunauxPrimaires: [
      { code: 'TPI_TANGER', nomAr: 'المحكمة الابتدائية بطنجة' },
      { code: 'TPI_ASILAH', nomAr: 'المحكمة الابتدائية بأصيلة' },
      { code: 'TPI_LARACHE', nomAr: 'المحكمة الابتدائية بالعرائش' },
      { code: 'TPI_KSAR_EL_KBIR', nomAr: 'المحكمة الابتدائية بالقصر الكبير' },
      { code: 'TPI_TANGER_FAMILLE', nomAr: 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة' },
      { code: 'TPI_LARACHE_FAMILLE', nomAr: 'المحكمة الابتدائية بالعرائش - قسم قضاء الأسرة' },
      { code: 'TPI_KSAR_EL_KBIR_FAMILLE', nomAr: 'المحكمة الابتدائية بالقصر الكبير - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_KENITRA',
    nomAr: 'محكمة الاستئناف بالقنيطرة',
    tribunauxPrimaires: [
      { code: 'TPI_KENITRA', nomAr: 'المحكمة الابتدائية بالقنيطرة' },
      { code: 'TPI_SIDI_SLIMANE', nomAr: 'المحكمة الابتدائية بسيدي سليمان' },
      { code: 'TPI_SOUQ_ARBAA', nomAr: 'المحكمة الابتدائي بسوق الأريعاء' },
      { code: 'TPI_SIDI_KACEM', nomAr: 'المحكمة الابتدائية بسيدي قاسم' },
      { code: 'TPI_MECHRA_BEL_KSIRI', nomAr: 'المحكمة الإبتدائية بمشرع بلقصيري' },
      { code: 'TPI_KENITRA_FAMILLE', nomAr: 'المحكمة الابتدائية بالقنيطرة - قسم قضاء الأسرة' },
      { code: 'TPI_SIDI_KACEM_FAMILLE', nomAr: 'المحكمة الابتدائية بسيدي قاسم - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_LAAYOUNE',
    nomAr: 'محكمة الاستئناف بالعيون',
    tribunauxPrimaires: [
      { code: 'TPI_LAAYOUNE', nomAr: 'المحكمة الابتدائية بالعيون' },
      { code: 'TPI_BOUJDOUR', nomAr: 'المحكمة الابتدائية ببوجدور' },
      { code: 'TPI_SMARA', nomAr: 'المحكمة الابتدائية بالسمارة' },
      { code: 'TPI_DAKHLA', nomAr: 'المحكمة الابتدائية بالداخلة' },
      { code: 'TPI_SMARA_FAMILLE', nomAr: 'المحكمة الابتدائية بالسمارة - قسم قضاء الأسرة' },
      { code: 'TPI_LAAYOUNE_FAMILLE', nomAr: 'المحكمة الابتدائية بالعيون - قسم قضاء الأسرة' },
      { code: 'TPI_DAKHLA_FAMILLE', nomAr: 'المحكمة الابتدائية بالداخلة - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_EL_JADIDA',
    nomAr: 'محكمة الاستئناف بالجديدة',
    tribunauxPrimaires: [
      { code: 'TPI_EL_JADIDA', nomAr: 'المحكمة الابتدائية بالجديدة' },
      { code: 'TPI_SIDI_BENNOUR', nomAr: 'المحكمة الابتدائية بسيدي بنور' },
      { code: 'TPI_EL_JADIDA_FAMILLE', nomAr: 'المحكمة الابتدائية بالجديدة - قسم قضاء الأسرة' },
      { code: 'TPI_SIDI_BENNOUR_FAMILLE', nomAr: 'المحكمة الابتدائية بسيدي بنور - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_SETTAT',
    nomAr: 'محكمة الاستئناف بسطات',
    tribunauxPrimaires: [
      { code: 'TPI_SETTAT', nomAr: 'المحكمة الابتدائية بسطات' },
      { code: 'TPI_BERRECHID', nomAr: 'المحكمة الابتدائية ببرشيد' },
      { code: 'TPI_BEN_AHMED', nomAr: 'المحكمة الابتدائية ببن أحمد' },
      { code: 'TPI_BERRECHID_FAMILLE', nomAr: 'المحكمة الابتدائية ببرشيد - قسم قضاء الأسرة' },
      { code: 'TPI_BEN_AHMED_FAMILLE', nomAr: 'المحكمة الإبتدائية ببن أحمد - قسم قضاء الأسرة' },
    ],
  },
  {
    code: 'CA_OUJDA',
    nomAr: 'محكمة الاستئناف بوجدة',
    tribunauxPrimaires: [
      { code: 'TPI_OUJDA', nomAr: 'المحكمة الابتدائية بوجدة' },
      { code: 'TPI_JERADA', nomAr: 'المحكمة الابتدائية بجرادة' },
      { code: 'TPI_BERKANE', nomAr: 'المحكمة الابتدائية ببركان' },
      { code: 'TPI_FIGUIG', nomAr: 'المحكمة الإبتدائية لفجيج ببوعرفة' },
      { code: 'TPI_TAOURIRT', nomAr: 'المحكمة الابتدائية بتاوريرت' },
      { code: 'TPI_OUJDA_FAMILLE', nomAr: 'المحكمة الإبتدائية بوجدة - قسم قضاء الأسرة' },
      { code: 'TPI_TAOURIRT_FAMILLE', nomAr: 'المحكمة الإبتدائية بتاوريرت - قسم قضاء الأسرة' },
      { code: 'TPI_BERKANE_FAMILLE', nomAr: 'المحكمة الإبتدائية ببركان - قسم قضاء الأسرة' },
      { code: 'TPI_JERADA_FAMILLE', nomAr: 'المحكمة الإبتدائية بجرادة - قسم قضاء الأسرة' },
    ],
  },
]

const TRIBUNAUX_AR: Record<string, { courAppel: string; tribunalPrimaire?: string }> = {}
for (const ca of TRIBUNAUX_COMPLETS) {
  TRIBUNAUX_AR[ca.code] = { courAppel: ca.nomAr }
  for (const tp of ca.tribunauxPrimaires) {
    TRIBUNAUX_AR[tp.code] = { courAppel: ca.nomAr, tribunalPrimaire: tp.nomAr }
  }
}

export function resolveTribunalNames(tribunal: string): { courAppel: string; tribunalPrimaire?: string } {
  return TRIBUNAUX_AR[tribunal] ?? { courAppel: tribunal }
}

export function findTribunalCode(courAppel: string, tribunalPrimaire?: string): string | null {
  for (const ca of TRIBUNAUX_COMPLETS) {
    if (ca.nomAr === courAppel) {
      if (!tribunalPrimaire) return ca.code
      for (const tp of ca.tribunauxPrimaires) {
        if (tp.nomAr === tribunalPrimaire) return tp.code
      }
    }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}