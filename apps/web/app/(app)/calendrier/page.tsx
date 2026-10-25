'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Plus, X, CalendarDays, CalendarRange, List, Scale, Clock, Eye, CalendarCheck, CheckCircle2, Lightbulb, ListChecks,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useTribunaux } from '@/hooks/useTribunaux'
import { useToast, useActionAnnulable } from '@/components/Toast'
import { IconeRonde, EtatVide, IllusCalendrier } from '@/components/ui/Visuels'
import { ErreurChargement, useEnvoi, Attente } from '@/components/ui/Chargement'
import { joursRestants, fmtJM, heure, unitJours, JOURS, JOUR_MS } from '@/components/legal/DeadlineCard'

type Dossier = { id: string; numeroDossier: string; tribunal?: string; titreAffaire: string | null }
interface Mois {
  debut: string
  fin: string
  audiences: { id: string; date: string; titre: string; dossier: Dossier & { tribunal: string } }[]
  echeances: { id: string; date: string; titre: string; typeDelai: string; camp: 'AGIR' | 'SURVEILLER'; estComplete: boolean; estExpire: boolean; dossier: Dossier }[]
  rendezVous: { id: string; date: string; titre: string; lieu: string | null; dossier: Dossier | null }[]
  prochains?: {
    audience: { id: string; date: string; dossier: Dossier & { tribunal: string } } | null
    delai: { id: string; date: string; titre: string; dossier: Dossier } | null
  }
}
type Genre = 'audience' | 'agir' | 'surveiller' | 'rdv' | 'fait'
type Item = { id: string; date: string; genre: Genre; court: string; texte: string; sous: string; dossierId?: string; rdvId?: string }
type Vue = 'mois' | 'semaine' | 'liste'

const MOIS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر']
const ENTETES = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
const cle = (d: Date | string) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}` }
// Heure affichée seulement pour les jalons horaires : un délai court jusqu'à 23:59, son heure n'apporte rien
const hItem = (it: Item) => (it.genre === 'audience' || it.genre === 'rdv' ? heure(it.date) : '')
const dateLongue = (d: string | Date) => { const x = new Date(d); return <><span className="num">{x.getDate()}</span> {MOIS_AR[x.getMonth()]} <span className="num">{x.getFullYear()}</span></> }

// Conseils pratiques (un par jour, toujours le même pour une date donnée)
const CONSEILS = [
  'عندما يصادف آخر أجل يوم عطلة، تحققوا من التاريخ الذي يُعتمد في الحساب قبل الإيداع.',
  'سجّلوا تاريخ التبليغ فور توصلكم به: هو الذي يحدد بداية أجل الطعن في أغلب الحالات.',
  'أودعوا قبل آخر يوم بيوم على الأقل، تحسباً لأي طارئ في كتابة الضبط.',
  'أجل الاستئناف في القضايا الاستعجالية أقصر من القضايا العادية: راجعوا نوع المسطرة.',
  'راجعوا الأجندة كل صباح: الجلسات والآجال تُحدَّث تلقائياً من محاكم.',
]

// Style de chaque type d'élément (discipline du signal : rouge ≤ 48 h, ambre ≤ 7 j, seulement pour « عليكم »)
function styleEv(it: Item): { cls: string; Icon: LucideIcon } {
  if (it.genre === 'fait') return { cls: 'ev fait', Icon: CheckCircle2 }
  if (it.genre === 'surveiller') return { cls: 'ev surv', Icon: Eye }
  if (it.genre === 'rdv') return { cls: 'ev rdv', Icon: CalendarCheck }
  if (it.genre === 'agir') { const j = joursRestants(it.date); return { cls: j <= 2 ? 'ev rouge' : j <= 7 ? 'ev ambre' : 'ev agir', Icon: Clock } }
  return { cls: new Date(it.date).getTime() < Date.now() - JOUR_MS / 2 ? 'ev aud passe' : 'ev aud', Icon: Scale }
}

const CSS = `
.cal-wd,.cal-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.cal-wd{background:#F7F5F0;border-bottom:1px solid #EEEAE1}
.cal-wd span{padding:12px 14px;font-size:14px;font-weight:600;color:#15201E}
.cal-wk{border-bottom:1px solid #EEEAE1}
.cal-wk:last-child{border-bottom:0}
.cal-d{min-height:106px;padding:10px 8px 8px;border-left:1px solid #EEEAE1;display:flex;flex-direction:column;align-items:stretch;gap:5px;min-width:0;box-sizing:border-box;cursor:pointer;position:relative;transition:background .15s}
.cal-d:last-child{border-left:0}
.cal-d:hover{background:#FAF8F4}
.cal-d b{align-self:flex-start;font-size:14px;font-weight:600;min-width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#15201E}
.cal-d.out b{color:#9A958B;font-weight:400}
.cal-d.today{background:#F1F8F5}
.cal-d.today b{background:#0E5A4E;color:#FFFFFF}
.cal-d.sel::after{content:'';position:absolute;inset:3px;border:2px solid var(--mp-choix-bord);border-radius:12px;pointer-events:none}
.cal-d:focus-visible{outline:none;box-shadow:inset 0 0 0 3px #CDE5DD}
.ev-wrap{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}
.ev{max-width:100%;box-sizing:border-box;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;line-height:1.3;border-radius:8px;padding:4px 8px;text-decoration:none;overflow:hidden;white-space:nowrap}
.ev span{overflow:hidden;text-overflow:ellipsis}
.ev svg{flex:none}
.ev-h{font-size:11px;color:#5E6B67}
.ev.aud{background:#EAF0F5;color:#22476A}
.ev.aud.passe,.ev.fait{background:#F1EFEA;color:#5E6B67}
.ev.agir{background:#F1F8F5;color:#0B4A40;border:1px solid #CDE5DD}
.ev.ambre{background:#FDF1DC;color:#7A4E06}
.ev.rouge{background:#FBEAE7;color:#9B2C20}
.ev.surv{background:#FFFFFF;color:#4D5B57;border:1px dashed #8C877C}
.ev.rdv{background:#E3F0EC;color:#0B4A40}
.cal-leg{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:#3B4A47}
.cal-leg span{display:inline-flex;align-items:center;gap:6px}
.cal-leg i{width:10px;height:10px;border-radius:50%;flex:none}
.cal-seg{display:inline-flex;background:#EEEAE1;border-radius:999px;padding:4px;gap:4px}
.cal-seg button{font-family:inherit;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px;background:transparent;color:#3B4A47;border:0;border-radius:999px;padding:0 14px;min-height:40px;cursor:pointer}
.cal-seg button[aria-selected="true"]{background:var(--mp-choix-fond);color:var(--mp-choix-texte);border-color:var(--mp-choix-bord);box-shadow:inset 0 0 0 1px var(--mp-choix-bord)}
.cal-cartes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}
.cal-carte{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:10px;min-width:0}
.cal-carte h2{margin:0;font-size:17px;font-weight:600;flex:1}
.cal-carte a.lien{font-size:14px;font-weight:600;color:#0E5A4E;text-decoration:none;display:inline-flex;align-items:center;gap:4px;min-height:36px}
.cal-mob{display:none}
@media (max-width: 760px){.cal-grid{display:none !important}.cal-mob{display:flex !important}.cal-illus{display:none !important}.cal-leg{display:none}}
@media (prefers-reduced-motion: reduce){.cal-d{transition:none}}
`
const BTN: React.CSSProperties = { fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 16px', minHeight: 44, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }
const ROND: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', border: '1px solid #E4E0D6', background: '#FFFFFF', color: '#15201E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

export default function CalendrierPage() {
  const { toast } = useToast()
  const { tribunalAr } = useTribunaux()
  const now = new Date()
  const [vue, setVue] = useState<Vue>('mois')
  const [annee, setAnnee] = useState(now.getFullYear())
  const [mois, setMois] = useState(now.getMonth())
  const [jourSel, setJourSel] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const [semaine, setSemaine] = useState(0) // décalage en semaines (vue semaine)
  const [form, setForm] = useState(false)
  const { data, error, refetch } = useApi<Mois>(`/calendrier/mois?annee=${annee}&mois=${mois + 1}`)
  const { masques, differer } = useActionAnnulable()
  const { data: dossiers } = useApi<Dossier[]>(form ? '/dossiers' : null)

  const items: Item[] = useMemo(() => {
    if (!data) return []
    return [
      ...data.audiences.map((a) => ({ id: `a${a.id}`, date: a.date, genre: 'audience' as const, court: 'جلسة', texte: `جلسة · ${tribunalAr(a.dossier.tribunal)}`, sous: a.dossier.titreAffaire ?? a.dossier.numeroDossier, dossierId: a.dossier.id })),
      ...data.echeances.map((e) => {
        const titre = e.titre.split(' - ')[0]
        const genre: Genre = e.estComplete ? 'fait' : e.camp === 'SURVEILLER' ? 'surveiller' : 'agir'
        return {
          id: `e${e.id}`, date: e.date, genre,
          court: genre === 'fait' ? 'منجز' : genre === 'surveiller' ? 'أجل الخصم' : 'آخر أجل',
          texte: genre === 'fait' ? `منجز · ${titre}` : genre === 'surveiller' ? `${titre} (الخصم)` : `آخر أجل · ${titre}`,
          sous: e.dossier.titreAffaire ?? e.dossier.numeroDossier, dossierId: e.dossier.id,
        }
      }),
      ...data.rendezVous.map((r) => ({ id: `r${r.id}`, rdvId: r.id, date: r.date, genre: 'rdv' as const, court: r.titre, texte: r.titre, sous: [r.lieu, r.dossier?.titreAffaire ?? r.dossier?.numeroDossier].filter(Boolean).join(' · '), dossierId: r.dossier?.id })),
    ].filter((x) => !masques.has(x.id)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data, tribunalAr, masques])

  const parJour = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const it of items) { const k = cle(it.date); m.set(k, [...(m.get(k) ?? []), it]) }
    return m
  }, [items])

  // Grille lundi → dimanche couvrant le mois
  const semaines = useMemo(() => {
    const premier = new Date(annee, mois, 1)
    const dernier = new Date(annee, mois + 1, 0)
    const d = new Date(annee, mois, 1 - ((premier.getDay() + 6) % 7)) // lundi de la 1re semaine
    const out: Date[][] = []
    while (d <= dernier) {
      out.push(Array.from({ length: 7 }, () => { const x = new Date(d); d.setDate(d.getDate() + 1); return x }))
    }
    return out
  }, [annee, mois])

  const changerMois = (delta: number) => {
    const d = new Date(annee, mois + delta, 1)
    setAnnee(d.getFullYear()); setMois(d.getMonth())
  }
  const allerAujourdhui = () => { setAnnee(now.getFullYear()); setMois(now.getMonth()); setJourSel(new Date(now.getFullYear(), now.getMonth(), now.getDate())); setSemaine(0) }

  // Vue semaine : 7 jours à partir du lundi courant (+ décalage)
  const lundi = useMemo(() => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + semaine * 7); return d }, [semaine]) // eslint-disable-line react-hooks/exhaustive-deps
  const joursSemaine = Array.from({ length: 7 }, (_, i) => new Date(lundi.getTime() + i * JOUR_MS))
  const allerSemaine = (delta: number) => {
    const s = semaine + delta
    setSemaine(s)
    const l = new Date(lundi.getTime() + delta * 7 * JOUR_MS)
    if (l.getMonth() !== mois || l.getFullYear() !== annee) { setAnnee(l.getFullYear()); setMois(l.getMonth()) }
  }

  const duJour = parJour.get(cle(jourSel)) ?? []
  const estAujourdhui = cle(jourSel) === cle(now)
  const conseil = CONSEILS[Math.floor(Date.now() / JOUR_MS) % CONSEILS.length]
  const aud = data?.prochains?.audience
  const delai = data?.prochains?.delai
  const jDelai = delai ? joursRestants(delai.date) : 0
  const couleurDelai = jDelai <= 2 ? '#9B2C20' : jDelai <= 7 ? '#7A4E06' : '#0B4A40'

  const { cle: envoi, lancer } = useEnvoi()
  const ajouterRdv = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const f = new FormData(ev.currentTarget)
    return lancer('rdv', () => enregistrerRdv(f))
  }
  const enregistrerRdv = async (f: FormData) => {
    const date = String(f.get('date')); const h = String(f.get('heure') || '09:00')
    try {
      await apiFetch('/calendrier/rendez-vous', { method: 'POST', body: JSON.stringify({
        titre: String(f.get('titre')), lieu: String(f.get('lieu') || '') || undefined,
        debut: new Date(`${date}T${h}:00`).toISOString(), dossierId: String(f.get('dossierId') || '') || undefined,
      }) })
      toast('أُضيف الموعد إلى الأجندة.', 'success')
      await refetch(); setForm(false)
    } catch { toast('تعذّر إضافة الموعد. تحققوا من الحقول.', 'error') }
  }
  const supprimerRdv = (id: string) => differer([`r${id}`], 'حُذف الموعد.', () => apiFetch(`/calendrier/rendez-vous/${id}`, { method: 'DELETE' }), refetch)

  // Pastille d'un élément dans la grille : icône + libellé court, heure dessous
  const Pastille = ({ it }: { it: Item }) => {
    const { cls, Icon } = styleEv(it)
    const h = hItem(it)
    return (
      <span className="ev-wrap">
        <Link href={it.dossierId ? `/dossiers/${it.dossierId}` : '#'} className={cls} title={`${it.texte} — ${it.sous}`} onClick={(e) => e.stopPropagation()}>
          <Icon size={13} strokeWidth={2} aria-hidden /><span>{it.court}</span>
        </Link>
        {h && <span className="ev-h num">{h}</span>}
      </span>
    )
  }

  const navPrec = vue === 'semaine' ? () => allerSemaine(-1) : () => changerMois(-1)
  const navSuiv = vue === 'semaine' ? () => allerSemaine(1) : () => changerMois(1)

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>

      {/* En-tête : titre + vues + action principale */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarDays size={28} strokeWidth={1.8} color="#0E5A4E" aria-hidden />الأجندة
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>الجلسات والآجال في مكان واحد، تُحدَّث من محاكم تلقائياً.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div className="cal-seg" role="tablist" aria-label="طريقة العرض">
            {([['mois', 'شهر', CalendarDays], ['semaine', 'أسبوع', CalendarRange], ['liste', 'قائمة', List]] as const).map(([k, l, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={vue === k} onClick={() => setVue(k)}><Icon size={16} strokeWidth={1.8} aria-hidden />{l}</button>
            ))}
          </div>
          <button className="mp-action" type="button" onClick={() => setForm(true)} style={{ ...BTN, gap: 8, fontSize: 15, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, padding: '0 20px', minHeight: 46 }}><Plus size={18} aria-hidden />إضافة موعد</button>
        </div>
      </div>

      {form && (
        <form onSubmit={ajouterRdv} style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600, gridColumn: '1 / -1' }}>الموعد<input name="titre" required minLength={2} placeholder="مثال: موعد مع موكل" style={INPUT} /></label>
          <label style={LBL}>التاريخ<input name="date" type="date" required defaultValue={`${jourSel.getFullYear()}-${String(jourSel.getMonth() + 1).padStart(2, '0')}-${String(jourSel.getDate()).padStart(2, '0')}`} style={INPUT} /></label>
          <label style={LBL}>الساعة<input name="heure" type="time" defaultValue="09:00" style={INPUT} /></label>
          <label style={LBL}>المكان <span style={{ fontWeight: 400, color: '#5E6B67' }}>(اختياري)</span><input name="lieu" style={INPUT} /></label>
          <label style={LBL}>الملف <span style={{ fontWeight: 400, color: '#5E6B67' }}>(اختياري)</span>
            <select name="dossierId" style={INPUT}><option value="">بدون ملف</option>{(dossiers ?? []).map((d) => <option key={d.id} value={d.id}>{d.titreAffaire ?? d.numeroDossier}</option>)}</select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="mp-action" type="submit" disabled={envoi === 'rdv'} aria-busy={envoi === 'rdv'} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0 }}><Attente actif={envoi === 'rdv'} texte="جارٍ الحفظ…">حفظ</Attente></button>
            <button type="button" onClick={() => setForm(false)} style={BTN}>إلغاء</button>
          </div>
        </form>
      )}

      {/* Calendrier */}
      <section aria-label={`${MOIS_AR[mois]} ${annee}`} style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 18, overflow: 'hidden', boxShadow: '0 10px 30px -24px rgba(8,59,52,.35)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" aria-label={vue === 'semaine' ? 'الأسبوع السابق' : 'الشهر السابق'} onClick={navPrec} style={ROND}><ChevronRight size={18} aria-hidden /></button>
            <h2 style={{ margin: '0 4px', fontSize: 19, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={18} strokeWidth={1.8} color="#0E5A4E" aria-hidden />
              {vue === 'semaine' ? <><span className="num">{fmtJM(joursSemaine[0])}</span> — <span className="num">{fmtJM(joursSemaine[6])}</span></> : <>{MOIS_AR[mois]} <span className="num">{annee}</span></>}
            </h2>
            <button type="button" aria-label={vue === 'semaine' ? 'الأسبوع التالي' : 'الشهر التالي'} onClick={navSuiv} style={ROND}><ChevronLeft size={18} aria-hidden /></button>
            <button type="button" onClick={allerAujourdhui} style={{ ...BTN, color: '#0E5A4E', minHeight: 40, marginInlineStart: 4 }}>اليوم</button>
          </div>
          <div className="cal-leg" aria-label="دليل الألوان">
            <span><i style={{ background: '#22476A' }} />جلسة</span>
            <span><i style={{ background: '#C0392B' }} />أجل عليكم ≤ <span className="num">48</span> س</span>
            <span><i style={{ background: '#F2A93B' }} />أجل عليكم ≤ <span className="num">7</span> أيام</span>
            <span><i style={{ background: '#FFFFFF', border: '1.5px dashed #8C877C' }} />أجل الخصم</span>
            <span><i style={{ background: '#2E8B6E' }} />موعد</span>
          </div>
        </div>

        {!data && error && <div style={{ padding: 16, borderTop: '1px solid #EEEAE1' }}><ErreurChargement quoi="الأجندة" onReessayer={refetch} /></div>}
        {vue === 'mois' && (
          <div className="cal-grid" role="grid" aria-label="أيام الشهر" style={{ borderTop: '1px solid #EEEAE1' }}>
            <div className="cal-wd" role="row">{ENTETES.map((j) => <span key={j} role="columnheader">{j}</span>)}</div>
            {semaines.map((sem, si) => (
              <div key={si} className="cal-wk" role="row">
                {sem.map((d) => {
                  const dansMois = d.getMonth() === mois
                  const it = parJour.get(cle(d)) ?? []
                  const cls = ['cal-d', !dansMois ? 'out' : '', cle(d) === cle(now) ? 'today' : '', cle(d) === cle(jourSel) ? 'sel' : ''].join(' ')
                  return (
                    <div key={cle(d)} className={cls} role="gridcell" tabIndex={0} aria-selected={cle(d) === cle(jourSel)} aria-current={cle(d) === cle(now) ? 'date' : undefined}
                      aria-label={`${JOURS[d.getDay()]} ${d.getDate()} ${MOIS_AR[d.getMonth()]}${it.length ? `، ${it.length} عناصر` : ''}`}
                      onClick={() => setJourSel(d)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setJourSel(d) } }}>
                      <b className="num">{d.getDate()}</b>
                      {it.slice(0, 2).map((x) => <Pastille key={x.id} it={x} />)}
                      {it.length > 2 && <span style={{ fontSize: 12, color: '#5E6B67', textAlign: 'center' }}>+<span className="num">{it.length - 2}</span></span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {vue === 'semaine' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', minHeight: 420, overflowX: 'auto', borderTop: '1px solid #EEEAE1' }}>
            {joursSemaine.map((d, i) => {
              const it = parJour.get(cle(d)) ?? []
              const auj = cle(d) === cle(now)
              return (
                <div key={i} style={{ borderLeft: i < 6 ? '1px solid #EEEAE1' : 0, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, background: auj ? '#F1F8F5' : '#FFFFFF' }}>
                  <span style={{ textAlign: 'center', fontSize: 12, color: '#3B4A47', padding: '6px 0', borderRadius: 10, background: auj ? '#0E5A4E' : '#F7F5F0', ...(auj ? { color: '#FFFFFF', fontWeight: 600 } : {}) }}>
                    <span className="num" style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{d.getDate()}</span>{ENTETES[(d.getDay() + 6) % 7]}
                  </span>
                  {it.length === 0 ? <span style={{ fontSize: 12, color: '#6B665C', textAlign: 'center' }}>—</span> : it.map((x) => {
                    const { cls, Icon } = styleEv(x)
                    return (
                      <Link key={x.id} href={x.dossierId ? `/dossiers/${x.dossierId}` : '#'} className={cls} style={{ whiteSpace: 'normal', alignItems: 'flex-start', display: 'flex' }}>
                        <Icon size={13} strokeWidth={2} aria-hidden style={{ marginTop: 2 }} />
                        <span style={{ display: 'flex', flexDirection: 'column' }}>
                          {hItem(x) && <span className="num">{hItem(x)}</span>}{x.texte}<span style={{ fontWeight: 400, opacity: 0.85 }}>{x.sous}</span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {(vue === 'liste' || vue === 'mois') && (() => {
          const debutAuj = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
          const liste = items.filter((x) => new Date(x.date).getMonth() === mois && (vue === 'liste' || new Date(x.date).getTime() >= debutAuj))
          return (
            <ol className={vue === 'mois' ? 'cal-mob' : ''} aria-label="مواعيد الشهر" style={{ listStyle: 'none', margin: 0, padding: '4px 16px 16px', borderTop: '1px solid #EEEAE1', display: vue === 'liste' ? 'flex' : undefined, flexDirection: 'column', gap: 4 }}>
              {liste.length === 0 && <li><EtatVide Icon={CalendarDays} texte="لا مواعيد في هذه الفترة." /></li>}
              {liste.map((x, i) => {
                const { cls, Icon } = styleEv(x)
                return (
                  <li key={x.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < liste.length - 1 ? '1px solid #EEEAE1' : 0 }}>
                    <span style={{ flex: 'none', width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span className="num" style={{ fontWeight: 700, fontSize: 15 }}>{fmtJM(x.date)}</span>
                      {hItem(x) && <span className="num" style={{ fontSize: 12, color: '#5E6B67' }}>{hItem(x)}</span>}
                    </span>
                    <span className={cls} aria-hidden style={{ padding: 6, flex: 'none' }}><Icon size={16} strokeWidth={2} /></span>
                    <Link href={x.dossierId ? `/dossiers/${x.dossierId}` : '#'} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none', color: '#15201E' }}>
                      <span style={{ fontSize: 14, fontWeight: x.genre === 'agir' ? 600 : 400 }}>{x.texte}</span>
                      {x.sous && <span style={{ fontSize: 12, color: '#5E6B67' }}>{x.sous}</span>}
                    </Link>
                    {x.rdvId && <button type="button" aria-label="حذف الموعد" onClick={() => supprimerRdv(x.rdvId!)} style={{ ...ROND, width: 36, height: 36 }}><X size={14} aria-hidden /></button>}
                  </li>
                )
              })}
            </ol>
          )
        })()}
      </section>

      {/* Cartes : prochaine audience, délai le plus proche, jour sélectionné */}
      <div className="cal-cartes">
        <section className="cal-carte" aria-labelledby="c-aud">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 id="c-aud">الجلسة القادمة</h2>
            <IconeRonde Icon={Scale} ton="bleu" taille={40} />
          </div>
          {aud ? (
            <>
              <strong style={{ fontSize: 16, fontWeight: 600 }}>{JOURS[new Date(aud.date).getDay()]} {dateLongue(aud.date)}</strong>
              <span style={{ fontSize: 15 }}>ملف رقم <span className="num">{aud.dossier.numeroDossier}</span></span>
              <span style={{ fontSize: 14, color: '#3B4A47' }}>{aud.dossier.titreAffaire ? `${aud.dossier.titreAffaire} · ` : ''}{tribunalAr(aud.dossier.tribunal)}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#22476A' }}>
                  <Clock size={15} aria-hidden />{heure(aud.date) ? <span className="num">{heure(aud.date)}</span> : 'الساعة غير محددة'}
                </span>
                <Link href={`/dossiers/${aud.dossier.id}`} className="lien">فتح الملف<ChevronLeft size={16} aria-hidden /></Link>
              </div>
            </>
          ) : <EtatVide Icon={Scale} texte="لا جلسة مبرمجة حالياً." />}
        </section>

        <section className="cal-carte" aria-labelledby="c-delai">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 id="c-delai">أقرب أجل عليكم</h2>
            <IconeRonde Icon={Clock} taille={40} />
          </div>
          {delai ? (
            <>
              <strong style={{ fontSize: 16, fontWeight: 600, color: couleurDelai }}>{JOURS[new Date(delai.date).getDay()]} {dateLongue(delai.date)}</strong>
              <span style={{ fontSize: 15 }}>ملف رقم <span className="num">{delai.dossier.numeroDossier}</span></span>
              <span style={{ fontSize: 14, color: '#3B4A47' }}>{delai.titre.split(' - ')[0]}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: couleurDelai }}>
                  {jDelai <= 0 ? 'آخر يوم: اليوم' : <>بعد <span className="num">{jDelai}</span> {unitJours(jDelai)}</>}
                </span>
                <Link href="/echeances" className="lien">كل الآجال<ChevronLeft size={16} aria-hidden /></Link>
              </div>
            </>
          ) : <EtatVide Icon={CheckCircle2} texte="لا أجل مفتوح عليكم." />}
        </section>

        <section className="cal-carte" aria-labelledby="c-jour">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 id="c-jour">{estAujourdhui ? 'اليوم' : JOURS[jourSel.getDay()]} · <span className="num">{fmtJM(jourSel)}</span></h2>
            <IconeRonde Icon={ListChecks} taille={40} />
          </div>
          {duJour.length === 0 ? (
            <EtatVide Icon={CalendarDays} texte="لا جلسة ولا أجل في هذا اليوم." action={<button type="button" onClick={() => setForm(true)} style={{ ...BTN, minHeight: 40, color: '#0E5A4E' }}><Plus size={16} aria-hidden />إضافة موعد</button>} />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {duJour.map((x) => {
                const { cls, Icon } = styleEv(x)
                return (
                  <li key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={cls} aria-hidden style={{ padding: 6, flex: 'none' }}><Icon size={14} strokeWidth={2} /></span>
                    <Link href={x.dossierId ? `/dossiers/${x.dossierId}` : '#'} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: '#15201E' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.texte}</span>
                      {x.sous && <span style={{ fontSize: 12, color: '#5E6B67', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.sous}</span>}
                    </Link>
                    {hItem(x) && <span className="num" style={{ fontSize: 13, color: '#3B4A47', flex: 'none' }}>{hItem(x)}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Conseil du jour */}
      <section aria-label="معلومة اليوم" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(90deg, #E3F0EC, #F1F8F5)', border: '1px solid #CDE5DD', borderRadius: 16, padding: '14px 20px' }}>
        <IconeRonde Icon={Lightbulb} ton="vert" taille={42} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong style={{ fontSize: 16, fontWeight: 600, color: '#0B4A40' }}>معلومة اليوم</strong>
          <span style={{ fontSize: 14, color: '#23443C', lineHeight: 1.7 }}>{conseil}</span>
        </div>
        <span className="cal-illus" style={{ flex: 'none', display: 'inline-flex' }}><IllusCalendrier taille={84} /></span>
      </section>
    </div>
  )
}

const INPUT: React.CSSProperties = { fontSize: 15, color: '#15201E', background: '#FFFFFF', border: '1px solid #CFCAC0', borderRadius: 10, minHeight: 46, padding: '0 12px', boxSizing: 'border-box', width: '100%' }
const LBL: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }
