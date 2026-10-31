'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Check, FileText, Eye, ArrowLeftRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useToast, TOAST_MS } from '@/components/Toast'
import { Attente } from '@/components/ui/Chargement'
import { useAuth, aDroit } from '@/hooks/useAuth'
import { t as tr, langueCourante } from '@/lib/langue'

export type Camp = 'AGIR' | 'SURVEILLER'
export type RoleClient = 'DEMANDEUR' | 'DEFENDEUR' | 'INCONNU'

export interface EcheanceItem {
  id: string
  description: string
  descriptionAr?: string | null
  typeDelai: string
  dateDepart?: string
  dateLimite: string
  estCritique: boolean
  camp?: Camp
  completeAt?: string | null
  dossier: { id?: string; numeroDossier: string; tribunal: string; titreAffaire?: string | null; roleClient?: RoleClient }
  evenement?: { id: string; typeEvenement?: string | null; natureJugement?: string | null } | null
}

export const JOUR_MS = 86_400_000
// Jours CALENDAIRES jusqu'au dernier jour : 0 = « اليوم », même à 9 h (la limite est 23:59:59).
const debutJour = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
export const joursRestants = (d: string) => Math.round((debutJour(new Date(d)) - debutJour(new Date())) / JOUR_MS)
/** Le dernier jour tombe un samedi ou un dimanche : il faut en pratique agir avant. */
export const finSemaine = (d: string) => { const j = new Date(d).getDay(); return j === 0 || j === 6 }
// description : libellé français calculé par l'API ; descriptionAr : le même en arabe
export const titreDelai = (e: Pick<EcheanceItem, 'descriptionAr' | 'description' | 'typeDelai'>) =>
  langueCourante() === 'fr' ? e.description || e.typeDelai : e.descriptionAr || e.description || e.typeDelai

export function unitJours(j: number) {
  if (j <= 0) return tr('اليوم')
  if (j === 1) return tr('يوم')
  if (j === 2) return tr('يومان')
  if (j <= 10) return tr('أيام')
  return tr('يوماً')
}

export const ROLE_AR: Record<RoleClient, string> = { DEMANDEUR: tr('مدعٍ'), DEFENDEUR: tr('مدعى عليه'), INCONNU: tr('غير محدد') }
export const roleTexte = (r?: RoleClient) => (r && r !== 'INCONNU' ? tr('موكلكم: {v0}', { v0: r === 'DEMANDEUR' ? tr('المدعي') : tr('المدعى عليه') }) : '')

// Discipline du signal : rouge = à agir sous 48 h, ambre = sous 7 jours, sinon neutre.
export function tone(j: number) {
  if (j <= 2) return { bg: '#C0392B', fg: '#FFFFFF', text: '#6E1D14', rail: '#F2D3CE', border: '1.5px solid #C0392B', heading: '#9B2C20' }
  if (j <= 7) return { bg: '#F2A93B', fg: '#15201E', text: '#7A4E06', rail: '#FBE9C9', border: '1px solid #E4E0D6', heading: '#7A4E06' }
  return { bg: '#E3F0EC', fg: '#0B4A40', text: '#3B4A47', rail: '#EEEAE1', border: '1px solid #E4E0D6', heading: '#0B4A40' }
}
export const TONE_WATCH = { bg: '#EEEAE1', fg: '#4D5B57' }

const p2 = (n: number) => String(n).padStart(2, '0')
export const fmtDate = (d: string | Date) => { const x = new Date(d); return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}/${x.getFullYear()}` }
export const fmtJM = (d: string | Date) => { const x = new Date(d); return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}` }
export const JOURS = [tr('الأحد'), tr('الإثنين'), tr('الثلاثاء'), tr('الأربعاء'), tr('الخميس'), tr('الجمعة'), tr('السبت')]
export const jourSemaine = (d: string | Date) => JOURS[new Date(d).getDay()]
/** mahakim donne souvent la date d'audience sans heure (00:00) : on n'affiche alors rien. */
// 00:00 UTC = « date sans heure » (convention de l'API) ; sinon heure locale (Maroc)
export const heure = (d: string | Date) => { const t = new Date(d); return t.getUTCHours() || t.getUTCMinutes() ? `${p2(t.getHours())}:${p2(t.getMinutes())}` : '' }

/** Part du délai déjà écoulée (barre de progression), ou null si la date de départ manque. */
export function ecoule(e: Pick<EcheanceItem, 'dateDepart' | 'dateLimite'>) {
  if (!e.dateDepart) return null
  const total = new Date(e.dateLimite).getTime() - new Date(e.dateDepart).getTime()
  if (total <= 0) return null
  const fait = Date.now() - new Date(e.dateDepart).getTime()
  return { pct: Math.min(100, Math.max(0, Math.round((fait / total) * 100))), jours: Math.max(0, Math.round(fait / JOUR_MS)), total: Math.round(total / JOUR_MS) }
}

export function CountdownBadge({ j, size = 80, watch = false, onDark = false }: { j: number; size?: number; watch?: boolean; onDark?: boolean }) {
  const t = watch ? TONE_WATCH : tone(j)
  const bg = !watch && j > 7 && onDark ? '#0B4A40' : t.bg
  const fg = !watch && j > 7 && onDark ? '#FFFFFF' : t.fg
  return (
    <div style={{ flex: 'none', width: size, height: size, borderRadius: size >= 100 ? 22 : size > 60 ? 18 : size >= 52 ? 14 : 12, background: bg, color: fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: size >= 100 ? 2 : 0 }}>
      {j > 0 && <span className="num" style={{ fontSize: Math.round(size * (size >= 100 ? 0.46 : 0.42)), fontWeight: 700, lineHeight: 1 }}>{j}</span>}
      <span style={{ fontSize: size >= 100 ? 14 : size > 60 ? 12 : 11, fontWeight: 600 }}>{unitJours(j)}</span>
    </div>
  )
}

/**
 * « تم الإيداع » annulable : la carte disparaît tout de suite, l'appel API part
 * seulement après le délai du toast, sauf si l'avocat clique « تراجع ».
 */
export function useCompleteWithUndo(onDone: () => void) {
  const { toast } = useToast()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const montrer = (id: string) => setHidden((h) => { const n = new Set(h); n.delete(id); return n })

  const complete = (e: EcheanceItem) => {
    setHidden((h) => new Set(h).add(e.id))
    timers.current[e.id] = setTimeout(async () => {
      delete timers.current[e.id]
      try {
        await apiFetch(`/echeances/${e.id}/complete`, { method: 'PATCH' })
        onDone()
      } catch {
        montrer(e.id)
        toast(tr('تعذّر تسجيل الإنجاز، أعيدوا المحاولة.'), 'error')
      }
    }, TOAST_MS)
    toast(tr('سُجّل الإيداع: {v0}', { v0: titreDelai(e) }), 'success', {
      label: tr('تراجع'),
      onClick: () => { clearTimeout(timers.current[e.id]); delete timers.current[e.id]; montrer(e.id) },
    })
  }

  /** « إلغاء الإنجاز » sur un délai déjà enregistré comme fait */
  const rouvrir = async (e: EcheanceItem) => {
    try {
      await apiFetch(`/echeances/${e.id}/rouvrir`, { method: 'PATCH' })
      toast(tr('أُعيد فتح الأجل: {v0}', { v0: titreDelai(e) }), 'info')
      onDone()
    } catch {
      toast(tr('تعذّر إلغاء الإنجاز.'), 'error')
    }
  }
  return { hidden, complete, rouvrir }
}

export const BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
  background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 16px',
  minHeight: 44, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box',
}
export const BTN_DARK: React.CSSProperties = { ...BTN, background: '#15201E', color: '#FFFFFF', border: '1px solid #15201E' }

/**
 * Recherche par numéro « 2026/1201/202 » : des chiffres seuls (« 202 ») se cherchent dans le code et le numéro,
 * pas dans l'année (sinon « 202 » trouvait tous les dossiers de 2026). Une année complète (4 chiffres) reste trouvable.
 */
export function numeroCorrespond(numero: string, saisie: string): boolean {
  const t = saisie.trim().toLowerCase()
  if (!/^\d+$/.test(t)) return numero.toLowerCase().includes(t)
  const [annee, ...reste] = numero.split('/')
  return reste.some((x) => x.includes(t)) || (t.length === 4 && annee === t)
}

/** Lien vers l'éditeur, pré-rempli avec le dossier et le type de délai. */
export const lienRediger = (e: EcheanceItem) =>
  `/documents?${new URLSearchParams({ ...(e.dossier.id ? { dossier: e.dossier.id } : {}), delai: e.typeDelai }).toString()}`

/** Carte « عليكم » (maquette Délais) */
export function DeadlineCard({ e, tribunalAr, onComplete, onBasculer, attente }: { e: EcheanceItem; tribunalAr: (c: string) => string; onComplete: (e: EcheanceItem) => void; onBasculer?: (e: EcheanceItem) => void; attente?: boolean }) {
  const j = joursRestants(e.dateLimite)
  const t = tone(j)
  const prog = ecoule(e)
  const href = e.dossier.id ? `/dossiers/${e.dossier.id}` : '/dossiers'
  const role = roleTexte(e.dossier.roleClient)
  const { user } = useAuth()
  // Mobile : glisser la carte vers la gauche (≥ 96 px) = « تم الإيداع ». Le défilement vertical reste prioritaire.
  const depart = useRef<{ x: number; y: number; horizontal?: boolean } | null>(null)
  const [dx, setDx] = useState(0)
  const SEUIL = 96
  const glisse = {
    onTouchStart: (ev: React.TouchEvent) => { depart.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY } },
    onTouchMove: (ev: React.TouchEvent) => {
      const d = depart.current
      if (!d) return
      const x = ev.touches[0].clientX - d.x
      const y = ev.touches[0].clientY - d.y
      if (d.horizontal === undefined && (Math.abs(x) > 8 || Math.abs(y) > 8)) d.horizontal = Math.abs(x) > Math.abs(y)
      if (d.horizontal) setDx(Math.min(0, Math.max(x, -140)))
    },
    onTouchEnd: () => {
      if (dx <= -SEUIL) onComplete(e)
      depart.current = null
      setDx(0)
    },
  }

  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
    {dx < 0 && (
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: dx <= -SEUIL ? '#0E5A4E' : '#E3F0EC', color: dx <= -SEUIL ? '#FFFFFF' : '#0E5A4E', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingInline: 20, gap: 8, fontWeight: 600 }}>
        <Check size={20} aria-hidden />{' '}{tr('تم الإيداع')}
      </div>
    )}
    <article {...glisse} style={{ position: 'relative', transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .2s ease', touchAction: 'pan-y', background: '#FFFFFF', border: t.border, borderRadius: 18, padding: 20, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
      <CountdownBadge j={j} />
      <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>{titreDelai(e)}</strong>
        <Link href={href} style={{ fontSize: 14, color: '#3B4A47', textDecoration: 'none' }}>
          <span className="num">{e.dossier.numeroDossier}</span>
          {e.dossier.titreAffaire ? ` · ${e.dossier.titreAffaire}` : ` · ${tribunalAr(e.dossier.tribunal)}`}
          {role ? ` · ${role}` : ''}
        </Link>
        {prog && (
          <div role="img" aria-label={tr('مضى {jours} يوماً من {total}', { jours: prog.jours, total: prog.total })} style={{ height: 6, borderRadius: 999, background: t.rail }}>
            <div style={{ width: `${prog.pct}%`, height: 6, borderRadius: 999, background: j <= 7 ? t.bg : '#0E5A4E' }} />
          </div>
        )}
        <span style={{ fontSize: 13, color: t.text }}>
          {e.dateDepart && <>{tr('البداية')}{' '}<span className="num">{fmtJM(e.dateDepart)}</span> · </>}
          {tr('آخر أجل')}{' '}{jourSemaine(e.dateLimite)} <span className="num">{fmtDate(e.dateLimite)}</span>
        </span>
        {finSemaine(e.dateLimite) && j >= 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#7A4E06' }}>{tr('آخر يوم يصادف عطلة نهاية الأسبوع: أودعوا قبل الجمعة.')}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {aDroit(user, 'IA') && <Link href={lienRediger(e)} style={j <= 2 ? BTN_DARK : BTN}><FileText size={16} aria-hidden />{' '}{tr('تحرير المقال')}</Link>}
        <button type="button" onClick={() => onComplete(e)} style={BTN}><Check size={16} aria-hidden />{' '}{tr('تم الإيداع')}</button>
        {onBasculer && (
          <button type="button" onClick={() => onBasculer(e)} disabled={attente} aria-busy={attente} title={tr('هذا الأجل على الخصم')} aria-label={tr('نقل الأجل إلى «على الخصم»')} style={{ ...BTN, padding: 0, width: 44, justifyContent: 'center' }}>
            <Attente actif={!!attente} sombre><ArrowLeftRight size={16} aria-hidden /></Attente>
          </button>
        )}
      </div>
    </article>
    </div>
  )
}

/** Ligne « على الخصم » (maquette Fiche dossier) : neutre, pointillés, aucune action demandée. */
export function WatchRow({ e, partie, onBasculer, attente }: { e: EcheanceItem; partie?: string; onBasculer?: (e: EcheanceItem) => void; attente?: boolean }) {
  const j = joursRestants(e.dateLimite)
  const prog = ecoule(e)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', border: '1px solid #E4E0D6', borderRadius: 14, padding: '14px 16px' }}>
      <CountdownBadge j={j} size={64} watch />
      <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong style={{ fontSize: 16, fontWeight: 600 }}>{titreDelai(e)}{partie ? ` · ${partie}` : ''}</strong>
        {prog && (
          <div role="img" aria-label={tr('مضى {jours} يوماً من {total}', { jours: prog.jours, total: prog.total })} style={{ height: 6, borderRadius: 999, background: '#EEEAE1' }}>
            <div style={{ width: `${prog.pct}%`, height: 6, borderRadius: 999, background: '#4D5B57' }} />
          </div>
        )}
        <span style={{ fontSize: 13, color: '#3B4A47' }}>{tr('ينتهي')}{' '}{jourSemaine(e.dateLimite)} <span className="num">{fmtDate(e.dateLimite)}</span>{e.typeDelai === 'OPPOSITION' ? tr(' · سننبهكم إن سُجّل تعرّض') : ''}</span>
      </div>
      {onBasculer && (
        <button type="button" onClick={() => onBasculer(e)} disabled={attente} aria-busy={attente} style={{ ...BTN, fontSize: 13, minHeight: 40 }}>
          <Attente actif={!!attente} texte={tr('جارٍ النقل…')} sombre><Eye size={15} aria-hidden />{' '}{tr('هذا الأجل علينا')}</Attente>
        </button>
      )}
    </div>
  )
}

export const EyeIcon = ({ size = 18 }: { size?: number }) => <Eye size={size} color="#4D5B57" strokeWidth={1.8} aria-hidden />

/** « X ضد Y — objet » → { demandeur: X, defendeur: Y, objet } (titre saisi ou lu sur mahakim). */
export function lireTitre(titre?: string | null) {
  const [parties, ...reste] = (titre ?? '').split(/\s+[—-]\s+/)
  const [demandeur, defendeur] = parties.split(/\s+ضد\s+/)
  return { demandeur: demandeur?.trim() || '', defendeur: defendeur?.trim() || '', objet: reste.join(' — ').trim() }
}

/** Nom de l'adversaire selon le rôle du client (vide si inconnu). */
export function adversaire(titre?: string | null, role?: RoleClient) {
  const t = lireTitre(titre)
  return role === 'DEMANDEUR' ? t.defendeur : role === 'DEFENDEUR' ? t.demandeur : ''
}
