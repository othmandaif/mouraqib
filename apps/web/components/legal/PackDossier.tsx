'use client'
// « تحضير ملف العمل » (fiche dossier) : documents Word du dossier, pré-remplis.
// - administratifs : mis en page ici, instantanés, sans IA ;
// - actes de procédure : générés par l'IA (POST /documents/generer) puis enregistrés dans « وثائقي ».
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Download, Eye, FileArchive, FileText, Sparkles, X, ExternalLink } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Attente, ErreurChargement, SqueletteListe } from '@/components/ui/Chargement'
import { BTN } from '@/components/legal/DeadlineCard'
import { CARTE, H2, dh } from '@/lib/facturation'
import { creerZip, telecharger } from '@/lib/zip'
import { documentWord, documentsAdministratifs, nomFichier, texteVersHtml, type PackData } from '@/lib/pack/documents'

type EtatIA = { statut: 'attente' | 'cours' | 'pret' | 'erreur'; contenu?: string; documentId?: string }

const LIGNE: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid #EEEAE1', background: '#FFFFFF', flexWrap: 'wrap' }
const CASE: React.CSSProperties = { width: 22, height: 22, accentColor: '#0E5A4E', flex: 'none', cursor: 'pointer' }
const ICONE_BTN: React.CSSProperties = { ...BTN, padding: 0, width: 44, justifyContent: 'center', borderRadius: '50%' }

export function PackDossier({ dossierId }: { dossierId: string }) {
  const { toast } = useToast()
  const { data: p, loading, refetch } = useApi<PackData>(`/dossiers/${dossierId}/pack`)
  const admins = useMemo(() => (p ? documentsAdministratifs(p) : []), [p])
  const [choisis, setChoisis] = useState<Set<string>>(() => new Set(['garde', 'convention', 'procuration', 'recu', 'bordereau', 'lettre', 'honoraires']))
  const [ia, setIa] = useState<Record<string, EtatIA>>({})
  const [apercu, setApercu] = useState<{ titre: string; html: string } | null>(null)

  if (loading) return <section style={CARTE}><SqueletteListe n={4} label="جارٍ تحضير ملف العمل" /></section>
  if (!p) return <ErreurChargement quoi="ملف العمل" onReessayer={refetch} />

  const basculer = (cle: string) => setChoisis((s) => { const n = new Set(s); if (n.has(cle)) n.delete(cle); else n.add(cle); return n })
  const telechargerUn = (titre: string, html: string) => telecharger(new Blob(['﻿', documentWord(titre, html)], { type: 'application/msword' }), nomFichier(titre, p.dossier.numeroDossier))

  /** Génère un acte par l'IA puis l'enregistre dans « وثائقي » (lié au dossier). */
  const generer = async (a: PackData['actesIA'][number]) => {
    setIa((s) => ({ ...s, [a.typeActe]: { statut: 'cours' } }))
    try {
      const r = await apiFetch<{ titre: string; contenu: string; langue: 'AR' | 'FR' }>('/documents/generer', { method: 'POST', body: JSON.stringify({ typeActe: a.typeActe, variables: a.variables, dossierId, langue: 'AR' }) })
      const doc = await apiFetch<{ id: string }>('/documents', { method: 'POST', body: JSON.stringify({ titre: `${a.titreAr} — ${p.dossier.numeroDossier}`, contenu: r.contenu, typeActe: a.typeActe, langue: r.langue, variables: a.variables, dossierId }) })
      setIa((s) => ({ ...s, [a.typeActe]: { statut: 'pret', contenu: r.contenu, documentId: doc.id } }))
      return true
    } catch {
      setIa((s) => ({ ...s, [a.typeActe]: { statut: 'erreur' } }))
      return false
    }
  }
  const genererTout = async () => {
    let echecs = 0
    for (const a of p.actesIA) if (ia[a.typeActe]?.statut !== 'pret' && !(await generer(a))) echecs++ // une à la fois : limite IA par heure
    toast(echecs ? `تعذّر توليد ${echecs} من الوثائق. أعيدوا المحاولة.` : 'وُلّدت كل الوثائق وحُفظت في «وثائقي».', echecs ? 'error' : 'success')
  }

  const toutTelecharger = () => {
    const fichiers = [
      ...admins.filter((d) => choisis.has(d.cle)).map((d, i) => ({ nom: `${String(i + 1).padStart(2, '0')} ${nomFichier(d.titre, p.dossier.numeroDossier)}`, contenu: '﻿' + documentWord(d.titre, d.html()) })),
      ...p.actesIA.filter((a) => ia[a.typeActe]?.statut === 'pret').map((a) => ({ nom: `IA ${nomFichier(a.titreAr, p.dossier.numeroDossier)}`, contenu: '﻿' + documentWord(a.titreAr, texteVersHtml(a.titreAr, ia[a.typeActe].contenu!)) })),
    ]
    if (!fichiers.length) { toast('اختاروا وثيقة واحدة على الأقل.', 'error'); return }
    telecharger(creerZip(fichiers), `ملف العمل - ${p.dossier.numeroDossier.replace(/\//g, '-')}.zip`)
  }

  const manque = [!p.client && 'اربطوا الملف بموكل', p.dossier.honorairesConvenusCentimes == null && 'حدّدوا الأتعاب المتفق عليها', !p.profil.existe && 'أكملوا معلومات المكتب'].filter(Boolean) as string[]
  const nbPrets = Object.values(ia).filter((x) => x.statut === 'pret').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {manque.length > 0 && (
        <div role="note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FDF1DC', border: '1px solid #F2D49C', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: '#5A3A05', lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700 }}>لوثائق مكتملة:</span>
          <span>{manque.join(' · ')}{!p.profil.existe && <> — <Link href="/facturation?onglet=profil" style={{ color: '#7A4E06', fontWeight: 600 }}>معلومات المكتب</Link></>}. الحقول الناقصة تظهر نقطاً للملء باليد.</span>
        </div>
      )}

      <section style={CARTE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><FileText size={20} color="#0E5A4E" aria-hidden />وثائق المكتب <span style={{ fontSize: 13, fontWeight: 400, color: '#5E6B67' }}>فورية، دون ذكاء اصطناعي</span></h2>
          <button type="button" onClick={() => setChoisis((s) => (s.size === admins.length ? new Set() : new Set(admins.map((d) => d.cle))))} style={{ ...BTN, minHeight: 40 }}>{choisis.size === admins.length ? 'إلغاء الكل' : 'اختيار الكل'}</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {admins.map((d) => (
            <div key={d.cle} style={LIGNE}>
              <input type="checkbox" checked={choisis.has(d.cle)} onChange={() => basculer(d.cle)} aria-label={d.titre} style={CASE} />
              <span style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <strong style={{ fontSize: 15, fontWeight: 600 }}>{d.titre}</strong>
                <span style={{ fontSize: 13, color: '#5E6B67' }}>{d.description}</span>
              </span>
              <button type="button" onClick={() => setApercu({ titre: d.titre, html: d.html() })} style={ICONE_BTN} aria-label={`معاينة ${d.titre}`} title="معاينة"><Eye size={18} aria-hidden /></button>
              <button type="button" onClick={() => telechargerUn(d.titre, d.html())} style={ICONE_BTN} aria-label={`تحميل ${d.titre}`} title="تحميل Word"><Download size={18} aria-hidden /></button>
            </div>
          ))}
        </div>
        {p.factures.length > 0 && (
          <div style={{ fontSize: 14, color: '#3B4A47', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            فواتير الملف المصدرة:
            {p.factures.map((f) => <Link key={f.id} href={`/facturation/${f.id}`} style={{ fontWeight: 600, color: '#0E5A4E' }}><span className="num">{f.numero}</span> ({dh(f.totalTtcCentimes)})</Link>)}
          </div>
        )}
      </section>

      <section style={CARTE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={20} color="#0E5A4E" aria-hidden />أعمال إجرائية حسب مرحلة الملف</h2>
          {p.actesIA.length > 1 && <button type="button" onClick={genererTout} disabled={Object.values(ia).some((x) => x.statut === 'cours')} style={{ ...BTN, minHeight: 40 }}>توليد الكل</button>}
        </div>
        <span style={{ fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>مسودات بالذكاء الاصطناعي من معطيات الملف، تُحفظ في «وثائقي» لتراجعوها وتعدّلوها قبل أي إيداع.</span>
        {p.actesIA.length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>لا عمل إجرائي مقترح لهذه المرحلة. يمكنكم تحرير أي وثيقة من «محرّر الوثائق».</span> : p.actesIA.map((a) => {
          const e = ia[a.typeActe]
          return (
            <div key={a.typeActe} style={LIGNE}>
              <span style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <strong style={{ fontSize: 15, fontWeight: 600 }}>{a.titreAr}</strong>
                <span style={{ fontSize: 13, color: '#5E6B67' }}>{a.raison}</span>
              </span>
              {e?.statut === 'pret' ? <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0B4A40' }}><Check size={16} aria-hidden />جاهزة</span>
                <button type="button" onClick={() => setApercu({ titre: a.titreAr, html: texteVersHtml(a.titreAr, e.contenu!) })} style={ICONE_BTN} aria-label={`معاينة ${a.titreAr}`}><Eye size={18} aria-hidden /></button>
                <button type="button" onClick={() => telechargerUn(a.titreAr, texteVersHtml(a.titreAr, e.contenu!))} style={ICONE_BTN} aria-label={`تحميل ${a.titreAr}`}><Download size={18} aria-hidden /></button>
                <Link href={`/documents?id=${e.documentId}`} style={{ ...ICONE_BTN }} aria-label="فتح في المحرر" title="فتح في المحرر"><ExternalLink size={18} aria-hidden /></Link>
              </> : (
                <button type="button" onClick={() => generer(a)} disabled={e?.statut === 'cours'} aria-busy={e?.statut === 'cours'} style={{ ...BTN, minHeight: 40, ...(e?.statut === 'erreur' ? { borderColor: '#C0392B', color: '#9B2C20' } : {}) }}>
                  <Attente actif={e?.statut === 'cours'} texte="جارٍ التحرير…" sombre><Sparkles size={16} aria-hidden />{e?.statut === 'erreur' ? 'إعادة المحاولة' : 'توليد'}</Attente>
                </button>
              )}
            </div>
          )
        })}
      </section>

      <style>{`.pk-barre{bottom:16px}@media (max-width:760px){.pk-barre{bottom:calc(84px + env(safe-area-inset-bottom))}}`}</style>
      <div className="pk-barre" style={{ position: 'sticky', zIndex: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#083B34', color: '#FFFFFF', borderRadius: 16, padding: '12px 16px' }}>
        <span style={{ fontSize: 14 }}><span className="num">{choisis.size + nbPrets}</span> وثيقة في الملف المضغوط</span>
        <button type="button" className="mp-action" onClick={toutTelecharger} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, gap: 8 }}><FileArchive size={18} aria-hidden />تحميل ملف العمل (zip)</button>
      </div>

      {apercu && (
        <div role="dialog" aria-modal="true" aria-label={apercu.titre} onClick={() => setApercu(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(21,32,30,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: 18, width: 'min(860px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #EEEAE1' }}>
              <strong style={{ flex: 1, fontSize: 16 }}>{apercu.titre}</strong>
              <button type="button" onClick={() => telechargerUn(apercu.titre, apercu.html)} style={{ ...BTN, minHeight: 40, gap: 6 }}><Download size={16} aria-hidden />Word</button>
              <button type="button" onClick={() => setApercu(null)} style={ICONE_BTN} aria-label="إغلاق"><X size={18} aria-hidden /></button>
            </div>
            <iframe title={apercu.titre} srcDoc={documentWord(apercu.titre, apercu.html)} sandbox="" style={{ border: 0, width: '100%', height: '75vh', background: '#FFFFFF' }} />
          </div>
        </div>
      )}
    </div>
  )
}
