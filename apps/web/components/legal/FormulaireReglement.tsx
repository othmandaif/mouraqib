'use client'
// Encaissement (modale) : sur une facture émise, ou provision (تسبيق) sans facture, imputable plus tard.
import { useState } from 'react'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Attente, useEnvoi } from '@/components/ui/Chargement'
import { BTN } from '@/components/legal/DeadlineCard'
import { INPUT, LABEL, MODE, centimesVersSaisie, dh, versCentimes, type ModeReglement } from '@/lib/facturation'
import { t as tr } from '@/lib/langue'

interface Props {
  clientId: string
  dossiers?: { id: string; numeroDossier: string }[]
  factures?: { id: string; numero: string | null; resteCentimes: number }[]
  factureId?: string
  dossierId?: string
  montantPropose?: number
  onFerme: () => void
  onFait: () => void
}

const aujourdHui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function FormulaireReglement({ clientId, dossiers = [], factures = [], factureId, dossierId, montantPropose, onFerme, onFait }: Props) {
  const { toast } = useToast()
  const { cle, lancer } = useEnvoi()
  const [f, setF] = useState({ montant: centimesVersSaisie(montantPropose), date: aujourdHui(), mode: 'VIREMENT' as ModeReglement, reference: '', factureId: factureId ?? '', dossierId: dossierId ?? '', note: '' })
  const facture = factures.find((x) => x.id === f.factureId)

  const valider = (e: React.FormEvent) => {
    e.preventDefault()
    const montantCentimes = versCentimes(f.montant)
    if (!montantCentimes) { toast(tr('أدخلوا مبلغاً صالحاً.'), 'error'); return }
    lancer('ok', async () => {
      try {
        await apiFetch('/facturation/reglements', {
          method: 'POST',
          body: JSON.stringify({
            clientId, montantCentimes, mode: f.mode, reference: f.reference || null, note: f.note || null,
            date: new Date(`${f.date}T12:00:00`).toISOString(), factureId: f.factureId || null, dossierId: f.dossierId || null,
          }),
        })
        toast(tr('سُجّل الأداء.'), 'success')
        onFait()
      } catch { toast(tr('تعذّر تسجيل الأداء.'), 'error') }
    })
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={tr('تسجيل أداء')} onClick={onFerme} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(21,32,30,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={valider} style={{ background: '#FFFFFF', borderRadius: 20, width: 'min(520px, 100%)', maxHeight: '92vh', overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{tr('تسجيل أداء')}</h2>
          <button type="button" onClick={onFerme} aria-label={tr('إغلاق')} style={{ ...BTN, padding: 0, width: 44, justifyContent: 'center', borderRadius: '50%' }}><X size={18} aria-hidden /></button>
        </div>
        {!factureId && (
          <label style={LABEL}>{tr('عن')}
            <select value={f.factureId} onChange={(e) => setF((x) => ({ ...x, factureId: e.target.value }))} style={INPUT}>
              <option value="">{tr('تسبيق على الأتعاب (دون فاتورة)')}</option>
              {factures.filter((x) => x.resteCentimes > 0).map((x) => <option key={x.id} value={x.id}>{tr('فاتورة')}{' '}{x.numero}{' '}{tr('— الباقي')}{' '}{dh(x.resteCentimes)}</option>)}
            </select>
          </label>
        )}
        {!f.factureId && dossiers.length > 0 && (
          <label style={LABEL}>{tr('الملف (اختياري)')}
            <select value={f.dossierId} onChange={(e) => setF((x) => ({ ...x, dossierId: e.target.value }))} style={INPUT}>
              <option value="">{tr('— دون ملف —')}</option>
              {dossiers.map((d) => <option key={d.id} value={d.id}>{d.numeroDossier}</option>)}
            </select>
          </label>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label style={LABEL}>{tr('المبلغ (درهم) *')}
            <input required inputMode="decimal" value={f.montant} onChange={(e) => setF((x) => ({ ...x, montant: e.target.value }))} className="num" style={{ ...INPUT, textAlign: 'start' }} autoFocus />
            {facture && <button type="button" onClick={() => setF((x) => ({ ...x, montant: centimesVersSaisie(facture.resteCentimes) }))} style={{ border: 0, background: 'transparent', color: '#0E5A4E', fontWeight: 600, cursor: 'pointer', padding: 0, textAlign: 'start', fontFamily: 'inherit' }}>{tr('الباقي:')}{' '}{dh(facture.resteCentimes)}</button>}
          </label>
          <label style={LABEL}>{tr('التاريخ *')}<input required type="date" value={f.date} max={aujourdHui()} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} style={INPUT} /></label>
        </div>
        <div role="radiogroup" aria-label={tr('طريقة الأداء')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(MODE) as ModeReglement[]).map((m) => <button key={m} type="button" role="radio" aria-checked={f.mode === m} className={f.mode === m ? 'mp-choix' : ''} onClick={() => setF((x) => ({ ...x, mode: m }))} style={{ ...BTN, minHeight: 40, fontSize: 13 }}>{MODE[m]}</button>)}
        </div>
        {f.mode !== 'ESPECES' && <label style={LABEL}>{tr('المرجع (رقم الشيك أو التحويل)')}<input value={f.reference} onChange={(e) => setF((x) => ({ ...x, reference: e.target.value }))} className="num" style={INPUT} /></label>}
        <label style={LABEL}>{tr('ملاحظة')}<input value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} style={INPUT} /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="mp-action" disabled={cle === 'ok'} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, minHeight: 48, padding: '0 22px' }}><Attente actif={cle === 'ok'} texte={tr('جارٍ الحفظ…')}>{tr('تسجيل')}</Attente></button>
          <button type="button" onClick={onFerme} style={{ ...BTN, minHeight: 48 }}>{tr('إلغاء')}</button>
        </div>
      </form>
    </div>
  )
}
