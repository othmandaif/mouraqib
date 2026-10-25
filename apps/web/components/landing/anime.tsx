'use client'
// Effets de la landing, recréés avec framer-motion (déjà dans le projet, aucune dépendance ajoutée) :
// - Apparition / MotsReveles : apparition au défilement et mots qui se révèlent (style Skiper UI / Animaster) ;
// - CarteLumiere : bordure lumineuse qui suit la souris (style Animaster « hover border ») ;
// - Tarifs : bascule mensuel/annuel avec pastille glissante et prix animé (style Vengeance UI pricing).
// Tout respecte prefers-reduced-motion (MotionConfig reducedMotion="user").
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import { useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { Check, MessageCircle, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { AR, FR, PRIX, type Langue } from './contenu'

const EASE = [0.22, 1, 0.36, 1] as const

export function Apparition({ children, delai = 0, className, style, as = 'div' }: { children: ReactNode; delai?: number; className?: string; style?: React.CSSProperties; as?: 'div' | 'li' }) {
  const M = as === 'li' ? motion.li : motion.div
  return (
    <MotionConfig reducedMotion="user">
      <M className={className} style={style} initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: delai, ease: EASE }}>
        {children}
      </M>
    </MotionConfig>
  )
}

/** Titre dont les mots apparaissent un par un (pas de découpage en lettres : l'arabe est cursif). */
export function MotsReveles({ texte, delai = 0, style }: { texte: string; delai?: number; style?: React.CSSProperties }) {
  const reduit = useReducedMotion()
  if (reduit) return <span style={style}>{texte}</span>
  return (
    <span style={style} aria-label={texte}>
      {texte.split(' ').map((mot, i) => (
        <motion.span key={i} aria-hidden style={{ display: 'inline-block', whiteSpace: 'pre' }}
          initial={{ opacity: 0, y: '0.4em', filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, delay: delai + i * 0.07, ease: EASE }}>
          {mot}{' '}
        </motion.span>
      ))}
    </span>
  )
}

/** Carte dont la bordure s'éclaire autour du pointeur (variables CSS --x/--y, sans re-rendu React). */
export function CarteLumiere({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const bouger = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${e.clientX - r.left}px`)
    el.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return <div ref={ref} onPointerMove={bouger} className={`lp-lumiere ${className}`} style={style}>{children}</div>
}

/** Petit mouvement de flottement (carte WhatsApp du hero). */
export function Flotte({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div style={style} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
        transition={{ opacity: { delay: 1.1, duration: 0.5 }, scale: { delay: 1.1, duration: 0.5 }, y: { delay: 1.6, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}>
        {children}
      </motion.div>
    </MotionConfig>
  )
}

const num = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

function lienWa(tel: string, texte: string) {
  return `https://wa.me/${tel.replace(/[^\d]/g, '').replace(/^00/, '').replace(/^0/, '212')}?text=${encodeURIComponent(texte)}`
}

/** Grille de prix avec bascule mensuel / annuel. `restants` = places fondateurs (null si l'API ne répond pas, 0 = offre terminée). */
export function Tarifs({ lang, restants, tel }: { lang: Langue; restants: number | null; tel: string }) {
  const t = lang === 'ar' ? AR : FR
  const T = t.tarifs
  const [annuel, setAnnuel] = useState(false)
  const fondateur = restants !== 0
  const Fleche = lang === 'ar' ? ArrowLeft : ArrowRight
  const prix = (id: 'solo' | 'cabinet') => {
    const p = PRIX[id]
    const base = fondateur ? p.fondateur : p.mois
    return { affiche: annuel ? base * PRIX.moisPayesParAn : base, barre: annuel ? p.mois * PRIX.moisPayesParAn : p.mois, jour: Math.round(base / 30) }
  }
  return (
    <MotionConfig reducedMotion="user">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div role="radiogroup" aria-label={T.titre} className="lp-bascule">
          {[{ v: false, l: T.mensuel }, { v: true, l: T.annuel }].map(({ v, l }) => (
            <button key={l} type="button" role="radio" aria-checked={annuel === v} onClick={() => setAnnuel(v)} className="lp-bascule-btn" data-actif={annuel === v}>
              {annuel === v && <motion.span layoutId="bascule" className="lp-bascule-pastille" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span style={{ position: 'relative' }}>{l}</span>
              {v && <span className="lp-eco" style={{ position: 'relative' }}>{T.economie}</span>}
            </button>
          ))}
        </div>

        <div className="lp-prix-grille">
          {T.offres.map((o, i) => {
            const pop = !!o.populaire
            const p = o.id === 'surMesure' ? null : prix(o.id)
            const href = o.id === 'surMesure' ? lienWa(tel, t.wa.devis) : '/register'
            return (
              <motion.div key={o.id} className={`lp-prix ${pop ? 'pop' : ''}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}>
                {pop && <span className="lp-prix-ruban"><Sparkles size={14} aria-hidden />{lang === 'ar' ? 'الأكثر اختياراً' : 'Le plus choisi'}</span>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{o.nom}</h3>
                  <span style={{ fontSize: 14, color: pop ? '#9FC9BE' : '#5E6B67' }}>{o.pour}</span>
                </div>

                <div style={{ minHeight: 132, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p ? (
                    <>
                      {fondateur && <span className="lp-badge-fond">{T.fondateurBadge(restants)}</span>}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span key={`${o.id}-${annuel}`} className="num" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1 }}
                            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }} transition={{ duration: 0.3 }}>
                            {num(p.affiche)}
                          </motion.span>
                        </AnimatePresence>
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{annuel ? T.parAn : T.parMois}</span>
                      </div>
                      {(fondateur || annuel) && (
                        <span style={{ fontSize: 14, color: pop ? '#9FC9BE' : '#5E6B67' }}>
                          {T.prixNormal} <s className="num">{num(fondateur ? p.barre : PRIX[o.id as 'solo' | 'cabinet'].mois * 12)}</s> {T.dh}
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: pop ? '#CFE5DD' : '#3B4A47' }}>{fondateur ? T.fondateurNote : T.parJour(p.jour)}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2 }}>{T.surDevis}</span>
                      <span style={{ fontSize: 14, color: '#5E6B67', lineHeight: 1.6 }}>{T.surDevisNote}</span>
                    </>
                  )}
                </div>

                <a href={href} {...(o.id === 'surMesure' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`lp-btn ${o.id === 'surMesure' ? 'contour' : 'action mp-action'}`} style={{ width: '100%' }}>
                  {o.id === 'surMesure' ? <MessageCircle size={18} aria-hidden /> : null}{o.cta}{o.id !== 'surMesure' && <Fleche size={18} aria-hidden />}
                </a>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {o.inclus.map((x) => (
                    <li key={x} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.6 }}>
                      <span className="lp-coche" data-pop={pop}><Check size={14} strokeWidth={3} aria-hidden /></span>{x}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </div>
    </MotionConfig>
  )
}
