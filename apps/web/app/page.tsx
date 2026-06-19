import Link from 'next/link'

const C = {
  pageA: '#E7D9A6', pageB: '#EFE7D0', pageC: '#ECE2C2',
  card: '#FBF9F2', ink: '#2C2A24', ink2: '#3A3322', muted: '#5B5544', faint: '#A39C8B',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  green: '#3F9E6B', border: '#EEE7D6',
}

const FEATURES = [
  { icon: '🔍', title: 'مراقبة آلية', desc: 'فحص يومي لموقع mahakim.ma لجميع ملفاتكم. دون أي تدخّل يدوي.' },
  { icon: '⏰', title: 'احتساب الآجال', desc: 'يحتسب المحرّك تلقائياً آجال الاستئناف والتعرّض والنقض وفق قانون المسطرة المدنية المغربي.' },
  { icon: '📱', title: 'تنبيهات واتساب', desc: 'تلقّوا تنبيهاً فورياً عند رصد أي حدث، مع ملخّص صباحي على الساعة السابعة.' },
]

const PLANS = [
  { plan: 'مجاني', prix: 0, features: ['3 ملفات', 'تنبيهات واتساب', 'احتساب الآجال'] },
  { plan: 'فردي', prix: 190, features: ['100 ملف', 'تنبيهات واتساب', 'ملخّص صباحي', 'دعم بالأولوية'], popular: true },
  { plan: 'مكتب', prix: 790, features: ['500 ملف', 'محامون متعدّدون', 'ولوج API', 'مرافقة مخصّصة'] },
]

export default function LandingPage() {
  return (
    <main dir="rtl" style={{ minHeight: '100vh', background: `linear-gradient(155deg, ${C.pageA} 0%, ${C.pageB} 45%, ${C.pageC} 100%)`, color: C.ink, fontFamily: "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif" }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(145deg,#CBAE55,#9A7820)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px -4px rgba(150,115,20,.6)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M7 7h10" /><path d="M5 7 2.5 13a3.5 3.5 0 0 0 5 0L5 7Z" /><path d="M19 7l-2.5 6a3.5 3.5 0 0 0 5 0L19 7Z" /><path d="M8 21h8" /></svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>مُراقِب</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{ color: C.ink2, textDecoration: 'none', padding: '8px 14px', fontSize: 14, fontWeight: 500 }}>تسجيل الدخول</Link>
          <Link href="/register" style={{ background: 'linear-gradient(140deg,#CBAE55,#9A7820)', color: '#fff', padding: '10px 18px', borderRadius: 11, fontWeight: 600, fontSize: 14, textDecoration: 'none', boxShadow: '0 6px 14px -5px rgba(150,115,20,.6)' }}>تجربة مجانية</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 920, margin: '0 auto', padding: '72px 32px 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.goldSubtle, color: C.goldD, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999, marginBottom: 28, border: `1px solid ${C.goldM}55` }}>
          ✦ جديد — تنبيهات واتساب فورية
        </div>
        <h1 style={{ fontSize: 'clamp(34px, 6vw, 56px)', fontWeight: 700, lineHeight: 1.25, color: C.ink, marginBottom: 22 }}>
          لا تفوّتوا أبداً<br />
          <span style={{ color: C.goldD }}>جلسة أمام المحاكم المغربية</span>
        </h1>
        <p style={{ fontSize: 18, color: C.muted, marginBottom: 14, maxWidth: 640, margin: '0 auto 14px', lineHeight: 1.8 }}>
          يراقب «مُراقِب» ملفاتكم تلقائياً على <strong style={{ color: C.ink }}>mahakim.ma</strong>، ويحتسب آجالكم المسطرية، ويرسل لكم تنبيهات عبر واتساب قبل كل أجل.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 34 }}>
          <Link href="/register" style={{ background: 'linear-gradient(140deg,#CBAE55,#9A7820)', color: '#fff', padding: '15px 30px', borderRadius: 14, fontSize: 17, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 24px -8px rgba(150,115,20,.6)' }}>
            ابدأوا مجاناً ←
          </Link>
          <a href="#tarifs" style={{ border: `1px solid ${C.goldM}`, color: C.ink2, padding: '15px 30px', borderRadius: 14, fontSize: 17, textDecoration: 'none', background: '#fff' }}>
            اطّلعوا على الأسعار
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ background: C.card, borderRadius: 22, padding: 26, border: `1px solid ${C.border}`, boxShadow: '0 14px 34px -24px rgba(110,90,30,.4)' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.8 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="tarifs" style={{ maxWidth: 980, margin: '0 auto', padding: '56px 32px' }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, textAlign: 'center', color: C.ink, marginBottom: 44 }}>أسعار بسيطة وواضحة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>
          {PLANS.map((p) => (
            <div key={p.plan} style={{ borderRadius: 22, padding: 28, border: p.popular ? `2px solid ${C.goldM}` : `1px solid ${C.border}`, background: p.popular ? C.goldSubtle : C.card, boxShadow: p.popular ? '0 20px 44px -22px rgba(150,115,20,.45)' : '0 14px 34px -24px rgba(110,90,30,.4)', position: 'relative' }}>
              {p.popular && <div style={{ color: C.goldD, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>★ الأكثر اختياراً</div>}
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{p.plan}</h3>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.ink, marginBottom: 18, fontFamily: "'IBM Plex Sans',sans-serif", direction: 'rtl' }}>
                {p.prix === 0 ? 'مجاني' : <>{p.prix} <span style={{ fontSize: 15, fontWeight: 400, color: C.faint }}>درهم/شهرياً</span></>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.ink2, fontSize: 14 }}>
                    <span style={{ color: C.green, fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'block', textAlign: 'center', padding: 13, borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', ...(p.popular ? { background: 'linear-gradient(140deg,#CBAE55,#9A7820)', color: '#fff' } : { background: '#fff', color: C.ink, border: `1px solid ${C.border}` }) }}>
                ابدأوا الآن
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', color: C.faint, padding: '32px 0', borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
        © 2024 مُراقِب · contact@mouraqib.ma
      </footer>
    </main>
  )
}