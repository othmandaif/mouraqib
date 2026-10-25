// Éléments visuels partagés (landing, tableau de bord, états vides) :
// icônes dans un rond coloré, pastilles de section et petites illustrations en SVG (couleurs de la marque).
import type { LucideIcon } from 'lucide-react'

type Ton = 'menthe' | 'vert' | 'bleu' | 'ardoise' | 'clair'
const TONS: Record<Ton, { bg: string; fg: string }> = {
  menthe: { bg: '#E3F0EC', fg: '#0E5A4E' },
  vert: { bg: '#0E5A4E', fg: '#FFFFFF' },
  bleu: { bg: '#EAF0F5', fg: '#22476A' }, // audiences / mises à jour
  ardoise: { bg: '#F1EFEA', fg: '#4D5B57' }, // neutre (adversaire, dossiers dormants)
  clair: { bg: 'rgba(255,255,255,.14)', fg: '#FFFFFF' }, // sur fond vert profond
}

export function IconeRonde({ Icon, ton = 'menthe', taille = 48 }: { Icon: LucideIcon; ton?: Ton; taille?: number }) {
  const t = TONS[ton]
  return (
    <span aria-hidden style={{ flex: 'none', width: taille, height: taille, borderRadius: '50%', background: t.bg, color: t.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={Math.round(taille * 0.46)} strokeWidth={1.8} />
    </span>
  )
}

export function PastilleSection({ children, sombre }: { children: React.ReactNode; sombre?: boolean }) {
  return (
    <span style={{ alignSelf: 'center', fontSize: 13, fontWeight: 600, borderRadius: 999, padding: '5px 14px', ...(sombre ? { background: 'rgba(255,255,255,.12)', color: '#E3F0EC', border: '1px solid rgba(255,255,255,.2)' } : { background: '#E3F0EC', color: '#0B4A40' }) }}>
      {children}
    </span>
  )
}

const Defs = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`${id}-v`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2E8B6E" /><stop offset="1" stopColor="#0E5A4E" /></linearGradient>
    <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E3F0EC" /></linearGradient>
    <filter id={`${id}-o`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#083B34" floodOpacity=".22" /></filter>
  </defs>
)

/** Calendrier avec coche (jalons, audiences). */
export function IllusCalendrier({ taille = 110 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 120 120" aria-hidden>
      <Defs id="ical" />
      <g filter="url(#ical-o)">
        <rect x="16" y="24" width="80" height="74" rx="14" fill="url(#ical-m)" />
        <path d="M16 38a14 14 0 0 1 14-14h52a14 14 0 0 1 14 14v6H16z" fill="url(#ical-v)" />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={26 + c * 16} y={54 + r * 13} width="10" height="8" rx="2" fill={r === 1 && c === 2 ? '#2E8B6E' : '#CDE5DD'} />))}
        <rect x="32" y="16" width="6" height="16" rx="3" fill="#083B34" /><rect x="74" y="16" width="6" height="16" rx="3" fill="#083B34" />
        <circle cx="92" cy="90" r="17" fill="#0E5A4E" stroke="#FFFFFF" strokeWidth="4" />
        <path d="m84 90 6 6 10-11" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/** Horloge + calendrier (temps gagné). */
export function IllusHorloge({ taille = 130 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille * 0.8} viewBox="0 0 150 120" aria-hidden>
      <Defs id="ihor" />
      <ellipse cx="78" cy="108" rx="62" ry="8" fill="#E3F0EC" />
      <g filter="url(#ihor-o)">
        <rect x="70" y="26" width="64" height="70" rx="12" fill="url(#ihor-m)" stroke="#CDE5DD" />
        <path d="M70 38a12 12 0 0 1 12-12h40a12 12 0 0 1 12 12v4H70z" fill="url(#ihor-v)" />
        {[0, 1].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={80 + c * 15} y={52 + r * 14} width="10" height="8" rx="2" fill="#CDE5DD" />))}
        <path d="m100 82 6 6 12-13" fill="none" stroke="#0E5A4E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="66" r="36" fill="#FFFFFF" stroke="url(#ihor-v)" strokeWidth="8" />
        <path d="M50 44v23l14 9" fill="none" stroke="#083B34" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="67" r="4" fill="#0E5A4E" />
      </g>
    </svg>
  )
}

/** Document sur une tuile verte (un message, un acte). */
export function IllusDocument({ taille = 120 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 120 120" aria-hidden>
      <Defs id="idoc" />
      <g filter="url(#idoc-o)" transform="rotate(-10 60 60)">
        <rect x="18" y="20" width="82" height="82" rx="20" fill="url(#idoc-v)" />
        <rect x="38" y="34" width="42" height="54" rx="7" fill="#FFFFFF" />
        <rect x="46" y="46" width="26" height="4" rx="2" fill="#2E8B6E" />
        <rect x="46" y="56" width="26" height="4" rx="2" fill="#CDE5DD" />
        <rect x="46" y="66" width="18" height="4" rx="2" fill="#CDE5DD" />
      </g>
      <path d="M96 18l4-9M104 28l9-3M90 12l-1-8" stroke="#9FE0C6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Feuille cochée + calendrier (offre fondateurs). */
export function IllusChecklist({ taille = 170 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille * 0.85} viewBox="0 0 180 150" aria-hidden>
      <Defs id="ichk" />
      <g filter="url(#ichk-o)">
        <rect x="24" y="30" width="96" height="112" rx="12" fill="#FFFFFF" transform="rotate(-8 72 86)" />
        <g transform="rotate(-8 72 86)">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx="46" cy={60 + i * 28} r="10" fill="#2E8B6E" />
              <path d={`m41 ${60 + i * 28} 4 4 7-8`} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="62" y={55 + i * 28} width="44" height="5" rx="2.5" fill="#CDE5DD" />
              <rect x="62" y={64 + i * 28} width="30" height="4" rx="2" fill="#E3F0EC" />
            </g>
          ))}
        </g>
        <rect x="118" y="14" width="46" height="46" rx="12" fill="url(#ichk-v)" />
        <rect x="128" y="26" width="26" height="24" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M128 33h26M135 22v7M147 22v7" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Avion en papier (dernier appel). */
export function IllusAvion({ taille = 70 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 80 80" aria-hidden>
      <path d="M8 38 70 12 56 68 38 50 30 64 28 46z" fill="rgba(255,255,255,.14)" stroke="#9FE0C6" strokeWidth="3" strokeLinejoin="round" />
      <path d="M28 46 70 12" stroke="#9FE0C6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Document avec bouclier (sécurité, programme fondateurs dans l'app). */
export function IllusBouclier({ taille = 130 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 130 130" aria-hidden>
      <Defs id="ibou" />
      <circle cx="40" cy="70" r="34" fill="rgba(255,255,255,.08)" />
      <g filter="url(#ibou-o)">
        <rect x="40" y="18" width="70" height="90" rx="10" fill="#FFFFFF" transform="rotate(8 75 63)" />
        <g transform="rotate(8 75 63)">
          {[0, 1, 2, 3].map((i) => <rect key={i} x="52" y={36 + i * 14} width={i === 3 ? 28 : 44} height="5" rx="2.5" fill="#CDE5DD" />)}
        </g>
        <path d="M38 58 58 50l20 8v16c0 14-9 23-20 28-11-5-20-14-20-28z" fill="url(#ibou-v)" stroke="#FFFFFF" strokeWidth="3" />
        <path d="m49 76 7 7 12-13" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/** Petit état vide : icône dans un rond + texte. */
export function EtatVide({ Icon, texte, action }: { Icon: LucideIcon; texte: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 8px', textAlign: 'center', color: '#5E6B67', fontSize: 14 }}>
      <IconeRonde Icon={Icon} ton="ardoise" taille={52} />
      <span>{texte}</span>
      {action}
    </div>
  )
}
