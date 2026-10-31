'use client'
// Paramètres › ذاكرة المساعد : ce que l'assistant a retenu de l'avocat (corrections, préférences, pratique, formules).
// Rendu dans la page Paramètres (mêmes classes pr-*). Tout est visible, modifiable et supprimable par l'avocat.
import { useState } from 'react'
import { Brain, Trash2 } from 'lucide-react'
import { IconeRonde } from '@/components/ui/Visuels'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { useToast } from '@/components/Toast'
import { t as tr } from '@/lib/langue'

type Type = 'PREFERENCE' | 'PRATIQUE' | 'CORRECTION' | 'FORMULE'
interface Souvenir { id: string; type: Type; texte: string; source: string | null; actif: boolean; updatedAt: string }

const TYPES: [Type, string][] = [['PREFERENCE', 'طريقة الجواب'], ['CORRECTION', 'تصحيح'], ['PRATIQUE', 'مجال الممارسة'], ['FORMULE', 'صياغة']]
const NOM: Record<Type, string> = Object.fromEntries(TYPES) as Record<Type, string>
const COULEUR: Record<Type, { bg: string; fg: string }> = {
  CORRECTION: { bg: '#FBF1EF', fg: '#9B2C20' }, PREFERENCE: { bg: '#E3F0EC', fg: '#0B4A40' },
  PRATIQUE: { bg: '#EAF0F5', fg: '#22476A' }, FORMULE: { bg: '#F1EFEA', fg: '#3B4A47' },
}

export function MemoireAssistant() {
  const { toast } = useToast()
  const { data, refetch } = useApi<{ active: boolean; souvenirs: Souvenir[] }>('/assistant/memoire')
  const [nouveau, setNouveau] = useState({ type: 'PREFERENCE' as Type, texte: '' })
  const [occupe, setOccupe] = useState('')

  const faire = async (k: string, fn: () => Promise<unknown>, ok?: string) => {
    setOccupe(k)
    try { await fn(); await refetch(); if (ok) toast(tr(ok), 'success') } catch (e: any) { toast(erreurAr(e?.message), 'error') } finally { setOccupe('') }
  }
  const ajouter = (e: React.FormEvent) => {
    e.preventDefault()
    if (nouveau.texte.trim().length < 8) { toast(tr('اكتبوا قاعدة قصيرة وواضحة (8 أحرف على الأقل).'), 'error'); return }
    faire('ajout', async () => { await apiFetch('/assistant/memoire', { method: 'POST', body: JSON.stringify(nouveau) }); setNouveau({ ...nouveau, texte: '' }) }, 'أُضيف إلى الذاكرة.')
  }
  const actifs = data?.souvenirs.filter((s) => s.actif).length ?? 0

  return (
    <section id="mem" className="pr-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Brain} taille={40} />{tr('ذاكرة المساعد')}</h2>
      <p style={{ margin: 0, fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>
        {tr('يتعلّم المساعد من تصحيحاتكم وتفضيلاتكم ليجيبكم كما تريدون: الأسلوب، طول الجواب، مجال ممارستكم، والأخطاء التي صحّحتموها. لا يحفظ أسماء الأطراف ولا أرقام الملفات ولا المبالغ، ولا يشاركها مع أحد، ولا تُستعمل لتدريب أي نموذج.')}
      </p>

      <div className="pr-row" style={{ paddingTop: 0 }}>
        <div><strong>{tr('التعلّم من المحادثات')}</strong><span>{data?.active === false ? tr('متوقف: لا يُضاف شيء ولا تُستعمل الذاكرة في الأجوبة.') : tr('مفعّل: يظهر إشعار «سأتذكّر…» عند كل إضافة، مع إمكانية التراجع.')}</span></div>
        <button type="button" className="pr-sw" role="switch" aria-checked={data?.active !== false} aria-label={tr('التعلّم من المحادثات')} disabled={!data || !!occupe}
          onClick={() => faire('reglage', () => apiFetch('/assistant/memoire-reglage', { method: 'PATCH', body: JSON.stringify({ active: !data!.active }) }))} />
      </div>

      <form onSubmit={ajouter} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
        <label className="pr-l" style={{ flex: '0 0 170px' }}>{tr('النوع')}
          <select className="pr-in" value={nouveau.type} onChange={(e) => setNouveau({ ...nouveau, type: e.target.value as Type })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{tr(l)}</option>)}
          </select>
        </label>
        <label className="pr-l" style={{ flex: '1 1 260px' }}>{tr('قاعدة يتذكّرها المساعد')}
          <input className="pr-in" value={nouveau.texte} maxLength={300} onChange={(e) => setNouveau({ ...nouveau, texte: e.target.value })} placeholder={tr('مثال: ابدأ بالخلاصة ثم السند القانوني، في أقل من 10 أسطر.')} />
        </label>
        <button type="submit" className="pr-btn" disabled={!!occupe} aria-busy={occupe === 'ajout'}>{tr('إضافة')}</button>
      </form>

      {!data ? null : data.souvenirs.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: '#5E6B67' }}>{tr('الذاكرة فارغة. صحّحوا المساعد أو قولوا له «تذكّر أن…» وسيحفظ القاعدة هنا.')}</p>
      ) : (
        <div>
          <span style={{ fontSize: 13, color: '#5E6B67' }}>{tr('{n} قاعدة مستعملة في الأجوبة (40 كحد أقصى).', { n: actifs })}</span>
          {data.souvenirs.map((s) => (
            <div key={s.id} className="pr-row" style={{ opacity: s.actif ? 1 : 0.55 }}>
              <div>
                <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '2px 10px', background: COULEUR[s.type].bg, color: COULEUR[s.type].fg }}>
                  {tr(NOM[s.type])}{s.source === 'manuel' ? ` · ${tr('أضفتموها')}` : ''}{!s.actif ? ` · ${tr('غير مستعملة')}` : ''}
                </span>
                <strong dir="auto" style={{ fontWeight: 500 }}>{s.texte}</strong>
              </div>
              <span style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="pr-btn" disabled={!!occupe} onClick={() => faire(`a:${s.id}`, () => apiFetch(`/assistant/memoire/${s.id}`, { method: 'PATCH', body: JSON.stringify({ actif: !s.actif }) }))}>
                  {s.actif ? tr('إيقاف') : tr('تفعيل')}
                </button>
                <button type="button" className="pr-btn danger" disabled={!!occupe} aria-label={tr('حذف هذه القاعدة')} onClick={() => faire(`d:${s.id}`, () => apiFetch(`/assistant/memoire/${s.id}`, { method: 'DELETE' }), 'حُذفت القاعدة.')}>
                  <Trash2 size={16} aria-hidden />
                </button>
              </span>
            </div>
          ))}
          <button type="button" className="pr-btn danger" style={{ marginTop: 8 }} disabled={!!occupe}
            onClick={() => { if (window.confirm(tr('حذف كل ما تعلّمه المساعد؟ لا يمكن التراجع.'))) faire('tout', () => apiFetch('/assistant/memoire', { method: 'DELETE' }), 'حُذفت الذاكرة كاملة.') }}>
            {tr('حذف كل الذاكرة')}
          </button>
        </div>
      )}
    </section>
  )
}
