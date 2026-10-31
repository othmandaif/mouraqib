/**
 * Collecte des juridictions RÉELLES de mahakim.ma (diagnostic, à lancer en local) :
 *   cd apps/api
 *   npx ts-node scripts/collecter-juridictions.ts            (navigateur visible)
 *   npx ts-node scripts/collecter-juridictions.ts --cache    (sans fenêtre)
 *   … --ecrire : met aussi à jour le référentiel de l'app (src/services/juridictions/mahakim.json)
 *
 * Pour chaque type de code (ordinaire, famille, pénal, commerce, administratif) : saisit le code,
 * lit la liste des cours d'appel proposée par mahakim, puis pour chaque cour la liste des tribunaux
 * de 1re instance. Enregistre aussi les appels réseau du site (pour savoir si mahakim a un service
 * interrogeable directement, plus rapide que le navigateur).
 *
 * Résultat : apps/api/collecte-mahakim/juridictions.json, reseau.json, captures d'écran en cas d'échec.
 * Lecture seule : aucune donnée n'est envoyée à mahakim à part ces recherches de listes.
 */
import { chromium, Page, Locator } from 'playwright'
import { copyFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const URL_MAHAKIM = process.env.MAHAKIM_URL || 'https://www.mahakim.ma/#/suivi/dossier-suivi'
const SORTIE = join(__dirname, '..', 'collecte-mahakim')
// Un code représentatif par type de juridiction (le code détermine les listes proposées)
const CODES: Record<string, string> = { ordinaire: '1201', famille: '1626', penal: '2101', commerce: '8201', administratif: '7101' }
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function remplir(page: Page, fc: string, valeur: string) {
  const champ = page.locator(`input[formcontrolname="${fc}"]`).first()
  await champ.waitFor({ state: 'visible', timeout: 20000 })
  await champ.click(); await champ.fill(valeur)
  await champ.dispatchEvent('input'); await champ.dispatchEvent('change')
}

/** Menu déroulant PrimeNG : par formcontrolname, sinon par position (1er = cours d'appel, 2e = tribunaux). */
async function menu(page: Page, fc: string, rang: number): Promise<Locator | null> {
  const parFc = page.locator(`p-dropdown[formcontrolname="${fc}"], p-dropdown[ng-reflect-name="${fc}"]`)
  if (await parFc.count()) return parFc.first()
  const tous = page.locator('p-dropdown')
  return (await tous.count()) > rang ? tous.nth(rang) : null
}

async function ouvrir(page: Page, dd: Locator): Promise<boolean> {
  for (const sel of ['.p-dropdown-trigger', '.p-dropdown-label', '.p-dropdown', 'input[role="combobox"]']) {
    const el = dd.locator(sel).first()
    if (!(await el.count())) continue
    await el.click({ timeout: 3000 }).catch(() => {})
    if (await page.locator('.p-dropdown-panel').last().isVisible().catch(() => false)) return true
  }
  return false
}

/** Toutes les options du menu ouvert (liste virtualisée : on fait défiler pour tout charger). */
async function lireOptions(page: Page): Promise<string[]> {
  await page.waitForSelector('.p-dropdown-item, li[role="option"]', { timeout: 10000 }).catch(() => {})
  return page.evaluate(async () => {
    const d = (globalThis as any).document
    const norm = (s: string) => (s || '').replace(/[ ​-‏‪-‮]/g, ' ').replace(/\s+/g, ' ').trim()
    const vus = new Set<string>()
    const panel = d.querySelector('.p-dropdown-panel')
    const zone = panel ? panel.querySelector('.p-dropdown-items-wrapper') || panel : null
    for (let s = 0; s < 80; s++) {
      d.querySelectorAll('.p-dropdown-item, li[role="option"]').forEach((li: any) => { const t = norm(li.textContent); if (t) vus.add(t) })
      if (!zone) break
      const avant = zone.scrollTop
      zone.scrollTop = avant + 200
      await new Promise((r) => setTimeout(r, 80))
      if (zone.scrollTop === avant) break
    }
    return [...vus]
  })
}

async function choisir(page: Page, texte: string): Promise<boolean> {
  return page.evaluate(async (cible: string) => {
    const d = (globalThis as any).document
    const norm = (s: string) => (s || '').replace(/[ ​-‏‪-‮]/g, ' ').replace(/\s+/g, ' ').trim()
    const panel = d.querySelector('.p-dropdown-panel')
    const zone = panel ? panel.querySelector('.p-dropdown-items-wrapper') || panel : null
    for (let s = 0; s < 80; s++) {
      const li = [...d.querySelectorAll('.p-dropdown-item, li[role="option"]')].find((x: any) => norm(x.textContent) === cible) as any
      if (li) { li.scrollIntoView({ block: 'center' }); li.click(); return true }
      if (!zone) return false
      zone.scrollTop = s * 200
      await new Promise((r) => setTimeout(r, 80))
    }
    return false
  }, texte)
}

async function cocherTribunaux(page: Page): Promise<boolean> {
  const coche = () => page.evaluate(() => {
    const d = (globalThis as any).document
    return !!d.querySelector('p-checkbox .p-checkbox-box.p-highlight, .p-checkbox-box.p-highlight, input[type="checkbox"]:checked')
  })
  if (await coche()) return true
  for (const sel of ['p-checkbox[formcontrolname="si_tribunaux_primaires"] .p-checkbox-box', 'label:has-text("البحث بالمحاكم الابتدائية")', 'p-checkbox .p-checkbox-box']) {
    const el = page.locator(sel).first()
    if (await el.count()) { await el.click({ timeout: 3000 }).catch(() => {}); await pause(300); if (await coche()) return true }
  }
  return false
}

async function capture(page: Page, nom: string) {
  await page.screenshot({ path: join(SORTIE, `${nom}.png`), fullPage: true }).catch(() => {})
}

;(async () => {
  mkdirSync(SORTIE, { recursive: true })
  const navigateur = await chromium.launch({ headless: process.argv.includes('--cache') })
  const page = await navigateur.newPage()
  page.setDefaultTimeout(30000)

  // Appels réseau du site (XHR / fetch) : adresse, méthode, corps, réponse (tronquée)
  const reseau: unknown[] = []
  page.on('response', async (r) => {
    const req = r.request()
    if (!['xhr', 'fetch'].includes(req.resourceType())) return
    const corps = await r.text().catch(() => '')
    reseau.push({ methode: req.method(), url: req.url(), envoi: req.postData()?.slice(0, 2000) ?? null, statut: r.status(), reponse: corps.slice(0, 20000) })
  })

  const resultat: Record<string, { code: string; cours: { nom: string; tribunaux: string[] | null }[]; erreur?: string }> = {}
  for (const [type, code] of Object.entries(CODES)) {
    console.log(`\n== ${type} (code ${code})`)
    const r: (typeof resultat)[string] = { code, cours: [] }
    resultat[type] = r
    try {
      await page.goto(URL_MAHAKIM, { waitUntil: 'domcontentloaded' })
      await remplir(page, 'annee', String(new Date().getFullYear()))
      await remplir(page, 'mark', code)
      await remplir(page, 'numero', '1')
      await pause(800)

      const ddCa = await menu(page, 'tribunal', 0)
      if (!ddCa || !(await ouvrir(page, ddCa))) throw new Error("menu des cours d'appel introuvable")
      const cours = await lireOptions(page)
      await page.keyboard.press('Escape')
      console.log(`   ${cours.length} cours d'appel`)

      for (const nom of cours) {
        const entree = { nom, tribunaux: null as string[] | null }
        r.cours.push(entree)
        if (!(await ouvrir(page, ddCa)) || !(await choisir(page, nom))) { console.log(`   ! sélection impossible : ${nom}`); continue }
        await pause(500)
        let coche = false
        for (let essai = 0; essai < 3 && !coche; essai++) { coche = await cocherTribunaux(page); if (!coche) await pause(1000) }
        if (!coche) { console.log(`   (pas de case « tribunaux de 1re instance » pour ${nom})`); continue }
        await pause(500)
        const ddTp = await menu(page, 'tribunaux_primaires', 1)
        if (!ddTp || !(await ouvrir(page, ddTp))) { entree.tribunaux = []; continue }
        entree.tribunaux = await lireOptions(page)
        await page.keyboard.press('Escape')
        console.log(`   ${nom} → ${entree.tribunaux.length} tribunaux`)
      }
    } catch (e) {
      r.erreur = (e as Error).message
      console.log(`   ERREUR : ${r.erreur}`)
      await capture(page, `erreur-${type}`)
    }
    writeFileSync(join(SORTIE, 'juridictions.json'), JSON.stringify(resultat, null, 2)) // au fil de l'eau
  }

  writeFileSync(join(SORTIE, 'reseau.json'), JSON.stringify(reseau, null, 2))
  if (process.argv.includes('--ecrire')) {
    const erreurs = Object.entries(resultat).filter(([, v]) => v.erreur || !v.cours.length)
    if (erreurs.length) console.log(`\n⚠ Référentiel NON mis à jour : collecte incomplète (${erreurs.map(([t]) => t).join(', ')}).`)
    else { copyFileSync(join(SORTIE, 'juridictions.json'), join(__dirname, '..', 'src', 'services', 'juridictions', 'mahakim.json')); console.log('\nRéférentiel de l\'app mis à jour : src/services/juridictions/mahakim.json') }
  }
  await navigateur.close()
  console.log(`\nTerminé. Fichiers dans ${SORTIE} : juridictions.json, reseau.json (${reseau.length} appels réseau).`)
})()
