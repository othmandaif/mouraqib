'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Gavel, Clock, Eye, CalendarDays, RefreshCw, MessageCircle, Bell } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useTribunaux } from '@/hooks/useTribunaux'
import { useToast } from '@/components/Toast'
import { joursRestants, fmtJM, heure, unitJours, titreDelai, JOUR_MS } from '@/components/legal/DeadlineCard'
import type { Preferences } from '@/components/legal/preferences'
import { SqueletteListe, ErreurChargement, useEnvoi, Attente } from '@/components/ui/Chargement'
import { EtatVide } from '@/components/ui/Visuels'

interface Alerte {
  id: string; canal: 'IN_APP' | 'WHATSAPP'; typeAlerte: string; message: string; messageAr?: string | null; statut: string; luAt: string | null; createdAt: string
  dossier?: { id: string; numeroDossier: string; tribunal: string; titreAffaire: string | null } | null
  echeance?: { id: string; descriptionAr: string | null; description: string; dateLimite: string; camp: 'AGIR' | 'SURVEILLER'; typeDelai: string } | null
  evenement?: { id: string; typeEvenement: string | null; natureJugement: string | null; dateAudience: string | null; texteArabe?: string } | null
}
type Filtre = 'tous' | 'jugements' | 'delais' | 'audiences' | 'sync'
type Vue = 'a-traiter' | 'historique'
const TAILLE = 30 // taille d'une page côté API

const CSS = `
.al-chip{font-family:inherit;font-size:14px;font-weight:600;background:#FFFFFF;color:#3B4A47;border:1px solid #E4E0D6;border-radius:999px;padding:0 16px;min-height:44px;cursor:pointer}
.al-chip.on{background:var(--mp-choix-fond);color:var(--mp-choix-texte);border-color:var(--mp-choix-bord);box-shadow:inset 0 0 0 1px var(--mp-choix-bord)}
.al{position:relative;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;padding:16px 18px}
.al.un{box-shadow:inset -4px 0 0 #0E5A4E}
.al-btn{display:inline-flex;align-items:center;gap:4px;font-family:inherit;font-size:14px;font-weight:600;background:#FFFFFF;color:#15201E;border:1px solid #CFCAC0;border-radius:999px;padding:0 16px;min-height:44px;box-sizing:border-box;cursor:pointer;text-decoration:none}
.al-btn.p{background:var(--mp-action);color:var(--mp-action-texte);border-color:var(--mp-action)}
@media (max-width: 760px){.al-ac{align-self:flex-start !important}}
`
const ICONE = { jugement: { I: Gavel, bg: '#FBEAE7', fg: '#9B2C20' }, delai: { I: Clock, bg: '#FDF1DC', fg: '#7A4E06' }, adverse: { I: Eye, bg: '#F1EFEA', fg: '#4D5B57' }, audience: { I: CalendarDays, bg: '#E3F0EC', fg: '#0B4A40' }, sync: { I: RefreshCw, bg: '#FBEAE7', fg: '#9B2C20' }, digest: { I: MessageCircle, bg: '#E3F0EC', fg: '#0B4A40' }, autre: { I: Bell, bg: '#E3F0EC', fg: '#0B4A40' } }
const jourLabel = (d: string) => { const x = new Date(d); const auj = new Date(); auj.setHours(0, 0, 0, 0); const diff = Math.round((auj.getTime() - new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()) / JOUR_MS); return diff <= 0 ? 'اليوم' : diff === 1 ? 'أمس' : diff < 7 ? 'هذا الأسبوع' : 'أقدم' }
const masquer = (t?: string | null) => (t ? t.replace(/(\d{2})\s?(\d{2})\s?(\d{2})$/, '•• •• $3') : '')

export default function AlertesPage() {
  const { toast } = useToast()
  const { tribunalAr } = useTribunaux()
  // « للمعالجة » = non lues : une alerte lue ou traitée en sort aussitôt. « السجل » = le reste, par pages.
  const [vue, setVue] = useState<Vue>('a-traiter')
  const { data: page1, loading, error, refetch } = useApi<Alerte[]>(`/alertes?vue=${vue}`, [vue])
  const { data: compte, refetch: recompter } = useApi<{ nonLues: number }>('/alertes/non-lues')
  const [suite, setSuite] = useState<{ items: Alerte[]; dernierLot: number }>({ items: [], dernierLot: 0 })
  const [masquees, setMasquees] = useState<Set<string>>(new Set()) // lues à l'instant : retirées sans attendre le serveur
  useEffect(() => { setSuite({ items: [], dernierLot: 0 }); setMasquees(new Set()) }, [page1])
  const alertes = page1 && [...page1, ...suite.items].filter((a) => !masquees.has(a.id))
  const peutPlus = (suite.items.length ? suite.dernierLot : page1?.length ?? 0) === TAILLE
  const [chargePlus, setChargePlus] = useState(false)
  const chargerPlus = async () => {
    const dernier = [...(page1 ?? []), ...suite.items].at(-1)
    if (!dernier) return
    setChargePlus(true)
    try {
      const lot = await apiFetch<Alerte[]>(`/alertes?vue=${vue}&avant=${encodeURIComponent(dernier.createdAt)}`)
      setSuite((s) => ({ items: [...s.items, ...lot], dernierLot: lot.length }))
    } catch { toast('تعذّر تحميل المزيد.', 'error') } finally { setChargePlus(false) }
  }
  const { data: prefs } = useApi<{ whatsappNumero: string | null; whatsappVerifie: boolean; preferences: Preferences }>('/alertes/preferences')
  const [filtre, setFiltre] = useState<Filtre>('tous')

  const famille = (a: Alerte): keyof typeof ICONE => {
    if (a.typeAlerte === 'RAPPORT_SYNC') return 'sync'
    if (a.typeAlerte === 'DIGEST_QUOTIDIEN') return 'digest'
    if (a.echeance) return a.echeance.camp === 'SURVEILLER' ? 'adverse' : 'delai'
    if (a.evenement?.typeEvenement === 'JUGEMENT_RENDU' || a.evenement?.typeEvenement === 'ORDONNANCE_RENDUE') return 'jugement'
    if (a.evenement?.dateAudience || /RENVOI|INSCRIPTION|DELIBERE/.test(a.evenement?.typeEvenement ?? '')) return 'audience'
    return 'autre'
  }
  const filtres: Record<Filtre, (a: Alerte) => boolean> = {
    tous: () => true, jugements: (a) => famille(a) === 'jugement',
    delais: (a) => famille(a) === 'delai' || famille(a) === 'adverse', audiences: (a) => famille(a) === 'audience', sync: (a) => famille(a) === 'sync',
  }
  const liste = (alertes ?? []).filter(filtres[filtre])
  const nonLues = compte?.nonLues ?? 0
  const groupes = useMemo(() => {
    const g = new Map<string, Alerte[]>()
    for (const a of liste) g.set(jourLabel(a.createdAt), [...(g.get(jourLabel(a.createdAt)) ?? []), a])
    return Array.from(g.entries())
  }, [liste])

  const marquerLu = (a: Alerte) => {
    if (a.luAt || a.canal !== 'IN_APP') return
    setMasquees((m) => new Set(m).add(a.id))
    apiFetch(`/alertes/${a.id}/lu`, { method: 'PATCH' })
      .then(() => { recompter(); window.dispatchEvent(new Event('mp:alertes-lues')) }) // pastille du menu
      .catch(() => setMasquees((m) => { const n = new Set(m); n.delete(a.id); return n }))
  }
  // Une action à la fois ; la clé « <alerte>:<action> » désigne le bouton qui attend
  const { cle, occupe, lancer } = useEnvoi()
  const btn = (k: string, label: React.ReactNode, onClick: () => void, primaire?: boolean, texte = 'جارٍ الحفظ…') => (
    <button type="button" className={primaire ? 'al-btn p mp-action' : 'al-btn'} onClick={onClick} disabled={occupe} aria-busy={cle === k}>
      <Attente actif={cle === k} texte={texte} sombre={!primaire}>{label}</Attente>
    </button>
  )
  const toutLu = () => lancer('tout-lu', async () => {
    try { await apiFetch('/alertes/lu-tout', { method: 'POST' }); await Promise.all([refetch(), recompter()]); window.dispatchEvent(new Event('mp:alertes-lues')) } catch { toast('تعذّر تعليم التنبيهات كمقروءة.', 'error') }
  })
  const rappel = (a: Alerte) => lancer(`${a.id}:rappel`, async () => {
    if (!a.echeance) return
    const d = new Date(new Date(a.echeance.dateLimite).getTime() + JOUR_MS); d.setHours(8, 0, 0, 0)
    try {
      await apiFetch(`/echeances/${a.echeance.id}/rappel`, { method: 'PATCH', body: JSON.stringify({ date: d.toISOString() }) })
      toast(`سنذكّركم يوم ${fmtJM(d)}.`, 'success'); marquerLu(a)
    } catch { toast('تعذّر حفظ التذكير. أعيدوا المحاولة.', 'error') }
  })
  const resync = (a: Alerte) => lancer(`${a.id}:sync`, async () => {
    if (!a.dossier) return
    try {
      await apiFetch(`/dossiers/${a.dossier.id}/scraper`, { method: 'POST' })
      toast('أُعيدت محاولة المزامنة.', 'success'); marquerLu(a)
    } catch { toast('تعذّرت إعادة المحاولة الآن.', 'error') }
  })

  const contenu = (a: Alerte) => {
    const f = famille(a)
    const num = a.dossier ? <>ملف <span className="num">{a.dossier.numeroDossier}</span></> : null
    const trib = a.dossier ? ` · ${tribunalAr(a.dossier.tribunal)}` : ''
    const at = <> · رُصد <span className="num">{heure(a.createdAt) || fmtJM(a.createdAt)}</span></>
    if (a.typeAlerte === 'ABONNEMENT') {
      const pourCommercial = a.message.split(':').length > 3
      return { titre: a.messageAr ?? 'تذكير بالاشتراك', sous: <>{at}</>, hint: '', action: <Link href={pourCommercial ? '/admin' : '/abonnement'} className="al-btn">{pourCommercial ? 'الحسابات' : 'اشتراكي'}</Link> }
    }
    if (a.message === 'verif:classification' && a.evenement && a.dossier) {
      const fixer = (type: string, msg: string) => lancer(`${a.id}:${type}`, async () => {
        try {
          await apiFetch(`/dossiers/${a.dossier!.id}/evenements/${a.evenement!.id}/type`, { method: 'PATCH', body: JSON.stringify({ typeEvenement: type }) })
          toast(msg, 'success'); marquerLu(a)
        } catch { toast('تعذّر الحفظ. أعيدوا المحاولة.', 'error') }
      })
      return {
        titre: 'إجراء جديد يحتاج مراجعتكم',
        sous: <>{num}{trib}{at}</>,
        hint: `لم نتمكن من تصنيفه تلقائياً: «${a.evenement.texteArabe?.slice(0, 90) ?? ''}». هل يفتح أجلاً؟`,
        action: <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {btn(`${a.id}:JUGEMENT_RENDU`, 'حكم', () => fixer('JUGEMENT_RENDU', 'سُجّل كحكم. ستظهر الآجال خلال دقيقة.'), true)}
          {btn(`${a.id}:NOTIFICATION_PARTIE`, 'تبليغ', () => fixer('NOTIFICATION_PARTIE', 'سُجّل كتبليغ. سيظهر الأجل خلال دقيقة.'))}
          {btn(`${a.id}:AUTRE`, 'لا أجل', () => fixer('AUTRE', 'سُجّل: لا أجل لهذا الإجراء.'))}
        </span>,
      }
    }
    if (f === 'sync') return { titre: 'تعذّرت مزامنة ملف', sous: <>{num} · محاكم لا يستجيب</>, hint: 'آخر نسخة معروفة من الملف ما زالت معروضة.', action: btn(`${a.id}:sync`, 'إعادة المحاولة الآن', () => resync(a), false, 'جارٍ الطلب…') }
    if (f === 'digest') {
      const [, n, m] = a.message.split(':')
      return { titre: a.statut === 'ENVOYEE' ? 'أُرسل الملخص اليومي على واتساب' : 'تعذّر إرسال الملخص اليومي', sous: <><span className="num">{heure(a.createdAt)}</span> · <span className="num">{n ?? 0}</span> آجال و<span className="num">{m ?? 0}</span> جلسات</>, hint: '', action: null }
    }
    if (a.echeance) {
      const e = a.echeance
      const j = joursRestants(e.dateLimite)
      const t = titreDelai(e).split(' - ')[0]
      if (a.typeAlerte === 'NOUVEAU_DELAI') return {
        titre: e.camp === 'SURVEILLER' ? `بدأ ${t} للخصم` : `بدأ ${titreDelai(e)}`,
        sous: <>{num} · آخر أجل <span className="num">{fmtJM(e.dateLimite)}</span></>,
        hint: e.camp === 'SURVEILLER' ? 'لا شيء مطلوب منكم. سننبهكم عند انتهائه.' : '',
        action: <Link href="/echeances" className="al-btn">عرض الأجل</Link>,
      }
      if (e.camp === 'SURVEILLER') return {
        titre: `${t} الخصم ينتهي ${j <= 0 ? 'اليوم' : j === 1 ? 'غداً' : j === 2 ? 'بعد يومين' : `بعد ${j} ${unitJours(j)}`}`,
        sous: <>{a.dossier?.titreAffaire?.split(/\s+[—-]\s+/)[0] ?? num} · <span className="num">{fmtJM(e.dateLimite)}</span> · لا شيء مطلوب منكم</>,
        hint: e.typeDelai === 'OPPOSITION' ? 'إذا لم يتعرّض الخصم، يصبح الحكم قابلاً للتنفيذ.' : '',
        action: btn(`${a.id}:rappel`, <>ذكّروني يوم <span className="num">{fmtJM(new Date(new Date(e.dateLimite).getTime() + JOUR_MS))}</span></>, () => rappel(a)),
      }
      return {
        titre: a.typeAlerte === 'RAPPEL_DELAI' ? `تذكير: ${titreDelai(e)}` : `آخر أجل ${j <= 0 ? 'اليوم' : `بعد ${j} ${unitJours(j)}`} · ${t}`,
        sous: <>{num} · آخر أجل <span className="num">{fmtJM(e.dateLimite)}</span></>, hint: '',
        action: <Link href="/echeances" className={j <= 2 ? 'al-btn p mp-action' : 'al-btn'}>عرض الأجل</Link>,
      }
    }
    if (f === 'jugement') return {
      titre: a.evenement?.natureJugement === 'DEFAUT' ? 'صدر حكم غيابي في ملفكم' : 'صدر حكم في ملفكم',
      sous: <>{num}{trib}{at}</>,
      hint: a.evenement?.natureJugement ? 'إذا سُجّل التبليغ، يبدأ الأجل وملفاتي يحسبه تلقائياً.' : 'حدّدوا طبيعة الحكم (حضوري أو غيابي) لنضبط الآجال.',
      action: a.dossier ? <Link href={`/dossiers/${a.dossier.id}`} className="al-btn p mp-action">فتح الملف</Link> : null,
    }
    if (f === 'audience') return {
      titre: a.evenement?.dateAudience ? 'جلسة جديدة مُدرجة' : 'مستجد في الملف',
      sous: <>{num}{a.evenement?.dateAudience ? <> · <span className="num">{fmtJM(a.evenement.dateAudience)}</span>{heure(a.evenement.dateAudience) ? <> على <span className="num">{heure(a.evenement.dateAudience)}</span></> : null}</> : null}{trib}</>,
      hint: a.message.slice(0, 120),
      action: <Link href="/calendrier" className="al-btn">في الأجندة</Link>,
    }
    return { titre: 'مستجد في ملفكم', sous: <>{num}{trib}{at}</>, hint: a.message.slice(0, 140), action: a.dossier ? <Link href={`/dossiers/${a.dossier.id}`} className="al-btn">فتح الملف</Link> : null }
  }

  const p = prefs?.preferences
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>التنبيهات</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>كل ما رصده ملفاتي على محاكم، مع ما يجب فعله.</p>
        </div>
        <button type="button" onClick={toutLu} disabled={nonLues === 0 || occupe} aria-busy={cle === 'tout-lu'} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: nonLues ? '#0E5A4E' : '#6B665C', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 16px', minHeight: 44, cursor: nonLues ? 'pointer' : 'default' }}><Attente actif={cle === 'tout-lu'} texte="جارٍ التعليم…" sombre>تعليم الكل كمقروء</Attente></button>
      </div>

      <div role="tablist" aria-label="تصفية التنبيهات" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {([['a-traiter', 'للمعالجة'], ['historique', 'السجل']] as [Vue, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={vue === k} onClick={() => setVue(k)} className={`al-chip${vue === k ? ' on' : ''}`}>{l}{k === 'a-traiter' && nonLues > 0 ? <> <span className="num">{nonLues}</span></> : null}</button>
        ))}
      </div>
      <div role="group" aria-label="نوع التنبيه" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -8 }}>
        {([['tous', 'الكل'], ['jugements', 'أحكام'], ['delais', 'آجال'], ['audiences', 'جلسات'], ['sync', 'المزامنة']] as [Filtre, string][]).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filtre === k} onClick={() => setFiltre(k)} className={`al-chip${filtre === k ? ' on' : ''}`} style={{ minHeight: 36, fontSize: 13, padding: '0 12px' }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!alertes && error ? <ErreurChargement quoi="التنبيهات" onReessayer={refetch} /> : loading ? <SqueletteListe n={6} label="جارٍ تحميل التنبيهات" /> : liste.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '10px 0' }}>{vue === 'a-traiter' && filtre === 'tous'
              ? <EtatVide Icon={Bell} texte="لا شيء للمعالجة. التنبيهات المقروءة في السجل." />
              : (alertes ?? []).length === 0 && vue === 'historique'
              ? <EtatVide Icon={Bell} texte="لا تنبيهات بعد. ستظهر هنا مستجدات ملفاتكم وآجالها." action={<Link href="/dossiers?ajouter=1" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 12, border: '1px solid #CDE5DD', background: '#E3F0EC', color: '#0E5A4E', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>إضافة ملف للمراقبة</Link>} />
              : <EtatVide Icon={Bell} texte="لا تنبيهات في هذا القسم." />}</div>
          ) : groupes.map(([jour, l]) => (
            <div key={jour} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ margin: '10px 0 0', fontSize: 14, fontWeight: 600, color: '#3B4A47' }}>{jour}</h2>
              {l.map((a) => {
                const f = famille(a)
                const { I, bg, fg } = ICONE[f]
                const c = contenu(a)
                const nonLu = !a.luAt && a.canal === 'IN_APP'
                return (
                  <article key={a.id} className={`al${nonLu ? ' un' : ''}`} style={f === 'adverse' ? { borderStyle: 'dashed', borderColor: '#8C877C' } : undefined} onClick={() => marquerLu(a)}>
                    <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: bg, color: fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><I size={20} strokeWidth={1.8} aria-hidden /></span>
                    <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ fontSize: 16, fontWeight: 600 }}>{c.titre}</strong>
                      <span style={{ fontSize: 14, color: '#3B4A47' }}>{c.sous}</span>
                      {c.hint && <span style={{ fontSize: 13, color: '#5E6B67' }}>{c.hint}</span>}
                    </div>
                    {c.action && <div className="al-ac" style={{ display: 'flex', gap: 8, alignSelf: 'center' }} onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).closest('a')) marquerLu(a) }}>{c.action}</div>}
                    {nonLu && <span role="img" aria-label="غير مقروء" style={{ position: 'absolute', top: 14, left: 14, width: 10, height: 10, borderRadius: '50%', background: '#0E5A4E' }} />}
                  </article>
                )
              })}
            </div>
          ))}
          {peutPlus && !loading && (
            <button type="button" onClick={chargerPlus} disabled={chargePlus} aria-busy={chargePlus} className="al-chip" style={{ alignSelf: 'center', marginTop: 4 }}>
              <Attente actif={chargePlus} texte="جارٍ التحميل…" sombre>عرض المزيد</Attente>
            </button>
          )}
        </div>

        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>قنوات التنبيه</h2>
            <Canal label="واتساب">{prefs?.whatsappVerifie ? <span style={{ color: '#0B4A40', fontWeight: 600 }}><span className="num">{masquer(prefs.whatsappNumero)}</span> · مُفعّل</span> : <Link href="/parametres/whatsapp" style={{ fontWeight: 600 }}>غير مُفعّل · تفعيل</Link>}</Canal>
            <Canal label="داخل التطبيق"><span style={{ color: '#0B4A40', fontWeight: 600 }}>مُفعّل</span></Canal>
            <Canal label="الملخص اليومي">{p ? (p.digestActif ? <span className="num" style={{ fontWeight: 600 }}>{p.digestHeure}</span> : 'متوقف') : '—'}</Canal>
            <Canal label="ساعات الهدوء" last>{p ? <span className="num">{p.calmeDebut} – {p.calmeFin}</span> : '—'}</Canal>
            <Link href="/parametres#notif" style={{ fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'none' }}>تعديل الإعدادات</Link>
          </section>
          <section style={{ background: '#E3F0EC', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.7, color: '#23443C' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0B4A40' }}>الأجل القريب لا ينتظر ساعات الهدوء</h2>
            <span>التنبيهات الخاصة بأجل عليكم ينتهي خلال <span className="num">48</span> ساعة تُرسل دائماً، ولو في ساعات الهدوء.</span>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Canal({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, padding: '10px 0', borderBottom: last ? 0 : '1px solid #EEEAE1' }}><span>{label}</span><span>{children}</span></div>
}
