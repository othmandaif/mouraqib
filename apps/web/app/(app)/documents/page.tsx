'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Sparkles, Upload, Undo2, Heading, Bold, List, Plus, Eye, Pencil, Check, X } from 'lucide-react'
import { apiFetch, getToken } from '@/lib/api'
import { exporterWordHtml } from '@/lib/exportDocument'
import { useTribunaux } from '@/hooks/useTribunaux'
import { useToast } from '@/components/Toast'
import { joursRestants, tone, fmtDate, fmtJM, lireTitre, RoleClient } from '@/components/legal/DeadlineCard'
import { Markdown } from '../assistant/Markdown'
import { Indicateur, useEnvoi, Attente } from '@/components/ui/Chargement'

interface Variable { cle: string; label: string; type: string; requis: boolean }
interface TypeActe { cle: string; titreAr: string; categorie: string; langue: 'AR' | 'FR'; variables: Variable[] }
interface Doc { id: string; titre: string; contenu: string; statut: string; langue: 'AR' | 'FR'; dossierId: string | null; typeActe: string; updatedAt: string; variables?: Record<string, string> | null }
interface DossierInfo {
  id: string; numeroDossier: string; tribunal: string; titreAffaire?: string | null; roleClient: RoleClient
  evenements: { id: string; texteArabe: string; typeEvenement?: string | null; natureJugement?: string | null; datePublicationGreffe: string }[]
  echeances: { id: string; typeDelai: string; dateLimite: string; dateDepart: string; camp: 'AGIR' | 'SURVEILLER'; estComplete: boolean; descriptionAr?: string | null; description: string }[]
}

const CAT_AR: Record<string, string> = { REQUETE: 'مقالات ومذكرات', CORRESPONDANCE: 'مراسلات وإنذارات', CONTRAT: 'عقود', SOCIETE: 'الشركات', AUTRE: 'أخرى' }
const ACTE_POUR_DELAI: Record<string, string> = { APPEL: 'REQUETE_APPEL' }
const PROMPT_POUR_DELAI: Record<string, string> = {
  OPPOSITION: 'مقال تعرّض على حكم غيابي، مع عرض أسباب التعرّض والطلبات.',
  CASSATION: 'مقال طعن بالنقض أمام محكمة النقض، مع وسائل النقض.',
  EXECUTION: 'طلب الحصول على الصيغة التنفيذية وفتح ملف التنفيذ.',
}

const CSS = `
.ed-tb{width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:#15201E;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit}
.ed-tb:hover{background:#F1EFEA}
.ed-tb.on{background:var(--mp-choix-fond);color:var(--mp-choix-texte);border-color:var(--mp-choix-bord);box-shadow:inset 0 0 0 1px var(--mp-choix-bord)}
.ed-ai{text-align:right;font-family:inherit;font-size:14px;font-weight:600;background:transparent;color:#FFFFFF;border:1px solid #6E9C90;border-radius:12px;padding:0 14px;min-height:44px;cursor:pointer}
.ed-ai:hover{background:#0B4A40}
.ed-fl{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px;padding:8px 0;border-bottom:1px solid #EEEAE1}
.ed-fl input{font-family:inherit;font-size:14px;font-weight:600;border:1px solid transparent;border-radius:8px;padding:4px 8px;background:transparent;text-align:left;min-width:0;width:55%;color:#15201E}
.ed-fl input:hover,.ed-fl input:focus{border-color:#CFCAC0;background:#FFFFFF}
.ed-page mark{background:#E3F0EC;color:#0B4A40;border-bottom:1.5px dashed #0E5A4E;border-radius:4px;padding:0 4px}
.ed-in{font-family:inherit;font-size:15px;color:#15201E;background:#FFFFFF;border:1px solid #CFCAC0;border-radius:10px;min-height:46px;padding:0 12px;box-sizing:border-box;width:100%}
textarea.ed-in{padding:10px 12px;line-height:1.7;resize:vertical}
@media print{body *{visibility:hidden}.ed-page,.ed-page *{visibility:visible}.ed-page{position:absolute;inset:0;border:0 !important;box-shadow:none !important}}
@media (max-width: 760px){.ed-page{padding:24px 18px !important}}
`
const BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 16px', minHeight: 44, cursor: 'pointer', textDecoration: 'none' }
const BTN_P: React.CSSProperties = { ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0 }  // + className="mp-action" (survol, appui)

export default function DocumentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { tribunalAr } = useTribunaux()
  const [types, setTypes] = useState<TypeActe[]>([])
  const [dossiers, setDossiers] = useState<{ id: string; numeroDossier: string; titreAffaire?: string | null }[]>([])
  const [dossier, setDossier] = useState<DossierInfo | null>(null)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [mode, setMode] = useState<'modele' | 'libre'>('modele')
  const [typeChoisi, setTypeChoisi] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [promptLibre, setPromptLibre] = useState('')
  const [langue, setLangue] = useState<'AR' | 'FR'>('AR')
  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [apercu, setApercu] = useState(false)
  const [proposition, setProposition] = useState<{ avant: string; apres: string } | null>(null)
  const [aiEnCours, setAiEnCours] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [sauvegarde, setSauvegarde] = useState<'ok' | 'encours' | 'modifie'>('ok')
  const [champsMenu, setChampsMenu] = useState(false)
  const [modeles, setModeles] = useState<{ id: string; titre: string }[]>([])
  const [modeleId, setModeleId] = useState('')
  const zone = useRef<HTMLTextAreaElement>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chargerDossier = async (id: string) => {
    try { setDossier(await apiFetch<DossierInfo>(`/dossiers/${id}`)) } catch { setDossier(null) }
  }

  // ?id=… (ouvrir) · ?dossier=… · ?delai=APPEL · ?acte=EXECUTION
  useEffect(() => {
    apiFetch<TypeActe[]>('/documents/types').then(setTypes).catch(() => {})
    apiFetch<{ id: string; titre: string }[]>('/documents/modeles/importes').then(setModeles).catch(() => {})
    apiFetch<{ id: string; numeroDossier: string; titreAffaire?: string | null }[]>('/dossiers').then(setDossiers).catch(() => {})
    const p = new URLSearchParams(window.location.search)
    const id = p.get('id')
    if (id) apiFetch<Doc>(`/documents/${id}`).then((d) => { setDoc(d); setLangue(d.langue); if (d.dossierId) chargerDossier(d.dossierId) }).catch(() => toast('تعذّر فتح الوثيقة.', 'error'))
    if (p.get('dossier')) chargerDossier(p.get('dossier')!)
    if (p.get('type')) { setMode('modele'); setTypeChoisi(p.get('type')!) }
    const cle = p.get('delai') ?? p.get('acte') ?? ''
    if (ACTE_POUR_DELAI[cle]) { setMode('modele'); setTypeChoisi(ACTE_POUR_DELAI[cle]) }
    else if (PROMPT_POUR_DELAI[cle]) { setMode('libre'); setPromptLibre(PROMPT_POUR_DELAI[cle]) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Champs tirés du dossier (panneau « حقول مأخوذة من الملف »)
  const champs = useMemo(() => {
    if (!dossier) return [] as { label: string; valeur: string; num?: boolean }[]
    const t = lireTitre(dossier.titreAffaire)
    const jugement = dossier.evenements.find((e) => e.typeEvenement === 'JUGEMENT_RENDU' || e.typeEvenement === 'ORDONNANCE_RENDUE')
    const notif = dossier.evenements.find((e) => e.typeEvenement === 'NOTIFICATION_PARTIE' || e.typeEvenement === 'SIGNIFICATION')
    return [
      { label: 'المحكمة', valeur: tribunalAr(dossier.tribunal) },
      { label: 'رقم الملف', valeur: dossier.numeroDossier, num: true },
      ...(t.demandeur ? [{ label: 'المدعي', valeur: t.demandeur }] : []),
      ...(t.defendeur ? [{ label: 'المدعى عليه', valeur: t.defendeur }] : []),
      ...(jugement ? [{ label: 'تاريخ الحكم', valeur: fmtDate(jugement.datePublicationGreffe), num: true }] : []),
      ...(notif ? [{ label: 'تاريخ التبليغ', valeur: fmtDate(notif.datePublicationGreffe), num: true }] : []),
      ...(dossier.roleClient !== 'INCONNU' ? [{ label: 'صفة الموكل', valeur: dossier.roleClient === 'DEMANDEUR' ? 'مدعٍ' : 'مدعى عليه' }] : []),
      ...(jugement?.natureJugement ? [{ label: 'طبيعة الحكم', valeur: jugement.natureJugement === 'DEFAUT' ? 'غيابي' : 'حضوري' }] : []),
    ]
  }, [dossier, tribunalAr])

  // Pré-remplissage des variables du modèle à partir du dossier
  useEffect(() => {
    if (!dossier) return
    const t = lireTitre(dossier.titreAffaire)
    const client = dossier.roleClient === 'DEFENDEUR' ? t.defendeur : t.demandeur
    const adv = dossier.roleClient === 'DEFENDEUR' ? t.demandeur : t.defendeur
    const jugement = dossier.evenements.find((e) => e.typeEvenement === 'JUGEMENT_RENDU' || e.typeEvenement === 'ORDONNANCE_RENDUE')
    const auto: Record<string, string> = {
      demandeur: t.demandeur, defendeur: t.defendeur, tribunal: tribunalAr(dossier.tribunal), numero_dossier: dossier.numeroDossier,
      partie: client, adversaire: adv, appelant: client, intime: adv,
      jugement: jugement ? `${jugement.texteArabe} · ${fmtDate(jugement.datePublicationGreffe)} · ملف ${dossier.numeroDossier}` : '',
    }
    setVariables((v) => ({ ...Object.fromEntries(Object.entries(auto).filter(([, x]) => x)), ...v }))
  }, [dossier, tribunalAr])

  const typeActif = types.find((t) => t.cle === typeChoisi)
  const parCategorie = useMemo(() => {
    const g: Record<string, TypeActe[]> = {}
    for (const t of types) (g[t.categorie] ??= []).push(t)
    return g
  }, [types])
  const delaiAgir = dossier?.echeances.filter((e) => e.camp === 'AGIR' && !e.estComplete && joursRestants(e.dateLimite) >= 0).sort((a, b) => new Date(a.dateLimite).getTime() - new Date(b.dateLimite).getTime())[0]

  const generer = async () => {
    if (mode === 'modele' ? !typeChoisi : !promptLibre.trim()) return
    setGenerating(true)
    try {
      const r = await apiFetch<{ contenu: string; titre: string }>('/documents/generer', {
        method: 'POST',
        body: JSON.stringify({ ...(mode === 'modele' ? { typeActe: typeChoisi, variables } : { promptLibre }), langue, dossierId: dossier?.id, modeleId: modeleId || undefined }),
      })
      const titre = `${r.titre || typeActif?.titreAr || 'وثيقة'}${dossier?.titreAffaire ? ` — ${lireTitre(dossier.titreAffaire).demandeur}` : ''}`
      const cree = await apiFetch<Doc>('/documents', {
        method: 'POST',
        body: JSON.stringify({ typeActe: mode === 'modele' ? typeChoisi : undefined, modeleId: modeleId || undefined, titre, contenu: r.contenu, langue, variables: mode === 'modele' ? variables : undefined, promptLibre: mode === 'libre' ? promptLibre : undefined, dossierId: dossier?.id }),
      })
      setDoc(cree)
      router.replace(`/documents?id=${cree.id}`)
    } catch {
      toast('تعذّر توليد الوثيقة. أعيدوا المحاولة.', 'error')
    } finally { setGenerating(false) }
  }

  // Sauvegarde automatique 2 s après la dernière frappe
  const majContenu = (contenu: string) => {
    if (!doc) return
    setDoc({ ...doc, contenu })
    setSauvegarde('modifie')
    if (minuterie.current) clearTimeout(minuterie.current)
    minuterie.current = setTimeout(async () => {
      setSauvegarde('encours')
      try { await apiFetch(`/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ contenu }) }); setSauvegarde('ok'); setDoc((d) => d && { ...d, updatedAt: new Date().toISOString() }) }
      catch { setSauvegarde('modifie'); toast('تعذّر الحفظ التلقائي.', 'error') }
    }, 2000)
  }
  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current) }, [])

  // Barre d'outils (texte en Markdown léger, comme l'export Word)
  const entourer = (avant: string, apres = avant) => {
    const el = zone.current
    if (!el || !doc) return
    const { selectionStart: a, selectionEnd: b, value } = el
    const nouveau = value.slice(0, a) + avant + value.slice(a, b) + apres + value.slice(b)
    majContenu(nouveau)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + avant.length, b + avant.length) })
  }
  const prefixerLigne = (prefixe: string) => {
    const el = zone.current
    if (!el || !doc) return
    const debut = el.value.lastIndexOf('\n', el.selectionStart - 1) + 1
    majContenu(el.value.slice(0, debut) + prefixe + el.value.slice(debut))
  }
  const insererChamp = (v: string) => { entourer(v, ''); setChampsMenu(false) }
  const remplacerPartout = (ancien: string, nouveau: string) => {
    if (!doc || !ancien || ancien === nouveau) return
    majContenu(doc.contenu.split(ancien).join(nouveau))
  }

  // Aide IA : l'instruction s'applique au passage sélectionné (ou au document), puis l'avocat accepte ou refuse.
  const demanderIA = async (consigne: string) => {
    if (!doc || aiEnCours) return
    const el = zone.current
    const selection = el && el.selectionEnd > el.selectionStart ? el.value.slice(el.selectionStart, el.selectionEnd) : ''
    const instructionFinale = selection ? `${consigne}\nطبّق هذا على المقطع التالي فقط واترك باقي الوثيقة كما هي:\n«${selection}»` : consigne
    setAiEnCours(consigne)
    try {
      const r = await apiFetch<{ contenu: string }>('/documents/modifier', { method: 'POST', body: JSON.stringify({ contenuActuel: doc.contenu, instruction: instructionFinale, langue }) })
      setProposition({ avant: doc.contenu, apres: r.contenu })
      setApercu(true)
    } catch { toast('تعذّر تنفيذ الاقتراح.', 'error') }
    finally { setAiEnCours(null) }
  }
  const accepter = () => { if (proposition) { majContenu(proposition.apres); setProposition(null); setApercu(false) } }
  const refuser = () => { setProposition(null); setApercu(false) }

  const { cle: envoi, lancer } = useEnvoi()
  const finaliser = () => lancer('statut', async () => {
    if (!doc) return
    const statut = doc.statut === 'FINALISE' ? 'BROUILLON' : 'FINALISE'
    try {
      await apiFetch(`/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ statut }) })
      setDoc((d) => d && { ...d, statut })
      toast(statut === 'FINALISE' ? 'اعتُمدت الصيغة النهائية.' : 'أُعيدت الوثيقة إلى مسودة.', 'success')
    } catch { toast('تعذّر تغيير حالة الوثيقة. أعيدوا المحاولة.', 'error') }
  })

  const importer = async (f: File) => {
    setImporting(true)
    try {
      const fd = new FormData(); fd.append('fichier', f); if (typeChoisi) fd.append('typeActe', typeChoisi)
      const r = await fetch('/api/documents/modeles/importer', { method: 'POST', headers: { Authorization: `Bearer ${getToken() ?? ''}` }, body: fd })
      toast(r.ok ? 'استُورد النموذج. سيُستعمل أسلوبه في التوليد.' : 'تعذّر استيراد الملف (Word فقط، 5 ميغا كحد أقصى).', r.ok ? 'success' : 'error')
      if (r.ok) apiFetch<{ id: string; titre: string }[]>('/documents/modeles/importes').then(setModeles).catch(() => {})
    } catch { toast('تعذّر الاتصال.', 'error') } finally { setImporting(false) }
  }

  const valeursSurlignees = champs.map((c) => c.valeur).filter((v) => v && v.length > 2)
  const surligner = (texte: string) => {
    // Rendu « aperçu » : les valeurs du dossier sont surlignées comme des champs
    if (!valeursSurlignees.length) return texte
    const re = new RegExp(`(${valeursSurlignees.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
    return texte.replace(re, '==$1==')
  }

  /* ─── Écran 1 : choisir et générer ─── */
  if (!doc) {
    return (
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <style>{CSS}</style>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>محرّر الوثائق</h1>
            <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>اختاروا نوع الوثيقة والملف؛ تُملأ الحقول تلقائياً من محاكم ثم تحرّرونها بحرية.</p>
          </div>
          <Link href="/documents/mes" style={BTN}>وثائقي</Link>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <section style={{ flex: '999 1 560px', minWidth: 0, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>الملف المرتبط <span style={{ fontWeight: 400, color: '#5E6B67' }}>(يملأ الأطراف والتواريخ)</span>
              <select className="ed-in" value={dossier?.id ?? ''} onChange={(e) => (e.target.value ? chargerDossier(e.target.value) : setDossier(null))}>
                <option value="">بدون ملف</option>
                {dossiers.map((d) => <option key={d.id} value={d.id}>{d.titreAffaire ? `${d.titreAffaire} · ` : ''}{d.numeroDossier}</option>)}
              </select>
            </label>
            <div role="tablist" aria-label="طريقة التحرير" style={{ display: 'inline-flex', alignSelf: 'flex-start', background: '#EEEAE1', borderRadius: 999, padding: 4, gap: 4 }}>
              {([['modele', 'من نموذج'], ['libre', 'طلب حر']] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" className="mp-choix" aria-selected={mode === k} onClick={() => setMode(k)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, border: 0, borderRadius: 999, padding: '0 16px', minHeight: 40, cursor: 'pointer', background: mode === k ? '#FFFFFF' : 'transparent', color: mode === k ? '#15201E' : '#3B4A47' }}>{l}</button>
              ))}
            </div>
            {mode === 'modele' ? <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>نوع الوثيقة
                <select className="ed-in" value={typeChoisi} onChange={(e) => setTypeChoisi(e.target.value)}>
                  <option value="">اختاروا…</option>
                  {Object.entries(parCategorie).map(([cat, l]) => <optgroup key={cat} label={CAT_AR[cat] ?? cat}>{l.map((t) => <option key={t.cle} value={t.cle}>{t.titreAr}</option>)}</optgroup>)}
                </select>
              </label>
              {typeActif && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {typeActif.variables.map((v) => (
                    <label key={v.cle} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600, gridColumn: v.type === 'textarea' ? '1 / -1' : undefined }}>
                      {v.label}{!v.requis && <span style={{ fontWeight: 400, color: '#5E6B67' }}>(اختياري)</span>}
                      {v.type === 'textarea'
                        ? <textarea className="ed-in" rows={3} value={variables[v.cle] ?? ''} onChange={(e) => setVariables((x) => ({ ...x, [v.cle]: e.target.value }))} />
                        : <input className="ed-in" type={v.type === 'date' ? 'date' : 'text'} value={variables[v.cle] ?? ''} onChange={(e) => setVariables((x) => ({ ...x, [v.cle]: e.target.value }))} style={variables[v.cle] && dossier ? { background: '#E3F0EC' } : undefined} />}
                    </label>
                  ))}
                </div>
              )}
            </> : (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>صفوا الوثيقة المطلوبة
                <textarea className="ed-in" rows={5} value={promptLibre} onChange={(e) => setPromptLibre(e.target.value)} placeholder="مثال: إنذار بالأداء لمقاولة متأخرة في سداد 3 فواتير…" />
              </label>
            )}
            {modeles.length > 0 && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>أسلوب نموذج من مكتبكم <span style={{ fontWeight: 400, color: '#5E6B67' }}>(اختياري)</span>
                <select className="ed-in" value={modeleId} onChange={(e) => setModeleId(e.target.value)}>
                  <option value="">الأسلوب الافتراضي</option>
                  {modeles.map((m) => <option key={m.id} value={m.id}>{m.titre}</option>)}
                </select>
              </label>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTop: '1px solid #EEEAE1', paddingTop: 20 }}>
              <button className="mp-action" type="button" onClick={generer} disabled={generating || (mode === 'modele' ? !typeChoisi : !promptLibre.trim())} style={{ ...BTN_P, fontSize: 16, minHeight: 50, padding: '0 24px', opacity: generating ? 0.7 : 1 }}>
                {generating ? <><Indicateur taille={18} courant />جارٍ التحرير…</> : <><Sparkles size={18} aria-hidden />تحرير المسودة</>}
              </button>
              <div role="group" aria-label="اللغة" style={{ display: 'inline-flex', gap: 6 }}>
                {(['AR', 'FR'] as const).map((l) => <button key={l} type="button" className="mp-choix" aria-pressed={langue === l} onClick={() => setLangue(l)} style={{ ...BTN, minHeight: 40 }}>{l === 'AR' ? 'العربية' : 'Français'}</button>)}
              </div>
            </div>
          </section>
          <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {champs.length > 0 && (
              <section style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>حقول مأخوذة من الملف</h2>
                {champs.map((c) => <div key={c.label} className="ed-fl"><span style={{ color: '#3B4A47' }}>{c.label}</span><b className={c.num ? 'num' : undefined} style={{ fontWeight: 600 }}>{c.valeur}</b></div>)}
              </section>
            )}
            <section style={{ background: '#E3F0EC', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#23443C', lineHeight: 1.7 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0B4A40' }}>أسلوب مكتبكم</h2>
              <span>استوردوا نموذج Word من مكتبكم، وسيتبع التحرير أسلوبه وصيغه.</span>
              <input ref={fichier} type="file" accept=".docx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = '' }} />
              <button type="button" onClick={() => fichier.current?.click()} disabled={importing} style={{ ...BTN, alignSelf: 'flex-start' }}><Upload size={16} aria-hidden />{importing ? 'جارٍ الاستيراد…' : 'استيراد Word'}</button>
            </section>
          </aside>
        </div>
        <style>{`@keyframes ed-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  /* ─── Écran 2 : l'éditeur (maquette) ─── */
  const jDelai = delaiAgir ? joursRestants(delaiAgir.dateLimite) : null
  const contenuAffiche = proposition ? proposition.apres : doc.contenu
  const derniereMaj = Math.round((Date.now() - new Date(doc.updatedAt).getTime()) / 60000)

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', margin: '-28px -32px -48px' }} className="ed-wrap">
      <style>{CSS + '@media (max-width: 900px){.ed-wrap{margin:-12px -16px -96px !important}}'}</style>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '16px 32px', borderBottom: '1px solid #E4E0D6', background: '#FFFFFF' }}>
        <Link href="/documents/mes" aria-label="رجوع إلى وثائقي" style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #E4E0D6', color: '#15201E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} aria-hidden /></Link>
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input aria-label="عنوان الوثيقة" value={doc.titre} onChange={(e) => setDoc({ ...doc, titre: e.target.value })} onBlur={() => apiFetch(`/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ titre: doc.titre }) }).catch(() => null)}
            style={{ fontFamily: 'inherit', fontSize: 20, fontWeight: 600, border: 0, background: 'transparent', color: '#15201E', padding: 0, minWidth: 0, width: '100%' }} />
          <span style={{ fontSize: 13, color: '#5E6B67' }}>
            {dossier && <>ملف <span className="num">{dossier.numeroDossier}</span> · </>}
            {doc.statut === 'FINALISE' ? 'نهائية' : 'مسودة'} · {sauvegarde === 'encours' ? 'جارٍ الحفظ…' : sauvegarde === 'modifie' ? 'تغييرات غير محفوظة' : derniereMaj < 1 ? 'حُفظ الآن' : <>حُفظ قبل <span className="num">{derniereMaj}</span> دقيقة</>}
          </span>
        </div>
        {delaiAgir && jDelai !== null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, background: tone(jDelai).bg, color: tone(jDelai).fg, borderRadius: 999, padding: '4px 12px' }}>آخر أجل للإيداع <span className="num">{fmtJM(delaiAgir.dateLimite)}</span></span>
        )}
        <button type="button" onClick={() => exporterWordHtml({ titre: doc.titre, contenu: doc.contenu, langue })} style={BTN}>تصدير Word</button>
        <button type="button" onClick={() => { setApercu(true); setTimeout(() => window.print(), 50) }} style={BTN}>PDF</button>
        <button type="button" className={doc.statut === 'FINALISE' ? undefined : 'mp-action'} onClick={finaliser} disabled={envoi === 'statut'} aria-busy={envoi === 'statut'} style={doc.statut === 'FINALISE' ? BTN : BTN_P}>
          <Attente actif={envoi === 'statut'} texte="جارٍ الحفظ…" sombre={doc.statut === 'FINALISE'}>{doc.statut === 'FINALISE' ? <><Check size={16} aria-hidden />صيغة نهائية · تعديل</> : 'اعتماد الصيغة النهائية'}</Attente>
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 24, padding: '24px 32px 48px', alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {proposition && (
            <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: '#15201E', color: '#FFFFFF', borderRadius: 14, padding: '8px 8px 8px 16px', maxWidth: 760, width: '100%', boxSizing: 'border-box', alignSelf: 'center' }}>
              <Sparkles size={18} color="#F2A93B" aria-hidden style={{ marginRight: 8 }} />
              <span style={{ flex: 1, fontSize: 14 }}>اقتراح المساعد معروض أدناه. اقبلوه أو ارفضوه.</span>
              <button type="button" onClick={refuser} style={{ ...BTN, background: 'transparent', color: '#FFFFFF', border: '1px solid #5E6B67', minHeight: 40 }}><X size={16} aria-hidden />رفض</button>
              <button type="button" onClick={accepter} style={{ ...BTN, background: '#FFFFFF', border: 0, minHeight: 40 }}><Check size={16} aria-hidden />قبول</button>
            </div>
          )}
          <div role="toolbar" aria-label="تنسيق النص" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 14, padding: 4, alignSelf: 'center', position: 'relative' }}>
            <button type="button" aria-label="تراجع" className="ed-tb" onClick={() => { zone.current?.focus(); document.execCommand('undo') }} disabled={apercu}><Undo2 size={18} aria-hidden /></button>
            <span style={{ width: 1, height: 24, background: '#E4E0D6' }} />
            <button type="button" className="ed-tb" style={{ width: 'auto', padding: '0 12px', fontSize: 14 }} onClick={() => prefixerLigne('## ')} disabled={apercu}><Heading size={16} aria-hidden style={{ marginLeft: 4 }} />عنوان</button>
            <button type="button" aria-label="غامق" className="ed-tb" onClick={() => entourer('**')} disabled={apercu}><Bold size={18} aria-hidden /></button>
            <button type="button" aria-label="قائمة" className="ed-tb" onClick={() => prefixerLigne('- ')} disabled={apercu}><List size={18} aria-hidden /></button>
            <span style={{ width: 1, height: 24, background: '#E4E0D6' }} />
            <button type="button" className="ed-tb" aria-expanded={champsMenu} style={{ width: 'auto', padding: '0 12px', fontSize: 14, color: '#0E5A4E', fontWeight: 600 }} onClick={() => setChampsMenu((x) => !x)} disabled={apercu || champs.length === 0}><Plus size={16} aria-hidden />إدراج حقل</button>
            <button type="button" className={`ed-tb${apercu ? ' on' : ''}`} aria-pressed={apercu} style={{ width: 'auto', padding: '0 12px', fontSize: 14 }} onClick={() => setApercu((x) => !x)} disabled={!!proposition}>{apercu ? <><Pencil size={16} aria-hidden style={{ marginLeft: 4 }} />تحرير</> : <><Eye size={16} aria-hidden style={{ marginLeft: 4 }} />معاينة</>}</button>
            {champsMenu && (
              <div role="menu" style={{ position: 'absolute', top: 52, insetInlineEnd: 0, zIndex: 10, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: 6, boxShadow: '0 14px 30px -18px rgba(8,59,52,.28)', minWidth: 220 }}>
                {champs.map((c) => <button key={c.label} type="button" role="menuitem" onClick={() => insererChamp(c.valeur)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%', fontFamily: 'inherit', fontSize: 14, background: 'transparent', border: 0, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: '#15201E' }}><span style={{ color: '#5E6B67' }}>{c.label}</span><b className={c.num ? 'num' : undefined}>{c.valeur}</b></button>)}
              </div>
            )}
          </div>

          <article className="ed-page" aria-label="نص الوثيقة" style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 6, boxShadow: '0 1px 0 rgba(8,59,52,.04), 0 14px 30px -18px rgba(8,59,52,.28)', padding: '56px 64px', fontSize: 16, lineHeight: 2, color: '#15201E', maxWidth: 760, width: '100%', boxSizing: 'border-box', alignSelf: 'center', minHeight: 640 }} dir={langue === 'FR' ? 'ltr' : 'rtl'}>
            {apercu ? <Markdown texte={surligner(contenuAffiche)} /> : (
              <textarea ref={zone} aria-label="نص الوثيقة" value={doc.contenu} onChange={(e) => majContenu(e.target.value)}
                style={{ width: '100%', minHeight: 600, border: 0, outline: 0, resize: 'vertical', fontFamily: 'inherit', fontSize: 16, lineHeight: 2, color: '#15201E', background: 'transparent', boxShadow: 'none', padding: 0 }} />
            )}
          </article>
        </div>

        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {champs.length > 0 && (
            <section style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>حقول مأخوذة من الملف</h2>
              <span style={{ fontSize: 13, color: '#3B4A47', lineHeight: 1.6 }}>تُملأ تلقائياً من محاكم. غيّروا القيمة هنا لتتغير في كل الوثيقة.</span>
              <div>
                {champs.map((c, i) => (
                  <div key={c.label} className="ed-fl" style={i === champs.length - 1 ? { borderBottom: 0 } : undefined}>
                    <span style={{ color: '#3B4A47' }}>{c.label}</span>
                    <input aria-label={c.label} className={c.num ? 'num' : undefined} defaultValue={c.valeur} onBlur={(e) => remplacerPartout(c.valeur, e.target.value)} />
                  </div>
                ))}
              </div>
            </section>
          )}
          <section style={{ background: '#083B34', color: '#CFE5DD', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={18} color="#F2A93B" aria-hidden />مساعدة في التحرير</h2>
            <span style={{ fontSize: 14, lineHeight: 1.6 }}>حدّدوا فقرة في النص، أو اتركوا التحديد فارغاً لتطبيق الطلب على كامل الوثيقة.</span>
            {['إعادة صياغة بأسلوب أكثر رسمية', 'اقتراح دفوع مع المراجع القانونية', 'التحقق من الفصول المذكورة وتصحيحها'].map((a) => (
              <button key={a} type="button" className="ed-ai" onClick={() => demanderIA(a)} disabled={!!aiEnCours || apercu}>{aiEnCours === a ? 'جارٍ التحضير…' : a.replace(' وتصحيحها', '').replace(' القانونية', '')}</button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); if (instruction.trim()) { demanderIA(instruction.trim()); setInstruction('') } }} style={{ display: 'flex', gap: 8 }}>
              <label style={{ flex: 1, display: 'flex' }}><span className="sr-only-ar">طلب تعديل</span>
                <input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="طلب آخر: أضف فقرة عن…" style={{ flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: 14, background: '#0B4A40', color: '#FFFFFF', border: '1px solid #6E9C90', borderRadius: 12, padding: '0 12px', minHeight: 44 }} />
              </label>
              <button type="submit" disabled={!!aiEnCours || !instruction.trim() || apercu} className="ed-ai" style={{ textAlign: 'center' }}>تطبيق</button>
            </form>
            <span style={{ fontSize: 12, color: '#9FC9BE', lineHeight: 1.6 }}>كل اقتراح يظهر كتعديل يمكنكم قبوله أو رفضه.</span>
          </section>
        </aside>
      </div>
    </div>
  )
}
