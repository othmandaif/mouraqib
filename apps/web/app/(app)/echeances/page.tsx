'use client'

import { useState } from 'react'
import { IconeRonde, EtatVide } from '@/components/ui/Visuels'
import { Calculator } from 'lucide-react'
import Link from 'next/link'
import { Check, Eye } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useTribunaux } from '@/hooks/useTribunaux'
import { useToast } from '@/components/Toast'
import { SqueletteCartes, Nombre, ErreurChargement, DepuisSynchro, useEnvoi } from '@/components/ui/Chargement'
import {
  DeadlineCard, WatchRow, EcheanceItem, EyeIcon, joursRestants, useCompleteWithUndo, fmtJM, heure, titreDelai, adversaire, lireTitre,
} from '@/components/legal/DeadlineCard'

type Onglet = 'agir' | 'surveiller' | 'faits'
const SEG: React.CSSProperties = { fontFamily: 'inherit', fontSize: 15, fontWeight: 600, background: 'transparent', color: '#3B4A47', border: 0, borderRadius: 999, padding: '0 18px', minHeight: 42, cursor: 'pointer' }
const SEG_ON: React.CSSProperties = { ...SEG, background: '#FFFFFF', color: '#15201E', boxShadow: '0 1px 2px rgba(8,59,52,.12)' }
const nomCourt = (e: EcheanceItem) => lireTitre(e.dossier.titreAffaire).demandeur.split(' ').slice(0, 2).join(' ') || e.dossier.numeroDossier

export default function EcheancesPage() {
  const { toast } = useToast()
  const { tribunalAr } = useTribunaux()
  const [onglet, setOnglet] = useState<Onglet>('agir')
  const { data: actives, loading, error, refetch } = useApi<EcheanceItem[]>('/echeances')
  const { data: faits, refetch: refetchFaits } = useApi<EcheanceItem[]>('/echeances?statut=completees')
  const { data: expirees } = useApi<EcheanceItem[]>('/echeances?statut=expirees')
  const { data: sync } = useApi<{ derniereVerif: string | null }>('/dossiers/sync-statut')
  const toutRafraichir = () => { refetch(); refetchFaits() }
  const { hidden, complete, rouvrir } = useCompleteWithUndo(toutRafraichir)
  const { cle, lancer } = useEnvoi()

  const items = (actives ?? []).filter((e) => !hidden.has(e.id))
  const aAgir = items.filter((e) => e.camp !== 'SURVEILLER')
  const aSurveiller = items.filter((e) => e.camp === 'SURVEILLER')
  const advExpires = (expirees ?? []).filter((e) => e.camp === 'SURVEILLER')
  const groupes = [
    { k: 'h48', titre: <>خلال <span className="num">48</span> ساعة</>, couleur: '#9B2C20', l: aAgir.filter((e) => joursRestants(e.dateLimite) <= 2) },
    { k: 'sem', titre: 'هذا الأسبوع', couleur: '#7A4E06', l: aAgir.filter((e) => { const j = joursRestants(e.dateLimite); return j > 2 && j <= 7 }) },
    { k: 'tard', titre: 'لاحقاً', couleur: '#0B4A40', l: aAgir.filter((e) => joursRestants(e.dateLimite) > 7) },
  ]
  const sous7 = groupes[0].l.length + groupes[1].l.length
  const dans30 = aAgir.filter((e) => { const j = joursRestants(e.dateLimite); return j > 7 && j <= 30 }).length

  const basculer = (e: EcheanceItem) => lancer(e.id, async () => {
    try {
      await apiFetch(`/echeances/${e.id}/camp`, { method: 'PATCH', body: JSON.stringify({ camp: e.camp === 'SURVEILLER' ? 'AGIR' : 'SURVEILLER' }) })
      toast(e.camp === 'SURVEILLER' ? 'نُقل الأجل إلى «عليكم».' : 'نُقل الأجل إلى «على الخصم».', 'success')
      await refetch()
    } catch { toast('تعذّر نقل الأجل.', 'error') }
  })

  const Fait = ({ e }: { e: EcheanceItem }) => {
    const quand = e.completeAt ? new Date(e.completeAt) : null
    const aujourdhui = quand && fmtJM(quand) === fmtJM(new Date())
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '14px 18px' }}>
        <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#0E5A4E', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Check size={16} strokeWidth={2.4} aria-hidden /></span>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{titreDelai(e)}</span>
          <span style={{ fontSize: 13, color: '#5E6B67' }}><span className="num">{e.dossier.numeroDossier}</span>{e.dossier.titreAffaire ? ` · ${e.dossier.titreAffaire.split(/\s+[—-]\s+/)[0]}` : ''}{quand && <> · سُجّل {aujourdhui ? 'اليوم' : <span className="num">{fmtJM(quand)}</span>} <span className="num">{heure(quand)}</span></>}</span>
        </div>
        <button type="button" onClick={() => rouvrir(e)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#0E5A4E', border: 0, padding: '0 8px', minHeight: 44, cursor: 'pointer' }}>إلغاء الإنجاز</button>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>الآجال</h1>
        <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>
          {!actives ? (error ? 'تعذّر تحميل الآجال.' : 'جارٍ التحميل…') : <>{sous7 === 0 ? 'لا أجل عليكم' : sous7 === 1 ? 'أجل واحد عليكم' : sous7 === 2 ? 'أجلان عليكم' : <><span className="num">{sous7}</span> آجال عليكم</>} خلال <span className="num">7</span> أيام · {aSurveiller.length === 0 ? 'لا أجل للخصم' : aSurveiller.length === 2 ? 'أجلان للخصم' : <><span className="num">{aSurveiller.length}</span> {aSurveiller.length === 1 ? 'أجل للخصم' : 'آجال للخصم'}</>} تحت المراقبة</>}
        </p>
        {sync && <DepuisSynchro date={sync.derniereVerif} />}
      </div>

      <div role="tablist" aria-label="نوع الآجال" style={{ display: 'inline-flex', alignSelf: 'flex-start', flexWrap: 'wrap', background: '#EEEAE1', borderRadius: 999, padding: 4, gap: 4 }}>
        <button type="button" role="tab" className="mp-choix" aria-selected={onglet === 'agir'} onClick={() => setOnglet('agir')} style={onglet === 'agir' ? SEG_ON : SEG}>عليكم <Nombre v={actives ? aAgir.length : null} /></button>
        <button type="button" role="tab" className="mp-choix" aria-selected={onglet === 'surveiller'} onClick={() => setOnglet('surveiller')} style={onglet === 'surveiller' ? SEG_ON : SEG}>على الخصم <Nombre v={actives ? aSurveiller.length : null} /></button>
        <button type="button" role="tab" className="mp-choix" aria-selected={onglet === 'faits'} onClick={() => setOnglet('faits')} style={onglet === 'faits' ? SEG_ON : SEG}>منجزة <Nombre v={faits?.length} /></button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {!actives && error ? <ErreurChargement quoi="الآجال" onReessayer={refetch} /> : loading ? <SqueletteCartes n={3} /> : onglet === 'agir' ? <>
            {groupes.filter((g) => g.k !== 'tard' && g.l.length > 0).map((g) => (
              <section key={g.k} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: g.couleur }}>{g.titre}</h2>
                {g.l.map((e) => <DeadlineCard key={e.id} e={e} tribunalAr={tribunalAr} onComplete={complete} onBasculer={basculer} attente={cle === e.id} />)}
              </section>
            ))}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0B4A40' }}>لاحقاً</h2>
              {groupes[2].l.length === 0 || dans30 === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '16px 18px', color: '#3B4A47', fontSize: 15 }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Check size={16} strokeWidth={2.4} aria-hidden /></span>
                  لا أجل آخر عليكم خلال الثلاثين يوماً القادمة.
                </div>
              ) : null}
              {groupes[2].l.map((e) => <DeadlineCard key={e.id} e={e} tribunalAr={tribunalAr} onComplete={complete} onBasculer={basculer} attente={cle === e.id} />)}
            </section>
            {(faits ?? []).length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#3B4A47' }}>أُنجز مؤخراً</h2>
                {(faits ?? []).slice(0, 2).map((e) => <Fait key={e.id} e={e} />)}
              </section>
            )}
          </> : onglet === 'surveiller' ? <>
            {aSurveiller.length === 0 ? (
              <div style={{ background: '#FFFFFF', border: '1.5px dashed #8C877C', borderRadius: 16 }}><EtatVide Icon={Eye} texte="لا آجال للخصم تحت المراقبة. تظهر هنا آجال الطعن المفتوحة للطرف الآخر." /></div>
            ) : (
              <section style={{ background: '#FFFFFF', border: '1.5px dashed #8C877C', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><EyeIcon size={20} />آجال الخصم · لا إجراء عليكم</h2>
                {aSurveiller.map((e) => (
                  <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Link href={e.dossier.id ? `/dossiers/${e.dossier.id}` : '#'} style={{ fontSize: 13, color: '#5E6B67', textDecoration: 'none' }}><span className="num">{e.dossier.numeroDossier}</span>{e.dossier.titreAffaire ? ` · ${e.dossier.titreAffaire.split(/\s+[—-]\s+/)[0]}` : ''}</Link>
                    <WatchRow e={e} partie={adversaire(e.dossier.titreAffaire, e.dossier.roleClient) || undefined} onBasculer={basculer} attente={cle === e.id} />
                  </div>
                ))}
              </section>
            )}
            {advExpires.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0B4A40' }}>انتهت دون أن يسجَّل طعن</h2>
                {advExpires.map((e) => (
                  <div key={e.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', background: '#E3F0EC', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: '#0B4A40' }}>{titreDelai(e).split(' - ')[0]} الخصم انتهى <span className="num">{fmtJM(e.dateLimite)}</span>: الحكم يصبح نهائياً ← التنفيذ</strong>
                      <span style={{ fontSize: 13, color: '#23443C' }}><span className="num">{e.dossier.numeroDossier}</span> · تحققوا من عدم تسجيل طعن على محاكم.</span>
                    </div>
                    <Link className="mp-action" href={e.dossier.id ? `/documents?dossier=${e.dossier.id}&acte=EXECUTION` : '/documents'} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', borderRadius: 999, padding: '0 16px', minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>طلب التنفيذ</Link>
                  </div>
                ))}
              </section>
            )}
          </> : (
            (faits ?? []).length === 0
              ? <div style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16 }}><EtatVide Icon={Check} texte="لا آجال منجزة خلال الثلاثين يوماً الماضية." /></div>
              : <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{(faits ?? []).map((e) => <Fait key={e.id} e={e} />)}</section>
          )}
        </div>

        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {onglet !== 'surveiller' && aSurveiller.length > 0 && (
            <section style={{ background: '#FFFFFF', border: '1.5px dashed #8C877C', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><EyeIcon />على الخصم</h2>
              {aSurveiller.slice(0, 5).map((e, i) => (
                <button key={e.id} type="button" onClick={() => setOnglet('surveiller')} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, fontFamily: 'inherit', background: 'transparent', border: 0, borderTop: i ? '1px solid #EEEAE1' : 0, paddingTop: i ? 10 : 0, color: '#15201E', cursor: 'pointer', textAlign: 'right' }}>
                  <span>{titreDelai(e).split(' - ')[0].replace('أجل ', '')} · ملف {nomCourt(e)}</span>
                  <span className="num" style={{ color: '#4D5B57', fontWeight: 600 }}>{fmtJM(e.dateLimite)}</span>
                </button>
              ))}
            </section>
          )}
          <section style={{ background: '#E3F0EC', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.7, color: '#23443C' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0B4A40', display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Calculator} ton="vert" taille={36} />كيف نحسب الأجل؟</h2>
            <span>من تاريخ التبليغ المسجّل على محاكم، حسب نوع الإجراء وطبيعة الحكم وموقع موكلكم.</span>
            <span>تحققوا دائماً من تاريخ التبليغ الفعلي.</span>
            <span>إذا أخطأنا في التصنيف، انقلوا الأجل بزر ⇄ بين «عليكم» و«على الخصم».</span>
          </section>
        </aside>
      </div>
    </div>
  )
}
