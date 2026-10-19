'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

const C = {
  night: '#23201A', night2: '#2E2A22',
  pageA: '#E7D9A6', cream: '#F3EEE0', card: '#FBF9F2', white: '#fff',
  ink: '#26241E', ink2: '#3A3322', muted: '#5B5544', faint: '#9C947F',
  goldL: '#E4CE84', goldM: '#CBAE55', goldD: '#9A7820', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  green: '#3F9E6B', greenBg: '#E6F3EB', red: '#C9543C', redBg: '#FBE9E3', amber: '#C68A2E', amberBg: '#FAF1DE',
  border: '#E9E1CE', borderD: 'rgba(228,206,132,.16)',
  grad: 'linear-gradient(135deg,#E4CE84,#B6912F)',
}

const FEATURES = [
  { k: 'مراقبة آلية يومية', d: 'فحص يومي لبوابة mahakim.ma لكل ملفاتكم. يُرصد كل إجراء جديد لحظة نشره، دون أي تدخّل منكم.',
    i: <path d="M11 17.25a6.25 6.25 0 1 0 0-12.5 6.25 6.25 0 0 0 0 12.5ZM19.5 19.5l-3.9-3.9" /> },
  { k: 'احتساب دقيق للآجال', d: 'آجال الاستئناف والتعرّض والنقض تُحتسب آلياً وفق قانون المسطرة المدنية، مع احتساب أيام العطل.',
    i: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></> },
  { k: 'تنبيهات واتساب فورية', d: 'إشعار فوري عند كل حدث، وملخّص صباحي يومي على الساعة السابعة، يصلكم أينما كنتم.',
    i: <path d="M5 18l-1.5 4 4-1.3A8 8 0 1 0 5 18Z" /> },
  { k: 'مساعد ومحرّر ذكي', d: 'مساعد قانوني يُلمّ بمحفظتكم، ومحرّر يصوغ العقود والمذكّرات القضائية بأسلوبكم المهني.',
    i: <path d="M12 3l2 5 5 .5-4 3.5 1.3 5L12 19l-4.3 2.5L9 16 5 12.5l5-.5 2-5Z" /> },
]

const TRUST = [
  { k: 'مطابق لـ ق.م.م', d: 'الآجال محسوبة وفق قانون المسطرة المدنية المغربي.',
    i: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></> },
  { k: 'بياناتكم محمية', d: 'كل ملف يخصّكم وحدكم. تشفير ووصول مقيّد بحسابكم.',
    i: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></> },
  { k: 'دقّة في الرصد', d: 'محرّك مخصّص لبنية mahakim.ma، يتعرّف على كل أنواع الملفات.',
    i: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></> },
]

const STEPS = [
  { k: 'أضيفوا ملفاتكم', d: 'أدخلوا رقم الملف ومحكمته فقط. يتولّى «مُراقِب» الباقي.' },
  { k: 'نراقب نيابةً عنكم', d: 'فحص يومي تلقائي، ورصد كل إجراء جديد واحتساب آجاله بدقّة.' },
  { k: 'نُنبّهكم في الوقت', d: 'إشعار واتساب قبل كل جلسة وكل أجل حرج، فلا يفوتكم شيء.' },
]

const PLANS = [
  { plan: 'مجاني', prix: 0, sous: 'للتجربة', features: ['3 ملفات', 'تنبيهات واتساب', 'احتساب الآجال'] },
  { plan: 'فردي', prix: 190, sous: 'للمحامي المستقل', features: ['100 ملف', 'تنبيهات واتساب', 'ملخّص صباحي', 'المساعد والمحرّر الذكي', 'دعم بالأولوية'], popular: true },
  { plan: 'مكتب', prix: 790, sous: 'للمكاتب والشركات', features: ['500 ملف', 'محامون متعدّدون', 'ولوج API', 'مرافقة مخصّصة'] },
]

const TEMOINS = [
  { nom: 'ذ. كريم العلوي', ville: 'محامٍ بهيئة الرباط', txt: 'منذ اعتمدت «مُراقِب» لم يفُتني أي أجل استئناف. التنبيه الصباحي صار جزءاً من روتيني اليومي.' },
  { nom: 'ذة. سmiرة بنعيسى', ville: 'محامية بهيئة الدار البيضاء', txt: 'كنت أضيّع ساعات في تفقّد mahakim. الآن كل ملفاتي تحت السيطرة، وأنصرف لما هو أهم.' },
  { nom: 'ذ. يونس الفاسي', ville: 'مكتب محاماة بمراكش', txt: 'احتساب الآجال دقيق ومريح. أداة لا غنى عنها لأي مكتب يتابع عدداً كبيراً من الملفات.' },
]

const FAQ = [
  { q: 'هل خدمة «مُراقِب» قانونية؟', a: 'نعم. «مُراقِب» يطّلع فقط على المعلومات العمومية المتاحة على بوابة mahakim.ma باستعمال أرقام ملفاتكم، تماماً كما تفعلون يدوياً، لكن بشكل آلي ومنتظم.' },
  { q: 'هل بياناتي وملفاتي في أمان؟', a: 'بياناتكم مشفّرة ومقيّدة بحسابكم وحده. لا نشارك معلوماتكم مع أي طرف، وكل ملف يبقى خاصاً بكم.' },
  { q: 'كيف يُحتسب الأجل بدقّة؟', a: 'يعتمد المحرّك على قواعد قانون المسطرة المدنية المغربي (آجال الاستئناف، التعرّض، النقض)، مع مراعاة أيام العطل. يبقى التحقق النهائي من مسؤولية المحامي.' },
  { q: 'هل أحتاج إلى بطاقة بنكية للتجربة؟', a: 'لا. الباقة المجانية متاحة دون أي بطاقة بنكية، ويمكنكم إضافة ملفاتكم الأولى في أقل من دقيقة.' },
  { q: 'ماذا لو كان لي عدد كبير من الملفات؟', a: 'باقة «مكتب» تتيح حتى 500 ملف مع إمكانية إضافة عدة محامين وولوج API. تواصلوا معنا لحلول مخصّصة للمكاتب الكبرى.' },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: C.cream, color: C.ink, fontFamily: "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif", overflowX: 'hidden' }}>

      {/* ════ HERO ════ */}
      <div style={{ background: `radial-gradient(130% 100% at 78% -20%, #34301F 0%, ${C.night2} 42%, ${C.night} 100%)`, position: 'relative' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Image src="/logo.png" alt="مُراقِب" width={52} height={52} style={{ borderRadius: 11 }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>مُراقِب</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href="#contact" style={{ color: '#E9E1CC', textDecoration: 'none', padding: '8px 14px', fontSize: 14, fontWeight: 500 }} className="nav-contact">تواصل</a>
            <Link href="/login" style={{ color: '#E9E1CC', textDecoration: 'none', padding: '8px 14px', fontSize: 14, fontWeight: 500 }}>تسجيل الدخول</Link>
            <Link href="/register" style={{ background: C.grad, color: C.night, padding: '10px 18px', borderRadius: 11, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>تجربة مجانية</Link>
          </div>
        </nav>

        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '46px 28px 76px', display: 'grid', gridTemplateColumns: 'minmax(0,1.08fr) minmax(0,.92fr)', gap: 52, alignItems: 'center' }} className="hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(203,174,85,.1)', color: C.goldL, fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, marginBottom: 26, border: `1px solid ${C.borderD}` }}>
              المنصّة المغربية لمراقبة الملفات القضائية
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5.4vw, 60px)', fontWeight: 700, lineHeight: 1.16, color: '#fff', marginBottom: 24, letterSpacing: '-.5px' }}>
              راقبوا ملفاتكم القضائية<br />
              <span style={{ color: C.goldL }}>بثقة المحترفين</span>
            </h1>
            <p style={{ fontSize: 17.5, color: '#C9C0A9', marginBottom: 32, maxWidth: 510, lineHeight: 1.9 }}>
              يتولّى «مُراقِب» متابعة ملفاتكم على <strong style={{ color: '#fff' }}>mahakim.ma</strong>، واحتساب الآجال المسطرية بدقّة، وإشعاركم عبر واتساب قبل كل جلسة أو أجل — حتى تنصرفوا إلى جوهر عملكم.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 30 }}>
              <Link href="/register" style={{ background: C.grad, color: C.night, padding: '15px 32px', borderRadius: 13, fontSize: 16.5, fontWeight: 700, textDecoration: 'none' }}>
                ابدأوا مجاناً ←
              </Link>
              <a href="#tarifs" style={{ border: `1px solid ${C.borderD}`, color: '#E9E1CC', padding: '15px 28px', borderRadius: 13, fontSize: 16.5, textDecoration: 'none', fontWeight: 600 }}>
                الأسعار
              </a>
            </div>
            <p style={{ fontSize: 12.5, color: C.faint, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: C.goldL }}>✓</span> دون بطاقة بنكية
              <span style={{ color: C.faint, margin: '0 4px' }}>·</span>
              <span style={{ color: C.goldL }}>✓</span> إعداد في أقل من دقيقة
            </p>
          </div>

          {/* Aperçu produit — sobre, crédible (PAS d'animation gadget) */}
          <div className="hero-demo">
            <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 40px 80px -34px rgba(0,0,0,.55)', overflow: 'hidden', border: `1px solid rgba(255,255,255,.08)` }}>
              {/* barre fenêtre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px', borderBottom: `1px solid ${C.border}`, background: C.card }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E0C6C0' }} />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#EBDCB6' }} />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#CFE0CC' }} />
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.faint, fontFamily: "'IBM Plex Sans',sans-serif" }}>mouraqib.ma</span>
              </div>
              {/* corps */}
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenBg, padding: '4px 10px', borderRadius: 8 }}>قيد المراقبة</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>لوحة الملفات</span>
                </div>

                {/* ligne dossier 1 */}
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 13, padding: 13, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.red, background: C.redBg, padding: '3px 8px', borderRadius: 6 }}>أجل · 4 أيام</span>
                    <span dir="ltr" style={{ fontSize: 14, fontWeight: 700, color: C.goldD, fontFamily: "'IBM Plex Sans',sans-serif" }}>2026/2103/75</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>المحكمة الابتدائية بالرباط · اجتماعي</div>
                </div>

                {/* ligne dossier 2 */}
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 13, padding: 13, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.amber, background: C.amberBg, padding: '3px 8px', borderRadius: 6 }}>جلسة · غداً</span>
                    <span dir="ltr" style={{ fontSize: 14, fontWeight: 700, color: C.goldD, fontFamily: "'IBM Plex Sans',sans-serif" }}>2026/1840/12</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, textAlign: 'right' }}>محكمة الاستئناف بالدار البيضاء · تجاري</div>
                </div>

                {/* notif WhatsApp — INTÉGRÉE dans le cadre, plus de débordement */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.greenBg, borderRadius: 13, padding: '11px 13px', flexDirection: 'row-reverse' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Z" /></svg>
                  </div>
                  <p style={{ fontSize: 12, color: C.ink2, lineHeight: 1.7, textAlign: 'right', margin: 0 }}>تذكير: يتبقّى <strong>4 أيام</strong> على أجل الاستئناف في الملف 2103/75.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ════ BANDE DE CONFIANCE ════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '46px 28px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {TRUST.map((tr) => (
            <div key={tr.k} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', flexDirection: 'row-reverse', textAlign: 'right' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={C.goldD} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{tr.i}</svg>
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{tr.k}</div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7 }}>{tr.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════ FEATURES ════ */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '54px 28px 30px' }}>
        <div style={{ marginBottom: 38, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.goldD, letterSpacing: '1.5px', marginBottom: 8 }}>الإمكانات</div>
          <h2 style={{ fontSize: 'clamp(27px,3.6vw,36px)', fontWeight: 700, color: C.ink, letterSpacing: '-.5px' }}>أدوات صُمّمت لانشغالات المحامي</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(248px, 1fr))', gap: 18 }}>
          {FEATURES.map((f) => (
            <div key={f.k} className="feat" style={{ background: C.card, borderRadius: 18, padding: 24, border: `1px solid ${C.border}`, transition: 'transform .2s, box-shadow .2s' }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: C.night, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginInlineStart: 'auto' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.goldL} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{f.i}</svg>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8, textAlign: 'right' }}>{f.k}</h3>
              <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.85, textAlign: 'right' }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════ ÉTAPES ════ */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '44px 28px' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.goldD, letterSpacing: '1.5px', marginBottom: 8 }}>كيف يعمل</div>
          <h2 style={{ fontSize: 'clamp(27px,3.6vw,36px)', fontWeight: 700, color: C.ink, letterSpacing: '-.5px' }}>ثلاث خطوات، ثم نتكفّل بالباقي</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))', gap: 18 }}>
          {STEPS.map((s, i) => (
            <div key={s.k} style={{ position: 'relative', padding: '28px 22px 24px', background: i === 2 ? C.night : C.card, borderRadius: 18, border: `1px solid ${i === 2 ? 'transparent' : C.border}` }}>
              <div dir="ltr" style={{ fontSize: 42, fontWeight: 700, color: i === 2 ? 'rgba(228,206,132,.28)' : C.goldChip, fontFamily: "'IBM Plex Sans',sans-serif", lineHeight: 1, marginBottom: 10, textAlign: 'right' }}>{i + 1}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: i === 2 ? '#fff' : C.ink, marginBottom: 7, textAlign: 'right' }}>{s.k}</h3>
              <p style={{ fontSize: 13.5, color: i === 2 ? '#C9C0A9' : C.muted, lineHeight: 1.85, textAlign: 'right' }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════ TÉMOIGNAGES ════ */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '44px 28px' }}>
        <div style={{ marginBottom: 38, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.goldD, letterSpacing: '1.5px', marginBottom: 8 }}>شهادات</div>
          <h2 style={{ fontSize: 'clamp(27px,3.6vw,36px)', fontWeight: 700, color: C.ink, letterSpacing: '-.5px' }}>محامون يثقون في «مُراقِب»</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {TEMOINS.map((t) => (
            <div key={t.nom} style={{ background: C.card, borderRadius: 18, padding: 24, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: C.goldM, fontSize: 22, marginBottom: 10, lineHeight: 1 }}>★★★★★</div>
              <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.9, textAlign: 'right', marginBottom: 18, flex: 1 }}>«{t.txt}»</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexDirection: 'row-reverse' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.night, fontWeight: 700, fontSize: 15, flex: 'none' }}>{t.nom.replace('ذ. ', '').replace('ذة. ', '')[0]}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{t.nom}</div>
                  <div style={{ fontSize: 12, color: C.faint }}>{t.ville}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════ PRICING ════ */}
      <section id="tarifs" style={{ maxWidth: 1000, margin: '0 auto', padding: '46px 28px' }}>
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.goldD, letterSpacing: '1.5px', marginBottom: 8 }}>الأسعار</div>
          <h2 style={{ fontSize: 'clamp(27px,3.6vw,36px)', fontWeight: 700, color: C.ink, letterSpacing: '-.5px' }}>أسعار بسيطة وواضحة</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, alignItems: 'start' }}>
          {PLANS.map((p) => (
            <div key={p.plan} style={{ borderRadius: 22, padding: 28, border: p.popular ? `2px solid ${C.goldM}` : `1px solid ${C.border}`, background: p.popular ? C.white : C.card, boxShadow: p.popular ? '0 28px 56px -26px rgba(150,115,20,.45)' : 'none', position: 'relative', transform: p.popular ? 'scale(1.035)' : 'none' }}>
              {p.popular && <div style={{ position: 'absolute', top: -13, insetInlineStart: '50%', transform: 'translateX(50%)', background: C.grad, color: C.night, fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 999 }}>★ الأكثر اختياراً</div>}
              <h3 style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 2, textAlign: 'right' }}>{p.plan}</h3>
              <div style={{ fontSize: 12.5, color: C.faint, marginBottom: 14, textAlign: 'right' }}>{p.sous}</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.ink, marginBottom: 20, fontFamily: "'IBM Plex Sans',sans-serif", textAlign: 'right' }}>
                {p.prix === 0 ? 'مجاني' : <>{p.prix} <span style={{ fontSize: 14, fontWeight: 400, color: C.faint }}>درهم/شهرياً</span></>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.ink2, fontSize: 14, flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
                    <span>{f}</span>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: C.greenBg, color: C.green, fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✓</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'block', textAlign: 'center', padding: 13, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', ...(p.popular ? { background: C.grad, color: C.night } : { background: '#fff', color: C.ink, border: `1px solid ${C.border}` }) }}>
                ابدأوا الآن
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ════ FAQ ════ */}
      <section style={{ maxWidth: 780, margin: '0 auto', padding: '46px 28px' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.goldD, letterSpacing: '1.5px', marginBottom: 8 }}>أسئلة شائعة</div>
          <h2 style={{ fontSize: 'clamp(27px,3.6vw,36px)', fontWeight: 700, color: C.ink, letterSpacing: '-.5px' }}>كل ما يهمّكم معرفته</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map((item, i) => {
            const open = openFaq === i
            return (
              <div key={i} style={{ background: C.card, borderRadius: 14, border: `1px solid ${open ? C.goldM : C.border}`, overflow: 'hidden', transition: 'border-color .2s' }}>
                <button onClick={() => setOpenFaq(open ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '17px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
                  <span style={{ fontSize: 20, color: C.goldD, fontWeight: 400, flex: 'none', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{item.q}</span>
                </button>
                {open && (
                  <div style={{ padding: '0 20px 18px', textAlign: 'right' }}>
                    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: 0 }}>{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ════ CONTACT (mailto) ════ */}
      <section id="contact" style={{ maxWidth: 680, margin: '0 auto', padding: '46px 28px' }}>
        <div style={{ marginBottom: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.goldD, letterSpacing: '1.5px', marginBottom: 8 }}>تواصلوا معنا</div>
          <h2 style={{ fontSize: 'clamp(27px,3.6vw,36px)', fontWeight: 700, color: C.ink, letterSpacing: '-.5px', marginBottom: 8 }}>لديكم سؤال؟ نحن هنا</h2>
          <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.8 }}>املؤوا النموذج وسنجيبكم في أقرب وقت.</p>
        </div>
        <ContactForm />
      </section>

      {/* ════ CTA FINAL ════ */}
      <section style={{ maxWidth: 900, margin: '20px auto 0', padding: '0 28px' }}>
        <div style={{ background: `radial-gradient(120% 120% at 80% 0%, #34301F, ${C.night})`, borderRadius: 26, padding: 'clamp(34px,5vw,54px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <h2 style={{ fontSize: 'clamp(25px,3.6vw,34px)', fontWeight: 700, color: '#fff', marginBottom: 14, letterSpacing: '-.5px' }}>ابدأوا في حماية ملفاتكم اليوم</h2>
          <p style={{ fontSize: 15.5, color: '#C9C0A9', marginBottom: 28, lineHeight: 1.85, maxWidth: 460, margin: '0 auto 28px' }}>
            انضمّوا إلى المحامين الذين يثقون في «مُراقِب» لمتابعة آجالهم. تجربة مجانية دون أي التزام.
          </p>
          <Link href="/register" style={{ display: 'inline-block', background: C.grad, color: C.night, padding: '15px 34px', borderRadius: 13, fontSize: 16.5, fontWeight: 700, textDecoration: 'none' }}>
            ابدأوا مجاناً ←
          </Link>
        </div>
      </section>

      <footer style={{ textAlign: 'center', color: C.faint, padding: '40px 0 34px', marginTop: 44, fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: C.ink2, fontSize: 15, marginBottom: 8 }}>مُراقِب</div>
        © 2026 مُراقِب · contact@mouraqib.ma
      </footer>

      <style>{`
        .feat:hover { transform: translateY(-4px); box-shadow: 0 22px 44px -28px rgba(110,90,30,.45); }
        @media (max-width: 640px) { .nav-contact { display: none !important; } }
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-demo { margin-top: 30px; }
        }
      `}</style>
    </main>
  )
}

const C2 = {
  card: '#FBF9F2', white: '#fff', ink: '#26241E', ink2: '#3A3322', muted: '#5B5544', faint: '#9C947F',
  goldM: '#CBAE55', goldD: '#9A7820', border: '#E9E1CE', night: '#23201A',
  grad: 'linear-gradient(135deg,#E4CE84,#B6912F)',
}

function ContactForm() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const envoyer = () => {
    const sujet = encodeURIComponent(`رسالة من ${nom || 'زائر'} عبر الموقع`)
    const corps = encodeURIComponent(`الاسم: ${nom}\nالبريد: ${email}\n\n${message}`)
    window.location.href = `mailto:contact@mouraqib.ma?subject=${sujet}&body=${corps}`
  }

  const champ: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${C2.border}`,
    background: C2.white, fontSize: 14, color: C2.ink, fontFamily: "'IBM Plex Sans Arabic',sans-serif",
    outline: 'none', textAlign: 'right', marginBottom: 12, boxSizing: 'border-box',
  }

  return (
    <div style={{ background: C2.card, borderRadius: 20, padding: 26, border: `1px solid ${C2.border}` }}>
      <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="الاسم الكامل" dir="rtl" style={champ} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="البريد الإلكتروني" dir="rtl" style={champ} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="رسالتكم..." rows={4} dir="rtl" style={{ ...champ, resize: 'vertical' }} />
      <button onClick={envoyer} disabled={!message.trim()} style={{
        width: '100%', padding: 14, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700,
        cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? C2.grad : '#E5DFCD',
        color: message.trim() ? C2.night : C2.faint, fontFamily: "'IBM Plex Sans Arabic',sans-serif",
      }}>
        إرسال الرسالة
      </button>
    </div>
  )
}