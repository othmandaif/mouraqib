// Guides pratiques : page d'un guide (GuideSeo) et index des guides (HubGuides), en arabe ou en français.
// Composants serveur : aucun JavaScript client, FAQ en <details>. Même habillage que les pages « fonction » (classes lp-* / pg-*).
import Link from 'next/link'
import type { ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ExternalLink, Globe, Plus, UserRound } from 'lucide-react'
import { AR, FR, type Langue } from '@/components/landing/contenu'
import { Logo, WA, EMAIL, TEL, lienWa } from '@/components/landing/commun'
import { CSS } from '@/components/landing/styles'
import { CSS_PAGE } from '@/components/pages/styles'
import { PAGES } from '@/components/pages/contenu'
import { PAGES_FONCTIONS, cheminPage } from '@/lib/pagesPubliques'
import { GUIDES, cheminGuide, cheminHub, type GuideId } from '@/lib/guidesPublics'
import { GUIDES_TEXTES, UI_GUIDES } from './contenu'
import { jsonLdGuide, jsonLdHub } from './seo'

const POLICE = {
  ar: "'IBM Plex Sans Arabic', 'IBM Plex Sans', sans-serif",
  fr: "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif",
}

const CSS_GUIDE = `
.gd-etapes{margin:0;padding-inline-start:22px;display:flex;flex-direction:column;gap:10px;max-width:780px}
.gd-etapes li{font-size:16px;line-height:1.85;color:#3B4A47;padding-inline-start:4px}
.gd-note{margin:0;max-width:780px;font-size:15px;line-height:1.8;color:#7A4E06;background:#FDF8EC;border:1px solid #F2D49C;border-radius:12px;padding:12px 16px}
.gd-meta{font-size:14px;color:#CFE5DD;margin:0}
.gd-sources{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;max-width:780px}
.gd-sources li{display:flex;flex-direction:column;gap:2px;font-size:15px;line-height:1.75;color:#3B4A47}
.gd-sources a{font-weight:600;color:#0E5A4E;display:inline-flex;align-items:center;gap:6px;text-decoration:underline;text-underline-offset:3px}
`

/** Habillage commun : en-tête (navigation, fil d'Ariane, H1, accroche), contenu, pied de page. */
function Coquille({ lang, json, fil, pastille, h1, lead, meta, autre, children }: {
  lang: Langue; json: object; fil: { nom: string; href?: string }[]; pastille: string; h1: string; lead: string; meta: string
  autre: string; children: ReactNode
}) {
  const ar = lang === 'ar'
  const t = ar ? AR : FR
  const ui = UI_GUIDES[lang]
  const accueil = ar ? '/' : '/fr'
  const autreLang = ar ? 'fr' : 'ar'
  const Fleche = ar ? ArrowLeft : ArrowRight
  const DEMO = lienWa(t.wa.demo)
  const script = JSON.stringify(json).replace(/</g, '\\u003c')
  return (
    <div className="lp" lang={lang} dir={ar ? 'rtl' : 'ltr'} style={{ background: '#F5F3EE', color: '#15201E', fontFamily: POLICE[lang] }}>
      <style>{CSS}</style>
      <style>{CSS_PAGE}</style>
      <style>{CSS_GUIDE}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: script }} />

      <header className="lp-hero lp-sec pg-hero">
        <div className="lp-grille-fond" aria-hidden />
        <div className="lp-wrap" style={{ position: 'relative' }}>
          <nav aria-label={ar ? 'القائمة' : 'Menu'} className="lp-barre">
            <Link href={accueil} aria-label="MalafiPro"><Logo sombre /></Link>
            <div className="pg-nav">
              <Link href={cheminPage('suivi', lang)}>{PAGES.suivi[lang].nav}</Link>
              <Link href={cheminPage('alertes', lang)}>{PAGES.alertes[lang].nav}</Link>
              <Link href={cheminHub(lang)} style={{ color: '#FFFFFF', fontWeight: 700 }}>{ui.hubNav}</Link>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link href={autre} hrefLang={autreLang} lang={autreLang} className="lp-langue" aria-label={t.autreLangue.label}>
                <Globe size={17} aria-hidden /><span className="lp-langue-long">{t.autreLangue.label}</span><span className="lp-langue-court">{t.autreLangue.court}</span>
              </Link>
              <Link href="/login" rel="nofollow" className="lp-connexion"><UserRound size={18} aria-hidden /><span>{t.nav.connexion}</span></Link>
            </div>
          </nav>

          <div className="pg-corps">
            <ol className="pg-fil" aria-label={ui.fil}>
              {fil.map((f, i) => (
                <li key={f.nom} style={{ display: 'contents' }}>
                  {i > 0 && <span aria-hidden>{ar ? '‹' : '›'}</span>}
                  {f.href ? <Link href={f.href}>{f.nom}</Link> : <span aria-current="page">{f.nom}</span>}
                </li>
              ))}
            </ol>
            <span className="lp-pastille-hero" style={{ alignSelf: 'flex-start' }}><span className="lp-point" aria-hidden />{pastille}</span>
            <h1 className="lp-h1" style={{ fontSize: 'clamp(30px, 4.2vw, 44px)' }}>{h1}</h1>
            <p className="lp-sous" style={{ maxWidth: 720 }}>{lead}</p>
            <p className="gd-meta">{meta}</p>
          </div>
        </div>
      </header>

      <main className="lp-sec pg-main">
        <article className="lp-wrap pg-article">
          {children}
          <div className="lp-fin pg-cta">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className="lp-h2" style={{ color: '#FFFFFF', fontSize: 26 }}>{PAGES.suivi[lang].nav} · {PAGES.alertes[lang].nav}</h2>
              <p style={{ margin: 0, fontSize: 16, color: '#CFE5DD' }}>{t.pied.slogan}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link href="/register" className="lp-btn action mp-action">{ui.essai}<Fleche size={18} aria-hidden /></Link>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn fantome">{WA}{ui.demo}</a>
            </div>
          </div>
        </article>
      </main>

      <footer className="lp-pied">
        <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
              <Logo sombre />
              <p style={{ margin: 0, lineHeight: 1.8 }}>{t.pied.slogan}</p>
            </div>
            <nav aria-label={ar ? 'روابط' : 'Liens'} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', maxWidth: 560 }}>
              <Link href={accueil}>{ar ? 'ملفاتي' : 'MalafiPro'}</Link>
              {PAGES_FONCTIONS.map((x) => <Link key={x.id} href={cheminPage(x.id, lang)}>{PAGES[x.id][lang].nav}</Link>)}
              <Link href={cheminHub(lang)}>{ui.guidesLien}</Link>
              <Link href={autre} hrefLang={autreLang}>{t.autreLangue.label}</Link>
            </nav>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`mailto:${EMAIL}`}><span dir="ltr">{EMAIL}</span></a>
              <a href={DEMO} target="_blank" rel="noopener noreferrer">{WA}<span className="num">{TEL}</span></a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 14, color: '#9FC9BE' }}>© <span className="num">{new Date().getFullYear()}</span> MalafiPro · {t.pied.droits}</div>
        </div>
      </footer>
    </div>
  )
}

function CarteGuide({ id, lang }: { id: GuideId; lang: Langue }) {
  const g = GUIDES_TEXTES[lang][id]
  const Fleche = lang === 'ar' ? ArrowLeft : ArrowRight
  return (
    <Link href={cheminGuide(id, lang)} className="pg-lien-carte">
      <strong>{g.nav}</strong>
      <span>{g.resume}</span>
      <em>{UI_GUIDES[lang].lire}<Fleche size={15} aria-hidden /></em>
    </Link>
  )
}

export function GuideSeo({ id, lang }: { id: GuideId; lang: Langue }) {
  const g = GUIDES_TEXTES[lang][id]
  const ui = UI_GUIDES[lang]
  const ar = lang === 'ar'
  const Fleche = ar ? ArrowLeft : ArrowRight
  return (
    <Coquille
      lang={lang} json={jsonLdGuide(id, lang)} pastille={g.pastille} h1={g.h1} lead={g.lead} meta={ui.mis} autre={cheminGuide(id, ar ? 'fr' : 'ar')}
      fil={[{ nom: ar ? 'ملفاتي' : 'MalafiPro', href: ar ? '/' : '/fr' }, { nom: ui.hubNav, href: cheminHub(lang) }, { nom: g.nav }]}
    >
      {g.sections.map((s, i) => (
        <section key={s.h2} aria-labelledby={`s${i}`} className="pg-bloc">
          <h2 id={`s${i}`} className="pg-h2">{s.h2}</h2>
          {s.paras?.map((x) => <p key={x} className="pg-texte">{x}</p>)}
          {s.items && <div className="pg-grille">{s.items.map((c) => <div key={c.h3} className="pg-carte"><h3>{c.h3}</h3><p>{c.texte}</p></div>)}</div>}
          {s.etapes && <ol className="gd-etapes">{s.etapes.map((x) => <li key={x}>{x}</li>)}</ol>}
          {s.puces && <ul className="pg-puces">{s.puces.map((x) => <li key={x}><Check size={16} strokeWidth={3} color="#0E5A4E" aria-hidden /><span>{x}</span></li>)}</ul>}
          {s.note && <p className="gd-note">{s.note}</p>}
        </section>
      ))}

      <section aria-labelledby="fn" className="pg-bloc">
        <h2 id="fn" className="pg-h2">{ui.fonctionsTitre}</h2>
        <div className="pg-voir">
          {g.fonctions.map((f) => (
            <Link key={f.id} href={cheminPage(f.id, lang)} className="pg-lien-carte">
              <strong>{PAGES[f.id][lang].nav}</strong>
              <span>{f.texte}</span>
              <em>{ui.aller}<Fleche size={15} aria-hidden /></em>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq" className="pg-bloc">
        <h2 id="faq" className="pg-h2">{ui.faq}</h2>
        <div className="lp-faq">
          {g.faq.map(({ q, r }) => (
            <details key={q} className="lp-carte">
              <summary><h3>{q}</h3><Plus className="lp-chev" size={20} color="#0E5A4E" aria-hidden /></summary>
              <p>{r}</p>
            </details>
          ))}
        </div>
        <p className="lp-avert"><AlertTriangle size={16} aria-hidden />{ui.avertissement}</p>
      </section>

      <section aria-labelledby="src" className="pg-bloc">
        <h2 id="src" className="pg-h2">{ui.sources}</h2>
        <p className="pg-texte">{ui.sourcesTexte}</p>
        <ul className="gd-sources">
          {g.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.nom}<ExternalLink size={14} aria-hidden /></a>
              <span>{s.usage}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lies" className="pg-bloc">
        <h2 id="lies" className="pg-h2">{ui.lies}</h2>
        <div className="pg-voir">{g.lies.map((x) => <CarteGuide key={x} id={x} lang={lang} />)}</div>
        <p className="pg-texte"><Link href={cheminHub(lang)} className="lp-lien">{ui.guidesLien}</Link></p>
      </section>
    </Coquille>
  )
}

export function HubGuides({ lang }: { lang: Langue }) {
  const ui = UI_GUIDES[lang]
  const ar = lang === 'ar'
  return (
    <Coquille
      lang={lang} json={jsonLdHub(lang)} pastille={ui.hubPastille} h1={ui.hubH1} lead={ui.hubLead} meta={ui.mis} autre={cheminHub(ar ? 'fr' : 'ar')}
      fil={[{ nom: ar ? 'ملفاتي' : 'MalafiPro', href: ar ? '/' : '/fr' }, { nom: ui.hubNav }]}
    >
      <section aria-label={ui.hubNav} className="pg-bloc">
        <div className="pg-hub">{GUIDES.map((x) => <CarteGuide key={x.id} id={x.id} lang={lang} />)}</div>
      </section>
      <section aria-labelledby="crit" className="pg-bloc pg-limites">
        <h2 id="crit" className="pg-h2">{ar ? 'كيف نكتب هذه الأدلة' : 'Comment ces guides sont rédigés'}</h2>
        <ul className="pg-puces">{ui.hubCriteres.map((x) => <li key={x}><AlertTriangle size={16} aria-hidden /><span>{x}</span></li>)}</ul>
      </section>
    </Coquille>
  )
}
