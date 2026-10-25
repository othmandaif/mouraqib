'use client'

import { use, useEffect, useState } from 'react'
import { noterDossierRecent } from '@/components/layout/RechercheGlobale'
import { IconeRonde, EtatVide } from '@/components/ui/Visuels'
import { Route as IcRoute, Contact as IdCard, Microscope, Files, MessagesSquare, Users as IcUsers } from 'lucide-react'
import Link from 'next/link'
import { Archive, ArchiveRestore, Check, FileText, MessageSquare, RefreshCw, Sparkles } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useTribunaux } from '@/hooks/useTribunaux'
import { useToast } from '@/components/Toast'
import { labelProcedure } from '@/lib/labels'
import { SqueletteFiche, ErreurChargement, useEnvoi, Attente } from '@/components/ui/Chargement'
import {
  EcheanceItem, RoleClient, DeadlineCard, WatchRow, EyeIcon, useCompleteWithUndo, joursRestants, fmtDate, fmtJM, jourSemaine,
  heure, titreDelai, lireTitre, BTN, JOUR_MS,
} from '@/components/legal/DeadlineCard'

interface Evenement { id: string; texteArabe: string; typeEvenement?: string | null; natureJugement?: 'CONTRADICTOIRE' | 'DEFAUT' | null; dateAudience?: string | null; datePublicationGreffe: string; estNouvel: boolean }
interface DossierDetail {
  id: string; numeroDossier: string; codeRole: string; tribunal: string; titreAffaire?: string | null; typeProcedure: string
  estActif?: boolean; statutIA?: string; resumeIA?: string | null; analyseAt?: string | null; derniereVerif?: string | null
  roleClient: RoleClient
  evenements: Evenement[]
  echeances: (Omit<EcheanceItem, 'dossier'> & { estComplete: boolean })[]
  documents: { id: string; titre: string; statut: string; updatedAt: string }[]
  conversations: { id: string; titre: string; updatedAt: string }[]
  rawData?: {
    infosCarte: Record<string, string> | null
    parties: { qualite: string; nom: string; avocats: string; delegues: string; agents: string; representants: string }[]
    expertises: string[]
    recours: { type: string; partie: string; dateDepot: string; numero: string; numeroEnvoi: string; dateEnvoi: string; tribunal: string }[]
    dossiersLies: { type: string; numeroDossier: string; dateInscription: string; tribunal: string }[]
  }
}
type Onglet = 'apercu' | 'procedures' | 'delais' | 'documents' | 'conversations'

const STATUT: Record<string, { label: string; bg: string; fg: string }> = {
  OUVERT: { label: 'قضية جارية', bg: '#E3F0EC', fg: '#0B4A40' },
  EN_DELIBERE: { label: 'حجز للمداولة', bg: '#FDF1DC', fg: '#7A4E06' },
  CLOS: { label: 'قضية منتهية', bg: '#F1EFEA', fg: '#3B4A47' },
}
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }
const H2: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 600 }
const LIEN_EDIT: React.CSSProperties = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: 'transparent', color: '#0E5A4E', border: 0, padding: '4px 8px', minHeight: 44, cursor: 'pointer', textDecoration: 'underline' }
const val = (s?: string) => (s && s.trim() ? s.trim() : '—')
const estJugement = (t?: string | null) => t === 'JUGEMENT_RENDU' || t === 'ORDONNANCE_RENDUE'
const ilYa = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `منذ ${m} دقيقة`
  if (m < 60 * 24) return `منذ ${Math.round(m / 60)} ساعة`
  return `منذ ${Math.round(m / 1440)} يوماً`
}
const quandFutur = (d: string) => { const j = joursRestants(d); return j <= 0 ? 'اليوم' : j === 1 ? 'غداً' : j === 2 ? 'بعد يومين' : `بعد ${j} أيام` }

/** `attente` : valeur en cours d'envoi (indicateur sur ce bouton, les autres bloqués). */
function Choix({ options, onPick, attente }: { options: [string, string][]; onPick: (v: string) => void; attente?: string | null }) {
  return (
    <span role="group" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onPick(v)} disabled={attente != null} aria-busy={attente === v} style={{ ...BTN, minHeight: 40, fontSize: 14 }}>
          <Attente actif={attente === v} texte="جارٍ الحفظ…" sombre>{l}</Attente>
        </button>
      ))}
    </span>
  )
}

export default function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const { data: dossier, loading, error, refetch } = useApi<DossierDetail>(`/dossiers/${id}`)
  useEffect(() => { if (dossier) noterDossierRecent(id) }, [dossier, id])
  const { tribunalAr } = useTribunaux()
  const [onglet, setOnglet] = useState<Onglet>('apercu')
  const [editNature, setEditNature] = useState(false)
  const [editRole, setEditRole] = useState(false)
  const { hidden, complete } = useCompleteWithUndo(refetch)
  const { cle, occupe, lancer } = useEnvoi()

  if (loading) return <SqueletteFiche />
  // Erreur réseau ≠ dossier introuvable (404) : on propose de réessayer
  if (!dossier && error && !/introuvable|non trouv|404/i.test(error)) return <ErreurChargement quoi="الملف" onReessayer={refetch} />
  if (!dossier) {
    return (
      <div dir="rtl" style={{ ...CARD, alignItems: 'center', padding: '48px 24px' }}>
        <strong style={{ fontSize: 20, fontWeight: 600 }}>لم يتم العثور على الملف</strong>
        <Link href="/dossiers" style={{ fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>العودة إلى الملفات</Link>
      </div>
    )
  }

  const t = lireTitre(dossier.titreAffaire)
  const client = dossier.roleClient === 'DEMANDEUR' ? t.demandeur : dossier.roleClient === 'DEFENDEUR' ? t.defendeur : ''
  const adverse = dossier.roleClient === 'DEMANDEUR' ? t.defendeur : dossier.roleClient === 'DEFENDEUR' ? t.demandeur : ''
  const dossierRef = { id: dossier.id, numeroDossier: dossier.numeroDossier, tribunal: dossier.tribunal, titreAffaire: dossier.titreAffaire, roleClient: dossier.roleClient }
  const echeances: EcheanceItem[] = dossier.echeances.filter((e) => !e.estComplete && !hidden.has(e.id)).map((e) => ({ ...e, dossier: dossierRef }))
  const ouvertes = echeances.filter((e) => joursRestants(e.dateLimite) >= 0)
  const aAgir = ouvertes.filter((e) => e.camp !== 'SURVEILLER')
  const aSurveiller = ouvertes.filter((e) => e.camp === 'SURVEILLER')
  const dernierSurv = [...aSurveiller].sort((a, b) => new Date(b.dateLimite).getTime() - new Date(a.dateLimite).getTime())[0]
  const jugement = dossier.evenements.find((e) => estJugement(e.typeEvenement))
  const statut = dossier.statutIA ? STATUT[dossier.statutIA] : undefined
  const dernier = dossier.evenements[0]
  const parties = dossier.rawData?.parties ?? []

  // Une action à la fois ; `k` désigne le bouton qui affiche l'attente
  const action = (k: string, fn: () => Promise<unknown>, ok: string) => lancer(k, async () => {
    try { await fn(); toast(ok, 'success'); await refetch() } catch { toast('تعذّر تنفيذ العملية.', 'error') }
  })
  const choisirNature = async (nature: 'CONTRADICTOIRE' | 'DEFAUT') => {
    if (!jugement) return
    await action(`nature:${nature}`, () => apiFetch(`/dossiers/${id}/evenements/${jugement.id}/nature`, { method: 'PATCH', body: JSON.stringify({ nature }) }),
      nature === 'DEFAUT' ? 'سُجّل: حكم غيابي. تم ضبط الآجال.' : 'سُجّل: حكم حضوري. تم ضبط الآجال.')
    setEditNature(false)
  }
  const choisirRole = async (roleClient: RoleClient) => {
    await action(`role:${roleClient}`, () => apiFetch(`/dossiers/${id}`, { method: 'PATCH', body: JSON.stringify({ roleClient }) }), 'سُجّل موقع موكلكم. أُعيد تصنيف الآجال.')
    setEditRole(false)
  }
  const basculer = (e: EcheanceItem) => action(
    `camp:${e.id}`, () => apiFetch(`/echeances/${e.id}/camp`, { method: 'PATCH', body: JSON.stringify({ camp: e.camp === 'SURVEILLER' ? 'AGIR' : 'SURVEILLER' }) }),
    e.camp === 'SURVEILLER' ? 'نُقل الأجل إلى «عليكم».' : 'نُقل الأجل إلى «على الخصم».',
  )
  const rappeler = (e: EcheanceItem) => {
    const d = new Date(new Date(e.dateLimite).getTime() + JOUR_MS); d.setHours(8, 0, 0, 0)
    action('rappel', () => apiFetch(`/echeances/${e.id}/rappel`, { method: 'PATCH', body: JSON.stringify({ date: d.toISOString() }) }), `سنذكّركم يوم ${fmtJM(d)}.`)
  }
  const analyser = () => lancer('analyser', async () => {
    try { await apiFetch(`/assistant/dossiers/${id}/analyser`, { method: 'POST', body: JSON.stringify({ force: true }) }); await refetch() }
    catch { toast('تعذّر تحليل الملف الآن.', 'error') }
  })

  // « مسار الملف » : fins de délais à venir (pointillés) puis événements mahakim
  const futurs = [...ouvertes].sort((a, b) => new Date(b.dateLimite).getTime() - new Date(a.dateLimite).getTime())
  const resumeIA = (dossier.resumeIA ?? '').split(/(?<=[.؟!])\s+/).map((s) => s.trim()).filter(Boolean)

  const ONGLETS: { k: Onglet; label: string; n?: number }[] = [
    { k: 'apercu', label: 'نظرة عامة' },
    { k: 'procedures', label: 'الإجراءات', n: dossier.evenements.length },
    { k: 'delais', label: 'الآجال', n: ouvertes.length },
    { k: 'documents', label: 'الوثائق', n: dossier.documents.length || undefined },
    { k: 'conversations', label: 'المحادثات', n: dossier.conversations.length || undefined },
  ]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <nav aria-label="مسار التنقل" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#5E6B67' }}>
        <Link href="/dossiers" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'none' }}>الملفات</Link><span aria-hidden>‹</span><span className="num" style={{ color: '#15201E' }}>{dossier.numeroDossier}</span>
      </nav>

      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1px solid #E4E0D6', borderBottom: 0, borderRadius: '14px 14px 0 0', padding: '8px 18px 6px', marginInlineStart: 24 }}>
          <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{dossier.numeroDossier}</span>
          <span style={{ width: 1, height: 14, background: '#E4E0D6' }} />
          <span style={{ fontSize: 13, color: '#5E6B67' }}>رمز <span className="num">{dossier.codeRole}</span>{t.objet ? ` · ${t.objet}` : ''}</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 20, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 1px 0 rgba(8,59,52,.04), 0 14px 30px -18px rgba(8,59,52,.28)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {statut && <span style={{ fontSize: 13, fontWeight: 600, background: statut.bg, color: statut.fg, borderRadius: 999, padding: '4px 12px' }}>{statut.label}</span>}
                <span style={{ fontSize: 13, fontWeight: 600, background: '#EAF0F5', color: '#22476A', borderRadius: 999, padding: '4px 12px' }}>{labelProcedure(dossier.typeProcedure)}</span>
                {dossier.estActif === false && <span style={{ fontSize: 13, fontWeight: 600, background: '#F1EFEA', color: '#3B4A47', borderRadius: 999, padding: '4px 12px' }}>مؤرشف</span>}
              </div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>{t.demandeur ? (t.defendeur ? `${t.demandeur} ضد ${t.defendeur}` : t.demandeur) : <span className="num">{dossier.numeroDossier}</span>}</h1>
              <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {t.objet && <span>{t.objet} ·</span>}
                {dossier.roleClient !== 'INCONNU' && !editRole ? (
                  <>موكلكم: <strong style={{ color: '#15201E' }}>{client || (dossier.roleClient === 'DEMANDEUR' ? 'المدعي' : 'المدعى عليه')}</strong> ({dossier.roleClient === 'DEMANDEUR' ? 'مدعٍ' : 'مدعى عليه'})
                    <button type="button" onClick={() => setEditRole(true)} style={LIEN_EDIT}>تعديل</button></>
                ) : (
                  <><strong style={{ color: '#15201E' }}>موكلكم في هذا الملف:</strong><Choix options={[['DEMANDEUR', 'مدعٍ'], ['DEFENDEUR', 'مدعى عليه']]} onPick={(v) => choisirRole(v as RoleClient)} attente={cle?.startsWith('role:') ? cle.slice(5) : null} /></>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" disabled={occupe} aria-busy={cle === 'scraper'} onClick={() => action('scraper', () => apiFetch(`/dossiers/${id}/scraper`, { method: 'POST' }), 'بدأ التحديث من محاكم.')} style={{ ...BTN, gap: 8, fontSize: 15 }}>
                <Attente actif={cle === 'scraper'} texte="جارٍ الطلب…" sombre><RefreshCw size={18} aria-hidden />تحديث من محاكم</Attente>
              </button>
              <button type="button" aria-label={dossier.estActif === false ? 'استرجاع الملف' : 'أرشفة الملف'} title={dossier.estActif === false ? 'استرجاع' : 'أرشفة'}
                disabled={occupe} aria-busy={cle === 'archive'}
                onClick={() => action('archive', () => apiFetch(`/dossiers/${id}/${dossier.estActif === false ? 'restaurer' : 'archiver'}`, { method: 'PATCH' }), dossier.estActif === false ? 'استُرجع الملف.' : 'أُرشف الملف.')}
                style={{ ...BTN, padding: 0, width: 44, justifyContent: 'center', borderRadius: '50%' }}>
                <Attente actif={cle === 'archive'} sombre>{dossier.estActif === false ? <ArchiveRestore size={18} aria-hidden /> : <Archive size={18} aria-hidden />}</Attente>
              </button>
              <Link className="mp-action" href={`/documents?dossier=${dossier.id}`} style={{ ...BTN, gap: 8, fontSize: 15, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, padding: '0 18px' }}><FileText size={18} aria-hidden />تحرير وثيقة</Link>
            </div>
          </div>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, borderTop: '1px solid #EEEAE1', paddingTop: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><dt style={{ fontSize: 13, color: '#5E6B67' }}>المحكمة</dt><dd style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{tribunalAr(dossier.tribunal)}</dd></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><dt style={{ fontSize: 13, color: '#5E6B67' }}>آخر إجراء</dt><dd style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{dernier ? <>{dernier.texteArabe.slice(0, 36)}{dernier.texteArabe.length > 36 ? '…' : ''} · <span className="num">{fmtDate(dernier.datePublicationGreffe)}</span></> : '—'}</dd></div>
            {jugement && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><dt style={{ fontSize: 13, color: '#5E6B67' }}>طبيعة الحكم</dt>
                <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {jugement.natureJugement && !editNature ? <>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{jugement.natureJugement === 'DEFAUT' ? 'غيابي' : 'حضوري'}</span>
                    <button type="button" onClick={() => setEditNature(true)} style={LIEN_EDIT}>تعديل</button>
                  </> : <Choix options={[['CONTRADICTOIRE', 'حضوري'], ['DEFAUT', 'غيابي']]} onPick={(v) => choisirNature(v as 'CONTRADICTOIRE' | 'DEFAUT')} attente={cle?.startsWith('nature:') ? cle.slice(7) : null} />}
                </dd>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><dt style={{ fontSize: 13, color: '#5E6B67' }}>آخر مزامنة</dt><dd style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: dossier.derniereVerif ? '#2E8B6E' : '#8C877C' }} />{dossier.derniereVerif ? <>{fmtJM(dossier.derniereVerif) === fmtJM(new Date()) ? 'اليوم' : <span className="num">{fmtDate(dossier.derniereVerif)}</span>} <span className="num">{heure(dossier.derniereVerif)}</span></> : 'لم تتم بعد'}</dd></div>
          </dl>
        </div>
      </section>

      <div role="tablist" aria-label="أقسام الملف" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E4E0D6', overflowX: 'auto' }}>
        {ONGLETS.map((o) => (
          <button key={o.k} type="button" role="tab" aria-selected={onglet === o.k} onClick={() => setOnglet(o.k)}
            style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: onglet === o.k ? 600 : 400, background: 'transparent', color: onglet === o.k ? '#15201E' : '#3B4A47', border: 0, borderBottom: onglet === o.k ? '3px solid var(--mp-action)' : '3px solid transparent', padding: '12px 16px', minHeight: 44, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {o.label}{o.n ? <> <span className="num">{o.n}</span></> : null}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(onglet === 'apercu' || onglet === 'delais') && <>
            {jugement && !jugement.natureJugement && (
              <section style={{ ...CARD, background: '#FDF1DC', border: '1px solid #F2A93B' }}>
                <h2 style={{ ...H2, color: '#7A4E06' }}>صدر حكم: ما طبيعته؟</h2>
                <span style={{ fontSize: 14, color: '#3B4A47', lineHeight: 1.6 }}>يُسأل مرة واحدة عند صدور الحكم، ثم تُضبط الآجال تلقائياً (أجل التعرّض لا يُفتح إلا ضد الحكم الغيابي).</span>
                <Choix options={[['CONTRADICTOIRE', 'حضوري'], ['DEFAUT', 'غيابي']]} onPick={(v) => choisirNature(v as 'CONTRADICTOIRE' | 'DEFAUT')} attente={cle?.startsWith('nature:') ? cle.slice(7) : null} />
              </section>
            )}

            <section style={CARD}>
              <h2 style={H2}>عليكم</h2>
              {aAgir.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F5F3EE', borderRadius: 14, padding: '14px 16px' }}>
                  <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Check size={18} aria-hidden /></span>
                  <span style={{ fontSize: 15, color: '#3B4A47' }}>لا أجل عليكم في هذا الملف.{aSurveiller.length > 0 ? ' الطعن بيد الخصم.' : ''}</span>
                </div>
              ) : aAgir.map((e) => <DeadlineCard key={e.id} e={e} tribunalAr={tribunalAr} onComplete={complete} onBasculer={basculer} attente={cle === `camp:${e.id}`} />)}
            </section>

            {aSurveiller.length > 0 && (
              <section style={{ ...CARD, border: '1.5px dashed #8C877C' }}>
                <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 8 }}><EyeIcon size={20} />تحت المراقبة · آجال الخصم</h2>
                {aSurveiller.map((e) => <WatchRow key={e.id} e={e} partie={adverse || undefined} onBasculer={basculer} attente={cle === `camp:${e.id}`} />)}
                {dernierSurv && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', background: '#E3F0EC', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: '#0B4A40' }}>بعد <span className="num">{fmtJM(dernierSurv.dateLimite)}</span> دون طعن: الحكم نهائي</strong>
                      <span style={{ fontSize: 14, color: '#23443C' }}>الخطوة التالية: طلب الصيغة التنفيذية وفتح ملف التنفيذ.</span>
                    </div>
                    <button className="mp-action" type="button" disabled={occupe} aria-busy={cle === 'rappel'} onClick={() => rappeler(dernierSurv)} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0 }}>
                      <Attente actif={cle === 'rappel'} texte="جارٍ الحفظ…">ذكّروني يوم <span className="num">{fmtJM(new Date(new Date(dernierSurv.dateLimite).getTime() + JOUR_MS))}</span></Attente>
                    </button>
                  </div>
                )}
              </section>
            )}
          </>}

          {(onglet === 'apercu' || onglet === 'procedures') && (
            <section style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={IcRoute} taille={36} />مسار الملف</h2><span style={{ fontSize: 13, color: '#5E6B67' }}>المصدر: بوابة محاكم</span></div>
              {dossier.evenements.length === 0 && futurs.length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>لا إجراءات مسجّلة بعد.</span> : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                  {futurs.map((e) => (
                    <li key={e.id} style={{ display: 'flex', gap: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px dashed #8C877C', boxSizing: 'border-box', marginTop: 4 }} /><span style={{ flex: 1, width: 0, borderRight: '2px dashed #E4E0D6' }} /></div>
                      <div style={{ flex: 1, paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 13, color: '#5E6B67' }}><span className="num">{fmtDate(e.dateLimite)}</span> · {quandFutur(e.dateLimite)}</span>
                        <span style={{ fontSize: 15, color: '#3B4A47' }}>نهاية {titreDelai(e).split(' - ')[0]}{e.camp === 'SURVEILLER' ? ' الخصم' : ' (عليكم)'}</span>
                      </div>
                    </li>
                  ))}
                  {(onglet === 'apercu' ? dossier.evenements.slice(0, 6) : dossier.evenements).map((ev, i, arr) => {
                    const nouveau = i === 0 && ev.estNouvel
                    const dernierItem = i === arr.length - 1
                    return (
                      <li key={ev.id} style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', marginTop: 4, ...(nouveau ? { background: '#0E5A4E', boxShadow: '0 0 0 4px #CDE5DD' } : { background: ev.dateAudience ? '#22476A' : '#4D5B57' }) }} />
                          {!dernierItem && <span style={{ flex: 1, width: 2, background: '#E4E0D6' }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: dernierItem ? 0 : 20, display: 'flex', flexDirection: 'column', gap: nouveau ? 6 : 4 }}>
                          <span style={{ fontSize: 13, color: nouveau ? '#0B4A40' : '#5E6B67', fontWeight: nouveau ? 600 : 400 }}><span className="num">{fmtDate(ev.datePublicationGreffe)}</span>{nouveau ? ' · جديد' : ''}</span>
                          {nouveau ? <strong style={{ fontSize: 16, fontWeight: 600 }}>{ev.texteArabe}</strong> : <span style={{ fontSize: 15 }}>{ev.texteArabe}</span>}
                          {ev.dateAudience && <span style={{ fontSize: 13, color: '#22476A' }}>الجلسة: {jourSemaine(ev.dateAudience)} <span className="num">{fmtDate(ev.dateAudience)}{heure(ev.dateAudience) ? ` · ${heure(ev.dateAudience)}` : ''}</span></span>}
                          {estJugement(ev.typeEvenement) && ev.natureJugement && <span style={{ fontSize: 13, color: '#5E6B67' }}>صنّفه ملفاتي: <strong style={{ color: '#15201E', fontWeight: 600 }}>حكم {ev.natureJugement === 'DEFAUT' ? 'غيابي' : 'حضوري'}</strong></span>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
              {onglet === 'apercu' && dossier.evenements.length > 6 && <button type="button" onClick={() => setOnglet('procedures')} style={{ ...BTN, alignSelf: 'flex-start' }}>كل الإجراءات (<span className="num">{dossier.evenements.length}</span>)</button>}
            </section>
          )}

          {onglet === 'procedures' && <>
            {dossier.rawData?.infosCarte && Object.keys(dossier.rawData.infosCarte).length > 0 && (
              <section style={CARD}>
                <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={IdCard} taille={36} />بطاقة الملف</h2>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px 24px' }}>
                  {Object.entries(dossier.rawData.infosCarte).map(([k, v]) => <div key={k}><dt style={{ fontSize: 13, color: '#5E6B67' }}>{k}</dt><dd style={{ margin: 0, fontSize: 15 }}>{v || '—'}</dd></div>)}
                </dl>
              </section>
            )}
            {parties.length > 0 && <Tableau titre="لائحة الأطراف" entetes={['الصفة', 'اسم الطرف', 'المحامون', 'المفوضون القضائيون', 'الوكلاء', 'الممثلون القانونيون']} lignes={parties.map((p) => [p.qualite, p.nom, p.avocats, p.delegues, p.agents, p.representants].map(val))} />}
            {(dossier.rawData?.expertises ?? []).length > 0 && (
              <section style={CARD}><h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Microscope} taille={36} />لائحة الخبرات</h2>{dossier.rawData!.expertises.map((x, i) => <div key={i} style={{ background: '#F5F3EE', borderRadius: 10, padding: 12, fontSize: 15 }}>{x}</div>)}</section>
            )}
            {(dossier.rawData?.recours ?? []).length > 0 && <Tableau titre="عرائض الطعن" entetes={['النوع', 'من طرف', 'تاريخ وضعه', 'رقمها', 'رقم الإرسال', 'تاريخ الإرسال', 'المحكمة']} lignes={dossier.rawData!.recours.map((r) => [r.type, r.partie, r.dateDepot, r.numero, r.numeroEnvoi, r.dateEnvoi, r.tribunal].map(val))} />}
            {(dossier.rawData?.dossiersLies ?? []).length > 0 && <Tableau titre="الملفات المرتبطة" entetes={['نوع الملف', 'رقم الملف', 'تاريخ التسجيل', 'المحكمة']} lignes={dossier.rawData!.dossiersLies.map((d) => [d.type, d.numeroDossier, d.dateInscription, d.tribunal].map(val))} />}
          </>}

          {onglet === 'documents' && (
            <section style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Files} taille={36} />وثائق الملف</h2><Link href={`/documents?dossier=${dossier.id}`} style={{ ...BTN, background: '#0E5A4E', color: '#FFFFFF', border: 0 }}>+ وثيقة</Link></div>
              {dossier.documents.length === 0 ? <EtatVide Icon={FileText} texte="لا وثائق بعد لهذا الملف." action={<Link href={`/documents?dossier=${dossier.id}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 12, border: '1px solid #CDE5DD', background: '#E3F0EC', color: '#0E5A4E', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>صياغة وثيقة للملف</Link>} /> : dossier.documents.map((d) => <DocLigne key={d.id} d={d} />)}
            </section>
          )}

          {onglet === 'conversations' && (
            <section style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={MessagesSquare} taille={36} />محادثات المساعد حول الملف</h2><Link href={`/assistant?dossier=${dossier.id}`} style={{ ...BTN, background: '#0E5A4E', color: '#FFFFFF', border: 0 }}>سؤال جديد</Link></div>
              {dossier.conversations.length === 0 ? <EtatVide Icon={MessageSquare} texte="لا محادثات بعد حول هذا الملف." action={<Link href={`/assistant?dossier=${dossier.id}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 12, border: '1px solid #CDE5DD', background: '#E3F0EC', color: '#0E5A4E', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>سؤال للمساعد</Link>} /> : dossier.conversations.map((c) => (
                <Link key={c.id} href={`/assistant?conversation=${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#15201E', padding: 10, borderRadius: 10, background: '#F5F3EE', minHeight: 44, boxSizing: 'border-box', textDecoration: 'none' }}>
                  <MessageSquare size={18} color="#0E5A4E" aria-hidden /><span style={{ flex: 1, fontSize: 14 }}>{c.titre}</span><span className="num" style={{ fontSize: 12, color: '#5E6B67' }}>{fmtJM(c.updatedAt)}</span>
                </Link>
              ))}
            </section>
          )}
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section style={{ background: '#083B34', color: '#CFE5DD', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 style={{ ...H2, color: '#FFFFFF' }}>قراءة الذكاء الاصطناعي</h2>
              {dossier.analyseAt && <span style={{ fontSize: 12, color: '#9FC9BE' }}>{ilYa(dossier.analyseAt)}</span>}
            </div>
            {resumeIA.length > 0 ? (
              <ul style={{ margin: 0, padding: '0 18px 0 0', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, lineHeight: 1.7 }}>
                {resumeIA.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            ) : <span style={{ fontSize: 14, lineHeight: 1.7 }}>لم يُحلَّل هذا الملف بعد.</span>}
            <span style={{ fontSize: 12, color: '#9FC9BE', borderTop: '1px solid #1F5A4E', paddingTop: 10 }}>تحليل إرشادي لا يغني عن مراجعة الوثائق الأصلية.</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href={`/assistant?dossier=${dossier.id}`} style={{ ...BTN, flex: '1 1 160px', justifyContent: 'center', background: '#F5F3EE', color: '#083B34', border: 0 }}>اسأل عن هذا الملف</Link>
              <button type="button" onClick={analyser} disabled={occupe} aria-busy={cle === 'analyser'} style={{ ...BTN, background: 'transparent', color: '#FFFFFF', border: '1px solid #6E9C90' }}>
                <Attente actif={cle === 'analyser'} texte="جارٍ التحليل…"><Sparkles size={16} aria-hidden />{resumeIA.length ? 'تحديث القراءة' : 'تحليل الملف'}</Attente>
              </button>
            </div>
          </section>

          {parties.length > 0 && (
            <section style={{ ...CARD, padding: 20 }}>
              <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={IcUsers} taille={36} />الأطراف</h2>
              {parties.slice(0, 4).map((p, i) => {
                const estClient = !!client && p.nom.includes(client.split(' ')[0] ?? '')
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: estClient ? '#E3F0EC' : '#EEEAE1', color: estClient ? '#0B4A40' : '#3B4A47', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' }}>{p.nom.trim().replace(/^(شركة|مؤسسة|السيد|السيدة)\s+/, '').charAt(0) || '؟'}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><strong style={{ fontSize: 15, fontWeight: 600 }}>{p.nom}</strong><span style={{ fontSize: 13, color: '#5E6B67' }}>{p.qualite}{estClient ? ' · موكلكم' : client ? ' · الخصم' : ''}</span></div>
                  </div>
                )
              })}
            </section>
          )}

          <section style={{ ...CARD, padding: 20, gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Files} taille={36} />الوثائق</h2><Link href={`/documents?dossier=${dossier.id}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 8px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>+ وثيقة</Link></div>
            {dossier.documents.length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>لا وثائق بعد.</span> : dossier.documents.slice(0, 4).map((d) => <DocLigne key={d.id} d={d} />)}
          </section>
        </div>
      </div>
    </div>
  )
}

function DocLigne({ d }: { d: { id: string; titre: string; statut: string; updatedAt: string } }) {
  return (
    <Link href={`/documents?id=${d.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#15201E', padding: 10, borderRadius: 10, background: '#F5F3EE', minHeight: 44, boxSizing: 'border-box', textDecoration: 'none' }}>
      <FileText size={20} color="#0E5A4E" strokeWidth={1.8} aria-hidden />
      <span style={{ flex: 1, fontSize: 14 }}>{d.titre}</span>
      <span style={{ fontSize: 12, color: '#5E6B67' }}>{d.statut === 'FINALISE' ? 'نهائية' : 'مسودة'}</span>
    </Link>
  )
}

function Tableau({ titre, entetes, lignes }: { titre: string; entetes: string[]; lignes: string[][] }) {
  return (
    <section style={CARD}>
      <h2 style={H2}>{titre}</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr>{entetes.map((h) => <th key={h} style={{ fontSize: 13, fontWeight: 600, color: '#5E6B67', textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid #E4E0D6', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
          <tbody>{lignes.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} style={{ padding: '10px 12px', borderBottom: '1px solid #EEEAE1', fontWeight: j === 1 ? 600 : 400 }}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}
