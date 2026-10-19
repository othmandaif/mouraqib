'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Building2, Clock, Bell, Gavel, ArrowLeft } from 'lucide-react'

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', muted: '#7A7461', faint: '#A39C8B',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  green: '#3F9E6B', greenBg: '#E6F3EB', red: '#DB6A52', redBg: '#FCE8E2',
  amber: '#C68A2E', amberBg: '#FAF1DE', border: '#EEE7D6', borderSoft: '#F3EEDF',
  grad: 'linear-gradient(140deg,#CBAE55,#9A7820)',
}

export interface CaseCardProps {
  id: string
  dossierNumber: string
  tribunal: string          // déjà traduit en arabe par le parent
  typeAffaire?: string
  statut: 'critique' | 'audience' | 'en_cours' | 'nouveau' | 'clos'
  derniereNouveaute?: string | null  // date ISO du dernier événement
  dernierEvenement?: string | null   // texte court du dernier événement
  nbEvenements?: number
  nbEcheances?: number
  estCourAppel?: boolean
}

const STATUTS: Record<string, { label: string; color: string; bg: string }> = {
  critique: { label: 'أجل حرج', color: '#DB6A52', bg: '#FCE8E2' },
  audience: { label: 'جلسة قريبة', color: '#C68A2E', bg: '#FAF1DE' },
  en_cours: { label: 'قيد المتابعة', color: '#3F9E6B', bg: '#E6F3EB' },
  nouveau: { label: 'جديد', color: '#9A7820', bg: '#F4EFDF' },
  clos: { label: 'منتهٍ', color: '#7A7461', bg: '#F0EAD9' },
}

// "il y a X jours" en arabe, à partir d'une date ISO.
function depuis(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const jours = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (jours <= 0) return 'اليوم'
  if (jours === 1) return 'أمس'
  if (jours < 7) return `منذ ${jours} أيام`
  if (jours < 30) return `منذ ${Math.floor(jours / 7)} أسابيع`
  if (jours < 365) return `منذ ${Math.floor(jours / 30)} أشهر`
  return `منذ ${Math.floor(jours / 365)} سنوات`
}

export function CaseCard(props: CaseCardProps) {
  const s = STATUTS[props.statut] ?? STATUTS.nouveau
  const recent = depuis(props.derniereNouveaute)
  const dateExacte = props.derniereNouveaute
    ? new Date(props.derniereNouveaute).toLocaleDateString('fr-MA')
    : null

  return (
    <Link href={`/dossiers/${props.id}`} style={{ textDecoration: 'none' }}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        dir="rtl"
        style={{
          background: C.card, borderRadius: 18, padding: 0, overflow: 'hidden',
          border: `1px solid ${C.border}`,
          boxShadow: '0 12px 30px -22px rgba(110,90,30,.45)',
          position: 'relative', cursor: 'pointer', height: '100%',
        }}
        className="case-card"
      >
        {/* liseré coloré à droite selon statut */}
        <div style={{ position: 'absolute', insetInlineEnd: 0, top: 0, bottom: 0, width: 4, background: s.color, opacity: .9 }} />

        <div style={{ padding: '18px 20px' }}>
          {/* Haut : statut + récence */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '4px 11px', borderRadius: 8 }}>{s.label}</span>
            {recent && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.faint }}>
                {recent}
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: props.statut === 'critique' ? C.red : C.goldM, flex: 'none' }} />
              </span>
            )}
          </div>

          {/* Numéro de dossier */}
          <div dir="ltr" style={{ fontSize: 23, fontWeight: 700, color: C.goldD, fontFamily: "'IBM Plex Sans',sans-serif", textAlign: 'right', letterSpacing: '.3px', marginBottom: 10 }}>
            {props.dossierNumber}
          </div>

          {/* Tribunal (arabe) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: props.typeAffaire ? 6 : 14, flexDirection: 'row-reverse' }}>
            <Building2 size={15} stroke={C.goldM} style={{ marginTop: 2, flex: 'none' }} />
            <span style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.5, textAlign: 'right' }}>{props.tribunal}</span>
            {props.estCourAppel && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.goldD, background: C.goldChip, padding: '2px 7px', borderRadius: 6, flex: 'none' }}>استئناف</span>
            )}
          </div>

          {/* Objet / type */}
          {props.typeAffaire && (
            <p style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, paddingInlineEnd: 23, textAlign: 'right', lineHeight: 1.6 }}>{props.typeAffaire}</p>
          )}

          {/* Dernière nouveauté */}
          {props.dernierEvenement && (
            <div style={{ background: C.goldSubtle, borderRadius: 11, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
              <Gavel size={14} stroke={C.goldD} style={{ marginTop: 1, flex: 'none' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: C.goldD, marginBottom: 2 }}>آخر مستجد</div>
                <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.5 }}>
                  {props.dernierEvenement.length > 60 ? props.dernierEvenement.slice(0, 60) + '…' : props.dernierEvenement}
                </div>
              </div>
            </div>
          )}

          {/* Pied : compteurs + flèche */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
            <ArrowLeft size={16} stroke={C.faint} className="case-arrow" style={{ transition: 'transform .15s, color .15s' }} />
            <div style={{ display: 'flex', gap: 14 }}>
              {dateExacte && (
                <span dir="ltr" style={{ fontSize: 11, color: C.faint, fontFamily: "'IBM Plex Sans',sans-serif" }}>{dateExacte}</span>
              )}
              {!!props.nbEcheances && props.nbEcheances > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.red, fontWeight: 600 }}>
                  <Clock size={13} stroke={C.red} /> {props.nbEcheances}
                </span>
              )}
              {!!props.nbEvenements && props.nbEvenements > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: C.muted }}>
                  <Bell size={13} stroke={C.muted} /> {props.nbEvenements}
                </span>
              )}
            </div>
          </div>
        </div>

        <style>{`
          .case-card:hover .case-arrow { transform: translateX(-3px); stroke: ${C.goldD}; }
        `}</style>
      </motion.div>
    </Link>
  )
}