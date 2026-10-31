// Éléments partagés par la landing et les pages « fonction » (composants serveur, aucun JavaScript client).
export const TEL = process.env.NEXT_PUBLIC_CONTACT_TEL || process.env.CONTACT_COMMERCIAL_TEL || '+212607167594'
export const EMAIL = process.env.CONTACT_COMMERCIAL_EMAIL || 'contact@malafipro.ma'

export function lienWa(texte: string) {
  return `https://wa.me/${TEL.replace(/[^\d]/g, '').replace(/^00/, '').replace(/^0/, '212')}?text=${encodeURIComponent(texte)}`
}

export const WA = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /><path d="M9 10c0 3 2 5 5 5l1.2-1.2-1.8-1-.9.8c-.9-.4-1.7-1.2-2.1-2.1l.8-.9-1-1.8L9 10z" /></svg>
)

export const Logo = ({ sombre }: { sombre?: boolean }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={sombre ? '/brand/logo-symbol-white.svg' : '/brand/malafipro-symbol.svg'} alt="" width={38} height={38} />
    <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 22, fontWeight: 600, color: sombre ? '#FFFFFF' : '#083B34' }}>Malafi<span style={{ fontWeight: 400 }}>Pro</span></span>
  </span>
)

