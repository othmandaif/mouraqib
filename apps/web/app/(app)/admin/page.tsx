'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Plus, Copy, MessageCircle, X, Search, AlertTriangle, CheckCircle2, Inbox, Users, Wallet, Activity, ShieldCheck, KeyRound, UserRound, Phone, Power,
  ChevronLeft, ChevronRight, BarChart3, Receipt, Banknote, Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { lienWhatsapp, type EtatAbonnement } from '@/lib/abonnement'
import { useToast, useActionAnnulable } from '@/components/Toast'
import { fmtDate } from '@/components/legal/DeadlineCard'
import { IconeRonde, EtatVide } from '@/components/ui/Visuels'
import { Indicateur, useEnvoi as useActionLigne, Attente } from '@/components/ui/Chargement'

type Compte = {
  id: string; email: string; nom: string; prenom: string; telephone: string | null; barreau: string | null; role: string
  whatsappVerifie: boolean; createdAt: string; dossiers: number; derniereConnexion: string | null; cabinet: { nom: string } | null
  statut: 'EN_ATTENTE' | 'ACTIF' | 'DESACTIVE'; motifDesactivation: string | null; doitChangerMdp?: boolean
  demande: { ville?: string; structure?: string; nbDossiers?: string; message?: string } | null
  abonnement: null | { id: string; plan: Plan; estFondateur: boolean; prixMensuel: number | null; note: string | null; maxDossiers: number | null; essaiJusquAu: string | null; payeJusquAu: string | null; etat: EtatAbonnement; fin: string | null; joursRestants: number | null }
}
type Sante = {
  ok: boolean; workers: { nom: string; dernierPassage: string | null; enRetard: boolean }[]
  dossiersNonSynchronises: number; evenementsEnAttente: number; evenementsAVerifier: number; alertesWhatsappEchouees24h: number
  mahakim?: { panneDepuis: string | null; echecsConsecutifs: number; enPause: boolean }
  fileSynchro?: { enAttente: number; parMinute: number; heuresPourVider: number }
  delaisUrgentsSansWhatsapp: { userId: string; nom: string; telephone: string | null; delais: number }[]
}
type Plan = 'SOLO' | 'CABINET' | 'SUR_MESURE'

// Mêmes valeurs que apps/api/src/services/abonnements/offres.ts
const OFFRES: Record<Plan, { nom: string; prix: number | null; fondateur: number | null }> = {
  SOLO: { nom: 'فردي', prix: 290, fondateur: 149 },
  CABINET: { nom: 'مكتب', prix: 790, fondateur: 349 },
  SUR_MESURE: { nom: 'مكتب+ / تثبيت محلي', prix: null, fondateur: null },
}
const PLACES_FONDATEURS = 50
const ETAT: Record<EtatAbonnement, { t: string; bg: string; fg: string }> = {
  ESSAI: { t: 'فترة مجانية', bg: '#E3F0EC', fg: '#0B4A40' },
  PAYE: { t: 'مدفوع', bg: '#E3F0EC', fg: '#0B4A40' },
  A_RENOUVELER: { t: 'ينتهي قريباً', bg: '#FDF1DC', fg: '#7A4E06' },
  GRACE: { t: 'منتهٍ (مهلة)', bg: '#FBEAE7', fg: '#9B2C20' },
  EXPIRE: { t: 'منتهٍ', bg: '#FBEAE7', fg: '#9B2C20' },
}
const WORKER_AR: Record<string, string> = { scraper: 'مزامنة محاكم', nlp: 'تصنيف الإجراءات', alerts: 'إرسال التنبيهات', deadlines: 'حساب الآجال' }

const CSS = `
/* Textes saisis par les avocats (nom, ville, message…) : un mot très long ne doit jamais élargir la page */
.ad-racine{min-width:0;overflow-wrap:anywhere}
.ad-card{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:14px}
.ad-in{font-family:inherit;font-size:15px;color:#15201E;background:#FFFFFF;border:1px solid #CFCAC0;border-radius:10px;min-height:46px;padding:0 12px;box-sizing:border-box;width:100%;min-width:0}
.ad-l{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}
.ad-btn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:14px;font-weight:600;background:#FFFFFF;color:#15201E;border:1px solid #CFCAC0;border-radius:999px;padding:0 14px;min-height:40px;cursor:pointer;text-decoration:none;white-space:nowrap}
.ad-btn.p{background:var(--mp-action);color:var(--mp-action-texte);border-color:var(--mp-action)}
.ad-tbl{width:100%;border-collapse:collapse;font-size:14px}
.ad-tbl th{font-size:13px;font-weight:600;color:#5E6B67;text-align:right;padding:10px 12px;border-bottom:1px solid #E4E0D6;white-space:nowrap}
.ad-tbl td{padding:12px;border-bottom:1px solid #EEEAE1;vertical-align:middle}
.ad-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.ad-seg{display:inline-flex;background:#EEEAE1;border-radius:999px;padding:4px;gap:4px}
.ad-seg button{font-family:inherit;font-size:14px;font-weight:600;background:transparent;color:#3B4A47;border:0;border-radius:999px;padding:0 14px;min-height:36px;cursor:pointer}
.ad-seg button[aria-pressed="true"]{background:var(--mp-choix-fond);color:var(--mp-choix-texte);border-color:var(--mp-choix-bord);box-shadow:inset 0 0 0 1px var(--mp-choix-bord)}
.ad-demandes{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}
.ad-dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:14px}
.ad-dl dt{color:#5E6B67}
.ad-dl dd{margin:0;font-weight:600}
.ad-leg{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#3B4A47}
.ad-leg i{width:10px;height:10px;border-radius:3px}
.ad-btn:disabled{opacity:.5;cursor:not-allowed}
.ad-cartes{display:none;list-style:none;margin:0;padding:0;flex-direction:column;gap:12px}
.ad-carte-c{border:1px solid #E4E0D6;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.ad-tblw{overflow-x:auto}
@media (max-width: 1320px){.ad-tblw.ad-comptes{display:none}.ad-cartes{display:flex}}
`

type Onglet = 'demandes' | 'comptes' | 'compta' | 'sante' | 'admins'
type Compta = {
  annee: number; mois: { mois: number; recettes: number; depenses: number; resultat: number }[]; parCategorie: Record<string, number>
  totaux: { recettes: number; depenses: number; resultat: number }
  paiements: { id: string; montant: number; methode: string; reference: string | null; date: string; avocat: string | null; plan: string }[]
}
type Depense = { id: string; date: string; categorie: string; libelle: string; montant: number; recurrente: boolean; note: string | null }

const MOIS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر']
const CATEGORIES: Record<string, string> = { HEBERGEMENT: 'الاستضافة (VPS)', WHATSAPP: 'واتساب (Meta)', IA: 'الذكاء الاصطناعي', DOMAINE: 'النطاق والبريد', MARKETING: 'التسويق', LOGICIEL: 'برامج واشتراكات', AUTRE: 'أخرى' }
const STRUCTURE: Record<string, string> = { SEUL: 'محامٍ بمفرده', CABINET: 'مكتب (عدة محامين)' }
const NB_DOSSIERS: Record<string, string> = { MOINS_50: 'أقل من 50 ملفاً', '50_200': 'من 50 إلى 200', '200_500': 'من 200 إلى 500', PLUS_500: 'أكثر من 500' }
const METHODE: Record<string, string> = { VIREMENT: 'تحويل', CHEQUE: 'شيك', ESPECES: 'نقداً' }
// Espace comme séparateur de milliers (« 1.939 » se lisait comme un nombre décimal)
const dh = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F')
const depuis = (d: string) => { const j = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000); return j <= 0 ? 'اليوم' : j === 1 ? 'أمس' : `منذ ${j} أيام` }
const URL_CONNEXION = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const estAdmin = user?.role === 'ADMIN'
  const { data: comptes, refetch } = useApi<Compte[]>(estAdmin ? '/admin/comptes' : null)
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'actifs' | 'desactives'>('tous')
  const [nouveau, setNouveau] = useState(false)
  const [edition, setEdition] = useState<Compte | null>(null)
  const [paiement, setPaiement] = useState<Compte | null>(null)
  const [activation, setActivation] = useState<Compte | null>(null)
  const [desactivation, setDesactivation] = useState<Compte | null>(null)
  const [acces, setAcces] = useState<Acces | null>(null) // identifiants provisoires à transmettre
  const [active, setActive] = useState<Compte | null>(null) // message « compte activé » à envoyer

  const { masques, differer } = useActionAnnulable()
  const demandes = useMemo(() => (comptes ?? []).filter((c) => c.statut === 'EN_ATTENTE' && !masques.has(c.id)), [comptes, masques])
  const ouverts = useMemo(() => (comptes ?? []).filter((c) => c.statut !== 'EN_ATTENTE'), [comptes])
  const stats = useMemo(() => {
    const ab = ouverts.filter((x) => x.statut === 'ACTIF').map((x) => x.abonnement).filter(Boolean) as NonNullable<Compte['abonnement']>[]
    return {
      total: ouverts.length,
      desactives: ouverts.filter((c) => c.statut === 'DESACTIVE').length,
      fondateurs: ab.filter((a) => a.estFondateur).length,
      essai: ab.filter((a) => a.etat === 'ESSAI').length,
      payes: ab.filter((a) => a.etat === 'PAYE').length,
      aRelancer: ab.filter((a) => ['A_RENOUVELER', 'GRACE', 'EXPIRE'].includes(a.etat)).length,
      mensuel: ab.filter((a) => a.etat === 'PAYE' || a.etat === 'A_RENOUVELER').reduce((s, a) => s + (a.prixMensuel ?? (a.estFondateur ? OFFRES[a.plan]?.fondateur : OFFRES[a.plan]?.prix) ?? 0), 0),
    }
  }, [ouverts])
  // Une section par adresse (/admin, /admin/comptes, /admin/compta, /admin/sante) : le menu latéral sert d'onglets
  const seg = pathname.split('/')[2]
  const ongletActif: Onglet = seg === 'comptes' || seg === 'compta' || seg === 'sante' || seg === 'admins' ? seg : 'demandes'

  useEffect(() => { if (user && !estAdmin) router.replace('/dashboard') }, [user, estAdmin, router])
  if (user && !estAdmin) return null

  const liste = ouverts
    .filter((c) => filtre === 'tous' || (filtre === 'actifs' ? c.statut === 'ACTIF' : c.statut === 'DESACTIVE'))
    .filter((c) => !q || `${c.prenom} ${c.nom} ${c.email} ${c.telephone ?? ''} ${c.barreau ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  // Actions de ligne : une à la fois, indicateur sur le bouton cliqué (« <action>:<compte> »)
  const { cle: envoi, occupe, lancer } = useActionLigne()
  const reinitialiserMdp = async (c: Compte) => {
    if (!window.confirm(`إعادة تعيين كلمة مرور ذ. ${c.prenom} ${c.nom}؟ ستُغلق جلساته، وسيُطلب منه اختيار كلمة جديدة عند الدخول.`)) return
    await lancer(`mdp:${c.id}`, async () => { try {
      const r = await apiFetch<{ motDePasseProvisoire: string }>(`/admin/comptes/${c.id}/reinitialiser-mdp`, { method: 'POST' })
      setAcces({ titre: 'كلمة مرور مؤقتة', prenom: c.prenom, telephone: c.telephone, email: c.email, mdp: r.motDePasseProvisoire })
    } catch (e: any) { toast(erreurAr(e?.message), 'error') } })
  }
  const refuser = (c: Compte) => differer([c.id], `رُفض طلب ذ. ${c.prenom} ${c.nom}.`, () => apiFetch(`/admin/demandes/${c.id}`, { method: 'DELETE' }), refetch)
  const reactiver = (c: Compte) => lancer(`react:${c.id}`, async () => {
    try { await apiFetch(`/admin/comptes/${c.id}/reactiver`, { method: 'POST' }); toast('أُعيد تفعيل الحساب.', 'success'); await refetch() } catch (e: any) { toast(erreurAr(e?.message), 'error') }
  })

  const actions = (c: Compte) => c.statut === 'DESACTIVE'
    ? <button type="button" className="ad-btn p mp-action" onClick={() => reactiver(c)} disabled={occupe} aria-busy={envoi === `react:${c.id}`}><Attente actif={envoi === `react:${c.id}`} texte="جارٍ التفعيل…"><Power size={15} aria-hidden />إعادة التفعيل</Attente></button>
    : <>
      <button type="button" className="ad-btn" onClick={() => setPaiement(c)} disabled={!c.abonnement}>دفعة</button>
      <button type="button" className="ad-btn" onClick={() => setEdition(c)}>العرض</button>
      <button type="button" className="ad-btn" onClick={() => reinitialiserMdp(c)} disabled={occupe} aria-busy={envoi === `mdp:${c.id}`}><Attente actif={envoi === `mdp:${c.id}`} texte="جارٍ الإنشاء…" sombre><KeyRound size={15} aria-hidden />كلمة مرور مؤقتة</Attente></button>
      <button type="button" className="ad-btn" style={{ color: '#9B2C20' }} onClick={() => setDesactivation(c)}><Power size={15} aria-hidden />تعطيل</button>
    </>

  const TITRES: Record<Onglet, { t: string; sous: string; Icon: typeof Inbox }> = {
    demandes: { t: 'طلبات التسجيل', sous: 'المحامون الذين ملؤوا استمارة التسجيل: اتصلوا بهم ثم فعّلوا الحساب بالعرض المتفق عليه.', Icon: Inbox },
    comptes: { t: 'الحسابات والاشتراكات', sous: 'العروض، الدفعات، التجديد، وتعطيل الحسابات أو إعادة تفعيلها.', Icon: Users },
    compta: { t: 'المحاسبة', sous: 'مداخيل الاشتراكات ومصاريف الخدمة، شهراً بشهر.', Icon: Wallet },
    sante: { t: 'سلامة النظام', sous: 'المزامنة مع محاكم، حساب الآجال وإرسال التنبيهات.', Icon: Activity },
    admins: { t: 'المشرفون', sous: 'حسابات فريق الإدارة والمبيعات: إضافة مشرف، حذفه، وتغيير كلمة مروركم.', Icon: ShieldCheck },
  }
  const T = TITRES[ongletActif]

  return (
    <div dir="rtl" className="ad-racine" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <T.Icon size={28} strokeWidth={1.8} color="#0E5A4E" aria-hidden />{T.t}
          {ongletActif === 'demandes' && demandes.length > 0 && <span className="num" style={{ fontSize: 14, fontWeight: 700, background: '#F2A93B', color: '#15201E', borderRadius: 999, padding: '2px 10px' }}>{demandes.length}</span>}
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>{T.sous}</p>
      </div>

      {ongletActif === 'demandes' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="طلبات التسجيل">
          {comptes && demandes.length === 0 && <div className="ad-card"><EtatVide Icon={Inbox} texte="لا طلبات جديدة." /></div>}
          <div className="ad-demandes">
            {demandes.map((c) => {
              const d = c.demande ?? {}
              return (
                <article key={c.id} className="ad-card" style={{ gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <IconeRonde Icon={UserRound} taille={44} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <strong style={{ fontSize: 17, fontWeight: 600 }}>ذ. {c.prenom} {c.nom}</strong>
                      <span dir="ltr" style={{ fontSize: 13, color: '#5E6B67', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#5E6B67', whiteSpace: 'nowrap' }}>{depuis(c.createdAt)}</span>
                  </div>
                  <dl className="ad-dl">
                    {c.telephone && <><dt>الهاتف</dt><dd><span className="num">{c.telephone}</span></dd></>}
                    {c.barreau && <><dt>الهيئة</dt><dd>{c.barreau}</dd></>}
                    {d.ville && <><dt>المدينة</dt><dd>{d.ville}</dd></>}
                    {d.structure && <><dt>الهيكلة</dt><dd>{STRUCTURE[d.structure] ?? d.structure}</dd></>}
                    {d.nbDossiers && <><dt>الملفات</dt><dd>{NB_DOSSIERS[d.nbDossiers] ?? d.nbDossiers}</dd></>}
                  </dl>
                  {d.message && <p style={{ margin: 0, fontSize: 14, background: '#F7F5F0', borderRadius: 10, padding: '10px 12px', lineHeight: 1.7 }}>{d.message}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto' }}>
                    <button type="button" className="ad-btn p mp-action" onClick={() => setActivation(c)}><CheckCircle2 size={16} aria-hidden />تفعيل الحساب</button>
                    {c.telephone && <a className="ad-btn" href={`tel:${c.telephone}`}><Phone size={16} aria-hidden />اتصال</a>}
                    {c.telephone && <a className="ad-btn" target="_blank" rel="noopener noreferrer" href={lienWhatsapp(c.telephone, `مرحباً ذ. ${c.prenom}، شكراً على تسجيلكم في ملفاتي. متى يناسبكم أن نتواصل لتقديم الخدمة وتفعيل حسابكم؟`)}><MessageCircle size={16} aria-hidden />واتساب</a>}
                    <button type="button" className="ad-btn" style={{ marginInlineStart: 'auto', color: '#9B2C20' }} onClick={() => refuser(c)}>رفض</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {ongletActif === 'comptes' && (
        <>
          <div className="ad-g" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Chiffre t="الحسابات" v={stats.total} />
            <Chiffre t="الأعضاء المؤسسون" v={<>{stats.fondateurs} / {PLACES_FONDATEURS}</>} />
            <Chiffre t="في الفترة المجانية" v={stats.essai} />
            <Chiffre t="مدفوعة" v={stats.payes} />
            <Chiffre t="للمتابعة (تجديد)" v={stats.aRelancer} alerte={stats.aRelancer > 0} />
            <Chiffre t="معطّلة" v={stats.desactives} />
          </div>
          <section className="ad-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <label style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 14px', maxWidth: 420 }}>
                <Search size={18} color="#5E6B67" aria-hidden /><span className="sr-only-ar">بحث</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم، بريد، هاتف، هيئة…" style={{ flex: 1, border: 0, outline: 0, minHeight: 42, fontFamily: 'inherit', fontSize: 15, background: 'transparent', boxShadow: 'none' }} />
              </label>
              <div className="ad-seg" role="group" aria-label="تصفية">
                {([['tous', 'الكل'], ['actifs', 'نشطة'], ['desactives', 'معطّلة']] as const).map(([k, t]) => <button key={k} type="button" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{t}</button>)}
              </div>
              <button type="button" className="ad-btn" style={{ marginInlineStart: 'auto' }} onClick={() => setNouveau(true)}><Plus size={16} aria-hidden /> حساب يدوي</button>
            </div>
            <div className="ad-tblw ad-comptes">
              <table className="ad-tbl">
                <thead><tr><th>المحامي</th><th>الحساب</th><th>العرض</th><th>الاشتراك</th><th>حتى</th><th>الملفات</th><th>واتساب</th><th>آخر دخول</th><th /></tr></thead>
                <tbody>
                  {liste.map((c) => {
                    const a = c.abonnement
                    const off = c.statut === 'DESACTIVE'
                    return (
                      <tr key={c.id} style={off ? { background: '#FAF8F4' } : undefined}>
                        <td><Identite c={c} /></td>
                        <td><BadgeCompte c={c} /></td>
                        <td><Offre a={a} /></td>
                        <td><BadgeEtat a={a} /></td>
                        <td className="num">{a?.fin ? fmtDate(a.fin) : '—'}</td>
                        <td><Dossiers c={c} /></td>
                        <td>{c.whatsappVerifie ? <CheckCircle2 size={18} color="#0E5A4E" aria-label="مفعّل" /> : <span style={{ color: '#9B2C20', fontWeight: 600 }}>لا</span>}</td>
                        <td className="num" style={{ color: '#5E6B67' }}>{c.derniereConnexion ? fmtDate(c.derniereConnexion) : 'لم يدخل'}</td>
                        <td><div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>{actions(c)}</div></td>
                      </tr>
                    )
                  })}
                  {liste.length === 0 && <tr><td colSpan={9} style={{ color: '#5E6B67', padding: 20 }}>لا حسابات.</td></tr>}
                </tbody>
              </table>
            </div>
            {/* Écrans étroits (tablette, téléphone) : une carte par avocat au lieu du tableau */}
            <ul className="ad-cartes" aria-label="الحسابات">
              {liste.map((c) => {
                const a = c.abonnement
                return (
                  <li key={c.id} className="ad-carte-c" style={c.statut === 'DESACTIVE' ? { background: '#FAF8F4' } : undefined}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}><Identite c={c} /></div>
                      <BadgeCompte c={c} />
                    </div>
                    <dl className="ad-dl">
                      <dt>العرض</dt><dd><Offre a={a} /></dd>
                      <dt>الاشتراك</dt><dd style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><BadgeEtat a={a} />{a?.fin && <span style={{ fontWeight: 400, color: '#5E6B67' }}>حتى <span className="num">{fmtDate(a.fin)}</span></span>}</dd>
                      <dt>الملفات</dt><dd><Dossiers c={c} /></dd>
                      <dt>واتساب</dt><dd>{c.whatsappVerifie ? 'مفعّل' : <span style={{ color: '#9B2C20' }}>غير مفعّل</span>}</dd>
                      <dt>آخر دخول</dt><dd style={{ fontWeight: 400 }}>{c.derniereConnexion ? <span className="num">{fmtDate(c.derniereConnexion)}</span> : 'لم يدخل'}</dd>
                    </dl>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{actions(c)}</div>
                  </li>
                )
              })}
              {liste.length === 0 && <li style={{ color: '#5E6B67', padding: 12 }}>لا حسابات.</li>}
            </ul>
          </section>
        </>
      )}

      {ongletActif === 'compta' && <OngletCompta mensuel={stats.mensuel} />}
      {ongletActif === 'sante' && <OngletSante />}
      {ongletActif === 'admins' && <OngletAdmins />}

      {nouveau && <FormNouveau fondateursRestants={PLACES_FONDATEURS - stats.fondateurs} onFermer={() => setNouveau(false)} onCree={(a) => { setNouveau(false); setAcces(a); refetch() }} />}
      {edition && <FormOffre compte={edition} onFermer={() => setEdition(null)} onOk={() => { setEdition(null); refetch() }} />}
      {paiement && <FormPaiement compte={paiement} onFermer={() => setPaiement(null)} onOk={() => { setPaiement(null); refetch() }} />}
      {activation && <FormActivation compte={activation} fondateursRestants={PLACES_FONDATEURS - stats.fondateurs} onFermer={() => setActivation(null)} onOk={() => { setActive(activation); setActivation(null); refetch() }} />}
      {desactivation && <FormDesactivation compte={desactivation} onFermer={() => setDesactivation(null)} onOk={() => { setDesactivation(null); refetch() }} />}
      {active && (
        <Panneau titre="الحساب مفعّل" onFermer={() => setActive(null)}>
          <p style={{ margin: 0, fontSize: 15, color: '#3B4A47', lineHeight: 1.7 }}>أخبروا ذ. {active.prenom} {active.nom}: يمكنه الدخول الآن بالبريد وكلمة المرور اللذين اختارهما عند التسجيل.</p>
          {active.telephone && <a className="ad-btn p mp-action" style={{ alignSelf: 'flex-start', minHeight: 46 }} target="_blank" rel="noopener noreferrer" href={lienWhatsapp(active.telephone, `مرحباً ذ. ${active.prenom}، تم تفعيل حسابكم على ملفاتي. يمكنكم الدخول الآن: ${URL_CONNEXION}`)}><MessageCircle size={16} aria-hidden /> إرسال الخبر عبر واتساب</a>}
        </Panneau>
      )}
      {acces && <PanneauAcces acces={acces} onFermer={() => setAcces(null)} />}
    </div>
  )
}

function OngletSante() {
  const { data: sante, refetch } = useApi<Sante>('/admin/sante')
  if (!sante) return <div className="ad-card mp-skeleton" style={{ minHeight: 160 }} />
  return (
    <section className="ad-card" aria-label="سلامة الآجال" style={{ borderColor: sante.ok ? '#E4E0D6' : '#F0C9C2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {sante.ok ? <CheckCircle2 size={20} color="#0E5A4E" aria-hidden /> : <AlertTriangle size={20} color="#9B2C20" aria-hidden />}
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{sante.ok ? 'سلسلة الآجال تعمل بشكل طبيعي' : 'انتباه: نقطة تحتاج تدخلاً'}</h2>
        <button type="button" className="ad-btn" style={{ marginInlineStart: 'auto' }} onClick={refetch}>تحديث</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {sante.workers.map((w) => (
          <span key={w.nom} style={{ fontSize: 13, fontWeight: 600, borderRadius: 999, padding: '4px 12px', background: w.enRetard ? '#FBEAE7' : '#E3F0EC', color: w.enRetard ? '#9B2C20' : '#0B4A40' }}>
            {WORKER_AR[w.nom] ?? w.nom} · {w.dernierPassage ? <span className="num">{new Date(w.dernierPassage).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span> : 'لم يشتغل بعد'}
          </span>
        ))}
      </div>
      {sante.mahakim?.panneDepuis && (
        <div role="alert" style={{ background: '#FBF1EF', border: '1px solid #F0C9C2', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#6E1D14', lineHeight: 1.7 }}>
          <strong>بوابة محاكم لا تستجيب منذ <span className="num">{new Date(sante.mahakim.panneDepuis).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span>.</strong> المزامنة متوقفة مؤقتاً وتُستأنف تلقائياً عند عودة البوابة. لا تُرسل تنبيهات «تعذّرت المزامنة» للمحامين خلال العطل.
        </div>
      )}
      {sante.fileSynchro && sante.fileSynchro.heuresPourVider > 2 && (
        <div role="alert" style={{ background: '#FDF1DC', border: '1px solid #F2D29B', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#5C3B05', lineHeight: 1.7 }}>
          المزامنة متأخرة: <span className="num">{sante.fileSynchro.enAttente}</span> ملفاً في الانتظار، أي حوالي <span className="num">{sante.fileSynchro.heuresPourVider}</span> ساعة بالوتيرة الحالية (<span className="num">{sante.fileSynchro.parMinute}</span> ملفاً في الدقيقة). ارفعوا SCRAPER_PAR_MINUTE أو أضيفوا خادماً للمزامنة.
        </div>
      )}
      <div className="ad-g">
        <Chiffre t="ملفات غير مُزامنة منذ 48 ساعة" v={sante.dossiersNonSynchronises} alerte={sante.dossiersNonSynchronises > 0} />
        {sante.fileSynchro && <Chiffre t="ملفات في انتظار المزامنة" v={sante.fileSynchro.enAttente} alerte={sante.fileSynchro.heuresPourVider > 2} />}
        <Chiffre t="إجراءات في انتظار التصنيف" v={sante.evenementsEnAttente} alerte={sante.evenementsEnAttente > 0} />
        <Chiffre t="إجراءات يراجعها المحامي" v={sante.evenementsAVerifier} />
        <Chiffre t="رسائل واتساب فاشلة (24 ساعة)" v={sante.alertesWhatsappEchouees24h} alerte={sante.alertesWhatsappEchouees24h > 0} />
      </div>
      {sante.delaisUrgentsSansWhatsapp.length > 0 && (
        <div role="alert" style={{ background: '#FBF1EF', border: '1px solid #F0C9C2', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong style={{ color: '#6E1D14', fontSize: 15 }}>اتصلوا بهؤلاء المحامين: أجل خلال 48 ساعة وواتساب غير مفعّل</strong>
          {sante.delaisUrgentsSansWhatsapp.map((a) => (
            <span key={a.userId} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 14 }}>
              ذ. {a.nom} · <span className="num">{a.delais}</span> أجل
              {a.telephone && <a className="ad-btn" href={`tel:${a.telephone}`}><span className="num">{a.telephone}</span></a>}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function OngletCompta({ mensuel }: { mensuel: number }) {
  const { toast } = useToast()
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const { data: c, refetch } = useApi<Compta>(`/admin/compta?annee=${annee}`)
  const { data: depenses, refetch: refetchDep } = useApi<Depense[]>(`/admin/depenses?annee=${annee}`)
  const [form, setForm] = useState(false)
  const maj = () => { refetch(); refetchDep() }
  const { masques, differer } = useActionAnnulable()
  const supprimer = (d: Depense) => differer([d.id], `حُذف «${d.libelle}».`, () => apiFetch(`/admin/depenses/${d.id}`, { method: 'DELETE' }), maj)
  const max = Math.max(1, ...(c?.mois ?? []).flatMap((m) => [m.recettes, m.depenses]))
  const moisCourant = annee === new Date().getFullYear() ? new Date().getMonth() : 11
  // Lignes affichées : du premier mois avec une opération jusqu'au mois en cours (pas de douze lignes à zéro)
  const premierMois = Math.min(moisCourant, ...(c?.mois ?? []).filter((m) => m.recettes || m.depenses).map((m) => m.mois - 1))

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-label="المحاسبة">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <button type="button" className="ad-btn" style={{ width: 40, padding: 0, justifyContent: 'center' }} aria-label="السنة السابقة" onClick={() => setAnnee(annee - 1)}><ChevronRight size={16} aria-hidden /></button>
        <strong className="num" style={{ fontSize: 20, fontWeight: 600 }}>{annee}</strong>
        <button type="button" className="ad-btn" style={{ width: 40, padding: 0, justifyContent: 'center' }} aria-label="السنة التالية" onClick={() => setAnnee(annee + 1)} disabled={annee >= new Date().getFullYear()}><ChevronLeft size={16} aria-hidden /></button>
        <button type="button" className="ad-btn p mp-action" style={{ marginInlineStart: 'auto', minHeight: 44 }} onClick={() => setForm(true)}><Plus size={16} aria-hidden />مصروف جديد</button>
      </div>

      <div className="ad-g">
        <Chiffre t="المداخيل (درهم)" v={c ? dh(c.totaux.recettes) : '…'} />
        <Chiffre t="المصاريف (درهم)" v={c ? dh(c.totaux.depenses) : '…'} />
        <Chiffre t="النتيجة (درهم)" v={c ? dh(c.totaux.resultat) : '…'} alerte={!!c && c.totaux.resultat < 0} />
        <Chiffre t="المداخيل الشهرية المتوقعة" v={dh(mensuel)} />
      </div>

      <div className="ad-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconeRonde Icon={BarChart3} taille={36} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>شهراً بشهر</h2>
          <span className="ad-leg"><i style={{ background: '#0E5A4E' }} />مداخيل</span>
          <span className="ad-leg"><i style={{ background: '#9FB5AE' }} />مصاريف</span>
        </div>
        <div className="ad-tblw">
          <table className="ad-tbl">
            <thead><tr><th>الشهر</th><th>المداخيل</th><th>المصاريف</th><th>النتيجة</th><th style={{ width: '38%' }} /></tr></thead>
            <tbody>
              {(c?.mois ?? []).filter((m) => m.mois - 1 <= moisCourant && m.mois - 1 >= premierMois).map((m) => (
                <tr key={m.mois}>
                  <td>{MOIS_AR[m.mois - 1]}</td>
                  <td className="num">{dh(m.recettes)}</td>
                  <td className="num">{dh(m.depenses)}</td>
                  <td className="num" style={{ fontWeight: 600, color: m.resultat < 0 ? '#9B2C20' : '#0B4A40' }}>{dh(m.resultat)}</td>
                  <td aria-hidden><div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ height: 7, borderRadius: 4, background: '#0E5A4E', width: `${(m.recettes / max) * 100}%` }} />
                    <span style={{ height: 7, borderRadius: 4, background: '#9FB5AE', width: `${(m.depenses / max) * 100}%` }} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 16, alignItems: 'start' }}>
        <div className="ad-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconeRonde Icon={Receipt} taille={36} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>المصاريف</h2>
          </div>
          {c && Object.keys(c.parCategorie).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(c.parCategorie).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <span key={k} style={{ fontSize: 13, background: '#F1EFEA', color: '#3B4A47', borderRadius: 999, padding: '4px 12px' }}>{CATEGORIES[k] ?? k} · <span className="num">{dh(v)}</span></span>
              ))}
            </div>
          )}
          {depenses && depenses.length === 0 && <EtatVide Icon={Receipt} texte="لا مصاريف مسجّلة لهذه السنة." />}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {(depenses ?? []).filter((d) => !masques.has(d.id)).map((d, i, arr) => (
              <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEEAE1' : 0 }}>
                <span className="num" style={{ fontSize: 13, color: '#5E6B67', width: 74, flex: 'none' }}>{fmtDate(d.date)}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{d.libelle}{d.recurrente && <span style={{ marginInlineStart: 6, fontSize: 11, fontWeight: 600, color: '#0B4A40', background: '#E3F0EC', borderRadius: 999, padding: '1px 8px' }}>شهري</span>}</span>
                  <span style={{ fontSize: 12, color: '#5E6B67' }}>{CATEGORIES[d.categorie] ?? d.categorie}{d.note ? ` · ${d.note}` : ''}</span>
                </span>
                <span className="num" style={{ fontWeight: 600 }}>{dh(d.montant)}</span>
                <button type="button" aria-label={`حذف ${d.libelle}`} className="ad-btn" style={{ width: 36, minHeight: 36, padding: 0, justifyContent: 'center' }} onClick={() => supprimer(d)}><Trash2 size={15} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </div>

        <div className="ad-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconeRonde Icon={Banknote} taille={36} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>الدفعات المسجّلة</h2>
          </div>
          {c && c.paiements.length === 0 && <EtatVide Icon={Banknote} texte="لا دفعات هذه السنة. تُسجَّل من تبويب الحسابات (زر «دفعة»)." />}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {(c?.paiements ?? []).map((p, i, arr) => (
              <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEEAE1' : 0 }}>
                <span className="num" style={{ fontSize: 13, color: '#5E6B67', width: 74, flex: 'none' }}>{fmtDate(p.date)}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.avocat ? `ذ. ${p.avocat}` : '—'}</span>
                  <span style={{ fontSize: 12, color: '#5E6B67' }}>{OFFRES[p.plan as Plan]?.nom ?? p.plan} · {METHODE[p.methode] ?? p.methode}{p.reference ? ` · ${p.reference}` : ''}</span>
                </span>
                <span className="num" style={{ fontWeight: 600, color: '#0B4A40' }}>+{dh(p.montant)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {form && <FormDepense onFermer={() => setForm(false)} onOk={() => { setForm(false); maj() }} />}
    </section>
  )
}

function Chiffre({ t, v, alerte }: { t: string; v: React.ReactNode; alerte?: boolean }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${alerte ? '#F0C9C2' : '#E4E0D6'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, color: '#5E6B67' }}>{t}</span>
      <strong className="num" style={{ fontSize: 24, fontWeight: 600, color: alerte ? '#9B2C20' : '#15201E', textAlign: 'right' }}>{v}</strong>
    </div>
  )
}

function Panneau({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={titre} onKeyDown={(e) => { if (e.key === 'Escape') onFermer() }} style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '8vh 16px 16px', overflowY: 'auto' }}>
      <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(21,32,30,.45)' }} />
      <div style={{ position: 'relative', width: 'min(560px, 100%)', background: '#FFFFFF', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="إغلاق" className="ad-btn" style={{ width: 40, padding: 0, justifyContent: 'center' }}><X size={16} aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function useEnvoi() {
  const { toast } = useToast()
  const [enCours, setEnCours] = useState(false)
  const envoyer = async (fn: () => Promise<void>, ok: string) => {
    setEnCours(true)
    try { await fn(); toast(ok, 'success') } catch (e: any) { toast(erreurAr(e?.message), 'error') } finally { setEnCours(false) }
  }
  return { enCours, envoyer }
}

function FormNouveau({ fondateursRestants, onFermer, onCree }: { fondateursRestants: number; onFermer: () => void; onCree: (a: Acces) => void }) {
  const [f, setF] = useState({ prenom: '', nom: '', email: '', telephone: '', barreau: '', plan: 'SOLO' as Plan, estFondateur: fondateursRestants > 0, prix: '', essaiMois: fondateursRestants > 0 ? '3' : '1', note: '', limite: '' })
  const { enCours, envoyer } = useEnvoi()
  const prixDefaut = f.estFondateur ? OFFRES[f.plan].fondateur : OFFRES[f.plan].prix
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      const r = await apiFetch<{ motDePasseProvisoire: string }>('/admin/comptes', { method: 'POST', body: JSON.stringify({
        prenom: f.prenom, nom: f.nom, email: f.email, telephone: f.telephone, barreau: f.barreau || undefined,
        plan: f.plan, estFondateur: f.estFondateur, prixMensuel: f.prix ? Number(f.prix) : null, essaiMois: Number(f.essaiMois), note: f.note || undefined,
        maxDossiers: versLimite(f.limite),
      }) })
      onCree({ titre: 'الحساب جاهز', prenom: f.prenom, telephone: f.telephone, email: f.email.trim().toLowerCase(), mdp: r.motDePasseProvisoire })
    }, 'أُنشئ الحساب.')
  }
  return (
    <Panneau titre="حساب جديد" onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-g">
          <label className="ad-l">الاسم الشخصي<input className="ad-in" required minLength={2} value={f.prenom} onChange={set('prenom')} /></label>
          <label className="ad-l">الاسم العائلي<input className="ad-in" required minLength={2} value={f.nom} onChange={set('nom')} /></label>
          <label className="ad-l">البريد الإلكتروني<input className="ad-in" type="email" required dir="ltr" value={f.email} onChange={set('email')} /></label>
          <label className="ad-l">الهاتف<input className="ad-in num" type="tel" required minLength={9} placeholder="06…" value={f.telephone} onChange={set('telephone')} /></label>
          <label className="ad-l">هيئة المحامين<input className="ad-in" value={f.barreau} onChange={set('barreau')} placeholder="هيئة الدار البيضاء" /></label>
          <label className="ad-l">العرض<select className="ad-in" value={f.plan} onChange={set('plan')}>{(Object.keys(OFFRES) as Plan[]).map((p) => <option key={p} value={p}>{OFFRES[p].nom}</option>)}</select></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, minHeight: 44 }}>
          <input type="checkbox" checked={f.estFondateur} onChange={set('estFondateur')} disabled={fondateursRestants <= 0 && !f.estFondateur} style={{ width: 22, height: 22, accentColor: '#0E5A4E' }} />
          عضو مؤسس (سعر ثابت مدى الحياة) · تبقّت <span className="num">{Math.max(0, fondateursRestants)}</span> مقعداً
        </label>
        <div className="ad-g">
          <label className="ad-l">الثمن الشهري (درهم)<input className="ad-in num" type="number" min={0} value={f.prix} onChange={set('prix')} placeholder={prixDefaut != null ? String(prixDefaut) : 'حسب عرض السعر'} /></label>
          <label className="ad-l">الفترة المجانية (أشهر)<input className="ad-in num" type="number" min={0} max={12} value={f.essaiMois} onChange={set('essaiMois')} /></label>
          <ChampLimite valeur={f.limite} onChange={(v) => setF({ ...f, limite: v })} />
        </div>
        <label className="ad-l">ملاحظة داخلية<textarea className="ad-in" rows={2} style={{ padding: 10, minHeight: 60 }} value={f.note} onChange={set('note')} /></label>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}{enCours ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}</button>
      </form>
    </Panneau>
  )
}

const versDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const versIso = (d: string) => (d ? new Date(`${d}T23:59:59`).toISOString() : null)

function FormOffre({ compte, onFermer, onOk }: { compte: Compte; onFermer: () => void; onOk: () => void }) {
  const a = compte.abonnement
  const [f, setF] = useState({ plan: (a?.plan ?? 'SOLO') as Plan, estFondateur: a?.estFondateur ?? false, prix: a?.prixMensuel?.toString() ?? '', essai: versDate(a?.essaiJusquAu ?? null), paye: versDate(a?.payeJusquAu ?? null), note: a?.note ?? '', limite: a?.maxDossiers?.toString() ?? '' })
  const { enCours, envoyer } = useEnvoi()
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      await apiFetch(`/admin/comptes/${compte.id}/abonnement`, { method: 'PATCH', body: JSON.stringify({
        plan: f.plan, estFondateur: f.estFondateur, prixMensuel: f.prix ? Number(f.prix) : null,
        essaiJusquAu: versIso(f.essai), payeJusquAu: versIso(f.paye), note: f.note || null, maxDossiers: versLimite(f.limite),
      }) })
      onOk()
    }, 'حُفظ العرض.')
  }
  return (
    <Panneau titre={`عرض ذ. ${compte.prenom} ${compte.nom}`} onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-g">
          <label className="ad-l">العرض<select className="ad-in" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as Plan })}>{(Object.keys(OFFRES) as Plan[]).map((p) => <option key={p} value={p}>{OFFRES[p].nom}</option>)}</select></label>
          <label className="ad-l">الثمن الشهري (درهم)<input className="ad-in num" type="number" min={0} value={f.prix} onChange={(e) => setF({ ...f, prix: e.target.value })} placeholder="ثمن العرض" /></label>
          <label className="ad-l">الفترة المجانية حتى<input className="ad-in num" type="date" value={f.essai} onChange={(e) => setF({ ...f, essai: e.target.value })} /></label>
          <label className="ad-l">مدفوع حتى<input className="ad-in num" type="date" value={f.paye} onChange={(e) => setF({ ...f, paye: e.target.value })} /></label>
          <ChampLimite valeur={f.limite} onChange={(v) => setF({ ...f, limite: v })} />
        </div>
        {f.limite && Number(f.limite) < compte.dossiers && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: '#7A4E06', background: '#FDF1DC', borderRadius: 10, padding: '8px 12px' }}>
            يتابع هذا الحساب <span className="num">{compte.dossiers}</span> ملفاً، أكثر من الحد. تبقى ملفاته الحالية متابَعة، لكن لن يستطيع إضافة ملف جديد.
          </p>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, minHeight: 44 }}><input type="checkbox" checked={f.estFondateur} onChange={(e) => setF({ ...f, estFondateur: e.target.checked })} style={{ width: 22, height: 22, accentColor: '#0E5A4E' }} />عضو مؤسس</label>
        <label className="ad-l">ملاحظة داخلية<textarea className="ad-in" rows={2} style={{ padding: 10, minHeight: 60 }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}حفظ</button>
      </form>
    </Panneau>
  )
}

function FormPaiement({ compte, onFermer, onOk }: { compte: Compte; onFermer: () => void; onOk: () => void }) {
  const a = compte.abonnement!
  const prix = a.prixMensuel ?? (a.estFondateur ? OFFRES[a.plan]?.fondateur : OFFRES[a.plan]?.prix) ?? 0
  const [f, setF] = useState({ mois: '1', montant: String(prix), methode: 'VIREMENT', reference: '' })
  const { enCours, envoyer } = useEnvoi()
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      await apiFetch(`/admin/comptes/${compte.id}/paiements`, { method: 'POST', body: JSON.stringify({ montant: Number(f.montant), mois: Number(f.mois), methode: f.methode, reference: f.reference || undefined }) })
      onOk()
    }, 'سُجّلت الدفعة ومُدّد الاشتراك.')
  }
  return (
    <Panneau titre={`دفعة · ذ. ${compte.prenom} ${compte.nom}`} onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-g">
          <label className="ad-l">عدد الأشهر<select className="ad-in" value={f.mois} onChange={(e) => { const m = Number(e.target.value); setF({ ...f, mois: e.target.value, montant: String(m === 12 ? prix * 10 : prix * m) }) }}>
            {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m === 12 ? '12 شهراً (10 مدفوعة)' : `${m} ${m === 1 ? 'شهر' : 'أشهر'}`}</option>)}
          </select></label>
          <label className="ad-l">المبلغ (درهم)<input className="ad-in num" type="number" min={1} required value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} /></label>
          <label className="ad-l">طريقة الأداء<select className="ad-in" value={f.methode} onChange={(e) => setF({ ...f, methode: e.target.value })}><option value="VIREMENT">تحويل بنكي</option><option value="CHEQUE">شيك</option><option value="ESPECES">نقداً</option></select></label>
          <label className="ad-l">المرجع<input className="ad-in" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="رقم الشيك أو التحويل" /></label>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#5E6B67' }}>يُمدَّد الاشتراك ابتداءً من {a.payeJusquAu && new Date(a.payeJusquAu) > new Date() ? <>نهاية الفترة المدفوعة (<span className="num">{fmtDate(a.payeJusquAu)}</span>)</> : 'اليوم'}.</p>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}تسجيل الدفعة</button>
      </form>
    </Panneau>
  )
}

function FormActivation({ compte, fondateursRestants, onFermer, onOk }: { compte: Compte; fondateursRestants: number; onFermer: () => void; onOk: () => void }) {
  const suggere: Plan = compte.demande?.structure === 'CABINET' ? 'CABINET' : 'SOLO' as Plan
  const [f, setF] = useState<{ plan: Plan; estFondateur: boolean; prix: string; essaiMois: string; note: string; limite: string }>({ plan: suggere, estFondateur: fondateursRestants > 0, prix: '', essaiMois: fondateursRestants > 0 ? '3' : '1', note: '', limite: '' })
  const { enCours, envoyer } = useEnvoi()
  const prixDefaut = f.estFondateur ? OFFRES[f.plan].fondateur : OFFRES[f.plan].prix
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      await apiFetch(`/admin/comptes/${compte.id}/activer`, { method: 'POST', body: JSON.stringify({
        plan: f.plan, estFondateur: f.estFondateur, prixMensuel: f.prix ? Number(f.prix) : null, essaiMois: Number(f.essaiMois), note: f.note || undefined,
        maxDossiers: versLimite(f.limite),
      }) })
      onOk()
    }, 'فُعّل الحساب.')
  }
  return (
    <Panneau titre={`تفعيل حساب ذ. ${compte.prenom} ${compte.nom}`} onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-g">
          <label className="ad-l">العرض<select className="ad-in" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as Plan })}>{(Object.keys(OFFRES) as Plan[]).map((p) => <option key={p} value={p}>{OFFRES[p].nom}</option>)}</select></label>
          <label className="ad-l">الثمن الشهري (درهم)<input className="ad-in num" type="number" min={0} value={f.prix} onChange={(e) => setF({ ...f, prix: e.target.value })} placeholder={prixDefaut != null ? String(prixDefaut) : 'حسب عرض السعر'} /></label>
          <label className="ad-l">الفترة المجانية (أشهر)<input className="ad-in num" type="number" min={0} max={12} value={f.essaiMois} onChange={(e) => setF({ ...f, essaiMois: e.target.value })} /></label>
          <ChampLimite valeur={f.limite} onChange={(v) => setF({ ...f, limite: v })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, minHeight: 44 }}>
          <input type="checkbox" checked={f.estFondateur} onChange={(e) => setF({ ...f, estFondateur: e.target.checked })} disabled={fondateursRestants <= 0 && !f.estFondateur} style={{ width: 22, height: 22, accentColor: '#0E5A4E' }} />
          عضو مؤسس (سعر ثابت مدى الحياة) · تبقّت <span className="num">{Math.max(0, fondateursRestants)}</span> مقعداً
        </label>
        <label className="ad-l">ملاحظة داخلية<textarea className="ad-in" rows={2} style={{ padding: 10, minHeight: 60 }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثال: اتصال يوم 24/10، مهتم بعرض المكتب" /></label>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}{enCours ? 'جارٍ التفعيل…' : 'تفعيل الحساب'}</button>
      </form>
    </Panneau>
  )
}

function FormDesactivation({ compte, onFermer, onOk }: { compte: Compte; onFermer: () => void; onOk: () => void }) {
  const [motif, setMotif] = useState('')
  const { enCours, envoyer } = useEnvoi()
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      await apiFetch(`/admin/comptes/${compte.id}/desactiver`, { method: 'POST', body: JSON.stringify({ motif: motif || undefined }) })
      onOk()
    }, 'عُطّل الحساب.')
  }
  return (
    <Panneau titre={`تعطيل حساب ذ. ${compte.prenom} ${compte.nom}`} onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div role="alert" style={{ background: '#FBF1EF', border: '1px solid #F0C9C2', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#6E1D14', lineHeight: 1.7 }}>
          يُغلق الدخول فوراً وتتوقف مزامنة ملفاته وتنبيهاته (ومنها تنبيهات الآجال). تبقى بياناته محفوظة ويمكن إعادة التفعيل في أي وقت.
        </div>
        <label className="ad-l">السبب (داخلي، اختياري)<input className="ad-in" value={motif} maxLength={300} onChange={(e) => setMotif(e.target.value)} placeholder="مثال: عدم الأداء بعد المهلة" /></label>
        <button type="submit" className="ad-btn p" style={{ minHeight: 48, justifyContent: 'center', background: '#9B2C20', borderColor: '#9B2C20', color: '#FFFFFF' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}تعطيل الحساب</button>
      </form>
    </Panneau>
  )
}

function FormDepense({ onFermer, onOk }: { onFermer: () => void; onOk: () => void }) {
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), categorie: 'HEBERGEMENT', libelle: '', montant: '', recurrente: false, note: '' })
  const { enCours, envoyer } = useEnvoi()
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      await apiFetch('/admin/depenses', { method: 'POST', body: JSON.stringify({ ...f, montant: Number(f.montant), note: f.note || undefined }) })
      onOk()
    }, 'سُجّل المصروف.')
  }
  return (
    <Panneau titre="مصروف جديد" onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-g">
          <label className="ad-l">التاريخ<input className="ad-in num" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label className="ad-l">الصنف<select className="ad-in" value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })}>{Object.entries(CATEGORIES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
          <label className="ad-l">البيان<input className="ad-in" required minLength={2} value={f.libelle} onChange={(e) => setF({ ...f, libelle: e.target.value })} placeholder="مثال: VPS Contabo — أكتوبر" /></label>
          <label className="ad-l">المبلغ (درهم)<input className="ad-in num" type="number" min={0.01} step="0.01" required value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} /></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, minHeight: 44 }}>
          <input type="checkbox" checked={f.recurrente} onChange={(e) => setF({ ...f, recurrente: e.target.checked })} style={{ width: 22, height: 22, accentColor: '#0E5A4E' }} />مصروف شهري متكرر
        </label>
        <label className="ad-l">ملاحظة<input className="ad-in" value={f.note} maxLength={500} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}تسجيل</button>
      </form>
    </Panneau>
  )
}

function Identite({ c }: { c: Compte }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <strong style={{ fontWeight: 600 }}>ذ. {c.prenom} {c.nom}</strong>
      <span dir="ltr" style={{ fontSize: 13, color: '#5E6B67', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
      {c.barreau && <span style={{ fontSize: 12, color: '#5E6B67' }}>{c.barreau}</span>}
      {c.doitChangerMdp && <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, background: '#F1EFEA', color: '#4D5B57', borderRadius: 999, padding: '1px 8px' }}>كلمة مرور مؤقتة لم تُغيَّر</span>}
    </div>
  )
}

function BadgeCompte({ c }: { c: Compte }) {
  return c.statut === 'DESACTIVE'
    ? <span title={c.motifDesactivation ?? ''} style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px', background: '#F1EFEA', color: '#4D5B57', whiteSpace: 'nowrap' }}>معطّل{c.motifDesactivation ? ` · ${c.motifDesactivation}` : ''}</span>
    : <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px', background: '#E3F0EC', color: '#0B4A40', whiteSpace: 'nowrap' }}>نشط</span>
}

/** Dossiers suivis / limite fixée par l'administrateur (« بلا حد » par défaut) ; ambre à 90 %, rouge à la limite. */
function Dossiers({ c }: { c: Compte }) {
  const max = c.abonnement?.maxDossiers ?? null
  if (max == null) return <span style={{ whiteSpace: 'nowrap' }}><span className="num">{c.dossiers}</span><span style={{ color: '#5E6B67' }}> · بلا حد</span></span>
  const plein = c.dossiers >= max
  const ton = plein ? '#9B2C20' : c.dossiers >= max * 0.9 ? '#7A4E06' : '#15201E'
  return (
    <span style={{ color: ton, fontWeight: 600, whiteSpace: 'nowrap' }} title={`الحد: ${max}`}>
      <bdi dir="ltr" className="num">{c.dossiers} / {max}</bdi>
      {plein && <span style={{ fontWeight: 400 }}> · بلغ الحد</span>}
    </span>
  )
}

/** Champ « حد الملفات » : vide = illimité. */
function ChampLimite({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  return (
    <label className="ad-l">حد الملفات
      <input className="ad-in num" type="number" min={1} step={1} inputMode="numeric" value={valeur} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} placeholder="بلا حد" />
      <span style={{ fontSize: 12, fontWeight: 400, color: '#5E6B67' }}>اتركوه فارغاً لعدد غير محدود. يُحتسب لكل المكتب.</span>
    </label>
  )
}
const versLimite = (v: string) => (v ? Number(v) : null)

function Offre({ a }: { a: Compte['abonnement'] }) {
  if (!a) return <span style={{ color: '#5E6B67', fontWeight: 400 }}>عضو مكتب</span>
  const prix = a.prixMensuel ?? (a.estFondateur ? OFFRES[a.plan]?.fondateur : OFFRES[a.plan]?.prix)
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <span>{OFFRES[a.plan]?.nom ?? a.plan}{a.estFondateur && <span style={{ marginInlineStart: 6, fontSize: 12, fontWeight: 700, background: '#F2A93B', color: '#15201E', borderRadius: 999, padding: '2px 8px' }}>مؤسس</span>}</span>
      <span style={{ fontSize: 12, color: '#5E6B67', fontWeight: 400 }}>{prix != null ? <><span className="num">{prix}</span> درهم/شهر</> : 'عرض سعر'}</span>
    </span>
  )
}

function BadgeEtat({ a }: { a: Compte['abonnement'] }) {
  if (!a) return null
  const e = ETAT[a.etat]
  return <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px', background: e.bg, color: e.fg, whiteSpace: 'nowrap' }}>{e.t}</span>
}

type Admin = { id: string; prenom: string; nom: string; email: string; telephone: string | null; moi: boolean; derniereConnexion: string | null; doitChangerMdp?: boolean }
type Acces = { titre: string; prenom: string; telephone: string | null; email: string; mdp: string }

function OngletAdmins() {
  const { toast } = useToast()
  const { data: admins, refetch } = useApi<Admin[]>('/admin/admins')
  const [ajout, setAjout] = useState(false)
  const [mdp, setMdp] = useState(false)
  const [acces, setAcces] = useState<Acces | null>(null)
  const { cle: envoi, occupe, lancer } = useActionLigne()
  const reinitialiser = async (a: Admin) => {
    if (!window.confirm(`إعادة تعيين كلمة مرور ${a.prenom} ${a.nom}؟`)) return
    await lancer(a.id, async () => { try {
      const r = await apiFetch<{ motDePasseProvisoire: string }>(`/admin/comptes/${a.id}/reinitialiser-mdp`, { method: 'POST' })
      setAcces({ titre: 'كلمة مرور مؤقتة', prenom: a.prenom, telephone: a.telephone, email: a.email, mdp: r.motDePasseProvisoire })
    } catch (e: any) { toast(erreurAr(e?.message), 'error') } })
  }
  const { masques, differer } = useActionAnnulable()
  const retirer = (a: Admin) => differer([a.id], `حُذف المشرف ${a.prenom} ${a.nom}.`, () => apiFetch(`/admin/admins/${a.id}`, { method: 'DELETE' }), refetch)
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-label="المشرفون">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" className="ad-btn p mp-action" style={{ minHeight: 44 }} onClick={() => setAjout(true)}><Plus size={16} aria-hidden />مشرف جديد</button>
        <button type="button" className="ad-btn" style={{ minHeight: 44 }} onClick={() => setMdp(true)}><KeyRound size={16} aria-hidden />تغيير كلمة مروري</button>
      </div>
      <ul className="ad-card" style={{ listStyle: 'none', margin: 0, gap: 0, padding: '6px 20px' }}>
        {!admins && <li className="mp-skeleton" style={{ height: 60 }} />}
        {(admins ?? []).filter((a) => !masques.has(a.id)).map((a, i, arr) => (
          <li key={a.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #EEEAE1' : 0 }}>
            <IconeRonde Icon={ShieldCheck} ton={a.moi ? 'vert' : 'menthe'} taille={40} />
            <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <strong style={{ fontWeight: 600 }}>{a.prenom} {a.nom}{a.moi && <span style={{ marginInlineStart: 8, fontSize: 12, fontWeight: 600, background: '#E3F0EC', color: '#0B4A40', borderRadius: 999, padding: '2px 8px' }}>أنتم</span>}</strong>
              <span dir="ltr" style={{ fontSize: 13, color: '#5E6B67', textAlign: 'right' }}>{a.email}</span>
            </div>
            <span style={{ fontSize: 13, color: '#5E6B67' }}>{a.derniereConnexion ? <>آخر دخول <span className="num">{fmtDate(a.derniereConnexion)}</span></> : 'لم يدخل بعد'}</span>
            {!a.moi && <button type="button" className="ad-btn" onClick={() => reinitialiser(a)} disabled={occupe} aria-busy={envoi === a.id}><Attente actif={envoi === a.id} texte="جارٍ الإنشاء…" sombre><KeyRound size={15} aria-hidden />كلمة مرور مؤقتة</Attente></button>}
            {!a.moi && <button type="button" className="ad-btn" style={{ color: '#9B2C20' }} onClick={() => retirer(a)}><Trash2 size={15} aria-hidden />حذف</button>}
          </li>
        ))}
      </ul>
      {ajout && <FormAdmin onFermer={() => setAjout(false)} onCree={(a) => { setAjout(false); setAcces(a); refetch() }} />}
      {mdp && <FormMotDePasse onFermer={() => setMdp(false)} />}
      {acces && <PanneauAcces acces={acces} onFermer={() => setAcces(null)} admin />}
    </section>
  )
}

function FormAdmin({ onFermer, onCree }: { onFermer: () => void; onCree: (a: Acces) => void }) {
  const [f, setF] = useState({ prenom: '', nom: '', email: '', telephone: '' })
  const { enCours, envoyer } = useEnvoi()
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => {
      const r = await apiFetch<{ motDePasseProvisoire: string }>('/admin/admins', { method: 'POST', body: JSON.stringify({ ...f, telephone: f.telephone || undefined }) })
      onCree({ titre: 'حساب المشرف جاهز', prenom: f.prenom, telephone: f.telephone || null, email: f.email.trim().toLowerCase(), mdp: r.motDePasseProvisoire })
    }, 'أُنشئ حساب المشرف.')
  }
  return (
    <Panneau titre="مشرف جديد" onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-g">
          <label className="ad-l">الاسم الشخصي<input className="ad-in" required minLength={2} value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} /></label>
          <label className="ad-l">الاسم العائلي<input className="ad-in" required minLength={2} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></label>
          <label className="ad-l">البريد الإلكتروني<input className="ad-in" type="email" required dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label className="ad-l">الهاتف <span style={{ fontWeight: 400, color: '#5E6B67' }}>(اختياري)</span><input className="ad-in num" type="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} placeholder="06…" /></label>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#5E6B67', lineHeight: 1.7 }}>للمشرف نفس صلاحياتكم: الطلبات، الحسابات، المحاسبة وإضافة مشرفين آخرين.</p>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}إنشاء الحساب</button>
      </form>
    </Panneau>
  )
}

function FormMotDePasse({ onFermer }: { onFermer: () => void }) {
  const [f, setF] = useState({ actuel: '', nouveau: '' })
  const { enCours, envoyer } = useEnvoi()
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    envoyer(async () => { await apiFetch('/auth/mot-de-passe', { method: 'POST', body: JSON.stringify(f) }); onFermer() }, 'غُيّرت كلمة المرور، وأُغلقت الجلسات الأخرى.')
  }
  return (
    <Panneau titre="تغيير كلمة المرور" onFermer={onFermer}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="ad-l">كلمة المرور الحالية<input className="ad-in" type="password" dir="ltr" autoComplete="current-password" required value={f.actuel} onChange={(e) => setF({ ...f, actuel: e.target.value })} /></label>
        <label className="ad-l">كلمة المرور الجديدة<input className="ad-in" type="password" dir="ltr" autoComplete="new-password" required minLength={12} value={f.nouveau} onChange={(e) => setF({ ...f, nouveau: e.target.value })} />
          <span style={{ fontSize: 13, fontWeight: 400, color: '#5E6B67' }}><span className="num">12</span> حرفاً على الأقل لحساب الإدارة</span></label>
        <button type="submit" className="ad-btn p mp-action" style={{ minHeight: 48, justifyContent: 'center' }} disabled={enCours} aria-busy={enCours}>{enCours && <Indicateur taille={16} courant />}حفظ</button>
      </form>
    </Panneau>
  )
}

// Identifiants provisoires à transmettre : e-mail + mot de passe, à changer à la première connexion
function PanneauAcces({ acces, onFermer, admin }: { acces: Acces; onFermer: () => void; admin?: boolean }) {
  const { toast } = useToast()
  const url = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
  const message = `مرحباً ${admin ? '' : 'ذ. '}${acces.prenom}، هذه معلومات الدخول إلى ملفاتي:\nالرابط: ${url}\nالبريد: ${acces.email}\nكلمة المرور المؤقتة: ${acces.mdp}\nسيُطلب منكم اختيار كلمة مرور جديدة عند أول دخول.`
  const copier = async (t: string) => { await navigator.clipboard?.writeText(t).catch(() => {}); toast('نُسخ.', 'success') }
  return (
    <Panneau titre={acces.titre} onFermer={onFermer}>
      <p style={{ margin: 0, fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>أرسلوا هذه المعلومات للمعني بالأمر. كلمة المرور مؤقتة: <strong>يجب تغييرها عند أول دخول</strong>، ولن تظهر هنا مرة أخرى.</p>
      <dl className="ad-dl" style={{ background: '#F7F5F0', borderRadius: 12, padding: '12px 14px' }}>
        <dt>البريد</dt><dd dir="ltr" style={{ textAlign: 'right' }}>{acces.email}</dd>
        <dt>كلمة المرور</dt><dd><span className="num" style={{ fontSize: 18, letterSpacing: 1 }}>{acces.mdp}</span></dd>
      </dl>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {acces.telephone && <a className="ad-btn p mp-action" target="_blank" rel="noopener noreferrer" href={lienWhatsapp(acces.telephone, message)}><MessageCircle size={16} aria-hidden /> إرسال عبر واتساب</a>}
        <button type="button" className={acces.telephone ? 'ad-btn' : 'ad-btn p'} onClick={() => copier(message)}><Copy size={16} aria-hidden /> نسخ الرسالة</button>
        <button type="button" className="ad-btn" onClick={() => copier(acces.mdp)}>نسخ كلمة المرور فقط</button>
      </div>
    </Panneau>
  )
}
