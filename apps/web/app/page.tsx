import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">⚖️ Mouraqib</span>
          <span className="text-slate-400 text-sm">مراقب</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-slate-300 hover:text-white transition-colors px-4 py-2">
            Connexion
          </Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors">
            Essai gratuit
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-800/50 text-blue-200 text-sm px-4 py-2 rounded-full mb-8">
          🚀 Nouveau — Alertes WhatsApp en temps réel
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Ne ratez plus jamais<br />
          <span className="text-blue-400">une audience marocaine</span>
        </h1>
        <p className="text-xl text-slate-300 mb-4 max-w-2xl mx-auto">
          Mouraqib surveille automatiquement vos dossiers sur <strong>mahakim.ma</strong>,
          calcule vos délais procéduraux et vous envoie des alertes WhatsApp avant chaque échéance.
        </p>
        <p className="text-lg text-slate-400 mb-10" dir="rtl">
          مراقبة تلقائية لملفاتكم القضائية مع تنبيهات واتساب فورية
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors">
            Commencer gratuitement →
          </Link>
          <a href="#demo" className="border border-slate-600 hover:border-slate-400 text-slate-300 px-8 py-4 rounded-xl text-lg transition-colors">
            Voir la démo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-16 grid md:grid-cols-3 gap-8">
        {[
          { icon: '🔍', title: 'Scraping automatique', desc: 'Consultation quotidienne de mahakim.ma pour tous vos dossiers. Aucune action manuelle requise.' },
          { icon: '⏰', title: 'Délais calculés', desc: 'Le moteur calcule automatiquement les délais d\'appel, opposition et cassation selon le CPC marocain.' },
          { icon: '📱', title: 'Alertes WhatsApp', desc: 'Recevez une alerte instantanée dès qu\'un événement est détecté, plus un digest matinal à 7h.' },
        ].map((f) => (
          <div key={f.title} className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Tarifs simples</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { plan: 'GRATUIT', prix: 0, dossiers: 3, features: ['3 dossiers', 'Alertes WhatsApp', 'Calcul délais'] },
            { plan: 'SOLO', prix: 190, dossiers: 100, features: ['100 dossiers', 'Alertes WhatsApp', 'Digest matinal', 'Priorité support'], popular: true },
            { plan: 'CABINET', prix: 790, dossiers: 500, features: ['500 dossiers', 'Multi-avocats', 'API accès', 'Onboarding dédié'] },
          ].map((p) => (
            <div key={p.plan} className={`rounded-2xl p-6 border ${p.popular ? 'border-blue-500 bg-blue-600/20' : 'border-white/10 bg-white/5'}`}>
              {p.popular && <div className="text-blue-400 text-sm font-semibold mb-2">⭐ Plus populaire</div>}
              <h3 className="text-xl font-bold mb-1">{p.plan}</h3>
              <div className="text-3xl font-bold mb-4">
                {p.prix === 0 ? 'Gratuit' : <>{p.prix} <span className="text-lg font-normal text-slate-400">DH/mois</span></>}
              </div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-slate-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`block text-center py-3 rounded-lg font-semibold transition-colors ${p.popular ? 'bg-blue-600 hover:bg-blue-500' : 'bg-white/10 hover:bg-white/20'}`}>
                Commencer
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-slate-500 py-8 border-t border-white/10">
        © 2024 Mouraqib — مراقب · contact@mouraqib.ma
      </footer>
    </main>
  )
}
