import { chromium, Browser, Page, Locator } from 'playwright'
import * as cheerio from 'cheerio'
import * as Prisma from '@prisma/client'
import { logger } from '../../utils/logger'

const prisma = new Prisma.PrismaClient()

const CONFIG = {
  // Application Angular en hash-routing : l'URL complète recharge directement la bonne vue
  SEARCH_URL: 'https://www.mahakim.ma/#/suivi/dossier-suivi',
  DELAY_MS: 1000,
  TIMEOUT_MS: 30000,
  USER_AGENT: 'MouraqibBot/1.0 (Lawyer deadline assistant; contact@mouraqib.ma)',
}

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

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false,
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

  /**
   * @param numeroDossier format "annee/code/numero", ex: "2023/1501/5697"
   * @param courAppel nom exact de la cour d'appel tel qu'affiché dans le menu (ex: "محكمة الاستئناف بالدار البيضاء")
   * @param tribunalPrimaire optionnel — nom exact du tribunal de première instance si on veut affiner la recherche
   */
  private async takeDebugScreenshot(page: Page, numeroDossier: string, label: string): Promise<void> {
    try {
      const screenshotDir = process.env.SCRAPER_SCREENSHOT_DIR || '.scraper-debug'
      await page.screenshot({ path: `${screenshotDir}/${label}-${Date.now()}.png`, fullPage: true })
    } catch {}
  }

  async scrapeDossier(
    numeroDossier: string,
    courAppel: string,
    tribunalPrimaire?: string,
  ): Promise<DossierData | null> {
    if (!this.browser) throw new Error('Browser non initialisé — appeler init() d\'abord')

    const parsed = parseNumeroDossier(numeroDossier)
    if (!parsed) {
      logger.error(`Format de numéro de dossier invalide: ${numeroDossier} (attendu annee/code/numero)`)
      return null
    }

    const page = await this.browser.newPage()
    page.setDefaultTimeout(CONFIG.TIMEOUT_MS)

    try {
      await page.setExtraHTTPHeaders({ 'User-Agent': CONFIG.USER_AGENT })
      await page.goto(CONFIG.SEARCH_URL, { waitUntil: 'domcontentloaded' })

      // Laisser l'application Angular charger
      await page.waitForTimeout(1500)
      try {
        await page.waitForLoadState('networkidle', { timeout: 3000 })
      } catch {}
      logger.info(`Page chargée: ${page.url()}`)
      await this.takeDebugScreenshot(page, numeroDossier, '01-after-load')

      // Intercepter les requêtes XHR pour debugging
      const xhrUrls: string[] = []
      page.on('response', (response) => {
        const url = response.url()
        if (url.includes('mahakim.ma/api') || url.includes('mahakim.ma/service')) {
          xhrUrls.push(`${url} -> ${response.status()}`)
        }
      })

      // Le bouton "ملف/محضر/شكاية" est sélectionné par défaut sur cette URL,
      // mais on s'assure d'être sur le bon onglet de recherche.
      const dossierTab = page.locator('#Dossier, .dossier-tab, [data-tab="dossier"], a:has-text("ملف")')
      if (await dossierTab.count() > 0) {
        await dossierTab.first().click()
        await page.waitForTimeout(200)
      }

      // Remplissage des 3 champs du numéro de dossier — essayer plusieurs sélecteurs
      const fieldAnnee = page.locator('input[formcontrolname="annee"], input[placeholder*="سنة"], input[placeholder*="Année"], input#annee, input[name="annee"], [ng-reflect-name="annee"] input, input[formControlName="annee"]').first()
      const fieldMark = page.locator('input[formcontrolname="mark"], input[placeholder*="رمز"], input#mark, input[name="mark"], [ng-reflect-name="mark"] input, input[formControlName="mark"]').first()
      const fieldNumero = page.locator('input[formcontrolname="numero"], input[placeholder*="رقم"], input#numero, input[name="numero"], input[formcontrolname="numDossier"], [ng-reflect-name="numero"] input, input[formControlName="numero"]').first()

      await fieldAnnee.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
        logger.warn(`Champ année non trouvé pour ${numeroDossier}`)
      })
      await this.takeDebugScreenshot(page, numeroDossier, '02-before-fill')

      // Utiliser dispatchEvent pour les inputs Angular (qui utilisent souvent des écouteurs
      // personnalisés au lieu des événements DOM standards)
      await fieldAnnee.click()
      await fieldAnnee.fill('')
      await fieldAnnee.type(parsed.annee, { delay: 50 })
      await fieldAnnee.dispatchEvent('input')
      await fieldAnnee.dispatchEvent('change')

      await fieldMark.click()
      await fieldMark.fill('')
      await fieldMark.type(parsed.mark, { delay: 50 })
      await fieldMark.dispatchEvent('input')
      await fieldMark.dispatchEvent('change')

      await fieldNumero.click()
      await fieldNumero.fill('')
      await fieldNumero.type(parsed.numero, { delay: 50 })
      await fieldNumero.dispatchEvent('input')
      await fieldNumero.dispatchEvent('change')

      await page.waitForTimeout(200)
      await this.takeDebugScreenshot(page, numeroDossier, '03-after-fill')

      // Sélection de la cour d'appel
      await selectPrimeDropdown(page, 'p-dropdown[formcontrolname="tribunal"], p-dropdown .p-dropdown:first-of-type, [ng-reflect-name="tribunal"] p-dropdown', courAppel)
      await page.waitForTimeout(300)
      await this.takeDebugScreenshot(page, numeroDossier, '04-after-ca-select')

      if (tribunalPrimaire) {
        // Cocher la case pour révéler le second dropdown
        // Dans PrimeNG, l'<input> réel est caché dans .p-hidden-accessible ;
        // on clique sur la boîte visible .p-checkbox-box
        const checkboxBox = page.locator('p-checkbox[formcontrolname="si_tribunaux_primaires"] .p-checkbox-box')
        if (await checkboxBox.count() > 0) {
          await checkboxBox.click()
        } else {
          // Fallback: cliquer sur l'input hidden avec force
          await page.locator('p-checkbox[formcontrolname="si_tribunaux_primaires"] input[type="checkbox"]').click({ force: true })
        }
        await page.waitForTimeout(500)
        await selectPrimeDropdown(page, 'p-dropdown[formcontrolname="tribunaux_primaires"]', tribunalPrimaire)
        await page.waitForTimeout(200)
        await this.takeDebugScreenshot(page, numeroDossier, '05-after-tp-select')
      }

      // Tentatives de clic sur le bouton de recherche
      // Ne pas dépendre de type="submit" — Angular/PrimeNG utilise souvent des handlers (click)
      const submitBtn = page.locator('button:has-text("بحث"), input[value="بحث"], button:has-text("Rechercher"), .p-button:has-text("بحث")')
      await submitBtn.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        logger.warn(`Bouton recherche non trouvé pour ${numeroDossier}`)
      })
      await this.takeDebugScreenshot(page, numeroDossier, '06-before-submit')

      // Fonction de soumission : click + attente résultats
      const submitAndWait = async (force = false) => {
        if (await submitBtn.count() > 0) {
          await submitBtn.first().click({ force, timeout: 5000 }).catch(() => {})
        }
        await page.waitForTimeout(500)
        try { await page.waitForLoadState('networkidle', { timeout: 3000 }) } catch {}
        await page.waitForTimeout(500)
      }

      // Première tentative
      await submitAndWait(false)

      let resultFound = await page.waitForSelector('app-resultat-normal', { timeout: 30000 }).then(() => true).catch(() => false)

      if (!resultFound) {
        // Deuxième tentative : attendre le message "aucun résultat"
        resultFound = await page.waitForSelector('text=لا توجد أية نتيجة للبحث', { timeout: 10000 }).then(() => {
          logger.warn(`Dossier ${numeroDossier} introuvable sur mahakim.ma`)
          return false
        }).catch(() => false)
      }

      if (!resultFound) {
        // Troisième tentative : essai force + evaluate
        logger.warn(`Aucun résultat après 1ère soumission pour ${numeroDossier} — nouvelle tentative`)
        await page.evaluate(`document.querySelector('button:has-text("بحث")')?.click()`)
        await page.waitForTimeout(500)
        try { await page.waitForLoadState('networkidle', { timeout: 3000 }) } catch {}
        resultFound = await page.waitForSelector('app-resultat-normal', { timeout: 25000 }).then(() => true).catch(() => false)
      }

      if (!resultFound) {
        logger.warn(`Aucun sélecteur de résultat trouvé pour ${numeroDossier}`)
      }

      logger.info(`Résultat trouvé: ${resultFound} — URL: ${page.url()}`)
      await this.takeDebugScreenshot(page, numeroDossier, resultFound ? '08-result-found' : '08-no-result')

      if (resultFound) {
        await page.waitForSelector('text=لائحة الإجراءات', { timeout: 5000 }).catch(() => {})
        await sleep(500)
      }

      await this.takeDebugScreenshot(page, numeroDossier, '07-after-submit')
      logger.info(`Requêtes XHR interceptées (${xhrUrls.length}): ${xhrUrls.join(' | ')}`)

      const html = await page.content()
      return this.parseHtml(html, numeroDossier, tribunalPrimaire ?? courAppel)
    } catch (error) {
      logger.error(`Erreur scraping dossier ${numeroDossier}:`, error)
      return null
    } finally {
      await page.close()
      await sleep(CONFIG.DELAY_MS)
    }
  }

  private parseHtml(html: string, numeroDossier: string, tribunal: string): DossierData {
    const $ = cheerio.load(html)

    // 1) Carte d'identité du dossier : paires label/valeur génériques
    const infosCarte: Record<string, string> = {}
    $('.cm-child-dossier').each((_, el) => {
      const label = $(el).find('.cm-div-label label').text().trim()
      const value = $(el).find('.cm-div-value p').text().trim()
      if (label) infosCarte[label] = value
    })

    const titreAffaire = infosCarte['الموضوع'] || infosCarte['نوع الملف'] || undefined

    // Helper: trouver un <table> dont l'en-tête contient tous les textes donnés
    const findTableByHeaders = (...headers: string[]): cheerio.Cheerio<any> =>
      $('table').filter((_, t) => headers.every(h => $(t).find('th').text().includes(h))).first()

    // 2) لائحة الإجراءات
    const evenements: EvenementBrut[] = []
    const tableEvents = findTableByHeaders('تاريخ الإجراء')
    tableEvents.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 4) return
      const dateAction = $(cells[0]).text().trim()
      const typeAction = $(cells[1]).text().trim()
      const decision = $(cells[2]).text().trim()
      const dateProchaineAudience = $(cells[3]).text().trim()
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
    const tableParties = findTableByHeaders('الصفة', 'اسم الطرف')
    tableParties.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 6) return
      parties.push({
        qualite: $(cells[0]).text().trim(),
        nom: $(cells[1]).text().trim(),
        avocats: $(cells[2]).text().trim(),
        delegues: $(cells[3]).text().trim(),
        agents: $(cells[4]).text().trim(),
        representants: $(cells[5]).text().trim(),
      })
    })

    // 4) عرائض الطعن
    const recours: DossierRecours[] = []
    const tableRecours = findTableByHeaders('تعرض/إستئناف/عريضة نقض')
    tableRecours.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 7) return
      recours.push({
        type: $(cells[0]).text().trim(),
        partie: $(cells[1]).text().trim(),
        dateDepot: $(cells[2]).text().trim(),
        numero: $(cells[3]).text().trim(),
        numeroEnvoi: $(cells[4]).text().trim(),
        dateEnvoi: $(cells[5]).text().trim(),
        tribunal: $(cells[6]).text().trim(),
      })
    })

    // 4b) لائحة الخبرات
    const expertises: string[] = []
    const expertiseTabLabel = $('a').filter((_, el) => $(el).text().trim() === 'لائحة الخبرات').first()
    const expertiseTabId = expertiseTabLabel.attr('id')
    if (expertiseTabId) {
      const expertisePanel = $(`[aria-labelledby="${expertiseTabId}"]`)
      expertisePanel.find('tbody tr td').each((_, td) => {
        const txt = $(td).text().trim()
        if (txt && txt !== 'لا توجد خبرات') expertises.push(txt)
      })
    }

    // 5) الملفات المرتبطة
    const dossiersLies: DossierLie[] = []
    const tableLies = findTableByHeaders('نوع الملف', 'رقم الملف')
    // S'assurer qu'on a bien la BONNE table (celle avec "المحكمة" comme 4e colonne)
    // et pas une autre table qui aurait accidentellement "نوع الملف" et "رقم الملف"
    const tableLiesOk = tableLies.filter((_, t) => $(t).find('th').text().includes('المحكمة')).first()
    tableLiesOk.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 4) return
      dossiersLies.push({
        type: $(cells[0]).text().trim(),
        numeroDossier: $(cells[1]).text().trim(),
        dateInscription: $(cells[2]).text().trim(),
        tribunal: $(cells[3]).text().trim(),
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

    for (const dossier of dossiers) {
      try {
        const { courAppel, tribunalPrimaire } = resolveTribunalNames(dossier.tribunal)
        const data = await this.scrapeDossier(dossier.numeroDossier, courAppel, tribunalPrimaire)
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

/**
 * Ouvre un p-dropdown PrimeNG sur mahakim.ma et sélectionne l'option par texte.
 *
 * Le DOM réel mahakim.ma :
 *   <p-dropdown formcontrolname="tribunal">
 *     <div class="p-dropdown p-component p-inputwrapper">
 *       <!-- l'input readonly est le trigger, mais peut être caché -->
 *       <input readonly type="text" role="combobox" placeholder="..." class="p-element" />
 *       <!-- parfois label et trigger sont des enfants non-standards -->
 *     </div>
 *   </p-dropdown>
 *
 * L'input est parfois invisible (inside .p-hidden-accessible). On tente tout :
 *   - click sur .p-dropdown-label / trigger / wrapper
 *   - click force sur l'input
 *   - keyboard (focus + Espace / Flèche bas)
 *   - evaluate sur l'host <p-dropdown>
 *   - evaluate sur le wrapper .p-dropdown
 *   - évaluation du HTML pour debug
 */
async function selectPrimeDropdown(page: Page, _dropdownSelector: string, optionText: string): Promise<void> {
  // Déterminer l'identifiant : par formcontrolname (TP) ou par placeholder (CA)
  const isCA = optionText.includes('محكمة الاستئناف')
  const isTP = optionText.includes('المحكمة الابتدائية')
  const formcontrol = isTP ? 'tribunaux_primaires' : isCA ? 'tribunal' : null
  const placeholderFragment = isCA ? 'محكمة الاستئناف' : isTP ? 'المحكمة الابتدائية' : null

  // Trouver le bon <p-dropdown>
  let pDropdown: Locator
  if (formcontrol) {
    pDropdown = page.locator(`p-dropdown[formcontrolname="${formcontrol}"]`)
    if (await pDropdown.count() === 0) {
      // Fallback: par ng-reflect-name (Angular attribute)
      pDropdown = page.locator(`p-dropdown[ng-reflect-name="${formcontrol}"]`)
    }
  } else if (placeholderFragment) {
    pDropdown = page.locator('p-dropdown').filter({ has: page.locator(`input[placeholder*="${placeholderFragment}"]`) })
  } else {
    pDropdown = page.locator('p-dropdown').filter({ has: page.locator('input[role="combobox"]') }).last()
  }

  if (await pDropdown.count() === 0) {
    logger.warn(`Aucun p-dropdown trouvé pour: ${optionText} — recherche large`)
    pDropdown = page.locator('p-dropdown').filter({ has: page.locator('input[role="combobox"]') }).last()
    if (await pDropdown.count() === 0) {
      logger.warn(`Aucun p-dropdown trouvé du tout pour: ${optionText}`)
      return
    }
  }

  // DEBUG : logger la structure HTML du dropdown
  const dropdownHtml = await pDropdown.evaluate((el: any) => el.innerHTML ? el.innerHTML.substring(0, 600) : 'no innerHTML')
  logger.info(`Structure p-dropdown pour "${optionText}": ${dropdownHtml}`)

  await page.waitForTimeout(200)
  const panelOpened = await openDropdownPanel(page, pDropdown, placeholderFragment ?? '')
  if (!panelOpened) {
    logger.warn(`Impossible d'ouvrir le dropdown pour: ${optionText}`)
    return
  }

  await page.waitForTimeout(300)
  try {
    await page.waitForSelector('.p-dropdown-item, li[role="option"]', { timeout: 8000 })
  } catch {
    logger.warn(`Aucun item trouvé dans le panneau pour: ${optionText}`)
  }

  // DEBUG : logging des 5 premiers items du dropdown
  const debugItems = await page.evaluate(`Array.from(document.querySelectorAll('.p-dropdown-item, li[role="option"]')).slice(0,5).map(i => JSON.stringify(i.textContent ? i.textContent.trim() : ''))`) as string[]
  logger.info(`Items dans le dropdown (5 premiers): ${debugItems.join(', ')}`)

  // 1) Sélection par Playwright hasText (clic réel, fiable pour PrimeNG/Angular)
  try {
    const option = page.locator('.p-dropdown-item, li[role="option"]', { hasText: optionText }).first()
    await option.waitFor({ state: 'visible', timeout: 3000 })
    await option.click()
    logger.info(`Option sélectionnée via hasText: ${optionText}`)
    await page.waitForTimeout(200)
    return
  } catch {
    logger.warn(`Option non trouvée par hasText: ${optionText}`)
  }

  // 2) Fallback : évaluation exacte normalisée (supprime les espaces multiples)
  const found = await page.evaluate(new Function('text', `
    var norm = function(s) { return s.replace(/\\s+/g, ' ').trim(); };
    var items = document.querySelectorAll('.p-dropdown-item, li[role="option"]');
    for (var i = 0; i < items.length; i++) {
      if (items[i].textContent && norm(items[i].textContent) === norm(text)) {
        items[i].click();
        return true;
      }
    }
    return false;
  `) as any, optionText)

  if (found) {
    logger.info(`Option sélectionnée via evaluate normalisé: ${optionText}`)
    await page.waitForTimeout(200)
    return
  }

  logger.warn(`Impossible de sélectionner l'option: ${optionText}`)
}

/** Essaie plusieurs méthodes pour ouvrir le panneau PrimeNG. Retourne true si réussi. */
async function openDropdownPanel(page: Page, pDropdown: Locator, placeholderFragment: string): Promise<boolean> {
  // Méthode 1 : Playwright click sur les enfants visibles
  for (const sel of ['.p-dropdown-label', '.p-dropdown-trigger', '.p-dropdown', 'input[role="combobox"]']) {
    const el = pDropdown.locator(sel).first()
    if (await el.count() > 0) {
      try {
        await el.click({ timeout: 3000 })
        if (await isPanelVisible(page)) return true
      } catch {}
    }
  }

  // Méthode 2 : click force sur l'input
  const input = pDropdown.locator('input[role="combobox"]').first()
  if (await input.count() > 0) {
    try {
      await input.click({ force: true, timeout: 3000 })
      if (await isPanelVisible(page)) return true
    } catch {}
  }

  // Méthode 3 : keyboard (focus + Space / ArrowDown)
  if (await input.count() > 0) {
    try {
      await input.focus()
      await page.keyboard.press('Space')
      await page.waitForTimeout(200)
      if (await isPanelVisible(page)) return true
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)
      if (await isPanelVisible(page)) return true
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200)
      if (await isPanelVisible(page)) return true
    } catch {}
  }

  // Méthode 4 : evaluate — dispatch sur l'host <p-dropdown>
  const hostOpened = await page.evaluate(new Function('fragment', `
    var tryOpen = function(el) {
      if (!el) return false;
      ['mousedown', 'mouseup', 'click'].forEach(function(type) {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      });
      return true;
    };
    // Essayer plusieurs cibles
    var host = document.querySelector('p-dropdown input[placeholder*="' + fragment + '"]');
    if (host) tryOpen(host);
    host = document.querySelector('p-dropdown input[placeholder*="' + fragment + '"]').closest('p-dropdown');
    if (host) tryOpen(host);
    host = document.querySelector('p-dropdown input[placeholder*="' + fragment + '"]').parentElement;
    if (host) tryOpen(host);
    return true;
  `) as any, placeholderFragment)
  await page.waitForTimeout(300)
  if (hostOpened && await isPanelVisible(page)) return true

  return false
}

async function isPanelVisible(page: Page): Promise<boolean> {
  await page.waitForTimeout(100)
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

// Supporte "JJ/MM/AAAA" et "JJ/MM/AAAA HH:mm" (le site mahakim.ma ajoute parfois l'heure)
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

/**
 * Structure complète des tribunaux marocains.
 * Chaque cour d'appel (CA) a une liste de tribunaux primaires (TPI/TC/etc.) qui en dépendent.
 */
export interface CourAppelEntry {
  code: string           // ex: "CA_RABAT"
  nomAr: string          // ex: "محكمة الاستئناف بالرباط"
  tribunauxPrimaires: {
    code: string         // ex: "TPI_RABAT"
    nomAr: string        // ex: "المحكمة الابتدائية بالرباط"
  }[]
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

/** Mapping code → noms arabes pour résolution rapide dans le scraper worker. */
const TRIBUNAUX_AR: Record<string, { courAppel: string; tribunalPrimaire?: string }> = {}
for (const ca of TRIBUNAUX_COMPLETS) {
  TRIBUNAUX_AR[ca.code] = { courAppel: ca.nomAr }
  for (const tp of ca.tribunauxPrimaires) {
    TRIBUNAUX_AR[tp.code] = { courAppel: ca.nomAr, tribunalPrimaire: tp.nomAr }
  }
}

/** Résout le code tribunal vers les noms arabes pour les dropdowns mahakim.ma. */
export function resolveTribunalNames(tribunal: string): { courAppel: string; tribunalPrimaire?: string } {
  return TRIBUNAUX_AR[tribunal] ?? { courAppel: tribunal }
}

/** Trouve le code tribunal à partir des noms arabes (inverse de resolveTribunalNames). */
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