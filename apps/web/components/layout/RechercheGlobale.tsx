'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FolderOpen, Clock, Plus, FileText, Sparkles, CornerDownLeft, History, CalendarDays, AlarmClock } from 'lucide-react'
import { apiGet, lireCache } from '@/lib/api'
import { useTribunaux } from '@/hooks/useTribunaux'
import { joursRestants, titreDelai, unitJours, numeroCorrespond, type EcheanceItem } from '@/components/legal/DeadlineCard'

type PageListe = { items: DossierRech[] }
type DossierRech = { id: string; numeroDossier: string; tribunal: string; titreAffaire?: string | null }
type Resultat = { groupe: string; cle: string; Icon: typeof Search; titre: React.ReactNode; sous?: React.ReactNode; aller: () => void; urgent?: boolean }

// Recherche tolérante à l'arabe : sans tachkil, أ/إ/آ → ا, ة → ه, ى → ي
const normaliser = (t: string) => t
  .toLowerCase()
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/\s+/g, ' ').trim()
const correspond = (texte: string, mots: string[]) => { const t = normaliser(texte); return mots.every((m) => t.includes(m)) }

const CLE_RECENTS = 'malafipro:dossiers-recents'
/** Mémorise un dossier ouvert (appelé par la fiche dossier) : 5 derniers, propre à ce navigateur. */
export function noterDossierRecent(id: string) {
  try {
    const l = (JSON.parse(localStorage.getItem(CLE_RECENTS) ?? '[]') as string[]).filter((x) => x !== id)
    localStorage.setItem(CLE_RECENTS, JSON.stringify([id, ...l].slice(0, 5)))
  } catch { /* stockage indisponible : pas de récents */ }
}
const lireRecents = (): string[] => { try { return JSON.parse(localStorage.getItem(CLE_RECENTS) ?? '[]') } catch { return [] } }

/** Palette Ctrl/⌘ K : dossiers, délais et actions rapides depuis n'importe quelle page. */
export function RechercheGlobale({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const router = useRouter()
  const { tribunalAr } = useTribunaux()
  const [q, setQ] = useState('')
  const [actif, setActif] = useState(0)
  // Dossiers : demandés au serveur (page « liste ») au lieu de charger tout le portefeuille dans le navigateur
  const [dossiers, setDossiers] = useState<DossierRech[]>([])
  const [recentsD, setRecentsD] = useState<DossierRech[]>([])
  const [trouves, setTrouves] = useState<DossierRech[] | null>(null)
  const [echeances, setEcheances] = useState<EcheanceItem[]>(() => lireCache<EcheanceItem[]>('/echeances') ?? [])
  const input = useRef<HTMLInputElement>(null)
  const avant = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ouvert) return
    avant.current = document.activeElement as HTMLElement | null
    setQ(''); setActif(0)
    setTimeout(() => input.current?.focus(), 0)
    const recents = lireRecents()
    apiGet<PageListe>('/dossiers/liste?tri=recent&taille=4').then((p) => setDossiers(p.items)).catch(() => {})
    if (recents.length) {
      apiGet<PageListe>(`/dossiers/liste?ids=${recents.join(',')}&taille=5`)
        .then((p) => setRecentsD(recents.map((id) => p.items.find((x) => x.id === id)).filter((x): x is DossierRech => !!x))).catch(() => {})
    } else setRecentsD([])
    apiGet<EcheanceItem[]>('/echeances').then(setEcheances).catch(() => {})
    return () => { avant.current?.focus?.() } // rend le focus à l'élément d'origine
  }, [ouvert])

  const aller = (href: string) => { onFermer(); router.push(href) }

  // Recherche dans les dossiers : côté serveur (mêmes règles : chiffres = code ou numéro, arabe sans tachkil)
  useEffect(() => {
    const t = q.trim()
    if (!ouvert || !t) { setTrouves(null); return }
    const h = setTimeout(() => {
      apiGet<PageListe>(`/dossiers/liste?q=${encodeURIComponent(t)}&taille=6`).then((p) => setTrouves(p.items)).catch(() => {})
    }, 200)
    return () => clearTimeout(h)
  }, [q, ouvert])

  const resultats = useMemo<Resultat[]>(() => {
    const mots = normaliser(q).split(' ').filter(Boolean)
    const numerique = /^[\d/]+$/.test(q.trim())
    const aujourdhui = echeances.filter((x) => x.camp !== 'SURVEILLER' && joursRestants(x.dateLimite) <= 0).length
    const actions: Resultat[] = [
      { groupe: 'اختصارات', cle: 'a-jour', Icon: AlarmClock, urgent: aujourdhui > 0, titre: 'آجال عليكم اليوم', sous: aujourdhui ? <><span className="num">{aujourdhui}</span> {aujourdhui === 1 ? 'أجل' : 'آجال'}</> : 'لا أجل ينتهي اليوم', aller: () => aller('/echeances') },
      { groupe: 'اختصارات', cle: 'a-demain', Icon: CalendarDays, titre: 'جلسات الغد', sous: 'المفكرة', aller: () => aller('/calendrier') },
      { groupe: 'إجراءات', cle: 'a-ajout', Icon: Plus, titre: 'إضافة ملف', sous: 'برقم الملف على بوابة محاكم', aller: () => aller('/dossiers?ajouter=1') },
      { groupe: 'إجراءات', cle: 'a-doc', Icon: FileText, titre: 'صياغة وثيقة', sous: 'مقال، مذكرة، إنذار…', aller: () => aller('/documents') },
      { groupe: 'إجراءات', cle: 'a-ia', Icon: Sparkles, titre: q ? <>اسألوا المساعد: «{q}»</> : 'سؤال للمساعد القانوني', aller: () => aller(q ? `/assistant?q=${encodeURIComponent(q)}` : '/assistant') },
    ]
    // Sans saisie : les dossiers ouverts récemment d'abord (puis les derniers mouvements pour compléter).
    const estRecent = (x: DossierRech) => !mots.length && recentsD.some((r) => r.id === x.id)
    const d = (mots.length ? (trouves ?? []) : [...recentsD, ...dossiers.filter((x) => !recentsD.some((r) => r.id === x.id))])
      .slice(0, mots.length ? 6 : 4)
      .map<Resultat>((x) => ({ groupe: estRecent(x) ? 'فُتحت مؤخراً' : 'الملفات', cle: `d-${x.id}`, Icon: estRecent(x) ? History : FolderOpen, titre: <span className="num">{x.numeroDossier}</span>, sous: [x.titreAffaire, tribunalAr(x.tribunal)].filter(Boolean).join(' · '), aller: () => aller(`/dossiers/${x.id}`) }))
    const e = echeances
      .filter((x) => x.camp !== 'SURVEILLER')
      .filter((x) => !mots.length || (numerique ? numeroCorrespond(x.dossier.numeroDossier, q) : correspond(`${titreDelai(x)} ${x.dossier.numeroDossier} ${x.dossier.titreAffaire ?? ''}`, mots)))
      .sort((a, b) => +new Date(a.dateLimite) - +new Date(b.dateLimite))
      .slice(0, mots.length ? 5 : 3)
      .map<Resultat>((x) => {
        const j = joursRestants(x.dateLimite)
        return { groupe: 'آجال عليكم', cle: `e-${x.id}`, Icon: Clock, urgent: j <= 2, titre: titreDelai(x), sous: <>ملف <span className="num">{x.dossier.numeroDossier}</span> · {j <= 0 ? 'اليوم' : <>بعد <span className="num">{j}</span> {unitJours(j)}</>}</>, aller: () => aller('/echeances') }
      })
    const filtreActions = mots.length ? actions.filter((a) => a.cle === 'a-ia' || correspond(String(a.titre), mots)) : actions
    const raccourcis = filtreActions.filter((a) => a.groupe === 'اختصارات')
    // Un numéro tapé cherche d'abord le dossier ; un mot cherche d'abord dans les délais
    const autres = filtreActions.filter((a) => a.groupe !== 'اختصارات')
    return numerique ? [...d, ...e, ...autres] : [...raccourcis, ...e, ...d, ...autres]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, dossiers, trouves, echeances, recentsD, tribunalAr])

  useEffect(() => { setActif(0) }, [q])
  if (!ouvert) return null

  const touche = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Escape') { ev.preventDefault(); onFermer() }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); setActif((i) => Math.min(i + 1, resultats.length - 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActif((i) => Math.max(i - 1, 0)) }
    else if (ev.key === 'Enter') { ev.preventDefault(); resultats[actif]?.aller() }
    else if (ev.key === 'Tab') ev.preventDefault() // le focus reste dans la palette
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="بحث سريع" dir="rtl" onKeyDown={touche}
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12vh 16px 16px' }}>
      <div onClick={onFermer} style={{ position: 'absolute', inset: 0, background: 'rgba(21,32,30,.45)' }} />
      <div style={{ position: 'relative', width: 'min(620px, 100%)', background: '#FFFFFF', borderRadius: 16, boxShadow: '0 30px 60px -20px rgba(8,59,52,.45)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid #EEEAE1' }}>
          <Search size={20} color="#5E6B67" aria-hidden />
          <span className="sr-only-ar">ابحثوا عن ملف أو أجل أو إجراء</span>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم ملف، اسم طرف، أجل…" role="combobox" aria-expanded="true" aria-controls="rg-liste" aria-activedescendant={resultats[actif] ? `rg-${resultats[actif].cle}` : undefined}
            style={{ flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: 17, border: 0, outline: 'none', boxShadow: 'none', minHeight: 58, background: 'transparent', color: '#15201E' }} />
          <kbd className="num" style={{ fontSize: 12, border: '1px solid #E4E0D6', borderRadius: 6, padding: '2px 6px', color: '#5E6B67' }}>Esc</kbd>
        </label>
        <ul id="rg-liste" role="listbox" style={{ listStyle: 'none', margin: 0, padding: 8, overflowY: 'auto' }}>
          {resultats.length === 0 && <li style={{ padding: '18px 12px', color: '#5E6B67', fontSize: 15 }}>لا نتيجة. جرّبوا رقم الملف أو جزءاً منه.</li>}
          {resultats.map((r, i) => (<React.Fragment key={r.cle}>
            {r.groupe !== resultats[i - 1]?.groupe && (
              <li role="presentation" style={{ padding: i ? '12px 12px 4px' : '4px 12px', fontSize: 12, fontWeight: 600, color: '#5E6B67' }}>{r.groupe}</li>
            )}
            <li id={`rg-${r.cle}`} role="option" aria-selected={i === actif} onMouseEnter={() => setActif(i)} onClick={r.aller}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', minHeight: 52, borderRadius: 12, cursor: 'pointer', background: i === actif ? '#E3F0EC' : 'transparent' }}>
              <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: r.urgent ? '#FBE9E6' : '#F5F3EE', color: r.urgent ? '#9B2C20' : '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><r.Icon size={18} aria-hidden /></span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#15201E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</span>
                {r.sous && <span style={{ fontSize: 13, color: '#5E6B67', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sous}</span>}
              </span>
              {i === actif && <CornerDownLeft size={16} color="#5E6B67" aria-hidden />}
            </li>
          </React.Fragment>))}
        </ul>
        <div style={{ display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid #EEEAE1', fontSize: 12, color: '#5E6B67' }}>
          <span><span className="num">↑ ↓</span> للتنقل</span><span><span className="num">Enter</span> للفتح</span>
        </div>
      </div>
    </div>
  )
}
