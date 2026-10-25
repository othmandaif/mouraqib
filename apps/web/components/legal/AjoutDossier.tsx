'use client'
import { heure } from '@/components/legal/DeadlineCard'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { apiFetch, rechercherDossier, SearchResultPayload } from '@/lib/api'
import { COURS_APPEL } from '@/lib/coursAppel'
import { erreurAr } from '@/lib/erreurs'
import { InfoGrid } from '@/components/legal/InfoGrid'
import { EventsTimeline } from '@/components/legal/EventsTimeline'
import { PartiesTable } from '@/components/legal/PartiesTable'
import { AppealsTable } from '@/components/legal/AppealsTable'
import { RelatedFilesTable } from '@/components/legal/RelatedFilesTable'
import type { RoleClient } from '@/components/legal/DeadlineCard'
import { Attente, EtapesAttente } from '@/components/ui/Chargement'

const CSS = `
.mp-add input,.mp-add select{font-family:inherit;font-size:16px;color:#15201E;background:#FFFFFF;border:1px solid #CFCAC0;border-radius:10px;min-height:48px;padding:0 14px;box-sizing:border-box;width:100%;outline:none}
.mp-add input:focus-visible,.mp-add select:focus-visible{border-color:#0E5A4E;box-shadow:0 0 0 4px #CDE5DD}
.mp-add label{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}
`
const BTN_P: React.CSSProperties = { fontFamily: 'inherit', fontSize: 16, fontWeight: 600, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, borderRadius: 999, padding: '0 26px', minHeight: 50, cursor: 'pointer' }  // + className="mp-action" (survol, appui)
const BTN_S: React.CSSProperties = { fontFamily: 'inherit', fontSize: 15, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 20px', minHeight: 48, cursor: 'pointer' }

/**
 * Ajout d'un dossier (maquette « أضيفوا أول ملف ») : numéro en 3 champs, cour d'appel,
 * tribunal de première instance facultatif, rôle du client, puis recherche live sur mahakim.
 */
export function AjoutDossier({ titre = 'أضيفوا ملفاً', sousTitre = 'اكتبوا الرقم كما يظهر على بوابة محاكم. سنجلب مسار الملف ونحسب آجاله خلال دقائق.', onAjoute, onAnnuler }: {
  titre?: string; sousTitre?: string; onAjoute: (id: string) => void; onAnnuler?: () => void
}) {
  const [annee, setAnnee] = useState(String(new Date().getFullYear()))
  const [codeRole, setCodeRole] = useState('')
  const [numero, setNumero] = useState('')
  const [courAppel, setCourAppel] = useState('')
  const [tribunalPrimaire, setTribunalPrimaire] = useState('')
  const [role, setRole] = useState<RoleClient>('INCONNU')
  const [titreAffaire, setTitreAffaire] = useState('')
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState<SearchResultPayload | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])
  const ca = useMemo(() => COURS_APPEL.find((c) => c.nomAr === courAppel), [courAppel])
  const peutChercher = /^\d{4}$/.test(annee) && !!codeRole && !!numero && !!courAppel

  const chercher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!peutChercher) { setErreur('أكملوا رقم الملف واختاروا محكمة الاستئناف.'); return }
    setErreur('')
    setSearching(true)
    setResultat(null)
    abort.current?.abort()
    const c = new AbortController()
    abort.current = c
    try {
      const r = await rechercherDossier(
        { anneeDossier: annee, codeRole, numeroDossier: numero, courAppel, tribunalPrimaire: tribunalPrimaire || undefined },
        { intervalMs: 2000, timeoutMs: 120000, signal: c.signal },
      )
      if (c.signal.aborted) return
      setResultat(r)
      if (r.trouve && r.titreAffaire && !titreAffaire) setTitreAffaire(r.titreAffaire)
    } catch (err: any) {
      if (c.signal.aborted || err?.message === 'Recherche annulée') return
      setErreur(erreurAr(err?.message) || 'حدث خطأ أثناء البحث في محاكم.')
    } finally {
      if (abort.current === c) abort.current = null
      setSearching(false)
    }
  }

  const ajouter = async () => {
    if (!resultat?.trouve) return
    setErreur('')
    setSubmitting(true)
    try {
      const d = await apiFetch<{ id: string }>('/dossiers', {
        method: 'POST',
        body: JSON.stringify({
          anneeDossier: annee, codeRole, numeroDossier: numero, courAppel,
          tribunalPrimaire: tribunalPrimaire || undefined,
          titreAffaire: titreAffaire || undefined,
          roleClient: role,
          evenements: resultat.evenements,
          rawData: { infosCarte: resultat.infosCarte, parties: resultat.parties, expertises: resultat.expertises, recours: resultat.recours, dossiersLies: resultat.dossiersLies },
        }),
      })
      onAjoute(d.id)
    } catch (err: any) {
      setErreur(erreurAr(err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const recommencer = () => { abort.current?.abort(); setResultat(null); setSearching(false) }
  const chiffres = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)
  const num = `${annee}/${codeRole}/${numero}`

  return (
    <div className="mp-add" dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>{titre}</h1>
        <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>{sousTitre}</p>
      </div>

      {erreur && <div role="alert" style={{ background: '#FBF1EF', border: '1px solid #F0C9C2', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#6E1D14' }}>{erreur}</div>}

      {searching ? (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ alignSelf: 'flex-start', background: '#F5F3EE', border: '1px solid #E4E0D6', borderBottom: 0, borderRadius: '12px 12px 0 0', padding: '6px 14px 4px', marginInlineStart: 16 }}><span className="num" style={{ fontSize: 13, fontWeight: 600, color: '#5E6B67' }}>{num}</span></div>
            <div aria-hidden style={{ border: '1px solid #E4E0D6', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="mp-skeleton" style={{ height: 14, width: '70%', borderRadius: 7, background: '#EEEAE1' }} />
              <div className="mp-skeleton" style={{ height: 12, width: '45%', borderRadius: 6, background: '#EEEAE1' }} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div className="mp-skeleton" style={{ width: 44, height: 44, borderRadius: 12, background: '#EEEAE1' }} /><div className="mp-skeleton" style={{ flex: 1, height: 12, borderRadius: 6, background: '#EEEAE1' }} /></div>
            </div>
          </div>
          <EtapesAttente
            etapes={[{ texte: 'الاتصال ببوابة محاكم', des: 0 }, { texte: 'البحث عن الملف في سجلات المحكمة', des: 4 }, { texte: 'قراءة مسار الملف والأطراف', des: 15 }]}
            lent={{ des: 45, texte: 'بوابة محاكم بطيئة الآن، ما زلنا ننتظر ردّها (حتى دقيقتين).' }} />
          <button type="button" onClick={recommencer} style={BTN_S}>إلغاء البحث</button>
        </div>
      ) : resultat?.trouve ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#E3F0EC', borderRadius: 14, padding: '14px 16px' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#0E5A4E', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Check size={16} aria-hidden /></span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#0B4A40' }}>تم العثور على الملف <span className="num">{num}</span></span>
          </div>
          <label>موضوع القضية<input value={titreAffaire} onChange={(e) => setTitreAffaire(e.target.value)} placeholder="مثال: شركة س ضد شركة ص — أداء" /></label>
          {resultat.infosCarte && Object.keys(resultat.infosCarte).length > 0 && (
            <InfoGrid title="بطاقة الملف" columns={3} items={Object.entries(resultat.infosCarte).map(([label, value]) => ({ label, value: value || '—', arabic: true }))} />
          )}
          <EventsTimeline events={(resultat.evenements ?? []).map((ev: any) => ({
            date: new Date(ev.datePublication).toLocaleDateString('fr-MA'),
            time: ev.dateAudience ? heure(ev.dateAudience) || undefined : undefined,
            titreAr: ev.texteArabe,
            titreFr: ev.dateAudience ? `الجلسة: ${new Date(ev.dateAudience).toLocaleDateString('fr-MA')}` : undefined,
          }))} />
          <PartiesTable parties={(resultat.parties ?? []) as any} />
          <AppealsTable recours={(resultat.recours ?? []) as any} />
          <RelatedFilesTable dossiers={(resultat.dossiersLies ?? []).map((d: any) => ({ numero: d.numeroDossier, tribunal: d.tribunal, type: d.type, dateInscription: d.dateInscription }))} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #EEEAE1', paddingTop: 18 }}>
            <button className="mp-action" type="button" onClick={ajouter} disabled={submitting} aria-busy={submitting} style={BTN_P}><Attente actif={submitting} texte="جارٍ الإضافة وحساب الآجال…">إضافة ومتابعة</Attente></button>
            <button type="button" onClick={recommencer} disabled={submitting} style={BTN_S}>بحث جديد</button>
          </div>
        </div>
      ) : (
        <form onSubmit={chercher} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {resultat && !resultat.trouve && (
            <div role="alert" style={{ background: '#FBF1EF', border: '1px solid #F0C9C2', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#6E1D14', lineHeight: 1.6 }}>
              {/* Panne du portail ≠ dossier introuvable : ne pas faire douter l'avocat de son numéro */}
              {resultat.erreur
                ? 'بوابة محاكم لا تستجيب حالياً. أعيدوا المحاولة بعد دقائق، رقم الملف ليس هو المشكل.'
                : 'لم نجد هذا الملف على محاكم. تحققوا من السنة والرمز والرقم والمحكمة، ثم أعيدوا المحاولة.'}
            </div>
          )}
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>رقم الملف</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <label>السنة<input inputMode="numeric" className="num" value={annee} onChange={(e) => setAnnee(chiffres(e.target.value, 4))} style={{ textAlign: 'center' }} /></label>
              <label>الرمز<input inputMode="numeric" className="num" value={codeRole} placeholder="1201" onChange={(e) => setCodeRole(chiffres(e.target.value, 4))} style={{ textAlign: 'center' }} /></label>
              <label>الرقم<input inputMode="numeric" className="num" value={numero} placeholder="845" onChange={(e) => setNumero(chiffres(e.target.value, 8))} style={{ textAlign: 'center' }} /></label>
            </div>
            <span style={{ fontSize: 13, color: '#5E6B67' }}>مثال: <span className="num">2026/1201/845</span></span>
          </fieldset>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <label>محكمة الاستئناف
              <select value={courAppel} onChange={(e) => { setCourAppel(e.target.value); setTribunalPrimaire('') }} required>
                <option value="">اختاروا المحكمة</option>
                {COURS_APPEL.map((c) => <option key={c.nomAr} value={c.nomAr}>{c.nomAr.replace('محكمة الاستئناف ب', '').replace('محكمة الاستئناف ', '')}</option>)}
              </select>
            </label>
            <label><span>المحكمة الابتدائية <span style={{ fontWeight: 400, color: '#5E6B67' }}>(اختياري)</span></span>
              <select value={tribunalPrimaire} onChange={(e) => setTribunalPrimaire(e.target.value)} disabled={!ca}>
                <option value="">الملف بمحكمة الاستئناف</option>
                {ca?.tribunauxPrimaires.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>موكلكم في هذا الملف</legend>
            <div role="radiogroup" aria-label="موكلكم في هذا الملف" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {(['DEMANDEUR', 'DEFENDEUR'] as const).map((r) => (
                <button key={r} type="button" role="radio" className="mp-choix" aria-checked={role === r} onClick={() => setRole(r)}
                  style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 600, borderRadius: 12, padding: '0 18px', minHeight: 48, cursor: 'pointer', ...(role === r ? { background: '#E3F0EC', color: '#0B4A40', border: '1.5px solid #0E5A4E' } : { background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0' }) }}>
                  {r === 'DEMANDEUR' ? 'مدعٍ' : 'مدعى عليه'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#5E6B67', lineHeight: 1.6 }}>بفضل هذا نفرّق بين الآجال التي عليكم والآجال التي نراقبها على الخصم.</span>
          </fieldset>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTop: '1px solid #EEEAE1', paddingTop: 22 }}>
            {/* Toujours cliquable : un champ manquant est expliqué au clic (un bouton grisé ne dit pas pourquoi) */}
            <button className="mp-action" type="submit" disabled={searching} style={BTN_P}>البحث في محاكم</button>
            {onAnnuler && <button type="button" onClick={onAnnuler} style={BTN_S}>إلغاء</button>}
            <span style={{ fontSize: 13, color: '#5E6B67' }}>نقرأ المعطيات العمومية للملف فقط، دون حسابكم على البوابة.</span>
          </div>
        </form>
      )}
    </div>
  )
}
