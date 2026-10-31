// Page « fonction » (suivi mahakim, alertes, clients, facturation, assistant, actes), en arabe ou en français.
// Composant serveur : aucun JavaScript client, FAQ en <details>. Contenu : ./contenu.ts · SEO : ./seo.ts.
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Globe, Plus, UserRound } from 'lucide-react'
import { AR, FR, type Langue } from '@/components/landing/contenu'
import { Logo, WA, EMAIL, TEL, lienWa } from '@/components/landing/commun'
import { CSS } from '@/components/landing/styles'
import { PAGES_FONCTIONS, cheminPage, pagesConfiancePubliees, type PageId } from '@/lib/pagesPubliques'
import { PAGES, UI } from './contenu'
import { CSS_PAGE } from './styles'
import { jsonLdPage } from './seo'

const POLICE = {
  ar: "'IBM Plex Sans Arabic', 'IBM Plex Sans', sans-serif",
  fr: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
}

export function PageSeo({ id, lang }: { id: PageId; lang: Langue }) {
  const p = PAGES[id][lang]
  const ui = UI[lang]
  const ar = lang === 'ar'
  const t = ar ? AR : FR
  const dir = ar ? 'rtl' : 'ltr'
  const Fleche = ar ? ArrowLeft : ArrowRight
  const accueil = ar ? '/' : '/fr'
  const autre = ar ? 'fr' : 'ar'
  const DEMO = lienWa(t.wa.demo)
  // JSON-LD : « < » échappé pour qu'aucun texte ne puisse fermer la balise <script>
  const json = JSON.stringify(jsonLdPage(id, lang)).replace(/</g, '\\u003c')

  return (
    <div className="lp" lang={lang} dir={dir} style={{ background: '#F5F3EE', color: '#15201E', fontFamily: POLICE[lang] }}>
      <style>{CSS}</style>
      <style>{CSS_PAGE}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />

      {/* ── En-tête : navigation, fil d'Ariane, titre, accroche ── */}
      <header className="lp-hero lp-sec pg-hero">
        <div className="lp-grille-fond" aria-hidden />
        <div className="lp-wrap" style={{ position: 'relative' }}>
          <nav aria-label={ui.menu} className="lp-barre">
            <Link href={accueil} aria-label="MalafiPro"><Logo sombre /></Link>
            <div className="pg-nav">
              {PAGES_FONCTIONS.map((x) => (
                <Link key={x.id} href={cheminPage(x.id, lang)} aria-current={x.id === id ? 'page' : undefined} style={x.id === id ? { color: '#FFFFFF', fontWeight: 700 } : undefined}>{PAGES[x.id][lang].nav}</Link>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link href={cheminPage(id, autre)} hrefLang={autre} lang={autre} className="lp-langue" aria-label={t.autreLangue.label}>
                <Globe size={17} aria-hidden /><span className="lp-langue-long">{t.autreLangue.label}</span><span className="lp-langue-court">{t.autreLangue.court}</span>
              </Link>
              <Link href="/login" rel="nofollow" className="lp-connexion"><UserRound size={18} aria-hidden /><span>{t.nav.connexion}</span></Link>
            </div>
          </nav>

          <div className="pg-corps">
            <ol className="pg-fil" aria-label={ar ? 'مسار التصفح' : 'Fil d’Ariane'}>
              <li><Link href={accueil}>{ui.accueil}</Link></li>
              <li aria-hidden>{ar ? '‹' : '›'}</li>
              <li aria-current="page">{p.nav}</li>
            </ol>
            <span className="lp-pastille-hero" style={{ alignSelf: 'flex-start' }}><span className="lp-point" aria-hidden />{p.pastille}</span>
            <h1 className="lp-h1" style={{ fontSize: 'clamp(30px, 4.2vw, 44px)' }}>{p.h1}</h1>
            <p className="lp-sous" style={{ maxWidth: 720 }}>{p.lead}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link href="/register" className="lp-btn action mp-action">{ui.essai}<Fleche size={18} aria-hidden /></Link>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn fantome">{WA}{ui.demo}</a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="lp-sec pg-main">
        <article className="lp-wrap pg-article">
          {p.blocs.map((b, i) => (
            <section key={b.h2} aria-labelledby={`b${i}`} className="pg-bloc">
              <h2 id={`b${i}`} className="pg-h2">{b.h2}</h2>
              {b.intro && <p className="pg-texte">{b.intro}</p>}
              {b.puces && (
                <ul className="pg-puces">{b.puces.map((x) => <li key={x}><Check size={16} strokeWidth={3} color="#0E5A4E" aria-hidden /><span>{x}</span></li>)}</ul>
              )}
              {b.cartes && (
                <div className="pg-grille">{b.cartes.map((c) => <div key={c.h3} className="pg-carte"><h3>{c.h3}</h3><p>{c.texte}</p></div>)}</div>
              )}
              {b.image && (
                <figure className="pg-fig">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image.src} alt={b.image.alt} width={b.image.w} height={b.image.h} loading="lazy" decoding="async" />
                  <figcaption>{b.image.legende}</figcaption>
                </figure>
              )}
            </section>
          ))}

          <section aria-labelledby="lim" className="pg-bloc pg-limites">
            <h2 id="lim" className="pg-h2">{p.limites.h2}</h2>
            <ul className="pg-puces">{p.limites.puces.map((x) => <li key={x}><AlertTriangle size={16} aria-hidden /><span>{x}</span></li>)}</ul>
          </section>

          <section aria-labelledby="faq" className="pg-bloc">
            <h2 id="faq" className="pg-h2">{ui.faq}</h2>
            <div className="lp-faq">
              {p.faq.map(({ q, r }) => (
                <details key={q} className="lp-carte">
                  <summary><h3>{q}</h3><Plus className="lp-chev" size={20} color="#0E5A4E" aria-hidden /></summary>
                  <p>{r}</p>
                </details>
              ))}
            </div>
            <p className="lp-avert"><AlertTriangle size={16} aria-hidden />{ui.avertissement}</p>
          </section>

          <section aria-labelledby="voir" className="pg-bloc">
            <h2 id="voir" className="pg-h2">{ui.voirAussi}</h2>
            <div className="pg-voir">
              {p.voir.map((v) => (
                <Link key={v} href={cheminPage(v, lang)} className="pg-lien-carte">
                  <strong>{PAGES[v][lang].nav}</strong>
                  <span>{PAGES[v][lang].resume}</span>
                  <em>{ui.plus}<Fleche size={15} aria-hidden /></em>
                </Link>
              ))}
            </div>
          </section>

          <div className="lp-fin pg-cta">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className="lp-h2" style={{ color: '#FFFFFF', fontSize: 28 }}>{ui.cta}</h2>
              <p style={{ margin: 0, fontSize: 16, color: '#CFE5DD' }}>{ui.ctaTexte}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link href="/register" className="lp-btn action mp-action">{ui.essai}<Fleche size={18} aria-hidden /></Link>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn fantome">{WA}{ui.demo}</a>
            </div>
          </div>
        </article>
      </main>

      {/* ── Pied de page ── */}
      <footer className="lp-pied">
        <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
              <Logo sombre />
              <p style={{ margin: 0, lineHeight: 1.8 }}>{t.pied.slogan}</p>
            </div>
            <nav aria-label={ar ? 'روابط' : 'Liens'} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', maxWidth: 560 }}>
              <Link href={accueil}>{ui.accueil}</Link>
              {PAGES_FONCTIONS.map((x) => <Link key={x.id} href={cheminPage(x.id, lang)}>{PAGES[x.id][lang].nav}</Link>)}
              {pagesConfiancePubliees().map((x) => <Link key={x.ar} href={ar ? x.ar : x.fr}>{ar ? x.titreAr : x.titreFr}</Link>)}
              <Link href="/register">{t.pied.liens.find(([h]) => h === '/register')?.[1]}</Link>
              <Link href={cheminPage(id, autre)} hrefLang={autre}>{t.autreLangue.label}</Link>
            </nav>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`mailto:${EMAIL}`}><span dir="ltr">{EMAIL}</span></a>
              <a href={DEMO} target="_blank" rel="noopener noreferrer">{WA}<span className="num">{TEL}</span></a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 14, color: '#9FC9BE' }}>© <span className="num">{new Date().getFullYear()}</span> MalafiPro · {t.pied.droits}</div>
        </div>
      </footer>

      <Link href="/register" className="lp-btn action mp-action lp-flot">{ui.essai}<Fleche size={18} aria-hidden /></Link>
    </div>
  )
}
