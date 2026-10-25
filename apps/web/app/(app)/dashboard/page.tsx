'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, FileText, Plus, Send, FolderOpen, Scale, BellRing, FileClock, ChevronLeft, CalendarDays, Newspaper, Sparkles, CalendarRange } from 'lucide-react'
import { IconeRonde, IllusCalendrier, IllusBouclier, EtatVide } from '@/components/ui/Visuels'
import type { AbonnementCourant } from '@/lib/abonnement'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useTribunaux } from '@/hooks/useTribunaux'
import {
  EcheanceItem, CountdownBadge, joursRestants, tone, fmtDate, fmtJM, jourSemaine, heure, titreDelai,
  useCompleteWithUndo, lienRediger, roleTexte, adversaire, EyeIcon, BTN, JOUR_MS,
} from '@/components/legal/DeadlineCard'
import { StatsCabinet } from '@/components/legal/StatsCabinet'
import { SquelettePage, ErreurChargement } from '@/components/ui/Chargement'

interface Overview { kpi: { dossiersActifs: number; nouveauxCeMois: number; audiencesSemaine: number; alertesNonLues: number; dossiersNonLus: number; dossiersDormants: number } }
interface Dossier { id: string; numeroDossier: string; tribunal: string; titreAffaire?: string | null; updatedAt: string; dernierEvenement?: { texteArabe: string; datePublicationGreffe: string | null } | null }
interface Semaine { items: { id: string; type: 'audience' | 'echeance'; date: string; titre: string; numeroDossier: string; tribunal: string; titreAffaire: string | null; dossierId: string }[] }
interface Alerte { dossierId: string | null; luAt: string | null }
interface Sync { derniereVerif: string | null }

const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16 }
const BLEU = '#22476A' // audiences (maquette)
const JOURS_COURTS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const salut = () => (new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير')
const minutesDepuis = (d: string) => Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000))
const debutJour = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

const CSS = `
.tl-mob{display:none}
.mp-news:hover{background:#FAF8F3}
.mp-kpi{transition:box-shadow .15s,transform .15s}.mp-kpi:hover{box-shadow:0 12px 28px -18px rgba(8,59,52,.45);transform:translateY(-1px)}
@media (max-width: 760px){.tl-desk{display:none !important}.tl-mob{display:flex !important}.kbd{display:none !important}.mp-hero{padding:18px !important}}
`

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { tribunalAr, map: tribunauxMap } = useTribunaux()
  const { data: ov } = useApi<Overview>('/dashboard/overview')
  const { data: echeances, loading: loadingEch, error: erreurEch, refetch } = useApi<EcheanceItem[]>('/echeances')
  const { data: semaine } = useApi<Semaine>('/calendrier/semaine?offset=0')
  const { data: semaineSuiv } = useApi<Semaine>('/calendrier/semaine?offset=1')
  // Derniers mouvements : 4 dossiers seulement, triés en base (pas tout le portefeuille)
  const { data: recentsPage } = useApi<{ items: Dossier[] }>('/dossiers/liste?tri=recent&taille=4&avecActe=1')
  const dossiers = recentsPage?.items
  const { data: alertes } = useApi<Alerte[]>('/alertes')
  const { data: sync } = useApi<Sync>('/dossiers/sync-statut')
  const { hidden, complete } = useCompleteWithUndo(refetch)
  const { data: abo } = useApi<AbonnementCourant>(user && user.role !== 'ADMIN' ? '/abonnements/current' : null)


  const tous = (echeances ?? []).filter((e) => !hidden.has(e.id))
  const aAgir = tous.filter((e) => e.camp !== 'SURVEILLER')
  const aSurveiller = tous.filter((e) => e.camp === 'SURVEILLER')
  const [first, ...rest] = aAgir
  const sous7 = aAgir.filter((e) => joursRestants(e.dateLimite) <= 7).length
  const audiences = [...(semaine?.items ?? []), ...(semaineSuiv?.items ?? [])].filter((i) => i.type === 'audience')
  const audiencesSemaine = (semaine?.items ?? []).filter((i) => i.type === 'audience')

  const nonLus = useMemo(() => new Set((alertes ?? []).filter((a) => !a.luAt && a.dossierId).map((a) => a.dossierId!)), [alertes])
  const derniers = useMemo(() =>
    [...(dossiers ?? [])].filter((d) => d.dernierEvenement)
      .sort((a, b) => new Date(b.dernierEvenement!.datePublicationGreffe ?? b.updatedAt).getTime() - new Date(a.dernierEvenement!.datePublicationGreffe ?? a.updatedAt).getTime())
      .slice(0, 4),
  [dossiers])
  const tribunauxLabels = useMemo(() => Object.fromEntries(Object.entries(tribunauxMap || {}).map(([c, i]: any) => [c, i.nomAr])), [tribunauxMap])

  // Frise « الأسبوعان القادمان » : 14 colonnes à partir d'aujourd'hui
  const j0 = debutJour()
  const jours14 = Array.from({ length: 14 }, (_, i) => new Date(j0.getTime() + i * JOUR_MS))
  const col = (d: string) => Math.floor((debutJour(new Date(d)).getTime() - j0.getTime()) / JOUR_MS) // 0..13
  const lignesFrise = tous.filter((e) => { const c = col(e.dateLimite); return c >= 0 && c < 14 })
  const audiencesFrise = audiences.filter((a) => { const c = col(a.date); return c >= 0 && c < 14 })
  const listeMobile = [
    ...lignesFrise.map((e) => ({ date: e.dateLimite, k: e.id, couleur: e.camp === 'SURVEILLER' ? '#4D5B57' : tone(joursRestants(e.dateLimite)).bg, titre: `${e.camp === 'SURVEILLER' ? 'على الخصم' : 'عليكم'} · ${titreDelai(e)}`, sous: e.dossier.titreAffaire || e.dossier.numeroDossier })),
    ...audiencesFrise.map((a) => ({ date: a.date, k: a.id, couleur: BLEU, titre: `جلسة${heure(a.date) ? ` ${heure(a.date)}` : ''} · ${tribunalAr(a.tribunal)}`, sous: a.titreAffaire || a.numeroDossier })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 6)

  // Premier chargement sans rien en cache : squelette à la forme de la page (pas de valeurs vides)
  if (!ov && loadingEch) return <SquelettePage />

  const kpis = [
    { Icon: FolderOpen, ton: 'menthe' as const, href: '/dossiers', label: 'ملفات قيد المتابعة', value: ov?.kpi.dossiersActifs, note: <><span className="num">+{ov?.kpi.nouveauxCeMois ?? 0}</span> هذا الشهر</> },
    { Icon: Scale, ton: 'vert' as const, href: '/calendrier', label: 'جلسات هذا الأسبوع', value: semaine ? audiencesSemaine.length : undefined, note: audiencesSemaine[0] ? <>الأقرب {jourSemaine(audiencesSemaine[0].date)} <span className="num">{heure(audiencesSemaine[0].date) || fmtJM(audiencesSemaine[0].date)}</span></> : 'لا جلسة قادمة' },
    { Icon: BellRing, ton: 'bleu' as const, href: '/alertes', label: 'مستجدات غير مقروءة', value: ov?.kpi.alertesNonLues, note: <>في <span className="num">{ov?.kpi.dossiersNonLus ?? 0}</span> ملفات</> },
    { Icon: FileClock, ton: 'ardoise' as const, href: '/dossiers', label: 'ملفات بلا حركة', value: ov?.kpi.dossiersDormants, note: <>منذ أكثر من <span className="num">90</span> يوماً</> },
  ]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{CSS}</style>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>{salut()}، الأستاذ {user?.nom}</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.6 }}>
            {loadingEch ? 'جارٍ تحميل آجالكم…' : <>
              {sous7 > 0 ? <><span className="num">{sous7}</span> {sous7 === 1 ? 'أجل' : 'آجال'} عليكم هذا الأسبوع</> : 'لا أجل عاجل عليكم هذا الأسبوع'}
              {aSurveiller.length > 0 && <>، و<span className="num">{aSurveiller.length}</span> {aSurveiller.length === 1 ? 'أجل للخصم' : 'آجال للخصم'} تحت المراقبة</>}.
            </>}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <Link className="mp-action" href="/dossiers?ajouter=1" style={{ ...BTN, gap: 8, fontSize: 15, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, padding: '0 20px', minHeight: 46 }}><Plus size={18} aria-hidden />إضافة ملف</Link>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5E6B67' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E8B6E' }} />
            {jourSemaine(new Date())} <span className="num">{fmtDate(new Date())}</span>
            {sync?.derniereVerif && <> · مزامنة محاكم قبل <span className="num">{minutesDepuis(sync.derniereVerif) < 120 ? minutesDepuis(sync.derniereVerif) : Math.round(minutesDepuis(sync.derniereVerif) / 60)}</span> {minutesDepuis(sync.derniereVerif) < 120 ? 'دقيقة' : 'ساعة'}</>}
          </span>
        </div>
      </div>

      {first ? (
        <section className="mp-hero" aria-label="عليكم: أقرب أجل" style={{ background: '#083B34', color: '#E3F0EC', borderRadius: 20, padding: '24px 26px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' }}>
          <div style={{ flex: '2 1 380px', minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
            <CountdownBadge j={joursRestants(first.dateLimite)} size={104} onDark />
            <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F3EE', display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: '#F5F3EE', color: '#083B34', borderRadius: 999, padding: '2px 10px' }}>عليكم</span>
                ينتهي {jourSemaine(first.dateLimite)} <span className="num">{fmtDate(first.dateLimite)}</span>
              </span>
              <strong style={{ fontSize: 23, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.35 }}>{titreDelai(first)}</strong>
              <span style={{ fontSize: 15, color: '#CFE5DD', lineHeight: 1.6 }}>
                <span className="num">{first.dossier.numeroDossier}</span>{first.dossier.titreAffaire ? ` · ${first.dossier.titreAffaire}` : ` · ${tribunalAr(first.dossier.tribunal)}`}{roleTexte(first.dossier.roleClient) ? ` · ${roleTexte(first.dossier.roleClient)}` : ''}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                <Link href={lienRediger(first)} style={{ ...BTN, gap: 8, fontSize: 15, background: '#F5F3EE', color: '#083B34', border: 0, padding: '0 18px' }}><FileText size={18} aria-hidden />تحرير المقال</Link>
                <button type="button" onClick={() => complete(first)} style={{ ...BTN, gap: 8, fontSize: 15, background: 'transparent', color: '#FFFFFF', border: '1px solid #6E9C90', padding: '0 18px' }}><Check size={18} aria-hidden />تم الإيداع</button>
              </div>
            </div>
          </div>
          {rest.length > 0 && (
            <div style={{ flex: '1 1 240px', minWidth: 0, borderTop: '1px solid #1F5A4E', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, alignSelf: 'flex-end' }}>
              <span style={{ fontSize: 13, color: '#9FC9BE' }}>التالي عليكم</span>
              {rest.slice(0, 2).map((e) => {
                const j = joursRestants(e.dateLimite)
                const t = tone(j)
                return (
                  <Link key={e.id} href="/echeances" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                    <span className="num" style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: j <= 7 ? t.bg : '#0B4A40', color: j <= 7 ? t.fg : '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{j}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 600 }}>{titreDelai(e)} · {jourSemaine(e.dateLimite)} <span className="num">{fmtJM(e.dateLimite)}</span></span>
                      <span style={{ fontSize: 13, color: '#9FC9BE' }}><span className="num">{e.dossier.numeroDossier}</span>{e.dossier.titreAffaire ? ` · ${e.dossier.titreAffaire.split(/\s+[—-]\s+/)[0]}` : ''}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      ) : !echeances && erreurEch ? (
        // Jamais « لا أجل عليكم » quand les délais n'ont pas pu être chargés
        <ErreurChargement quoi="آجالكم" onReessayer={refetch} />
      ) : !loadingEch && echeances && (
        <section style={{ background: '#F1F8F5', border: '1px solid #CDE5DD', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, color: '#0B4A40', fontWeight: 500 }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#0E5A4E', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Check size={18} aria-hidden /></span>
          لا أجل عليكم حالياً. سننبهكم فور تسجيل أي تبليغ أو حكم.
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="mp-kpi" style={{ ...CARD, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: '#15201E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#5E6B67' }}>{k.label}</span>
                <span className="num" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1, textAlign: 'right' }}>{k.value ?? '—'}</span>
              </span>
              <IconeRonde Icon={k.Icon} ton={k.ton} taille={48} />
            </div>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#3B4A47' }}>
              <span>{k.note}</span><ChevronLeft size={16} color="#8C877C" aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          <section style={{ ...CARD, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={CalendarRange} taille={36} />الأسبوعان القادمان</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#3B4A47' }}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 18, height: 4, borderRadius: 2, background: '#C0392B' }} />عليكم ≤ يومان</span>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 18, height: 4, borderRadius: 2, background: '#F2A93B' }} />عليكم ≤ <span className="num">7</span> أيام</span>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 18, borderTop: '2px dashed #4D5B57' }} />على الخصم</span>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: BLEU }} />جلسة</span>
              </div>
            </div>
            {lignesFrise.length === 0 && audiencesFrise.length === 0 ? (
              <EtatVide Icon={CalendarDays} texte="لا آجال ولا جلسات خلال الأسبوعين القادمين." />
            ) : (
              <>
                <div className="tl-desk" style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 820, display: 'grid', gridTemplateColumns: '170px repeat(14, minmax(0, 1fr))', rowGap: 6, fontSize: 13 }}>
                    <span />
                    {jours14.map((d, i) => {
                      const we = d.getDay() === 0 || d.getDay() === 6
                      return (
                        <span key={i} style={{ textAlign: 'center', fontSize: 12, padding: '4px 0', borderRadius: 8, ...(i === 0 ? { color: '#FFFFFF', background: '#15201E', fontWeight: 600 } : we ? { color: '#6B665C', background: '#F5F3EE' } : { color: '#3B4A47' }) }}>
                          <span className="num" style={{ display: 'block', fontSize: 14 }}>{d.getDate()}</span>{JOURS_COURTS[d.getDay()]}
                        </span>
                      )
                    })}
                    {lignesFrise.map((e) => {
                      const c = col(e.dateLimite)
                      const watch = e.camp === 'SURVEILLER'
                      const couleur = watch ? '#4D5B57' : joursRestants(e.dateLimite) > 7 ? '#0E5A4E' : tone(joursRestants(e.dateLimite)).bg
                      const halo = joursRestants(e.dateLimite) <= 2 ? '#F7DCD8' : '#FBE3BC'
                      return [
                        <Link key={`l${e.id}`} href={e.dossier.id ? `/dossiers/${e.dossier.id}` : '/echeances'} style={{ gridColumn: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: '1px solid #EEEAE1', padding: '10px 0', textDecoration: 'none', color: watch ? '#4D5B57' : '#15201E' }}>
                          <strong style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watch ? `${titreDelai(e).split(' - ')[0]} الخصم` : titreDelai(e).split(' - ')[0]}</strong>
                          <span className="num" style={{ fontSize: 12, color: watch ? '#4D5B57' : '#5E6B67', textAlign: 'right' }}>{e.dossier.numeroDossier}</span>
                        </Link>,
                        <div key={`b${e.id}`} style={{ gridColumn: `2 / span ${c + 1}`, display: 'flex', alignItems: 'center', borderTop: '1px solid #EEEAE1', padding: '10px 6px' }}>
                          {watch ? <>
                            <span style={{ flex: 1, borderTop: '2px dashed #4D5B57' }} />
                            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #4D5B57', boxSizing: 'border-box', background: '#FFFFFF' }} />
                          </> : <>
                            <span style={{ flex: 1, height: 4, borderRadius: 2, background: couleur }} />
                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: couleur, boxShadow: `0 0 0 3px ${halo}` }} />
                          </>}
                        </div>,
                        c < 13 ? <span key={`r${e.id}`} style={{ gridColumn: `${c + 3} / span ${13 - c}`, borderTop: '1px solid #EEEAE1' }} /> : null,
                      ]
                    })}
                    {audiencesFrise.length > 0 && <>
                      <span style={{ gridColumn: 1, display: 'flex', alignItems: 'center', borderTop: '1px solid #EEEAE1', padding: '10px 0', fontWeight: 600, color: BLEU }}>الجلسات</span>
                      {jours14.map((d, i) => {
                        const a = audiencesFrise.find((x) => col(x.date) === i)
                        return (
                          <div key={i} style={{ gridColumn: i + 2, borderTop: '1px solid #EEEAE1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: a ? '10px 0' : 0 }}>
                            {a && <Link href={`/dossiers/${a.dossierId}`} aria-label={`جلسة ${fmtJM(a.date)}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                              <span style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: BLEU }} />
                              {heure(a.date) && <span className="num" style={{ fontSize: 12, color: BLEU }}>{heure(a.date)}</span>}
                            </Link>}
                          </div>
                        )
                      })}
                    </>}
                  </div>
                </div>
                <ol className="tl-mob" aria-label="الآجال والجلسات يوماً بيوم" style={{ listStyle: 'none', margin: 0, padding: 0, flexDirection: 'column', gap: 10 }}>
                  {listeMobile.map((x) => (
                    <li key={x.k} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ flex: 'none', width: 56, textAlign: 'center', fontSize: 12, color: '#3B4A47' }}><span className="num" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#15201E' }}>{new Date(x.date).getDate()}</span>{JOURS_COURTS[new Date(x.date).getDay()]}</span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, borderRight: `4px solid ${x.couleur}`, paddingRight: 10 }}>
                        <strong style={{ fontSize: 14, fontWeight: 600 }}>{x.titre}</strong>
                        <span style={{ fontSize: 12, color: '#3B4A47' }}>{x.sous}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <section style={{ ...CARD, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px 12px' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Newspaper} taille={36} />آخر المستجدات من محاكم</h2>
              <Link href="/alertes" style={{ fontSize: 14, fontWeight: 600, padding: '10px 0', textDecoration: 'none' }}>كل المستجدات</Link>
            </div>
            {derniers.length === 0 ? (
              <div style={{ borderTop: '1px solid #EEEAE1' }}><EtatVide Icon={FileText} texte="لا مستجدات بعد. أضيفوا ملفاً لبدء المتابعة." action={<Link href="/dossiers?ajouter=1" style={{ fontWeight: 600, fontSize: 14 }}>إضافة ملف</Link>} /></div>
            ) : derniers.map((d, i) => {
              const nouveau = nonLus.has(d.id)
              return (
                <Link key={d.id} className="mp-news" href={`/dossiers/${d.id}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '6px 14px', padding: i === derniers.length - 1 ? '14px 22px 18px' : '14px 22px', borderTop: '1px solid #EEEAE1', color: '#15201E', textDecoration: 'none', borderRadius: i === derniers.length - 1 ? '0 0 16px 16px' : 0 }}>
                  <span aria-hidden style={{ flex: 'none', width: 10, height: 10, borderRadius: '50%', background: nouveau ? '#0E5A4E' : '#CFCAC0', marginTop: 8 }} />
                  <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {nouveau ? <strong style={{ fontSize: 15, fontWeight: 600 }}>{d.dernierEvenement!.texteArabe}</strong> : <span style={{ fontSize: 15 }}>{d.dernierEvenement!.texteArabe}</span>}
                    <span style={{ fontSize: 13, color: '#5E6B67' }}>{d.titreAffaire || 'ملف'} · {tribunalAr(d.tribunal)}</span>
                  </div>
                  <span style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: '#5E6B67' }}>
                    <span className="num" style={{ fontSize: 12, fontWeight: 600, color: '#15201E', background: '#F5F3EE', border: '1px solid #E4E0D6', borderRadius: 8, padding: '3px 8px' }}>{d.numeroDossier}</span>
                    {d.dernierEvenement!.datePublicationGreffe && <span className="num">{fmtJM(d.dernierEvenement!.datePublicationGreffe)}</span>}
                  </span>
                </Link>
              )
            })}
          </section>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {aSurveiller.length > 0 && (
            <section aria-label="تحت المراقبة" style={{ background: '#FFFFFF', border: '1.5px dashed #8C877C', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><EyeIcon size={20} />تحت المراقبة · آجال الخصم</h2>
              {aSurveiller.slice(0, 3).map((e, i) => {
                const adv = adversaire(e.dossier.titreAffaire, e.dossier.roleClient)
                const j = joursRestants(e.dateLimite)
                return (
                  <Link key={e.id} href={e.dossier.id ? `/dossiers/${e.dossier.id}` : '/echeances'} style={{ display: 'flex', flexDirection: 'column', gap: 4, textDecoration: 'none', color: '#15201E', ...(i > 0 ? { borderTop: '1px solid #EEEAE1', paddingTop: 12 } : {}) }}>
                    <strong style={{ fontSize: 15, fontWeight: 600 }}>{titreDelai(e).split(' - ')[0]}{adv ? ` ${adv}` : ' الخصم'} · {i === 0 ? <>ينتهي {jourSemaine(e.dateLimite)} </> : null}<span className="num">{fmtJM(e.dateLimite)}</span></strong>
                    <span style={{ fontSize: 13, color: '#3B4A47', lineHeight: 1.6 }}>
                      {i === 0 && e.typeDelai === 'OPPOSITION' ? 'إن انتهى دون تعرّض، يصبح الحكم قابلاً للتنفيذ وننبهكم فوراً.'
                        : <><span className="num">{e.dossier.numeroDossier}</span> · <span className="num">{Math.max(0, j)}</span> {j === 1 ? 'يوم متبقٍّ' : 'يوماً متبقية'}</>}
                    </span>
                  </Link>
                )
              })}
            </section>
          )}

          <section style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0E5A4E,#083B34)', color: '#E3F0EC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>جلسات الأسبوع</h2>
                <span style={{ fontSize: 13, color: '#9FC9BE' }}>{audiencesSemaine.length === 0 ? 'لا جلسات قادمة هذا الأسبوع.' : <><span className="num">{audiencesSemaine.length}</span> {audiencesSemaine.length === 1 ? 'جلسة' : 'جلسات'}</>}</span>
              </div>
              <IllusCalendrier taille={audiencesSemaine.length ? 64 : 92} />
            </div>
            {audiencesSemaine.slice(0, 4).map((a, i) => (
              <Link key={a.id} href={`/dossiers/${a.dossierId}`} style={{ display: 'flex', gap: 14, alignItems: 'center', textDecoration: 'none', color: '#FFFFFF' }}>
                <div style={{ flex: 'none', width: 56, borderRadius: 12, textAlign: 'center', padding: '6px 0', ...(i === 0 ? { background: '#FFFFFF', color: '#083B34' } : { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)' }) }}>
                  <span style={{ display: 'block', fontSize: 12 }}>{jourSemaine(a.date)}</span>
                  <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{new Date(a.date).getDate()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <strong style={{ fontSize: 15, fontWeight: 600 }}>{heure(a.date) && <><span className="num">{heure(a.date)}</span> · </>}{tribunalAr(a.tribunal)}</strong>
                  <span style={{ fontSize: 13, color: '#CFE5DD' }}>{a.titreAffaire || <span className="num">{a.numeroDossier}</span>}</span>
                </div>
              </Link>
            ))}
            <Link href="/calendrier" style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 600, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36 }}>الأجندة <ChevronLeft size={16} aria-hidden /></Link>
          </section>

          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const q = new FormData(ev.currentTarget).get('q')?.toString().trim()
              router.push(q ? `/assistant?q=${encodeURIComponent(q)}` : '/assistant')
            }}
            style={{ background: '#E3F0EC', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Sparkles} ton="vert" taille={36} />اسألوا المساعد القانوني</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #C9DED6', borderRadius: 12, padding: '6px 6px 6px 12px' }}>
              <span className="sr-only-ar">سؤالكم</span>
              <input name="q" type="text" placeholder="مثال: ما أجل الطعن بالنقض؟" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, fontSize: 14, padding: '8px 6px', background: 'transparent' }} />
              <button className="mp-action" type="submit" aria-label="إرسال" style={{ width: 44, height: 44, borderRadius: 10, border: 0, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Send size={18} aria-hidden style={{ transform: 'scaleX(-1)' }} />
              </button>
            </label>
            <span style={{ fontSize: 13, color: '#23443C' }}>يذكر القانون والفصل مع كل جواب.</span>
          </form>

          {abo?.abonnement?.etat === 'ESSAI' && !abo.abonnement.estFondateur && (
            <section style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0E5A4E,#083B34)', color: '#E3F0EC', borderRadius: 16, padding: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,.12)', borderRadius: 999, padding: '3px 10px' }}>فترة مجانية</span>
                <strong style={{ fontSize: 17, fontWeight: 600, color: '#FFFFFF' }}>كونوا من الأعضاء المؤسسين</strong>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>سعر ثابت مدى الحياة ومرافقة شخصية.</span>
                <Link href="/abonnement" style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#083B34', borderRadius: 999, padding: '0 16px', minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 4 }}>اعرفوا أكثر <ChevronLeft size={16} aria-hidden /></Link>
              </div>
              <IllusBouclier taille={96} />
            </section>
          )}
        </div>
      </div>

      <StatsCabinet tribunauxLabels={tribunauxLabels} />
    </div>
  )
}
