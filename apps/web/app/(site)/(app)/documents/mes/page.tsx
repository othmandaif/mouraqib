'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Upload, MoreHorizontal, Trash2, FileText } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch, getToken } from '@/lib/api'
import { exporterWordHtml } from '@/lib/exportDocument'
import { useToast, useActionAnnulable } from '@/components/Toast'
import { EcheanceItem, joursRestants, fmtJM } from '@/components/legal/DeadlineCard'
import { SqueletteListe, ErreurChargement } from '@/components/ui/Chargement'
import { EtatVide } from '@/components/ui/Visuels'
import { t as tr } from '@/lib/langue'

interface DocItem { id: string; titre: string; typeActe: string; categorie: string; langue: 'AR' | 'FR'; statut: string; dossierId: string | null; updatedAt: string }
interface Modele { id: string; titre: string; typeActe: string; createdAt: string }

const MODELES_RAPIDES = [
  { tab: tr('استئناف'), titre: tr('مقال استئنافي'), sous: tr('يملأ الأطراف والتواريخ من الملف'), href: '/documents?type=REQUETE_APPEL' },
  { tab: tr('تعرّض'), titre: tr('مقال تعرّض'), sous: tr('للأحكام الغيابية'), href: '/documents?acte=OPPOSITION' },
  { tab: tr('جواب'), titre: tr('مذكرة جوابية'), sous: tr('بنية الشكل والموضوع'), href: '/documents?type=MEMOIRE_DEFENSE' },
  { tab: tr('افتتاح'), titre: tr('مقال افتتاحي'), sous: tr('مدني، تجاري، أسرة'), href: '/documents?type=REQUETE_INTRODUCTIVE' },
  { tab: tr('إنذار'), titre: tr('إنذار بالأداء'), sous: tr('قبل رفع الدعوى'), href: '/documents?type=MISE_EN_DEMEURE' },
]

const CSS = `
.md-tp{position:relative;display:flex;flex-direction:column;gap:6px;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:4px 16px 16px 16px;padding:22px 16px 16px;margin-top:14px;color:#15201E;text-decoration:none}
.md-tp:hover{border-color:#0E5A4E;color:#15201E}
.md-tp .tab{position:absolute;top:-14px;inset-inline-start:-1px;background:#E3F0EC;color:#0B4A40;font-size:12px;font-weight:600;border:1px solid #E4E0D6;border-bottom:0;border-radius:10px 10px 0 0;padding:3px 12px}
.md-chip{font-family:inherit;font-size:14px;font-weight:600;background:#FFFFFF;color:#3B4A47;border:1px solid #E4E0D6;border-radius:999px;padding:0 14px;min-height:44px;cursor:pointer}
.md-chip.on{background:var(--mp-choix-fond);color:var(--mp-choix-texte);border-color:var(--mp-choix-bord);box-shadow:inset 0 0 0 1px var(--mp-choix-bord)}
.md-th{padding:12px 18px;font-weight:600;border-bottom:1px solid #EEEAE1;text-align:start}
.md-tr{border-bottom:1px solid #EEEAE1}
.md-tr:last-child{border-bottom:0}
.md-tr:hover{background:#FAF8F4}
.md-td{padding:12px 18px;vertical-align:middle}
.md-st{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:600;border-radius:999px;padding:3px 10px;white-space:nowrap}
@media (max-width: 760px){.md-hm{display:none}.md-td,.md-th{padding:10px 8px !important}}
`
const BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 18px', minHeight: 46, cursor: 'pointer', textDecoration: 'none' }

export default function MesDocumentsPage() {
  const { toast } = useToast()
  const { data: docs, loading, error, refetch } = useApi<DocItem[]>('/documents')
  const { masques, differer } = useActionAnnulable()
  const { data: dossiers } = useApi<{ id: string; numeroDossier: string }[]>('/dossiers')
  const { data: echeances } = useApi<EcheanceItem[]>('/echeances')
  const { data: modeles, refetch: refetchModeles } = useApi<Modele[]>('/documents/modeles/importes')
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'BROUILLON' | 'FINALISE'>('tous')
  const [menu, setMenu] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menu) return
    const fermer = () => setMenu(null)
    window.addEventListener('click', fermer)
    return () => window.removeEventListener('click', fermer)
  }, [menu])

  const numero = useMemo(() => Object.fromEntries((dossiers ?? []).map((d) => [d.id, d.numeroDossier])), [dossiers])
  const delaiParDossier = useMemo(() => {
    const m: Record<string, EcheanceItem> = {}
    for (const e of echeances ?? []) if (e.camp !== 'SURVEILLER' && e.dossier.id && !m[e.dossier.id]) m[e.dossier.id] = e
    return m
  }, [echeances])
  const liste = (docs ?? []).filter((d) => !masques.has(d.id))
    .filter((d) => filtre === 'tous' || d.statut === filtre)
    .filter((d) => !q.trim() || d.titre.includes(q.trim()) || (d.dossierId && numero[d.dossierId]?.includes(q.trim())))
  const nbBrouillons = (docs ?? []).filter((d) => d.statut === 'BROUILLON').length

  const importer = async (f: File) => {
    setImporting(true)
    try {
      const fd = new FormData(); fd.append('fichier', f)
      const r = await fetch('/api/documents/modeles/importer', { method: 'POST', headers: { Authorization: `Bearer ${getToken() ?? ''}` }, body: fd })
      toast(r.ok ? tr('استُورد النموذج وأُضيف إلى نماذج مكتبكم.') : tr('تعذّر استيراد الملف (Word فقط، 5 ميغا كحد أقصى).'), r.ok ? 'success' : 'error')
      if (r.ok) refetchModeles()
    } catch { toast(tr('تعذّر الاتصال.'), 'error') } finally { setImporting(false) }
  }
  const supprimer = (d: DocItem) => differer([d.id], tr('حُذفت «{titre}».', { titre: d.titre }), () => apiFetch(`/documents/${d.id}`, { method: 'DELETE' }), refetch)
  const basculerStatut = async (d: DocItem) => {
    setMenu(null) // la barre du haut montre l'envoi ; la pastille change quand c'est enregistré
    try {
      await apiFetch(`/documents/${d.id}`, { method: 'PATCH', body: JSON.stringify({ statut: d.statut === 'FINALISE' ? 'BROUILLON' : 'FINALISE' }) })
      await refetch()
    } catch { toast(tr('تعذّر تغيير حالة الوثيقة. أعيدوا المحاولة.'), 'error') }
  }
  const exporter = async (d: DocItem) => {
    const full = await apiFetch<{ titre: string; contenu: string; langue: 'AR' | 'FR' }>(`/documents/${d.id}`).catch(() => null)
    if (full) exporterWordHtml({ titre: full.titre, contenu: full.contenu, langue: full.langue })
  }
  const supprimerModele = (m: Modele) => differer([m.id], tr('حُذف النموذج «{titre}».', { titre: m.titre }), () => apiFetch(`/documents/modeles/${m.id}`, { method: 'DELETE' }), refetchModeles)

  const Statut = ({ d }: { d: DocItem }) => {
    if (d.statut === 'FINALISE') return <span className="md-st" style={{ background: '#E3F0EC', color: '#0B4A40' }}>{tr('نهائية')}</span>
    const e = d.dossierId ? delaiParDossier[d.dossierId] : undefined
    if (!e) return <span className="md-st" style={{ background: '#F1EFEA', color: '#3B4A47' }}>{tr('مسودة')}</span>
    const j = joursRestants(e.dateLimite)
    const s = j <= 2 ? { background: '#FBEAE7', color: '#9B2C20' } : j <= 7 ? { background: '#FDF1DC', color: '#7A4E06' } : { background: '#F1EFEA', color: '#3B4A47' }
    return <span className="md-st" style={s}>{tr('مسودة · الأجل')}{' '}<span className="num">{fmtJM(e.dateLimite)}</span></span>
  }
  const quand = (d: string) => {
    const x = new Date(d)
    const hier = new Date(Date.now() - 86_400_000)
    if (fmtJM(x) === fmtJM(new Date())) return <>{tr('اليوم')}{' '}<span className="num">{x.getHours().toString().padStart(2, '0')}:{x.getMinutes().toString().padStart(2, '0')}</span></>
    if (fmtJM(x) === fmtJM(hier)) return tr('أمس')
    return <span className="num">{fmtJM(x)}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{tr('وثائقي')}</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>{tr('المقالات والمذكرات التي حرّرتموها، ونماذج المكتب.')}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input ref={fichier} type="file" accept=".docx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = '' }} />
          <button type="button" onClick={() => fichier.current?.click()} disabled={importing} style={BTN}><Upload size={18} aria-hidden />{importing ? tr('جارٍ الاستيراد…') : tr('استيراد Word')}</button>
          <Link className="mp-action" href="/documents" style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, padding: '0 20px' }}><Plus size={18} aria-hidden />{tr('وثيقة جديدة')}</Link>
        </div>
      </div>

      <section aria-labelledby="tpl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 id="tpl" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{tr('ابدأوا من نموذج')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {MODELES_RAPIDES.map((m) => (
            <Link key={m.titre} href={m.href} className="md-tp"><span className="tab">{m.tab}</span><strong style={{ fontSize: 16, fontWeight: 600 }}>{m.titre}</strong><span style={{ fontSize: 13, color: '#3B4A47' }}>{m.sous}</span></Link>
          ))}
          {(modeles ?? []).filter((m) => !masques.has(m.id)).map((m) => (
            <div key={m.id} className="md-tp" style={{ paddingInlineEnd: 48 }}>
              <span className="tab" style={{ background: '#FDF1DC', color: '#7A4E06' }}>{tr('نموذج المكتب')}</span>
              <strong style={{ fontSize: 16, fontWeight: 600 }}>{m.titre}</strong><span style={{ fontSize: 13, color: '#3B4A47' }}>{tr('يُتبع أسلوبه عند التحرير')}</span>
              <button type="button" onClick={() => supprimerModele(m)} aria-label={tr('حذف النموذج {titre}', { titre: m.titre })} style={{ position: 'absolute', top: 10, insetInlineEnd: 6, width: 36, height: 36, border: 0, background: 'transparent', color: '#6B665C', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={15} aria-hidden /></button>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent" style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #EEEAE1' }}>
          <h2 id="recent" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{tr('وثائقي الأخيرة')}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F3EE', border: '1px solid #E4E0D6', borderRadius: 999, padding: '0 14px', minHeight: 44, color: '#5E6B67', minWidth: 0 }}>
              <Search size={16} aria-hidden /><span className="sr-only-ar">{tr('بحث في الوثائق')}</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('بحث بالاسم أو الملف')} style={{ border: 0, outline: 0, background: 'transparent', fontSize: 14, color: '#15201E', width: 180, minWidth: 0 }} />
            </label>
            <button type="button" className={`md-chip${filtre === 'tous' ? ' on' : ''}`} aria-pressed={filtre === 'tous'} onClick={() => setFiltre('tous')}>{tr('الكل')}</button>
            <button type="button" className={`md-chip${filtre === 'BROUILLON' ? ' on' : ''}`} aria-pressed={filtre === 'BROUILLON'} onClick={() => setFiltre('BROUILLON')}>{tr('مسودات')}{' '}<span className="num">{nbBrouillons}</span></button>
            <button type="button" className={`md-chip${filtre === 'FINALISE' ? ' on' : ''}`} aria-pressed={filtre === 'FINALISE'} onClick={() => setFiltre('FINALISE')}>{tr('نهائية')}</button>
          </div>
        </div>
        {!docs && error ? <div style={{ padding: 18 }}><ErreurChargement quoi={tr('الوثائق')} onReessayer={refetch} /></div> : loading ? <div style={{ padding: 18 }}><SqueletteListe n={4} label={tr('جارٍ تحميل الوثائق')} /></div> : liste.length === 0 ? (
          <div style={{ padding: '14px 0' }}>{(docs ?? []).length === 0
            ? <EtatVide Icon={FileText} texte={tr('لا وثائق بعد. صيغوا أول مقال أو مذكرة من نموذج جاهز.')} action={<Link href="/documents" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 12, border: '1px solid #CDE5DD', background: '#E3F0EC', color: '#0E5A4E', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{tr('صياغة وثيقة')}</Link>} />
            : <EtatVide Icon={Search} texte={tr('لا وثيقة تطابق البحث.')} />}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ color: '#3B4A47', fontSize: 13 }}><th scope="col" className="md-th">{tr('الوثيقة')}</th><th scope="col" className="md-th md-hm">{tr('الملف')}</th><th scope="col" className="md-th md-hm">{tr('آخر تعديل')}</th><th scope="col" className="md-th">{tr('الحالة')}</th><th scope="col" className="md-th"><span className="sr-only-ar">{tr('إجراءات')}</span></th></tr></thead>
            <tbody>
              {liste.map((d) => (
                <tr key={d.id} className="md-tr">
                  <td className="md-td"><Link href={`/documents?id=${d.id}`} style={{ color: '#15201E', fontWeight: 600, textDecoration: 'none' }}>{d.titre}</Link></td>
                  <td className="md-td md-hm">{d.dossierId && numero[d.dossierId] ? <Link href={`/dossiers/${d.dossierId}`} className="num" style={{ color: '#3B4A47', textDecoration: 'none' }}>{numero[d.dossierId]}</Link> : <span style={{ color: '#5E6B67' }}>{tr('بدون ملف')}</span>}</td>
                  <td className="md-td md-hm">{quand(d.updatedAt)}</td>
                  <td className="md-td"><Statut d={d} /></td>
                  <td className="md-td" style={{ position: 'relative' }}>
                    <button type="button" aria-label={tr('خيارات الوثيقة')} aria-expanded={menu === d.id} onClick={(e) => { e.stopPropagation(); setMenu(menu === d.id ? null : d.id) }} style={{ width: 44, height: 44, border: 0, borderRadius: '50%', background: 'transparent', color: '#3B4A47', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><MoreHorizontal size={18} aria-hidden /></button>
                    {menu === d.id && (
                      <div role="menu" style={{ position: 'absolute', top: 50, insetInlineEnd: 12, zIndex: 10, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: 6, boxShadow: '0 14px 30px -18px rgba(8,59,52,.28)', minWidth: 180 }}>
                        <Link role="menuitem" href={`/documents?id=${d.id}`} style={MENU}>{tr('فتح في المحرّر')}</Link>
                        <button role="menuitem" type="button" onClick={() => exporter(d)} style={MENU}>{tr('تصدير Word')}</button>
                        <button role="menuitem" type="button" onClick={() => basculerStatut(d)} style={MENU}>{d.statut === 'FINALISE' ? tr('إرجاع إلى مسودة') : tr('اعتماد كنهائية')}</button>
                        <button role="menuitem" type="button" onClick={() => supprimer(d)} style={{ ...MENU, color: '#9B2C20' }}>{tr('حذف')}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

const MENU: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'start', fontFamily: 'inherit', fontSize: 14, background: 'transparent', border: 0, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: '#15201E', textDecoration: 'none', boxSizing: 'border-box' }
