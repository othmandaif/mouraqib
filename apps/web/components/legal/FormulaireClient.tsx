'use client'
// Création / modification d'un client (modale), partagée par la liste et la fiche client.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Attente, useEnvoi } from '@/components/ui/Chargement'
import { BTN } from '@/components/legal/DeadlineCard'
import { INPUT, LABEL, type Client } from '@/lib/facturation'

interface Conflits { commeClient: { id: string; nom: string }[]; commeAdversaire: { dossierId: string; numeroDossier: string; adversaire: string }[] }

/** Création / modification d'un client (modale). Avertit si le nom figure comme adversaire dans un dossier. */
export function FormulaireClient({ initial, onFerme, onCree }: { initial?: Client; onFerme: () => void; onCree: (id: string) => void }) {
  const { toast } = useToast()
  const { cle, lancer } = useEnvoi()
  const [f, setF] = useState<Partial<Client>>(initial ?? { type: 'PERSONNE', nom: '' })
  const [nomDebounce, setNomDebounce] = useState(f.nom ?? '')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  useEffect(() => { const t = setTimeout(() => setNomDebounce(f.nom ?? ''), 400); return () => clearTimeout(t) }, [f.nom])
  const { data: conflits } = useApi<Conflits>(nomDebounce.trim().length >= 3 ? `/clients/conflits?nom=${encodeURIComponent(nomDebounce.trim())}${initial ? `&sauf=${initial.id}` : ''}` : null)
  const champ = (k: keyof Client) => ({ value: (f[k] as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value })) })
  const societe = f.type === 'SOCIETE'

  const enregistrer = (e: React.FormEvent) => {
    e.preventDefault()
    lancer('ok', async () => {
      setErreurs({})
      const { id: _id, estArchive: _a, ...corps } = f as Client
      try {
        const r = await apiFetch<{ id: string }>(initial ? `/clients/${initial.id}` : '/clients', { method: initial ? 'PATCH' : 'POST', body: JSON.stringify(corps) })
        toast(initial ? 'حُفظت بطاقة الموكل.' : 'أُضيف الموكل.', 'success')
        onCree(r.id)
      } catch (err: any) {
        let champs: Record<string, string[]> | undefined
        try { champs = JSON.parse(err?.message ?? '')?.fieldErrors } catch { /* message simple */ }
        if (champs) setErreurs(Object.fromEntries(Object.entries(champs).map(([k, v]) => [k, v[0]])))
        toast('تحقّقوا من الحقول.', 'error')
      }
    })
  }

  const adv = conflits?.commeAdversaire ?? []
  const doublons = conflits?.commeClient ?? []
  return (
    <div role="dialog" aria-modal="true" aria-label={initial ? 'تعديل بطاقة الموكل' : 'موكل جديد'} onClick={onFerme} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(21,32,30,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form dir="rtl" onClick={(e) => e.stopPropagation()} onSubmit={enregistrer} style={{ background: '#FFFFFF', borderRadius: 20, width: 'min(640px, 100%)', maxHeight: '92vh', overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{initial ? 'تعديل بطاقة الموكل' : 'موكل جديد'}</h2>
          <button type="button" onClick={onFerme} aria-label="إغلاق" style={{ ...BTN, padding: 0, width: 44, justifyContent: 'center', borderRadius: '50%' }}><X size={18} aria-hidden /></button>
        </div>
        <div role="radiogroup" aria-label="نوع الموكل" style={{ display: 'flex', gap: 8 }}>
          {([['PERSONNE', 'شخص ذاتي'], ['SOCIETE', 'شركة']] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={f.type === v} onClick={() => setF((x) => ({ ...x, type: v }))} className={f.type === v ? 'mp-choix' : ''} style={{ ...BTN, flex: 1, justifyContent: 'center' }}>{l}</button>
          ))}
        </div>
        <label style={LABEL}>{societe ? 'اسم الشركة' : 'الاسم الكامل'} *<input required {...champ('nom')} style={INPUT} autoFocus />{erreurs.nom && <span style={{ color: '#9B2C20' }}>{erreurs.nom}</span>}</label>
        {adv.length > 0 && (
          <div role="alert" style={{ display: 'flex', gap: 10, background: '#FBEAE7', border: '1px solid #F0C9C2', borderRadius: 12, padding: 12, fontSize: 14, color: '#6E1D14', lineHeight: 1.7 }}>
            <AlertTriangle size={18} style={{ flex: 'none', marginTop: 3 }} aria-hidden />
            <span><strong>تعارض مصالح محتمل:</strong> هذا الاسم خصم في {adv.map((d, i) => <span key={d.dossierId}>{i > 0 && '، '}<Link href={`/dossiers/${d.dossierId}`} style={{ color: '#6E1D14', fontWeight: 700 }}>الملف <span className="num">{d.numeroDossier}</span></Link></span>)}.</span>
          </div>
        )}
        {!initial && doublons.length > 0 && <span style={{ fontSize: 13, color: '#7A4E06' }}>موكل باسم قريب موجود: {doublons.map((c) => c.nom).join('، ')}</span>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {societe ? <>
            <label style={LABEL}>ICE (15 رقماً)<input {...champ('ice')} inputMode="numeric" className="num" style={INPUT} />{erreurs.ice && <span style={{ color: '#9B2C20' }}>{erreurs.ice}</span>}</label>
            <label style={LABEL}>السجل التجاري<input {...champ('rc')} style={INPUT} /></label>
            <label style={LABEL}>التعريف الضريبي (IF)<input {...champ('identifiantFiscal')} style={INPUT} /></label>
            <label style={LABEL}>الممثل القانوني<input {...champ('representant')} style={INPUT} /></label>
          </> : <label style={LABEL}>رقم البطاقة الوطنية<input {...champ('cin')} style={INPUT} /></label>}
          <label style={LABEL}>الهاتف<input {...champ('telephone')} inputMode="tel" className="num" style={INPUT} /></label>
          <label style={LABEL}>البريد الإلكتروني<input {...champ('email')} type="email" dir="ltr" style={INPUT} />{erreurs.email && <span style={{ color: '#9B2C20' }}>{erreurs.email}</span>}</label>
          <label style={LABEL}>المدينة<input {...champ('ville')} style={INPUT} /></label>
        </div>
        <label style={LABEL}>العنوان<input {...champ('adresse')} style={INPUT} /></label>
        <label style={LABEL}>ملاحظات<textarea {...champ('notes')} rows={3} style={{ ...INPUT, padding: 12, minHeight: 80, resize: 'vertical' }} /></label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          <button type="submit" className="mp-action" disabled={cle === 'ok'} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, minHeight: 48, padding: '0 22px' }}><Attente actif={cle === 'ok'} texte="جارٍ الحفظ…">حفظ</Attente></button>
          <button type="button" onClick={onFerme} style={{ ...BTN, minHeight: 48 }}>إلغاء</button>
        </div>
      </form>
    </div>
  )
}
