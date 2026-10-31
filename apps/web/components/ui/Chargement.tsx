'use client'

// États de chargement communs : écran de démarrage, indicateur, squelettes qui ont la forme du contenu.
// Règles : pas de clignotement pour une attente courte (délai avant affichage), place réservée (pas de saut
// de mise en page), aria-busy / role="status" pour les lecteurs d'écran, animations coupées si l'utilisateur
// a demandé « moins de mouvement ».
import { useCallback, useEffect, useRef, useState } from 'react'
import { t, tx as _tx, useLangue } from '@/lib/langue'

// Styles (animations, reflet) : app/globals.css, section « Chargement »

/** Vrai seulement après `ms` : évite d'afficher un indicateur pour une attente de quelques millisecondes. */
export function useApresDelai(actif: boolean, ms = 250) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!actif) { setVisible(false); return }
    const t = setTimeout(() => setVisible(true), ms)
    return () => clearTimeout(t)
  }, [actif, ms])
  return visible
}

/**
 * Indicateur rond. Par défaut aux couleurs de la marque (piste menthe, arc vert) ; `clair` sur fond sombre ;
 * `courant` = couleur du texte autour (dans un bouton : lisible quel que soit le fond, vert, orange ou blanc).
 */
export function Indicateur({ taille = 20, clair, courant, label }: { taille?: number; clair?: boolean; courant?: boolean; label?: string }) {
  const piste = courant ? 'currentColor' : clair ? 'rgba(255,255,255,.3)' : '#CDE5DD'
  const arc = courant ? 'currentColor' : clair ? '#FFFFFF' : '#0E5A4E'
  return (
    <span role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: 'inline-flex', flex: 'none' }}>
      <svg className="mp-spin" width={taille} height={taille} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.5" stroke={piste} strokeOpacity={courant ? 0.25 : undefined} strokeWidth="3" />
        <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" stroke={arc} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** Écran de démarrage : logo qui « respire », barre de progression, message si le réseau est lent. */
export function Splash() {
  const lent = useApresDelai(true, 8000)
  const visible = useApresDelai(true, 150) // rien pendant 150 ms : pas de flash quand la session est déjà en cache
  const { t: tr } = useLangue() // rendu aussi côté serveur : hook (pas de décalage à l'hydratation)
  return (
    <div role="status" aria-busy="true" aria-label={tr('جارٍ تحميل ملفاتي')}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: 'radial-gradient(900px 500px at 50% 0%, #0E5A4E 0%, #083B34 70%)', color: '#E3F0EC', padding: 24 }}>
      {visible && (
        <div className="mp-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mp-splash-logo" src="/brand/logo-symbol-white.svg" alt="" width={72} height={72} />
          <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 28, fontWeight: 600, color: '#FFFFFF' }}>Malafi<span style={{ fontWeight: 400 }}>Pro</span></span>
          <span className="mp-splash-barre" aria-hidden style={{ position: 'relative', width: 160, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
            <i style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', borderRadius: 4, background: '#9FE0C6' }} />
          </span>
          <span style={{ fontSize: 15, color: '#9FC9BE', minHeight: 24, textAlign: 'center' }}>
            {lent ? tr('الاتصال بطيء… ما زلنا نحمّل ملفاتكم.') : tr('نحضّر ملفاتكم…')}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Squelettes ─────────────────────────────────────────────────────── */

export function Sq({ l = '100%', h = 14, r = 8, style }: { l?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="mp-sq" style={{ width: l, height: h, borderRadius: r, ...style }} />
}

const Conteneur = ({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div role="status" aria-busy="true" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
    {children}
  </div>
)

/** Liste (dossiers, alertes, documents) : rond + 2 lignes + pastille. */
export function SqueletteListe({ n = 5, label = t('جارٍ التحميل') }: { n?: number; label?: string }) {
  return (
    <Conteneur label={label} style={{ gap: 0, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '4px 18px' }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < n - 1 ? '1px solid #EEEAE1' : 0 }}>
          <Sq l={40} h={40} r={20} style={{ flex: 'none' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sq l={`${60 - (i % 3) * 10}%`} h={14} />
            <Sq l={`${35 + (i % 2) * 10}%`} h={11} />
          </div>
          <Sq l={64} h={24} r={12} style={{ flex: 'none' }} />
        </div>
      ))}
    </Conteneur>
  )
}

/** Cartes de délai : compte à rebours carré + titre + barre + 2 boutons. */
export function SqueletteCartes({ n = 2, label = t('جارٍ تحميل الآجال') }: { n?: number; label?: string }) {
  return (
    <Conteneur label={label}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="mp-sq-carte" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Sq l={72} h={72} r={16} style={{ flex: 'none' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sq l="55%" h={16} />
            <Sq l="35%" h={12} />
            <Sq l="100%" h={6} r={3} />
            <div style={{ display: 'flex', gap: 8 }}><Sq l={110} h={36} r={18} /><Sq l={90} h={36} r={18} /></div>
          </div>
        </div>
      ))}
    </Conteneur>
  )
}

/** Rangée d'indicateurs (tableau de bord, admin). */
export function SqueletteKpis({ n = 4 }: { n?: number }) {
  return (
    <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="mp-sq-carte" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}><Sq l="60%" h={12} /><Sq l={56} h={30} /></div>
          <Sq l={46} h={46} r={23} style={{ flex: 'none' }} />
        </div>
      ))}
    </div>
  )
}

/** Fiche dossier : en-tête + chronologie. */
export function SqueletteFiche() {
  return (
    <Conteneur label={t('جارٍ تحميل الملف')} style={{ gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><Sq l="45%" h={26} /><Sq l="30%" h={14} /></div>
      <div className="mp-sq-carte" style={{ background: '#083B34', borderColor: '#083B34', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <span className="mp-sq" style={{ width: 80, height: 80, borderRadius: 16, opacity: .25, flex: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="mp-sq" style={{ width: '50%', height: 16, opacity: .25 }} /><span className="mp-sq" style={{ width: '30%', height: 12, opacity: .25 }} />
        </div>
      </div>
      <div className="mp-sq-carte">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Sq l={12} h={12} r={6} style={{ marginTop: 4, flex: 'none' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}><Sq l={`${70 - i * 8}%`} h={14} /><Sq l="25%" h={11} /></div>
          </div>
        ))}
      </div>
    </Conteneur>
  )
}

/** Page générique (changement de page) : titre, indicateurs, liste. */
export function SquelettePage() {
  return (
    <Conteneur label={t('جارٍ تحميل الصفحة')} style={{ gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><Sq l={220} h={30} /><Sq l={320} h={14} style={{ maxWidth: '80%' }} /></div>
      <SqueletteKpis />
      <SqueletteListe n={4} />
    </Conteneur>
  )
}

/** Nombre pas encore chargé : petit squelette au lieu d'un « 0 » trompeur (0 délai ≠ pas encore chargé). */
export function Nombre({ v, l = 18 }: { v: number | null | undefined; l?: number }) {
  if (v === null || v === undefined) return <span className="mp-sq" aria-label={t('جارٍ التحميل')} style={{ display: 'inline-block', width: l, height: '0.9em', verticalAlign: 'middle', borderRadius: 4 }} />
  return <span className="num">{v}</span>
}

/**
 * Échec de chargement DANS la page (pas seulement le bandeau du haut) : jamais une liste vide qui ferait
 * croire qu'il n'y a « aucun délai ».
 */
export function ErreurChargement({ quoi, onReessayer }: { quoi: string; onReessayer: () => void }) {
  return (
    <div role="alert" style={{ background: '#FFFFFF', border: '1px solid #F0C9C2', borderRadius: 16, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <span aria-hidden style={{ width: 52, height: 52, borderRadius: '50%', background: '#FBEAE7', color: '#9B2C20', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9.5" /></svg>
      </span>
      <strong style={{ fontSize: 17, fontWeight: 600 }}>{t('تعذّر تحميل {quoi}', { quoi })}</strong>
      <span style={{ fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>{t('تحققوا من الاتصال بالإنترنت ثم أعيدوا المحاولة. لا تعني هذه الرسالة أنه لا توجد معطيات.')}</span>
      <button type="button" onClick={onReessayer} style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 600, background: '#15201E', color: '#FFFFFF', border: 0, borderRadius: 999, padding: '0 20px', minHeight: 44, cursor: 'pointer', marginTop: 4 }}>{t('إعادة المحاولة')}</button>
    </div>
  )
}

/** « Synchronisé avec محاكم il y a X » : l'avocat sait que l'information est fraîche. */
export function DepuisSynchro({ date, prefixe = t('آخر مزامنة مع محاكم') }: { date: string | null | undefined; prefixe?: string }) {
  if (!date) return <span style={{ fontSize: 13, color: '#5E6B67' }}>{prefixe}: {t('لم تتم بعد')}</span>
  const min = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000))
  const vieux = min > 26 * 60 // au-delà d'un jour sans synchronisation : à signaler
  const nb = (v: number) => <span className="num">{v}</span>
  const texte = min < 1 ? t('الآن') : min < 60 ? _tx('قبل {n} دقيقة', { n: nb(min) }) : min < 48 * 60 ? _tx('قبل {n} ساعة', { n: nb(Math.round(min / 60)) }) : _tx('قبل {n} أيام', { n: nb(Math.round(min / 1440)) })
  return (
    <span title={new Date(date).toLocaleString('fr-MA')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: vieux ? '#7A4E06' : '#5E6B67' }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: vieux ? '#F2A93B' : '#2E8B6E' }} />
      {prefixe} {texte}
    </span>
  )
}

/**
 * Contenu d'un bouton pendant l'envoi : indicateur + « جارٍ … » (le bouton reste bloqué : pas de double envoi).
 * L'indicateur prend la couleur du texte du bouton (`sombre` n'est plus nécessaire, gardé pour compatibilité).
 */
export function EnCours({ texte }: { texte: string; sombre?: boolean }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Indicateur taille={18} courant />{t(texte)}</span>
}

/**
 * Action qui prend du temps (créer, enregistrer, changer un état…) : un seul envoi à la fois par écran
 * (pas de double clic), et `cle` dit quel bouton attend pour y afficher l'indicateur.
 *   const { cle, occupe, lancer } = useEnvoi()
 *   <button disabled={occupe} aria-busy={cle === 'archiver'} onClick={() => lancer('archiver', () => apiFetch(…))}>
 *     <Attente actif={cle === 'archiver'} texte="جارٍ الأرشفة…">أرشفة</Attente>
 *   </button>
 */
export function useEnvoi() {
  const [cle, setCle] = useState<string | null>(null)
  const verrou = useRef(false)
  const lancer = useCallback(async <T,>(k: string, fn: () => Promise<T>): Promise<T | undefined> => {
    if (verrou.current) return undefined
    verrou.current = true
    setCle(k)
    try { return await fn() } finally { verrou.current = false; setCle(null) }
  }, [])
  return { cle, occupe: cle !== null, lancer }
}

/**
 * Contenu d'un bouton qui attend : le libellé reste tel quel les 200 premières ms (pas de clignotement),
 * puis indicateur + texte d'attente. Sans `texte` (bouton icône), l'indicateur remplace l'icône.
 */
export function Attente({ actif, texte, children }: { actif: boolean; texte?: string; sombre?: boolean; children: React.ReactNode }) {
  const visible = useApresDelai(actif, 200)
  if (!visible) return <>{children}</>
  return texte ? <EnCours texte={texte} /> : <Indicateur taille={18} courant label={t('جارٍ التنفيذ')} />
}

/**
 * Attente longue (recherche sur محاكم, génération…) : étapes qui avancent avec le temps écoulé + secondes.
 * L'utilisateur voit que ça progresse au lieu d'un texte figé. `etapes[i].des` = seconde de début de l'étape.
 */
export function EtapesAttente({ etapes, lent }: { etapes: { texte: string; des: number }[]; lent?: { des: number; texte: string } }) {
  const [s, setS] = useState(0)
  useEffect(() => {
    const debut = Date.now()
    const t = setInterval(() => setS(Math.floor((Date.now() - debut) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const courante = etapes.reduce((acc, e, i) => (s >= e.des ? i : acc), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ol aria-live="polite" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {etapes.map((e, i) => {
          const fait = i < courante, active = i === courante
          return (
            <li key={i} aria-current={active ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: active ? '#15201E' : fait ? '#0B4A40' : '#8C877C', fontWeight: active ? 600 : 400 }}>
              <span aria-hidden style={{ width: 22, height: 22, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {fait ? (
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </span>
                ) : active ? <Indicateur taille={20} /> : <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #CFCAC0' }} />}
              </span>
              {t(e.texte)}
            </li>
          )
        })}
      </ol>
      <span style={{ fontSize: 13, color: lent && s >= lent.des ? '#7A4E06' : '#5E6B67' }}>
        {_tx('{n} ثانية', { n: <span className="num">{s}</span> })}{lent && s >= lent.des ? ` · ${t(lent.texte)}` : ''}
      </span>
    </div>
  )
}
