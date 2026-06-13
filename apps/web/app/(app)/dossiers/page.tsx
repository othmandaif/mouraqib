'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'

const TRIBUNAUX = [
  { code: 'TPI_CASA_ANFA', label: 'TPI Casablanca Anfa' },
  { code: 'TPI_CASA_HAY_MOHAMMADI', label: 'TPI Casablanca Hay Mohammadi' },
  { code: 'TPI_CASA_AIN_SEBAA', label: 'TPI Casablanca Ain Sebaa' },
  { code: 'CA_CASA', label: "Cour d'Appel Casablanca" },
  { code: 'TC_CASA', label: 'Tribunal de Commerce Casablanca' },
  { code: 'TPI_RABAT', label: 'TPI Rabat' },
  { code: 'TPI_SALE', label: 'TPI Salé' },
  { code: 'CA_RABAT', label: "Cour d'Appel Rabat" },
  { code: 'TC_RABAT', label: 'Tribunal de Commerce Rabat' },
  { code: 'TPI_MARRAKECH', label: 'TPI Marrakech' },
  { code: 'CA_MARRAKECH', label: "Cour d'Appel Marrakech" },
  { code: 'TPI_FES', label: 'TPI Fès' },
  { code: 'CA_FES', label: "Cour d'Appel Fès" },
  { code: 'TPI_MEKNES', label: 'TPI Meknès' },
  { code: 'TPI_AGADIR', label: 'TPI Agadir' },
  { code: 'CA_AGADIR', label: "Cour d'Appel Agadir" },
  { code: 'TPI_TANGER', label: 'TPI Tanger' },
  { code: 'CA_TANGER', label: "Cour d'Appel Tanger" },
  { code: 'TPI_OUJDA', label: "TPI Oujda" },
  { code: 'TPI_KENITRA', label: 'TPI Kénitra' },
]

interface Dossier {
  id: string
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  estActif: boolean
  echeances: { id: string }[]
  _count: { evenements: number; echeances: number }
  updatedAt: string
}

export default function DossiersPage() {
  const { data: dossiers, loading, refetch } = useApi<Dossier[]>('/dossiers')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ numeroDossier: '', tribunal: '', titreAffaire: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await apiFetch('/dossiers', { method: 'POST', body: JSON.stringify(form) })
      setForm({ numeroDossier: '', tribunal: '', titreAffaire: '' })
      setShowForm(false)
      refetch()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleScrape = async (id: string) => {
    await apiFetch(`/dossiers/${id}/scraper`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes dossiers</h1>
          <p className="text-slate-500 mt-1">{dossiers?.length ?? 0} dossier{(dossiers?.length ?? 0) > 1 ? 's' : ''} surveillé{(dossiers?.length ?? 0) > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
          + Ajouter un dossier
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-blue-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Nouveau dossier</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de dossier *</label>
              <input value={form.numeroDossier} onChange={set('numeroDossier')} required
                placeholder="Ex: 123/2024"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tribunal *</label>
              <select value={form.tribunal} onChange={set('tribunal')} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sélectionner...</option>
                {TRIBUNAUX.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'affaire (optionnel)</label>
            <input value={form.titreAffaire} onChange={set('titreAffaire')}
              placeholder="Ex: Société X c/ Société Y"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              {submitting ? 'Ajout en cours...' : 'Ajouter et surveiller'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste dossiers */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : (dossiers?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
          <p className="text-slate-400 text-lg mb-2">Aucun dossier surveillé</p>
          <p className="text-slate-400 text-sm">Ajoutez votre premier dossier pour commencer la surveillance</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dossiers!.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 hover:border-blue-200 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Link href={`/dossiers/${d.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
                    {d.numeroDossier}
                  </Link>
                  {d.echeances.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {d.echeances.length} délai{d.echeances.length > 1 ? 's' : ''} critique{d.echeances.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{d.tribunal}</p>
                {d.titreAffaire && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{d.titreAffaire}</p>}
              </div>
              <div className="text-sm text-slate-400 text-right">
                <p>{d._count.evenements} événement{d._count.evenements > 1 ? 's' : ''}</p>
                <p className="text-xs">{new Date(d.updatedAt).toLocaleDateString('fr-MA')}</p>
              </div>
              <button onClick={() => handleScrape(d.id)}
                title="Forcer la mise à jour"
                className="text-slate-400 hover:text-blue-600 text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                🔄
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
