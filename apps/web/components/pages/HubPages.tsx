// Section « chaque fonction en détail » de la landing : liens internes vers les pages « fonction ». Composant serveur.
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Langue } from '@/components/landing/contenu'
import { PAGES_FONCTIONS, cheminPage } from '@/lib/pagesPubliques'
import { cheminHub } from '@/lib/guidesPublics'
import { UI_GUIDES } from '@/components/guides/contenu'
import { PAGES, UI } from './contenu'
import { CSS_PAGE } from './styles'

export function HubPages({ lang }: { lang: Langue }) {
  const ui = UI[lang]
  const Fleche = lang === 'ar' ? ArrowLeft : ArrowRight
  return (
    <section aria-labelledby="t-hub" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
      <style>{CSS_PAGE}</style>
      <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div className="lp-titre">
          <h2 id="t-hub" className="lp-h2">{ui.hubTitre}</h2>
          <p className="lp-lead">{ui.hubTexte}</p>
        </div>
        <div className="pg-hub">
          {PAGES_FONCTIONS.map((x) => (
            <Link key={x.id} href={cheminPage(x.id, lang)} className="pg-lien-carte">
              <strong>{PAGES[x.id][lang].nav}</strong>
              <span>{PAGES[x.id][lang].resume}</span>
              <em>{ui.plus}<Fleche size={15} aria-hidden /></em>
            </Link>
          ))}
        </div>
        <p className="lp-lead" style={{ margin: 0 }}>
          <Link href={cheminHub(lang)} className="lp-lien">{UI_GUIDES[lang].guidesLien} — {UI_GUIDES[lang].hubH1}</Link>
        </p>
      </div>
    </section>
  )
}
