'use client'
// Fiche dossier › الموكل والأتعاب : lien vers le client (CRM), honoraires convenus, adversaire + contrôle des conflits d'intérêts.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, UserRound, Plus } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Attente, useEnvoi } from '@/components/ui/Chargement'
import { BTN } from '@/components/legal/DeadlineCard'
import { CARTE, H2, INPUT, LABEL, centimesVersSaisie, dh, versCentimes, type Client } from '@/lib/facturation'

interface Props {
  dossierId: string
  client: { id: string; nom: string; telephone?: string | null } | null
  honorairesConvenusCentimes: number | null
  partieAdverse: string | null
  nomSuggere: string // nom du client lu dans le titre du dossier
  adversaireSuggere: string
  onChange: () => void
}
interface Conflits { commeClient: { id: string; nom: string }[]; commeAdversaire: { dossierId: string; numeroDossier: string; adversaire: string }[] }

export function ClientDossier({ dossierId, client, honorairesConvenusCentimes, partieAdverse, nomSuggere, adversaireSuggere, onChange }: Props) {
  const { toast } = useToast()
  const { cle, occupe, lancer } = useEnvoi()
  const [edition, setEdition] = useState(false)
  const [choix, setChoix] = useState('')
  const [nouveau, setNouveau] = useState(nomSuggere)
  const [honoraires, setHonoraires] = useState(centimesVersSaisie(honorairesConvenusCentimes))
  const [adverse, setAdverse] = useState(partieAdverse ?? adversaireSuggere)
  const { data: clients } = useApi<(Client & { id: string })[]>(edition || !client ? '/clients' : null)
  const adversaireEffectif = (partieAdverse ?? adversaireSuggere).trim()
  const { data: conflits } = useApi<Conflits>(adversaireEffectif.length >= 3 ? `/clients/conflits?nom=${encodeURIComponent(adversaireEffectif)}${client ? `&sauf=${client.id}` : ''}` : null)

  useEffect(() => { setHonoraires(centimesVersSaisie(honorairesConvenusCentimes)) }, [honorairesConvenusCentimes])

  const maj = (k: string, data: object, ok: string) => lancer(k, async () => {
    try { await apiFetch(`/dossiers/${dossierId}`, { method: 'PATCH', body: JSON.stringify(data) }); toast(ok, 'success'); setEdition(false); onChange() }
    catch { toast('تعذّر الحفظ.', 'error') }
  })
  const lier = () => choix && maj('lier', { clientId: choix }, 'رُبط الملف بالموكل.')
  const creerEtLier = () => lancer('creer', async () => {
    if (nouveau.trim().length < 2) { toast('أدخلوا اسم الموكل.', 'error'); return }
    try {
      const c = await apiFetch<{ id: string }>('/clients', { method: 'POST', body: JSON.stringify({ nom: nouveau.trim(), type: /^شركة|sarl|s\.a\b/i.test(nouveau) ? 'SOCIETE' : 'PERSONNE' }) })
      await apiFetch(`/dossiers/${dossierId}`, { method: 'PATCH', body: JSON.stringify({ clientId: c.id }) })
      toast('أُنشئت بطاقة الموكل ورُبط بها الملف.', 'success'); setEdition(false); onChange()
    } catch { toast('تعذّر إنشاء الموكل.', 'error') }
  })
  const enregistrerHonoraires = () => {
    const c = honoraires.trim() ? versCentimes(honoraires) : null
    if (honoraires.trim() && c == null) { toast('مبلغ غير صالح.', 'error'); return }
    maj('honoraires', { honorairesConvenusCentimes: c }, 'سُجّلت الأتعاب المتفق عليها.')
  }

  const conflit = conflits?.commeClient ?? []
  return (
    <section style={{ ...CARTE, padding: 20, gap: 12 }}>
      <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 10 }}><UserRound size={20} color="#0E5A4E" aria-hidden />الموكل والأتعاب</h2>

      {client && !edition ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F5F3EE', borderRadius: 12, padding: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#E3F0EC', color: '#0B4A40', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' }}>{client.nom.replace(/^(شركة|السيد|السيدة)\s+/, '').charAt(0)}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Link href={`/clients/${client.id}`} style={{ fontSize: 15, fontWeight: 600, color: '#15201E' }}>{client.nom}</Link>
            {client.telephone && <span className="num" style={{ fontSize: 13, color: '#5E6B67', textAlign: 'right' }}>{client.telephone}</span>}
          </span>
          <button type="button" onClick={() => setEdition(true)} style={{ ...BTN, minHeight: 36, fontSize: 13 }}>تغيير</button>
        </div>
      ) : null}
      {client && !edition ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/facturation/nouvelle?client=${client.id}&dossier=${dossierId}`} style={{ ...BTN, minHeight: 40, fontSize: 13 }}>فاتورة لهذا الملف</Link>
          <Link href={`/clients/${client.id}`} style={{ ...BTN, minHeight: 40, fontSize: 13 }}>بطاقة الموكل والأداءات</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={LABEL}>موكل موجود
            <span style={{ display: 'flex', gap: 8 }}>
              <select value={choix} onChange={(e) => setChoix(e.target.value)} style={{ ...INPUT, flex: 1 }}>
                <option value="">— اختاروا —</option>
                {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <button type="button" onClick={lier} disabled={!choix || occupe} style={{ ...BTN, flex: 'none' }}><Attente actif={cle === 'lier'} texte="…" sombre>ربط</Attente></button>
            </span>
          </label>
          <label style={LABEL}>أو موكل جديد
            <span style={{ display: 'flex', gap: 8 }}>
              <input value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="الاسم الكامل أو اسم الشركة" style={{ ...INPUT, flex: 1 }} />
              <button type="button" onClick={creerEtLier} disabled={occupe} style={{ ...BTN, flex: 'none', gap: 4 }}><Attente actif={cle === 'creer'} texte="…" sombre><Plus size={16} aria-hidden />إنشاء</Attente></button>
            </span>
          </label>
          {client && <button type="button" onClick={() => setEdition(false)} style={{ ...BTN, alignSelf: 'flex-start', minHeight: 36, fontSize: 13 }}>إلغاء</button>}
        </div>
      )}

      <label style={LABEL}>الأتعاب المتفق عليها (درهم)
        <span style={{ display: 'flex', gap: 8 }}>
          <input inputMode="decimal" value={honoraires} onChange={(e) => setHonoraires(e.target.value)} placeholder="مثال: 15000" className="num" style={{ ...INPUT, flex: 1, textAlign: 'right' }} />
          <button type="button" onClick={enregistrerHonoraires} disabled={occupe || versCentimes(honoraires) === honorairesConvenusCentimes || (!honoraires && honorairesConvenusCentimes == null)} style={{ ...BTN, flex: 'none' }}><Attente actif={cle === 'honoraires'} texte="…" sombre>حفظ</Attente></button>
        </span>
        {honorairesConvenusCentimes != null && <span style={{ fontWeight: 400, color: '#5E6B67' }}>{dh(honorairesConvenusCentimes)}</span>}
      </label>

      <label style={LABEL}>الخصم
        <span style={{ display: 'flex', gap: 8 }}>
          <input value={adverse} onChange={(e) => setAdverse(e.target.value)} placeholder="اسم الطرف الخصم" style={{ ...INPUT, flex: 1 }} />
          <button type="button" onClick={() => maj('adverse', { partieAdverse: adverse.trim() || null }, 'سُجّل اسم الخصم.')} disabled={occupe || adverse.trim() === (partieAdverse ?? '')} style={{ ...BTN, flex: 'none' }}><Attente actif={cle === 'adverse'} texte="…" sombre>حفظ</Attente></button>
        </span>
      </label>

      {conflit.length > 0 && (
        <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FBEAE7', border: '1px solid #F0C9C2', borderRadius: 12, padding: 12, fontSize: 14, color: '#6E1D14', lineHeight: 1.7 }}>
          <AlertTriangle size={18} style={{ flex: 'none', marginTop: 3 }} aria-hidden />
          <span><strong>تعارض مصالح محتمل:</strong> الخصم «{adversaireEffectif}» يشبه موكلكم {conflit.map((c, i) => <span key={c.id}>{i > 0 && '، '}<Link href={`/clients/${c.id}`} style={{ color: '#6E1D14', fontWeight: 700 }}>{c.nom}</Link></span>)}. تحقّقوا قبل مواصلة الملف.</span>
        </div>
      )}
    </section>
  )
}
