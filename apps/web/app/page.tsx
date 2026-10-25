// Landing de vente (SEO : métadonnées, JSON-LD et textes réels). Contact : NEXT_PUBLIC_CONTACT_TEL (ou CONTACT_COMMERCIAL_TEL) au build.
// Pas de faux témoignages ni de chiffres inventés : à ajouter seulement avec l'accord écrit d'avocats clients.
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Bell, Plus, CalendarClock, FileSearch, ShieldCheck, UserRound, Smartphone, Server, Mail, CheckCircle2, ArrowLeft,
  Clock, CalendarDays, Calculator, Sparkles, FileText, Users, Lock, Gavel, ScanText, ListChecks, Bot,
} from 'lucide-react'
import { IconeRonde, PastilleSection, IllusChecklist } from '@/components/ui/Visuels'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')
const TEL = process.env.NEXT_PUBLIC_CONTACT_TEL || process.env.CONTACT_COMMERCIAL_TEL || '+212607167594'
const EMAIL = process.env.CONTACT_COMMERCIAL_EMAIL || 'contact@malafipro.ma'
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const TITRE = 'ملفاتي MalafiPro — متابعة ملفات محاكم وآجال الطعن بالذكاء الاصطناعي للمحامين في المغرب'
const DESCRIPTION = 'ملفاتي يتابع ملفاتكم على بوابة محاكم تلقائياً، يقرأ الإجراءات بالذكاء الاصطناعي، يحسب آجال الاستئناف والتعرض والنقض، ويُنبّهكم على واتساب قبل آخر أجل. مساعد قانوني مبني على نصوص القانون المغربي. Logiciel de suivi des dossiers mahakim et des délais pour avocats au Maroc.'

export const metadata: Metadata = {
  title: { absolute: TITRE },
  description: DESCRIPTION,
  keywords: ['الذكاء الاصطناعي للمحامين', 'مساعد قانوني', 'محاكم', 'متابعة الملفات', 'آجال الطعن', 'أجل الاستئناف', 'برنامج للمحامين', 'مكتب المحاماة', 'المسطرة المدنية', 'تنبيهات واتساب', 'mahakim.ma', 'logiciel avocat Maroc', 'IA juridique Maroc', 'suivi dossiers mahakim', 'délais de recours'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', locale: 'ar_MA', alternateLocale: ['fr_MA'], url: '/', siteName: 'MalafiPro — ملفاتي',
    title: TITRE, description: DESCRIPTION,
    images: [{ url: '/og-malafipro.jpg', width: 1200, height: 630, alt: 'ملفاتي MalafiPro على حاسوب محامٍ في مكتبه' }],
  },
  twitter: { card: 'summary_large_image', title: TITRE, description: DESCRIPTION, images: ['/og-malafipro.jpg'] },
}

function lienContact(texte: string) {
  if (!TEL) return `mailto:${EMAIL}?subject=${encodeURIComponent('عرض ملفاتي')}&body=${encodeURIComponent(texte)}`
  return `https://wa.me/${TEL.replace(/[^\d]/g, '').replace(/^00/, '').replace(/^0/, '212')}?text=${encodeURIComponent(texte)}`
}
const DEMO = lienContact('السلام عليكم، أنا محامٍ وأريد عرضاً مجانياً لملفاتي.')
const FONDATEUR = lienContact('السلام عليكم، أريد حجز مقعد ضمن الأعضاء المؤسسين في ملفاتي.')

// Places restantes (mises à jour toutes les 10 min) ; masquées si l'API ne répond pas
async function placesRestantes(): Promise<number | null> {
  try {
    const r = await fetch(`${API}/api/v1/abonnements/fondateurs`, { next: { revalidate: 600 } })
    if (!r.ok) return null
    return (await r.json()).restants as number
  } catch { return null }
}

// Les problèmes concrets d'un avocat, et la réponse exacte de MalafiPro (même ordre, 1 pour 1)
const PROBLEMES = [
  { titre: 'ساعات ضائعة على بوابة محاكم', detail: 'فتح كل ملف على حدة، كل يوم، بحثاً عن إجراء جديد أو تأجيل أو حكم.' },
  { titre: 'آجال طعن تمرّ دون انتباه', detail: 'تبليغ أو حكم يبدأ معه أجل الاستئناف أو التعرض، ولا يُكتشف إلا بعد فوات الأوان.' },
  { titre: 'حساب الآجال يدوياً', detail: 'عدّ الأيام، العطل، نوع المسطرة عادية أو استعجالية: خطأ واحد يكفي لضياع حق الموكل.' },
  { titre: 'جلسات تُنسى أو يُخلط تاريخها', detail: 'مذكرة ورقية، هاتف، رسائل… ولا مكان واحد يجمع جلسات كل الملفات.' },
  { titre: 'خلط بين ما عليكم وما على الخصم', detail: 'قائمة آجال طويلة لا تفرّق بين ما يجب أن تقوموا به، وما يخص الطرف الآخر.' },
  { titre: 'تحرير نفس المعطيات مرة بعد مرة', detail: 'أسماء الأطراف، رقم الملف، المحكمة… تُكتب من جديد في كل مقال وإنذار.' },
]
const SOLUTIONS = [
  { titre: 'متابعة تلقائية لكل ملفاتكم', detail: 'نتحقق من بوابة محاكم عدة مرات في اليوم، ولا نخبركم إلا عندما يتحرك ملف.' },
  { titre: 'تنبيه واتساب قبل آخر أجل', detail: 'قبل 7 أيام، ثم قبل 48 ساعة، ثم صباح آخر يوم. لا أجل يمرّ دون علمكم.' },
  { titre: 'حساب تلقائي للآجال', detail: 'حسب قانون المسطرة المدنية، مع مراعاة العطل ونوع المسطرة.' },
  { titre: 'أجندة واحدة للجلسات', detail: 'تُحدَّث من محاكم تلقائياً، مع ملخص كل صباح على واتساب.' },
  { titre: '«عليكم» و«على الخصم» منفصلان', detail: 'ما عليكم مع زر الإجراء، وآجال الخصم تحت المراقبة دون إزعاج.' },
  { titre: 'مقالات وإنذارات جاهزة', detail: 'مسودة من معطيات الملف مباشرة، تعدّلونها ثم تحمّلونها بصيغة Word.' },
]

// Ce que fait l'IA, concrètement (fonctions réelles de l'app)
const IA = [
  { Icon: ScanText, titre: 'يقرأ كل إجراء ويفهمه', texte: 'حكم، تبليغ، تأجيل، خبرة… يصنّف الذكاء الاصطناعي كل إجراء جديد على محاكم، ويستخرج منه الأجل الذي بدأ يسري.' },
  { Icon: Sparkles, titre: 'مساعد قانوني بالعربية', texte: 'اسألوه كما تسألون زميلاً: يجيب مع الإحالة على فصول القانون المغربي التي اعتمد عليها، لتتحققوا بأنفسكم.' },
  { Icon: FileText, titre: 'يحرّر المقالات والإنذارات', texte: 'مسودة كاملة من معطيات الملف: الأطراف، المحكمة، الوقائع. تعدّلونها ثم تحمّلونها بصيغة Word.' },
  { Icon: ListChecks, titre: 'يلخّص الملف في سطرين', texte: 'أين وصل الملف، ما آخر إجراء، وما المطلوب منكم الآن. قبل الجلسة أو قبل مكالمة الموكل.' },
]

const BANDEAU = [
  { Icon: FileSearch, titre: 'متابعة محاكم', texte: 'كل ملفاتكم دون فتح البوابة' },
  { Icon: Calculator, titre: 'حساب الآجال', texte: 'الاستئناف، التعرض، النقض' },
  { Icon: Bell, titre: 'تنبيهات واتساب', texte: 'قبل آخر أجل وعند كل جديد' },
  { Icon: CalendarDays, titre: 'أجندة الجلسات', texte: 'الجلسات والمواعيد في مكان واحد' },
  { Icon: Sparkles, titre: 'مساعد بالذكاء الاصطناعي', texte: 'أجوبة مع نصوص القانون المغربي' },
  { Icon: FileText, titre: 'تحرير الوثائق', texte: 'مقالات وإنذارات من معطيات الملف' },
]

const MIZAYA = [
  { Icon: FileSearch, titre: 'متابعة تلقائية لمحاكم', texte: 'كل ملفاتكم في المحاكم الابتدائية ومحاكم الاستئناف، دون فتح البوابة.' },
  { Icon: Calculator, titre: 'حساب آجال الطعن', texte: 'الاستئناف، التعرض، النقض، الأوامر الاستعجالية، مع مراعاة العطل.' },
  { Icon: Bell, titre: 'تنبيهات واتساب', texte: 'قبل آخر أجل، وعند كل إجراء جديد، وملخص صباحي. بالتوقيت الذي تختارونه.' },
  { Icon: CalendarDays, titre: 'أجندة الجلسات', texte: 'الجلسات والآجال ومواعيدكم في تقويم واحد، شهرياً وأسبوعياً.' },
  { Icon: Sparkles, titre: 'مساعد قانوني بالعربية', texte: 'أسئلتكم القانونية مع الإحالة على نصوص القانون المغربي.' },
  { Icon: FileText, titre: 'تحرير المقالات والإنذارات', texte: 'مسودات جاهزة من معطيات الملف، تعدّلونها ثم تحمّلونها بصيغة Word.' },
  { Icon: Users, titre: 'فريق المكتب', texte: 'ادعوا زملاءكم والكتابة: كل واحد بدوره، والملفات مشتركة.' },
  { Icon: ShieldCheck, titre: 'أمان وسرّية', texte: 'اتصال مشفّر، تحقق بخطوتين، ولا نشارك بياناتكم مع أي طرف.' },
]

const FAQ: { Icon: typeof Bell; q: string; r: string }[] = [
  { Icon: CalendarClock, q: 'كم الثمن؟', r: 'ثلاثة أشهر مجاناً للأعضاء المؤسسين، ثم اشتراك شهري بسعر ثابت مدى الحياة. يقترح عليكم مستشارنا العرض المناسب لحجم مكتبكم، دون أي التزام.' },
  { Icon: UserRound, q: 'هل تحتاجون إلى حسابي على محاكم؟', r: 'لا. يكفي رقم الملف والمحكمة: نقرأ المعطيات العمومية كما تظهر على بوابة محاكم.' },
  { Icon: Gavel, q: 'كيف تُحسب الآجال؟', r: 'حسب قانون المسطرة المدنية، انطلاقاً من الإجراءات المنشورة (حكم، تبليغ…)، مع مراعاة نوع المسطرة والعطل. التنبيه وسيلة مساعدة، ويبقى التحقق النهائي من الأجل للمحامي.' },
  { Icon: Clock, q: 'كم يستغرق تفعيل الحساب؟', r: 'املؤوا طلب التسجيل: نتصل بكم خلال يوم عمل، نضبط العرض معكم، ثم نفعّل الحساب. يمكن أن يضيف مستشارنا ملفاتكم الأولى معكم.' },
  { Icon: Smartphone, q: 'هل يعمل على الهاتف؟', r: 'نعم، من متصفح الهاتف أو الحاسوب دون تثبيت، والتنبيهات تصلكم على واتساب.' },
  { Icon: Lock, q: 'هل بياناتي محمية؟', r: 'الاتصال مشفّر، وكلمات المرور محفوظة بشكل آمن، ويمكن تفعيل التحقق بخطوتين. لا نشارك بياناتكم مع أي طرف، وتُعالَج وفق القانون 09.08.' },
  { Icon: Server, q: 'هل يمكن تثبيته داخل مكتبي؟', r: 'نعم. للمكاتب التي تفضّل عدم استعمال السحابة، نثبّت ملفاتي على خوادمكم بعرض سعر حسب الحاجة.' },
  { Icon: Users, q: 'هل يناسب المكاتب الكبيرة؟', r: 'نعم: عرض «مكتب» لعدة مستعملين، ملفات غير محدودة، وأدوار لكل عضو (محامٍ، كتابة، مسؤول المكتب).' },
]

// Données structurées (résultats enrichis Google : logiciel, organisation, FAQ)
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${SITE}/#organisation`, name: 'MalafiPro', alternateName: 'ملفاتي', url: SITE,
      logo: `${SITE}/icon-512.png`, email: EMAIL,
      contactPoint: { '@type': 'ContactPoint', telephone: TEL, email: EMAIL, contactType: 'sales', areaServed: 'MA', availableLanguage: ['ar', 'fr'] },
    },
    { '@type': 'WebSite', '@id': `${SITE}/#site`, url: SITE, name: 'MalafiPro — ملفاتي', inLanguage: 'ar', publisher: { '@id': `${SITE}/#organisation` } },
    {
      '@type': 'SoftwareApplication', name: 'MalafiPro — ملفاتي', applicationCategory: 'BusinessApplication', applicationSubCategory: 'Legal practice management',
      operatingSystem: 'Web, Android, iOS', inLanguage: 'ar', url: SITE, image: `${SITE}/og-malafipro.jpg`, description: DESCRIPTION,
      audience: { '@type': 'BusinessAudience', audienceType: 'المحامون ومكاتب المحاماة في المغرب' },
      featureList: MIZAYA.map((m) => m.titre), publisher: { '@id': `${SITE}/#organisation` },
    },
    {
      '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
    },
  ],
}

const CSS = `
.lp a{text-decoration:none}
.num{font-family:'IBM Plex Sans',sans-serif;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.lp a:focus-visible,.lp summary:focus-visible{outline:none;box-shadow:0 0 0 4px #CDE5DD}
.lp summary{cursor:pointer;list-style:none}.lp summary::-webkit-details-marker{display:none}
.lp details[open] .lp-chev{transform:rotate(45deg)}
.lp-chev{transition:transform .2s}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-size:16px;font-weight:600;border-radius:999px;padding:0 24px;min-height:52px;transition:transform .15s,box-shadow .15s}
.lp-btn:hover{transform:translateY(-1px)}
.lp-btn.action{background:var(--mp-action);color:var(--mp-action-texte);box-shadow:0 12px 24px -14px rgba(156,82,10,.75)}
.lp-btn.blanc{background:#FFFFFF;color:#083B34}
.lp-btn.contour{background:#FFFFFF;color:#083B34;border:1.5px solid #0E5A4E}
.lp-btn.petit{font-size:15px;min-height:44px;padding:0 18px}
.lp-nav a{color:#3B4A47;font-size:15px;font-weight:500;padding:10px 4px;min-height:44px;display:inline-flex;align-items:center}
.lp-nav a:hover{color:#0E5A4E}
.lp-wrap{max-width:1180px;margin:0 auto}
.lp-carte{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:20px;box-shadow:0 10px 30px -24px rgba(8,59,52,.35)}
.lp-titre{display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center}
.lp-h2{margin:0;font-size:34px;font-weight:600;line-height:1.35}
.lp-hero{position:relative;overflow:hidden;background:radial-gradient(1200px 520px at 85% 0%,#0E5A4E 0%,#083B34 60%);color:#E3F0EC;border-radius:0 0 40px 40px}
.lp-hero .lp-nav a{color:#CFE5DD}.lp-hero .lp-nav a:hover{color:#FFFFFF}
.lp-confiance li{color:#CFE5DD !important;border-color:rgba(255,255,255,.18) !important}
.lp-ia{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:16px}
.lp-confiance{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:0}
.lp-confiance li{display:flex;align-items:center;gap:8px;font-size:14px;color:#3B4A47;padding:6px 16px;border-inline-start:1px solid #E4E0D6}
.lp-confiance li:first-child{border-inline-start:0;padding-inline-start:0}
.lp-bande{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))}
.lp-bande>div{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:22px 12px;border-inline-start:1px solid #EEEAE1}
.lp-bande>div:first-child{border-inline-start:0}
.lp-defi{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);overflow:hidden;border-radius:24px;background:#083B34;color:#E3F0EC}
.lp-defi img{width:100%;height:100%;object-fit:cover;object-position:40% 40%;display:block;min-height:320px}
.lp-liste{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
.lp-liste li{display:flex;gap:12px;align-items:flex-start}
.lp-liste strong{display:block;font-size:16px;font-weight:600}
.lp-liste span.d{display:block;font-size:14px;line-height:1.7}
.lp-x{flex:none;width:26px;height:26px;border-radius:50%;background:#C0392B;color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
.lp-sol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 28px}
.lp-app{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:32px;align-items:center}
.lp-faq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.lp-flot{display:none}
@media (max-width: 1000px){
  .lp-bande{grid-template-columns:repeat(3,minmax(0,1fr))}
  .lp-bande>div:nth-child(4){border-inline-start:0}
  .lp-bande>div:nth-child(n+4){border-top:1px solid #EEEAE1}
  .lp-defi{grid-template-columns:1fr}.lp-defi img{min-height:0;aspect-ratio:16/9}
  .lp-app{grid-template-columns:1fr}
}
@media (max-width: 760px){
  .lp-nav,.lp-nav-cta{display:none !important}
  .lp-h1{font-size:32px !important}.lp-h2{font-size:26px !important}
  .lp-sec{padding-left:16px !important;padding-right:16px !important}
  .lp-bande{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lp-bande>div{border-inline-start:0 !important;border-top:1px solid #EEEAE1}
  .lp-bande>div:nth-child(-n+2){border-top:0}
  .lp-bande>div:nth-child(even){border-inline-start:1px solid #EEEAE1 !important}
  .lp-sol,.lp-faq{grid-template-columns:1fr}
  .lp-illus{display:none !important}
  .lp-confiance li{border:0;padding:4px 12px 4px 0}
  .lp-flot{display:inline-flex;position:fixed;bottom:16px;left:16px;right:16px;z-index:50}
  .lp-pied{padding-bottom:96px !important}
}
@media (prefers-reduced-motion: reduce){.lp-btn,.lp-chev{transition:none}.lp-btn:hover{transform:none}}
`

const WA = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /><path d="M9 10c0 3 2 5 5 5l1.2-1.2-1.8-1-.9.8c-.9-.4-1.7-1.2-2.1-2.1l.8-.9-1-1.8L9 10z" /></svg>
)
const X = () => <span className="lp-x" aria-hidden><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></span>
const Coche = ({ clair }: { clair?: boolean }) => <CheckCircle2 size={24} color={clair ? '#083B34' : '#FFFFFF'} fill={clair ? '#9FE0C6' : '#0E5A4E'} aria-hidden style={{ flex: 'none', marginTop: 1 }} />

// Logo : symbole + « MalafiPro » seulement
const Logo = ({ sombre }: { sombre?: boolean }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={sombre ? '/brand/logo-symbol-white.svg' : '/brand/malafipro-symbol.svg'} alt="" width={38} height={38} />
    <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 22, fontWeight: 600, color: sombre ? '#FFFFFF' : '#083B34' }}>Malafi<span style={{ fontWeight: 400 }}>Pro</span></span>
  </span>
)

export default async function LandingPage() {
  const restants = await placesRestantes()
  return (
    <div className="lp" dir="rtl" style={{ background: '#F5F3EE', color: '#15201E', fontFamily: "'IBM Plex Sans Arabic', 'IBM Plex Sans', sans-serif" }}>
      <style>{CSS}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* ── Accroche : fond vert dessiné en code (pas de photo), mot souligné ── */}
      <header className="lp-hero lp-sec" style={{ padding: '0 24px 80px' }}>
        <svg aria-hidden width="520" height="520" viewBox="0 0 520 520" style={{ position: 'absolute', left: -140, top: -120, opacity: 0.12 }}><circle cx="260" cy="260" r="220" fill="none" stroke="#9FE0C6" strokeWidth="60" /></svg>
        <svg aria-hidden width="260" height="260" viewBox="0 0 260 260" style={{ position: 'absolute', right: -60, bottom: -80, opacity: 0.08 }}><circle cx="130" cy="130" r="100" fill="none" stroke="#9FE0C6" strokeWidth="36" /></svg>
        <div className="lp-wrap" style={{ position: 'relative' }}>
          <nav aria-label="القائمة" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 76 }}>
            <Link href="/" aria-label="MalafiPro — الصفحة الرئيسية"><Logo sombre /></Link>
            <div className="lp-nav" style={{ display: 'flex', gap: 22 }}>
              <a href="#المشاكل">المشاكل والحلول</a><a href="#الذكاء">الذكاء الاصطناعي</a><a href="#عرض">العرض</a><a href="#أسئلة">الأسئلة الشائعة</a>
            </div>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#FFFFFF', border: '1px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '0 16px', minHeight: 44 }}><UserRound size={18} aria-hidden />الدخول</Link>
          </nav>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'center', paddingTop: 28 }}>
            <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,.1)', color: '#E3F0EC', border: '1px solid rgba(255,255,255,.22)', borderRadius: 999, padding: '6px 14px' }}>
                <Sparkles size={16} color="#9FE0C6" aria-hidden />ذكاء اصطناعي في خدمة المحامين بالمغرب
              </span>
              <h1 className="lp-h1" style={{ margin: 0, fontSize: 54, lineHeight: 1.3, fontWeight: 600, color: '#FFFFFF' }}>
                أجل واحد يفوتكم<br />قد يكلّفكم <span style={{ position: 'relative', display: 'inline-block' }}>موكلاً.<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden style={{ position: 'absolute', right: 0, bottom: -10, width: '100%', height: 14 }}><path d="M4 14C60 4 140 4 196 12" fill="none" stroke="#2E8B6E" strokeWidth="6" strokeLinecap="round" /></svg></span>
              </h1>
              <p style={{ margin: 0, fontSize: 19, lineHeight: 1.85, color: '#CFE5DD', maxWidth: 560 }}>
                ملفاتي يتابع ملفاتكم على بوابة محاكم، <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>يقرأ كل إجراء بالذكاء الاصطناعي</strong>، يحسب آجال الطعن، ويُنبّهكم على واتساب قبل آخر أجل.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn action mp-action">{WA} اطلبوا عرضاً مجانياً</a>
                <Link href="/register" className="lp-btn blanc">طلب التسجيل <ArrowLeft size={18} aria-hidden /></Link>
              </div>
              <ul className="lp-confiance">
                <li><Lock size={18} color="#9FE0C6" aria-hidden />لا نطلب حسابكم على محاكم</li>
                <li><ShieldCheck size={18} color="#9FE0C6" aria-hidden />وفق القانون <span className="num">09.08</span></li>
                <li><Bell size={18} color="#9FE0C6" aria-hidden />تنبيهات على واتساب</li>
              </ul>
            </div>

            {/* Aperçu dessiné : l'IA lit un acte, calcule le délai, l'assistant répond, WhatsApp prévient */}
            <div aria-hidden style={{ flex: '1 1 460px', minWidth: 0, position: 'relative', paddingBottom: 74 }}>
              <div style={{ background: '#F5F3EE', color: '#15201E', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 40px 80px -40px rgba(0,0,0,.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ScanText size={18} /></span>
                  <strong style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>إجراء جديد على محاكم · الملف <span className="num">2026/1801/77</span></strong>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, color: '#3B4A47' }}>«صدر الحكم وتم تبليغه للطرف المدعى عليه»</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E3F0EC', color: '#0B4A40', borderRadius: 999, padding: '4px 10px', fontWeight: 600 }}><Sparkles size={14} />الذكاء الاصطناعي: تبليغ حكم</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F2A93B', color: '#15201E', borderRadius: 999, padding: '4px 10px', fontWeight: 700 }}>أجل الاستئناف: <span className="num">30</span> يوماً</span>
                </div>
                <div style={{ height: 1, background: '#E4E0D6' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#083B34', color: '#FFFFFF', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 13, lineHeight: 1.6 }}>متى يبدأ أجل الاستئناف في هذا الملف؟</span>
                  <span style={{ alignSelf: 'flex-end', maxWidth: '90%', background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: '14px 14px 14px 4px', padding: '8px 12px', fontSize: 13, lineHeight: 1.7, display: 'flex', gap: 8 }}>
                    <Bot size={16} color="#0E5A4E" style={{ flex: 'none', marginTop: 3 }} />
                    <span>من تاريخ التبليغ، ومدته ثلاثون يوماً حسب الفصل <span className="num">134</span> من قانون المسطرة المدنية. آخر أجل: <strong className="num">22/11</strong>.</span>
                  </span>
                </div>
              </div>
              <div style={{ position: 'absolute', left: -12, bottom: 0, width: 280, maxWidth: '80%', background: '#FFFFFF', color: '#15201E', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: '0 24px 48px -24px rgba(0,0,0,.6)' }}>
                <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: '#0E5A4E', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{WA}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, lineHeight: 1.6 }}>
                  <strong style={{ fontWeight: 600 }}>واتساب · ملفاتي <span className="num" style={{ fontWeight: 400, color: '#5E6B67' }}>08:00</span></strong>
                  <span>بقي يومان على أجل الاستئناف في الملف <span className="num">2026/1801/77</span>.</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ── Bandeau des fonctions ──────────────────────────────────── */}
        <section aria-label="ما يقدّمه ملفاتي" className="lp-sec" style={{ padding: '28px 24px 0' }}>
          <div className="lp-wrap lp-carte lp-bande">
            {BANDEAU.map((b) => (
              <div key={b.titre}>
                <IconeRonde Icon={b.Icon} taille={52} />
                <strong style={{ fontSize: 16, fontWeight: 600 }}>{b.titre}</strong>
                <span style={{ fontSize: 13, color: '#5E6B67', lineHeight: 1.6 }}>{b.texte}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Les problèmes, en détail ───────────────────────────────── */}
        <section id="المشاكل" aria-labelledby="t-pb" className="lp-sec" style={{ padding: '64px 24px 24px', scrollMarginTop: 16 }}>
          <div className="lp-wrap lp-defi">
            <div style={{ padding: '36px 36px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h2 id="t-pb" className="lp-h2" style={{ color: '#FFFFFF' }}>المشاكل التي تواجهونها كل يوم</h2>
                <p style={{ margin: '8px 0 0', fontSize: 16, color: '#CFE5DD' }}>هل تعرفون واحدة منها على الأقل؟</p>
              </div>
              <ol className="lp-liste">
                {PROBLEMES.map((p) => (
                  <li key={p.titre}><X /><span><strong style={{ color: '#FFFFFF' }}>{p.titre}</strong><span className="d" style={{ color: '#CFE5DD' }}>{p.detail}</span></span></li>
                ))}
              </ol>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/avocat-deborde-1000.webp" srcSet="/landing/avocat-deborde-600.webp 600w, /landing/avocat-deborde-1000.webp 1000w" sizes="(max-width: 1000px) 100vw, 480px"
              width={1000} height={667} loading="lazy" decoding="async" alt="محامٍ مُرهَق أمام ملفات متراكمة وجلسات ومواعيد في مكتبه" />
          </div>
        </section>

        {/* ── La réponse, point par point ────────────────────────────── */}
        <section aria-labelledby="t-sol" className="lp-sec" style={{ padding: '0 24px 64px' }}>
          <div className="lp-wrap lp-carte" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <h2 id="t-sol" className="lp-h2" style={{ color: '#083B34' }}>الحل مع ملفاتي</h2>
                <p style={{ margin: '8px 0 0', fontSize: 16, color: '#3B4A47' }}>لكل مشكلة جواب واضح، بنفس الترتيب.</p>
              </div>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn action mp-action">{WA} شاهدوه في عرض مجاني</a>
            </div>
            <ol className="lp-liste lp-sol">
              {SOLUTIONS.map((p) => (
                <li key={p.titre}><Coche /><span><strong>{p.titre}</strong><span className="d" style={{ color: '#3B4A47' }}>{p.detail}</span></span></li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Intelligence artificielle ──────────────────────────────── */}
        <section id="الذكاء" aria-labelledby="t-ia" className="lp-sec" style={{ padding: '0 24px 64px', scrollMarginTop: 16 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div className="lp-titre">
              <PastilleSection>الذكاء الاصطناعي</PastilleSection>
              <h2 id="t-ia" className="lp-h2" style={{ color: '#083B34' }}>ذكاء اصطناعي يعرف القانون المغربي</h2>
              <p style={{ margin: 0, fontSize: 17, color: '#3B4A47', lineHeight: 1.8, maxWidth: 700 }}>ليس روبوت محادثة عاماً: ذكاء اصطناعي مبني على نصوص القانون المغربي وعلى ملفاتكم في محاكم، يشتغل في الخلفية من أجلكم.</p>
            </div>
            <div className="lp-ia">
              {IA.map((m) => (
                <div key={m.titre} className="lp-carte" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <IconeRonde Icon={m.Icon} ton="vert" taille={50} />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{m.titre}</h3>
                  <p style={{ margin: 0, fontSize: 15, color: '#3B4A47', lineHeight: 1.8 }}>{m.texte}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#F1F8F5', border: '1px solid #CDE5DD', borderRadius: 16, padding: '14px 18px' }}>
              <ShieldCheck size={22} color="#0E5A4E" aria-hidden />
              <span style={{ flex: '1 1 280px', fontSize: 15, color: '#0B4A40', lineHeight: 1.7 }}><strong style={{ fontWeight: 600 }}>الذكاء الاصطناعي يقترح، والمحامي يقرّر.</strong> كل جواب مرفق بمراجعه، وكل أجل محسوب يمكنكم التحقق منه قبل الإيداع.</span>
            </div>
          </div>
        </section>

        {/* ── L'application ──────────────────────────────────────────── */}
        <section id="المزايا" aria-labelledby="t-app" className="lp-sec" style={{ padding: '0 24px 64px', scrollMarginTop: 16 }}>
          <div className="lp-wrap lp-carte lp-app" style={{ padding: 32, background: 'linear-gradient(135deg,#FFFFFF,#F1F8F5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PastilleSection>على الحاسوب والهاتف</PastilleSection>
              <h2 id="t-app" className="lp-h2" style={{ color: '#083B34' }}>كل ملفاتكم وآجالكم في لوحة واحدة</h2>
              <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.8 }}>بالعربية، بسيطة وواضحة، دون تثبيت: من المكتب أو من المحكمة.</p>
              <ul className="lp-liste" style={{ gap: 10 }}>
                {['الأجندة: الجلسات والآجال ومواعيدكم', 'الآجال مرتبة من الأقرب إلى الأبعد', 'تُحدَّث تلقائياً من محاكم', 'فريق المكتب: كل واحد بدوره'].map((t) => (
                  <li key={t} style={{ alignItems: 'center', fontSize: 15 }}><Coche />{t}</li>
                ))}
              </ul>
              <Link href="/register" className="lp-btn contour" style={{ alignSelf: 'flex-start', marginTop: 4 }}>طلب التسجيل <ArrowLeft size={18} aria-hidden /></Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/app-agenda-1200.webp" srcSet="/landing/app-agenda-800.webp 800w, /landing/app-agenda-1200.webp 1200w" sizes="(max-width: 1000px) 100vw, 640px"
              width={1200} height={800} loading="lazy" decoding="async" alt="أجندة ملفاتي على الحاسوب والهاتف: الجلسات والآجال والمواعيد"
              style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 18 }} />
          </div>
        </section>

        {/* ── Offre fondateurs ───────────────────────────────────────── */}
        <section id="عرض" aria-labelledby="t-offre" className="lp-sec" style={{ padding: '0 24px 64px', scrollMarginTop: 16 }}>
          <div className="lp-wrap" style={{ background: 'radial-gradient(700px 300px at 10% 100%, #0E5A4E 0%, #083B34 70%)', color: '#E3F0EC', borderRadius: 24, padding: '36px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {restants !== null && (
                <span style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 700, color: '#15201E', background: '#F2A93B', borderRadius: 999, padding: '5px 14px' }}>تبقّى <span className="num">{restants}</span> مقعداً من <span className="num">50</span></span>
              )}
              <h2 id="t-offre" className="lp-h2" style={{ color: '#FFFFFF' }}>كونوا من الأعضاء المؤسسين.</h2>
              <ul className="lp-liste" style={{ gap: 10 }}>
                {['ثلاثة أشهر مجاناً', 'سعر ثابت مدى الحياة بعدها', 'مستشار يضيف ملفاتكم الأولى ويضبط التنبيهات معكم'].map((t) => (
                  <li key={t} style={{ alignItems: 'center', fontSize: 16 }}><Coche clair />{t}</li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <a href={FONDATEUR} target="_blank" rel="noopener noreferrer" className="lp-btn action mp-action">{WA} احجزوا مقعدكم</a>
              <span style={{ fontSize: 14, color: '#9FC9BE' }}>بدون بطاقة بنكية · بدون التزام</span>
            </div>
            <span className="lp-illus" style={{ flex: '0 0 auto' }}><IllusChecklist taille={180} /></span>
          </div>
        </section>

        {/* ── Questions ──────────────────────────────────────────────── */}
        <section id="أسئلة" aria-labelledby="t-faq" className="lp-sec" style={{ padding: '0 24px 64px', scrollMarginTop: 16 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="lp-titre">
              <h2 id="t-faq" className="lp-h2">الأسئلة الشائعة</h2>
              <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>أجوبة عن أكثر ما يسأل عنه المحامون قبل البدء.</p>
            </div>
            <div className="lp-faq">
              {FAQ.map(({ q, r }) => (
                <details key={q} className="lp-carte" style={{ padding: '6px 18px', borderRadius: 14 }}>
                  <summary style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52 }}>
                    <h3 style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 600 }}>{q}</h3>
                    <Plus className="lp-chev" size={20} color="#0E5A4E" aria-hidden />
                  </summary>
                  <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.85, color: '#3B4A47' }}>{r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dernier appel ──────────────────────────────────────────── */}
        <section aria-labelledby="t-fin" className="lp-sec" style={{ padding: '0 24px 56px' }}>
          <div className="lp-wrap" style={{ background: 'linear-gradient(135deg,#0E5A4E,#083B34)', borderRadius: 24, padding: '32px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 id="t-fin" className="lp-h2" style={{ fontSize: 30, color: '#FFFFFF' }}>لا تتركوا أجلاً للصدفة.</h2>
              <p style={{ margin: 0, fontSize: 16, color: '#CFE5DD' }}>ملفاتكم تحت المراقبة، من الليلة.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn action mp-action">{WA} اطلبوا عرضاً مجانياً</a>
              <Link href="/register" className="lp-btn" style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,.45)' }}>طلب التسجيل</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-pied" style={{ background: '#083B34', color: '#CFE5DD', padding: '32px 24px 24px', fontSize: 14 }}>
        <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
              <Logo sombre />
              <p style={{ margin: 0, lineHeight: 1.8 }}>متابعة ملفات محاكم وآجال الطعن للمحامين ومكاتب المحاماة في المغرب.</p>
              <p lang="fr" dir="ltr" style={{ margin: 0, lineHeight: 1.7, color: '#9FC9BE', textAlign: 'right' }}>Logiciel de suivi des dossiers mahakim et des délais de recours pour avocats au Maroc.</p>
            </div>
            <nav aria-label="روابط" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
              {[['#المشاكل', 'المشاكل والحلول'], ['#الذكاء', 'الذكاء الاصطناعي'], ['#المزايا', 'المزايا'], ['#عرض', 'العرض'], ['#أسئلة', 'الأسئلة'], ['/register', 'طلب التسجيل'], ['/login', 'الدخول']].map(([h, t]) => (
                <a key={h} href={h} style={{ color: '#E3F0EC', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{t}</a>
              ))}
            </nav>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`mailto:${EMAIL}`} style={{ color: '#E3F0EC', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36 }}><Mail size={18} aria-hidden /><span dir="ltr">{EMAIL}</span></a>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" style={{ color: '#E3F0EC', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36 }}>{WA}<span className="num">{TEL}</span></a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 14, color: '#9FC9BE' }}>© <span className="num">{new Date().getFullYear()}</span> MalafiPro</div>
        </div>
      </footer>

      {/* Bouton toujours visible sur mobile */}
      <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn action mp-action lp-flot">{WA} اطلبوا عرضاً مجانياً</a>
    </div>
  )
}
