// Landing de vente bilingue (arabe sur /, français sur /fr). Composant serveur : les effets sont dans ./anime.tsx.
// Contact : NEXT_PUBLIC_CONTACT_TEL (ou CONTACT_COMMERCIAL_TEL) au build.
import Link from 'next/link'
import {
  Bell, Plus, Search, Clock, CalendarDays, Phone, Wallet, FolderOpen, WifiOff, PenLine, Users, Sparkles, FileText, Laptop,
  UsersRound, ShieldCheck, Cloud, HardDrive, RefreshCw, Check, X, ArrowLeft, ArrowRight, UserRound, Mail, Globe, Eye,
  Lock, ScanText, Bot, FileType2, AlertTriangle, ListChecks, Landmark, Smartphone, Monitor, RefreshCcw, FileArchive, type LucideIcon,
} from 'lucide-react'
import { ANCRES, BIENTOT, type Contenu } from './contenu'
import { Apparition, CarteLumiere, Flotte, MotsReveles, Tarifs } from './anime'
import { CSS } from './styles'
import { pagesConfiancePubliees } from '@/lib/pagesPubliques'
import { HubPages } from '@/components/pages/HubPages'

import { TEL, EMAIL, lienWa, WA, Logo } from './commun'
export { TEL, EMAIL } from './commun'

const ICONES: Record<string, LucideIcon> = {
  search: Search, clock: Clock, calendar: CalendarDays, phone: Phone, wallet: Wallet, folder: FolderOpen, wifi: WifiOff, pen: PenLine,
  bell: Bell, users: Users, sparkles: Sparkles, file: FileText, laptop: Laptop, team: UsersRound, shield: ShieldCheck, scan: ScanText, list: ListChecks,
}

const Bientot = ({ t, sombre }: { t: Contenu; sombre?: boolean }) => <span className={`lp-bientot ${sombre ? 'sombre' : ''}`}>{t.bientot}</span>

export function Landing({ t, restants }: { t: Contenu; restants: number | null }) {
  const a = ANCRES[t.lang]
  const Fleche = t.dir === 'rtl' ? ArrowLeft : ArrowRight
  const DEMO = lienWa(t.wa.demo)
  const FONDATEUR = lienWa(t.wa.fondateur)
  const ar = t.lang === 'ar'
  const police = ar ? "'IBM Plex Sans Arabic', 'IBM Plex Sans', sans-serif" : "'IBM Plex Sans', 'IBM Plex Sans Arabic', sans-serif"

  return (
    <div className="lp" lang={t.lang} dir={t.dir} style={{ background: '#F5F3EE', color: '#15201E', fontFamily: police }}>
      <style>{CSS}</style>

      {/* ── Accroche ───────────────────────────────────────────────── */}
      <header className="lp-hero lp-sec">
        <div className="lp-grille-fond" aria-hidden />
        <div className="lp-wrap" style={{ position: 'relative' }}>
          <nav aria-label={ar ? 'القائمة' : 'Menu'} className="lp-barre">
            <Link href={ar ? '/' : '/fr'} aria-label="MalafiPro"><Logo sombre /></Link>
            <div className="lp-nav">
              <a href={`#${a.pb}`}>{t.nav.probleme}</a><a href={`#${a.fonctions}`}>{t.nav.fonctions}</a><a href={`#${a.donnees}`}>{t.nav.donnees}</a><a href={`#${a.tarifs}`}>{t.nav.tarifs}</a><a href={`#${a.faq}`}>{t.nav.faq}</a>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link href={t.autreLangue.href} hrefLang={ar ? 'fr' : 'ar'} lang={ar ? 'fr' : 'ar'} className="lp-langue" aria-label={t.autreLangue.label}>
                <Globe size={17} aria-hidden /><span className="lp-langue-long">{t.autreLangue.label}</span><span className="lp-langue-court">{t.autreLangue.court}</span>
              </Link>
              <Link href="/login" rel="nofollow" className="lp-connexion"><UserRound size={18} aria-hidden /><span>{t.nav.connexion}</span></Link>
            </div>
          </nav>

          <div className="lp-hero-grille">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
              {/* H1 = ce que fait la page (« برنامج المحامي المغربي » / « logiciel de l'avocat marocain ») ; le slogan reste le grand titre visuel */}
              <Apparition><h1 className="lp-pastille-hero" style={{ margin: 0, lineHeight: 'inherit' }}><span className="lp-point" aria-hidden />{t.hero.badge}</h1></Apparition>
              <p className="lp-h1">
                <MotsReveles texte={t.hero.titre1} style={{ display: 'block' }} />
                <MotsReveles texte={t.hero.titre2} delai={0.35} style={{ display: 'block', color: '#9FE0C6' }} />
              </p>
              <Apparition delai={0.5}><p className="lp-sous">{t.hero.sousTitre}</p></Apparition>
              <Apparition delai={0.65} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/register" className="lp-btn action mp-action">{t.hero.ctaEssai}<Fleche size={18} aria-hidden /></Link>
                <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn fantome">{WA}{t.hero.ctaDemo}</a>
              </Apparition>
              <Apparition delai={0.8}>
                <ul className="lp-confiance">
                  {t.hero.confiance.map((c) => <li key={c}><Check size={16} color="#9FE0C6" strokeWidth={3} aria-hidden />{c}</li>)}
                </ul>
              </Apparition>
            </div>

            {/* Aperçu dessiné en code : acte lu par l'IA → délai calculé → assistant → alerte WhatsApp */}
            <div aria-hidden className="lp-mock-zone">
              <Apparition delai={0.4} style={{ position: 'relative' }}>
                <div className="lp-mock">
                  <div className="lp-mock-barre"><span /><span /><span /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="lp-rond"><ScanText size={18} /></span>
                    <strong style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.mock.titre} · <span className="num">2026/1801/77</span></strong>
                  </div>
                  <div className="lp-mock-acte" dir="rtl" lang="ar">{t.mock.acte}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <span className="lp-puce menthe"><Sparkles size={14} />{t.mock.ia}</span>
                    <span className="lp-puce ambre">{t.mock.delai} · <span className="num">30</span> {ar ? 'يوماً' : 'jours'}</span>
                  </div>
                  <div className="lp-mock-delais">
                    <div className="agir"><span className="lp-compte"><b className="num">2</b><small>{ar ? 'يومان' : 'jours'}</small></span><span><strong>{t.mock.agir}</strong><small>{t.mock.delai}</small></span></div>
                    <div className="surv"><Eye size={18} /><span><strong>{t.mock.surveiller}</strong><small className="num">12 {ar ? 'يوماً' : 'jours'}</small></span></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="lp-bulle q">{t.mock.question}</span>
                    <span className="lp-bulle r"><Bot size={16} color="#0E5A4E" style={{ flex: 'none', marginTop: 3 }} /><span>{t.mock.reponse} <strong className="num">22/11</strong><small className="lp-source">{t.mock.source}</small></span></span>
                  </div>
                </div>
              </Apparition>
              <Flotte style={{ position: 'absolute', insetInlineEnd: -8, bottom: 0, width: 290, maxWidth: '82%' }}>
                <div className="lp-wa-carte">
                  <span className="lp-wa-rond">{WA}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, lineHeight: 1.6 }}>
                    <strong style={{ fontWeight: 600 }}>{t.mock.wa} <span className="num" style={{ fontWeight: 400, color: '#5E6B67' }}>08:00</span></strong>
                    <span>{t.mock.waTexte} <span className="num">…/1801/77</span></span>
                  </span>
                </div>
              </Flotte>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ── Problèmes → solutions, en paires ────────────────────── */}
        <section id={a.pb} aria-labelledby="t-pb" className="lp-sec lp-bloc">
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.pb.pastille}</span>
              <h2 id="t-pb" className="lp-h2">{t.pb.titre}</h2>
              <p className="lp-lead">{t.pb.sousTitre}</p>
            </Apparition>
            <ol className="lp-paires">
              {t.pb.paires.map((p, i) => {
                const Icon = ICONES[p.icone]
                const bientot = p.bientot && (p.icone === 'wifi' || p.icone === 'folder' ? BIENTOT.horsLigne : BIENTOT.crm)
                return (
                  <Apparition as="li" key={p.pb} delai={(i % 4) * 0.08} className="lp-paire">
                    <div className="lp-paire-pb">
                      <span className="lp-paire-ico"><Icon size={20} aria-hidden /></span>
                      <span className="lp-mot pb"><X size={13} strokeWidth={3} aria-hidden />{t.pb.motPb}</span>
                      <strong>{p.pb}</strong>
                      <span className="d">{p.pbDetail}</span>
                    </div>
                    <div className="lp-paire-sol">
                      <span className="lp-mot sol"><Check size={13} strokeWidth={3} aria-hidden />{t.pb.motSol}{bientot && <Bientot t={t} />}</span>
                      <strong>{p.sol}</strong>
                      <span className="d">{p.solDetail}</span>
                    </div>
                  </Apparition>
                )
              })}
            </ol>
            <Apparition style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/register" className="lp-btn action mp-action">{t.hero.ctaEssai}<Fleche size={18} aria-hidden /></Link>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn contour">{WA}{t.hero.ctaDemo}</a>
            </Apparition>
          </div>
        </section>

        {/* ── Comment ça marche : l'app consulte mahakim, l'avocat regarde son écran ── */}
        <section aria-labelledby="t-flux" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.flux.pastille}</span>
              <h2 id="t-flux" className="lp-h2">{t.flux.titre}</h2>
              <p className="lp-lead">{t.flux.texte}</p>
            </Apparition>
            <Apparition>
              <div className="lp-flux" role="img" aria-label={`${t.flux.mahakim} → ${t.flux.app} → ${t.flux.avocat}`}>
                <div className="lp-noeud"><span className="lp-noeud-ico"><Landmark size={28} /></span><strong>{t.flux.mahakim}</strong></div>
                <div className="lp-liaison"><span className="lp-tirets" /><span className="lp-boucle"><RefreshCcw size={16} /></span><small>{t.flux.frequence}</small></div>
                <div className="lp-noeud app"><span className="lp-noeud-ico"><Sparkles size={28} /></span><strong>{t.flux.app}</strong></div>
                <div className="lp-liaison"><span className="lp-tirets" /><span className="lp-boucle"><Bell size={16} /></span></div>
                <div className="lp-noeud"><span className="lp-noeud-ico" style={{ gap: 4 }}><Smartphone size={22} /><Monitor size={22} /></span><strong>{t.flux.avocat}</strong><small>{t.flux.vous}</small></div>
              </div>
            </Apparition>
            <ol className="lp-etapes">
              {t.flux.etapes.map(([titre, texte], i) => (
                <Apparition as="li" key={titre} delai={i * 0.1}><span className="lp-etape-n num">{i + 1}</span><span><strong>{titre}</strong><small>{texte}</small></span></Apparition>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Intelligence artificielle ── */}
        <section aria-labelledby="t-ia" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.ia.pastille}</span>
              <h2 id="t-ia" className="lp-h2">{t.ia.titre}</h2>
              <p className="lp-lead">{t.ia.texte}</p>
            </Apparition>
            <div className="lp-ia">
              {t.ia.cartes.map((c, i) => {
                const Icon = ICONES[c.icone]
                return (
                  <Apparition key={c.titre} delai={i * 0.08}>
                    <CarteLumiere className="lp-fn"><span className="lp-fn-ico sombre"><Icon size={22} aria-hidden /></span><h3>{c.titre}</h3><p>{c.texte}</p></CarteLumiere>
                  </Apparition>
                )
              })}
            </div>
            <Apparition><p className="lp-garde"><ShieldCheck size={20} aria-hidden />{t.ia.garde}</p></Apparition>
          </div>
        </section>

        {/* ── Toutes les fonctions (grille bento, bordure lumineuse) ── */}
        <section id={a.fonctions} aria-labelledby="t-fn" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.fonctions.pastille}</span>
              <h2 id="t-fn" className="lp-h2">{t.fonctions.titre}</h2>
              <p className="lp-lead">{t.fonctions.sousTitre}</p>
            </Apparition>
            <div className="lp-bento">
              {t.fonctions.cartes.map((c, i) => {
                const Icon = ICONES[c.icone]
                const bientot = c.bientot && (c.icone === 'laptop' ? BIENTOT.horsLigne : BIENTOT.crm)
                return (
                  <Apparition key={c.titre} delai={(i % 3) * 0.08} className={c.large ? 'large' : ''}>
                    <CarteLumiere className="lp-fn">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span className="lp-fn-ico"><Icon size={22} aria-hidden /></span>
                        {bientot && <Bientot t={t} />}
                      </div>
                      <h3>{c.titre}</h3>
                      <p>{c.texte}</p>
                    </CarteLumiere>
                  </Apparition>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CRM clients ─────────────────────────────────────────── */}
        <section aria-labelledby="t-crm" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap lp-crm">
            <Apparition style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span className="lp-pastille sombre" style={{ alignSelf: 'flex-start' }}>{t.crm.pastille}{BIENTOT.crm && <> · {t.bientot}</>}</span>
              <h2 id="t-crm" className="lp-h2" style={{ color: '#FFFFFF' }}>{t.crm.titre}</h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: '#CFE5DD' }}>{t.crm.texte}</p>
              <ul className="lp-liste-claire">
                {t.crm.points.map((x) => <li key={x}><Check size={16} strokeWidth={3} aria-hidden />{x}</li>)}
              </ul>
            </Apparition>
            <Apparition delai={0.15} style={{ minWidth: 0 }}>
              <div className="lp-fiche" aria-hidden>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="lp-avatar">{ar ? 'أ' : 'A'}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><strong style={{ fontSize: 17 }}>{t.crm.fiche.nom}</strong><small style={{ color: '#5E6B67' }}>{t.crm.fiche.type}</small></span>
                </div>
                <div className="lp-fiche-stats">
                  <div><small>{t.crm.fiche.dossiers}</small><b className="num">4</b></div>
                  <div><small>{t.crm.fiche.honoraires}</small><b className="num">25 000</b></div>
                  <div><small>{t.crm.fiche.reste}</small><b className="num" style={{ color: '#7A4E06' }}>7 500</b></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#3B4A47', marginBottom: 6 }}><span>{t.crm.fiche.regle}</span><span className="num">70%</span></div>
                  <div className="lp-rail"><span style={{ width: '70%' }} /></div>
                </div>
                {['2025/1201/14', '2026/8203/51', '2026/1801/77'].map((n, i) => (
                  <div key={n} className="lp-fiche-ligne"><FileType2 size={16} color="#0E5A4E" /><span className="num" style={{ flex: 1 }}>{n}</span><span className={`lp-etat e${i}`}>{[ar ? 'حكم' : 'Jugement', ar ? 'جلسة 04/11' : 'Audience 04/11', ar ? 'أجل: يومان' : 'Délai : 2 j'][i]}</span></div>
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
                  <span className="lp-puce neutre"><Phone size={13} />{t.crm.fiche.dernier}</span>
                  <span className="lp-puce menthe"><ShieldCheck size={13} />{t.crm.fiche.conflit}</span>
                </div>
              </div>
            </Apparition>
          </div>
        </section>

        {/* ── Préparation des documents du dossier ── */}
        <section aria-labelledby="t-docs" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap lp-docs">
            <Apparition style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="lp-pastille" style={{ alignSelf: 'flex-start' }}>{t.docs.pastille}</span>
              <h2 id="t-docs" className="lp-h2">{t.docs.titre}</h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: '#3B4A47' }}>{t.docs.texte}</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#0B4A40', fontWeight: 600 }}>{t.docs.ia}</p>
            </Apparition>
            <Apparition delai={0.1}>
              <div className="lp-docs-liste" aria-hidden>
                {t.docs.liste.map((d) => <div key={d}><FileText size={18} color="#22476A" /><span>{d}</span><span className="lp-doc-ext">.doc</span></div>)}
                <div className="lp-docs-zip"><FileArchive size={18} />{ar ? 'ملف العمل.zip' : 'Dossier de travail.zip'}</div>
              </div>
            </Apparition>
          </div>
        </section>

        {/* ── Vos données : cloud / PC / les deux ─────────────────── */}
        <section id={a.donnees} aria-labelledby="t-don" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.donnees.pastille}</span>
              <h2 id="t-don" className="lp-h2">{t.donnees.titre}</h2>
              <p className="lp-lead">{t.donnees.texte}</p>
            </Apparition>
            <div className="lp-donnees">
              <div className="lp-options">
                {t.donnees.options.map((o, i) => {
                  const Icon = [Cloud, HardDrive, RefreshCw][i]
                  return (
                    <Apparition key={o.titre} delai={i * 0.1}>
                      <CarteLumiere className={`lp-option ${i === 2 ? 'mise' : ''}`}>
                        <span className="lp-fn-ico"><Icon size={22} aria-hidden /></span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong style={{ fontSize: 18 }}>{o.titre}</strong>{o.bientot && BIENTOT.horsLigne && <Bientot t={t} />}</span>
                          <span style={{ fontSize: 15, color: '#3B4A47', lineHeight: 1.7 }}>{o.texte}</span>
                          <small style={{ color: '#0E5A4E', fontWeight: 600 }}>{o.pour}</small>
                        </span>
                      </CarteLumiere>
                    </Apparition>
                  )
                })}
              </div>
              <Apparition delai={0.2} style={{ minWidth: 0 }}>
                <div className="lp-explorateur" aria-hidden>
                  <div className="lp-mock-barre"><span /><span /><span /></div>
                  <div className="lp-chemin"><FolderOpen size={16} />{t.donnees.dossierBureau}</div>
                  {t.donnees.fichiers.map((f) => (
                    <div key={f} className="lp-fichier"><FileText size={18} color={f.endsWith('pdf') ? '#C0392B' : '#22476A'} /><span style={{ flex: 1 }}>{f}</span><Check size={16} color="#0E5A4E" /></div>
                  ))}
                  <div className="lp-synchro"><WifiOff size={15} />{t.donnees.synchro}</div>
                </div>
              </Apparition>
            </div>
          </div>
        </section>

        {/* ── Captures de l'application ── */}
        <section aria-labelledby="t-ecr" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.ecrans.pastille}</span>
              <h2 id="t-ecr" className="lp-h2">{t.ecrans.titre}</h2>
              <p className="lp-lead">{t.ecrans.texte}</p>
            </Apparition>
            <div className="lp-ecrans">
              {t.ecrans.items.map((e, i) => (
                <Apparition key={e.src} delai={(i % 2) * 0.1}>
                  <figure className="lp-ecran">
                    <div className="lp-mock-barre"><span /><span /><span /></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.src} alt={e.alt} loading="lazy" decoding="async" />
                    <figcaption>{e.titre}</figcaption>
                  </figure>
                </Apparition>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tarifs ──────────────────────────────────────────────── */}
        <section id={a.tarifs} aria-labelledby="t-prix" className="lp-sec lp-bloc lp-zone-prix">
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Apparition className="lp-titre">
              <span className="lp-pastille">{t.tarifs.pastille}</span>
              <h2 id="t-prix" className="lp-h2">{t.tarifs.titre}</h2>
              <p className="lp-lead">{t.tarifs.sousTitre}</p>
            </Apparition>
            <Tarifs lang={t.lang} restants={restants} tel={TEL} />
            <Apparition>
              <ul className="lp-garanties">
                {t.tarifs.garanties.map((g) => <li key={g}><ShieldCheck size={18} color="#0E5A4E" aria-hidden />{g}</li>)}
              </ul>
            </Apparition>
            {restants !== 0 && (
              <Apparition style={{ textAlign: 'center' }}>
                <a href={FONDATEUR} target="_blank" rel="noopener noreferrer" className="lp-lien">{WA}{ar ? 'احجزوا مقعدكم ضمن الأعضاء المؤسسين على واتساب' : 'Réservez votre place de membre fondateur sur WhatsApp'}</a>
              </Apparition>
            )}
          </div>
        </section>

        {/* ── Avant / après ───────────────────────────────────────── */}
        <section aria-labelledby="t-cmp" className="lp-sec lp-bloc">
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
            <Apparition className="lp-titre"><h2 id="t-cmp" className="lp-h2">{t.compare.titre}</h2></Apparition>
            <Apparition>
              <div className="lp-table" role="table">
                <div role="row" className="tete"><span role="columnheader" /><span role="columnheader">{t.compare.sans}</span><span role="columnheader" className="avec">{t.compare.avec}</span></div>
                {t.compare.lignes.map(([l, s, m]) => (
                  <div role="row" key={l}>
                    <span role="rowheader"><strong>{l}</strong></span>
                    <span role="cell" className="sans"><X size={15} strokeWidth={3} aria-hidden />{s}</span>
                    <span role="cell" className="avec"><Check size={15} strokeWidth={3} aria-hidden />{m}</span>
                  </div>
                ))}
              </div>
            </Apparition>
          </div>
        </section>

        {/* ── Questions ───────────────────────────────────────────── */}
        <section id={a.faq} aria-labelledby="t-faq" className="lp-sec lp-bloc" style={{ paddingTop: 0 }}>
          <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Apparition className="lp-titre">
              <h2 id="t-faq" className="lp-h2">{t.faq.titre}</h2>
              <p className="lp-lead">{t.faq.sousTitre}</p>
            </Apparition>
            <div className="lp-faq">
              {t.faq.items.map(({ q, r }) => (
                <details key={q} className="lp-carte">
                  <summary><h3>{q}</h3><Plus className="lp-chev" size={20} color="#0E5A4E" aria-hidden /></summary>
                  <p>{r}</p>
                </details>
              ))}
            </div>
            <p className="lp-avert"><AlertTriangle size={16} aria-hidden />{t.avertissement}</p>
          </div>
        </section>

        {/* ── Chaque fonction en détail : liens internes vers les pages « fonction » ── */}
        <HubPages lang={t.lang} />

        {/* ── Dernier appel ───────────────────────────────────────── */}
        <section aria-labelledby="t-fin" className="lp-sec" style={{ paddingBottom: 56 }}>
          <Apparition className="lp-wrap lp-fin">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 id="t-fin" className="lp-h2" style={{ color: '#FFFFFF', fontSize: 30 }}>{t.fin.titre}</h2>
              <p style={{ margin: 0, fontSize: 16, color: '#CFE5DD' }}>{t.fin.texte}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link href="/register" className="lp-btn action mp-action">{t.hero.ctaEssai}<Fleche size={18} aria-hidden /></Link>
              <a href={DEMO} target="_blank" rel="noopener noreferrer" className="lp-btn fantome">{WA}{t.hero.ctaDemo}</a>
            </div>
          </Apparition>
        </section>
      </main>

      <footer className="lp-pied">
        <div className="lp-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
              <Logo sombre />
              <p style={{ margin: 0, lineHeight: 1.8 }}>{t.pied.slogan}</p>
            </div>
            <nav aria-label={ar ? 'روابط' : 'Liens'} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
              {t.pied.liens.map(([h, l]) => <a key={h} href={h} rel={h === '/login' ? 'nofollow' : undefined}>{l}</a>)}
              {pagesConfiancePubliees().map((p) => <Link key={p.ar} href={ar ? p.ar : p.fr}>{ar ? p.titreAr : p.titreFr}</Link>)}
              <Link href={t.autreLangue.href} hrefLang={ar ? 'fr' : 'ar'}>{t.autreLangue.label}</Link>
            </nav>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`mailto:${EMAIL}`}><Mail size={18} aria-hidden /><span dir="ltr">{EMAIL}</span></a>
              <a href={DEMO} target="_blank" rel="noopener noreferrer">{WA}<span className="num">{TEL}</span></a>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#9FC9BE' }}><Lock size={16} aria-hidden />{ar ? <>وفق القانون <span className="num">09.08</span></> : <>Conforme à la loi <span className="num">09-08</span></>}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 14, color: '#9FC9BE' }}>© <span className="num">{new Date().getFullYear()}</span> MalafiPro · {t.pied.droits}</div>
        </div>
      </footer>

      {/* Bouton toujours visible sur mobile */}
      <Link href="/register" className="lp-btn action mp-action lp-flot">{t.hero.ctaEssai}<Fleche size={18} aria-hidden /></Link>
    </div>
  )
}
