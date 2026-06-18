'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, RotateCw, Trash2, X, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { CaseCard } from '@/components/legal/CaseCard'
import { InfoGrid } from '@/components/legal/InfoGrid'
import { EventsTimeline } from '@/components/legal/EventsTimeline'
import { PartiesTable } from '@/components/legal/PartiesTable'
import { AppealsTable } from '@/components/legal/AppealsTable'
import { RelatedFilesTable } from '@/components/legal/RelatedFilesTable'

const COURS_APPEL = [
  {
    nomAr: 'محكمة الاستئناف بالرباط',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بالرباط', 'المحكمة الابتدائية بسلا', 'المحكمة الابتدائية بتمارة',
      'المحكمة الابتدائية بالخميسات', 'المحكمة الإبتدائية بتيفلت', 'المحكمة الابتدائية بالرماني',
      'المحكمة الابتدائية بالرباط - قسم قضاء الأسرة', 'المحكمة الابتدائية بسلا - قسم قضاء الأسرة',
      'المحكمة الابتدائية بالخميسات - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بالدار البيضاء',
    tribunauxPrimaires: [
      'المحكمة الابتدائية المدنية بالدار البيضاء', 'المحكمة الابتدائية الاجتماعية بالدار البيضاء',
      'المحكمة الابتدائية الزجرية بالدار البيضاء', 'المحكمة الابتدائية بالمحمدية',
      'المحكمة الابتدائية ببنسليمان', 'المحكمة الابتدائية ببنسليمان - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بأكادير',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بأكادير', 'المحكمة الابتدائية بانزكان', 'المحكمة الابتدائية بأولاد تايمة',
      'المحكمة الابتدائية بتيزنيت', 'المحكمة الابتدائية بطاطا', 'المحكمة الابتدائية بتارودانت',
      'المحكمة الابتدائية ببيوكرى', 'المحكمة الابتدائية بتارودانت - قسم قضاء الأسرة',
      'المحكمة الإبتدائية بتزنيت - قسم قضاء الأسرة', 'المحكمة الابتدائية بانزكان - قسم قضاء الأسرة',
      'المحكمة الابتدائية ببيوكرى - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بورزازات',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بورزازات', 'المحكمة الإبتدائية بتنغير', 'المحكمة الابتدائية بزاكورة',
      'المحكمة الابتدائية بورزازات - قسم قضاء الأسرة', 'المحكمة الابتدائية بزاكورة - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف ببني ملال',
    tribunauxPrimaires: [
      'المحكمة الابتدائية ببني ملال', 'المحكمة الابتدائية بقصبة تادلة', 'المحكمة الابتدائية بالفقيه بن صالح',
      'المحكمة الإبتدائية بسوق السبت أولاد النمة', 'المحكمة الابتدائية بخنيفرة', 'المحكمة الابتدائية بأزيلال',
      'المحكمة الابتدائية ببني ملال - قسم قضاء الأسرة', 'المحكمة الابتدائية بالفقيه بن صالح - قسم قضاء الأسرة',
      'المحكمة الابتدائية بخنيفرة - قسم قضاء الأسرة', 'المحكمة الابتدائية بقصبة تادلة - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بمراكش',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بمراكش', 'المحكمة الابتدائية بامنتانوت', 'المحكمة الابتدائية بقلعة السراغنة',
      'المحكمة الابتدائية بابن جرير', 'المحكمة الابتدائية بمراكش - قسم قضاء الأسرة',
      'المحكمة الابتدائية بقلعة السراغنة - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بكلميم',
    tribunauxPrimaires: [
      'المحكمةالابتدائية بسيدي افني', 'المحكمة الابتدائية بكلميم', 'المحكمة الابتدائية بآسا الزاك',
      'المحكمة الابتدائية بطانطان', 'المحكمة الابتدائية بكلميم - قسم قضاء الأسرة',
      'المحكمة الابتدائية بطانطان - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بالحسيمة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بالحسيمة', 'المحكمة الإبتدائية بتارجيست',
      'المحكمة الابتدائية بتارجيست - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بتازة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بتازة', 'المحكمة الابتدائية بجرسيف', 'المحكمة الابتدائية بتازة - قسم قضاء الأسرة',
      'المحكمة الابتدائية بجرسيف - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بمكناس',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بمكناس', 'المحكمة الابتدائية بالحاجب', 'المحكمة الابتدائية بآزرو',
      'المحكمة الابتدائية بمكناس - قسم قضاء الأسرة', 'المحكمة الابتدائية بآزرو - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بالرشيدية',
    tribunauxPrimaires: ['المحكمة الابتدائية بالرشيدية', 'المحكمة الابتدائية بميدلت'],
  },
  {
    nomAr: 'محكمة الاستئناف بالناضور',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بالناضور', 'المحكمة الإبتدائية بالدريوش',
      'المحكمة الابتدائية بالناضور - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بآسفي',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بآسفي', 'المحكمة الابتدائية باليوسفية', 'المحكمة الابتدائية بالصويرة',
      'المحكمة الابتدائية بآسفي - قسم قضاء الأسرة', 'المحكمة الابتدائية باليوسفية - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بخريبكة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بخريبكة', 'المحكمة الابتدائية بواد زم', 'المحكمة الابتدائية بأبي الجعد',
      'المحكمة الابتدائية بخريبكة - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بتطوان',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بتطوان', 'المحكمة الابتدائية بشفشاون', 'المحكمة الابتدائية بوزان',
      'المحكمة الابتدائية بوزان - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بفاس',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بفاس', 'المحكمة الابتدائية بصفرو', 'المحكمة الإبتدائية لبولمان بميسور',
      'المحكمة الابتدائية بتاونات', 'المحكمة الابتدائية بفاس - قسم قضاء الأسرة',
      'المحكمة الابتدائية لبولمان بميسور - قسم قضاء الأسرة',
      'المحكمة الابتدائية بتاونات - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بطنجة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بطنجة', 'المحكمة الابتدائية بأصيلة', 'المحكمة الابتدائية بالعرائش',
      'المحكمة الابتدائية بالقصر الكبير', 'المحكمة الابتدائية بطنجة - قسم قضاء الأسرة',
      'المحكمة الابتدائية بالعرائش - قسم قضاء الأسرة',
      'المحكمة الابتدائية بالقصر الكبير - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بالقنيطرة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بالقنيطرة', 'المحكمة الابتدائية بسيدي سليمان',
      'المحكمة الابتدائي بسوق الأريعاء', 'المحكمة الابتدائية بسيدي قاسم',
      'المحكمة الإبتدائية بمشرع بلقصيري', 'المحكمة الابتدائية بالقنيطرة - قسم قضاء الأسرة',
      'المحكمة الابتدائية بسيدي قاسم - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بالعيون',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بالعيون', 'المحكمة الابتدائية ببوجدور', 'المحكمة الابتدائية بالسمارة',
      'المحكمة الابتدائية بالداخلة', 'المحكمة الابتدائية بالسمارة - قسم قضاء الأسرة',
      'المحكمة الابتدائية بالعيون - قسم قضاء الأسرة', 'المحكمة الابتدائية بالداخلة - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بالجديدة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بالجديدة', 'المحكمة الابتدائية بسيدي بنور',
      'المحكمة الابتدائية بالجديدة - قسم قضاء الأسرة', 'المحكمة الابتدائية بسيدي بنور - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بسطات',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بسطات', 'المحكمة الابتدائية ببرشيد', 'المحكمة الابتدائية ببن أحمد',
      'المحكمة الابتدائية ببرشيد - قسم قضاء الأسرة', 'المحكمة الإبتدائية ببن أحمد - قسم قضاء الأسرة',
    ],
  },
  {
    nomAr: 'محكمة الاستئناف بوجدة',
    tribunauxPrimaires: [
      'المحكمة الابتدائية بوجدة', 'المحكمة الابتدائية بجرادة', 'المحكمة الابتدائية ببركان',
      'المحكمة الإبتدائية لفجيج ببوعرفة', 'المحكمة الابتدائية بتاوريرت',
      'المحكمة الإبتدائية بوجدة - قسم قضاء الأسرة', 'المحكمة الإبتدائية بتاوريرت - قسم قضاء الأسرة',
      'المحكمة الإبتدائية ببركان - قسم قضاء الأسرة', 'المحكمة الإبتدائية بجرادة - قسم قضاء الأسرة',
    ],
  },
]

interface Dossier {
  id: string
  numeroDossier: string
  anneeDossier: string
  codeRole: string
  tribunal: string
  titreAffaire?: string
  estCourAppel: boolean
  estActif: boolean
  echeances: { id: string }[]
  _count: { evenements: number; echeances: number }
  updatedAt: string
}

interface SearchResult {
  trouve: boolean
  titreAffaire: string | null
  evenements: {
    texteArabe: string
    dateAudience?: string | null
    datePublication: string
    rawHtml?: string | null
  }[]
  infosCarte: Record<string, string> | null
  parties: { qualite: string; nom: string; avocats: string; delegues: string; agents: string; representants: string }[]
  expertises: string[]
  recours: { type: string; partie: string; dateDepot: string; numero: string; numeroEnvoi: string; dateEnvoi: string; tribunal: string }[]
  dossiersLies: { type: string; numeroDossier: string; dateInscription: string; tribunal: string }[]
}

export default function DossiersPage() {
  const { data: dossiers, loading, refetch } = useApi<Dossier[]>('/dossiers')
  const [showForm, setShowForm] = useState(false)
  const [annee, setAnnee] = useState('')
  const [codeRole, setCodeRole] = useState('')
  const [numero, setNumero] = useState('')
  const [courAppel, setCourAppel] = useState('')
  const [recherchePrimaire, setRecherchePrimaire] = useState(false)
  const [tribunalPrimaire, setTribunalPrimaire] = useState('')
  const [titreAffaire, setTitreAffaire] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [formError, setFormError] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filteredDossiers = useMemo(() => {
    if (!dossiers) return []
    if (!filterQuery.trim()) return dossiers
    const q = filterQuery.toLowerCase()
    return dossiers.filter((d) =>
      d.numeroDossier.toLowerCase().includes(q) ||
      d.tribunal.toLowerCase().includes(q) ||
      (d.titreAffaire?.toLowerCase() ?? '').includes(q)
    )
  }, [dossiers, filterQuery])

  const caCourant = useMemo(
    () => COURS_APPEL.find((ca) => ca.nomAr === courAppel),
    [courAppel],
  )

  const handleSearch = async () => {
    if (!annee || !codeRole || !numero || !courAppel) {
      setFormError('Veuillez remplir tous les champs obligatoires')
      return
    }
    setFormError('')
    setSearching(true)
    setSearchResult(null)
    try {
      const res = await apiFetch<SearchResult>('/dossiers/rechercher', {
        method: 'POST',
        body: JSON.stringify({
          anneeDossier: annee,
          codeRole,
          numeroDossier: numero,
          courAppel,
          tribunalPrimaire: recherchePrimaire ? tribunalPrimaire : undefined,
        }),
      })
      setSearchResult(res)
      if (res.trouve && res.titreAffaire && !titreAffaire) {
        setTitreAffaire(res.titreAffaire)
      }
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de la recherche sur mahakim.ma')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchResult?.trouve) return
    setFormError('')
    setSubmitting(true)
    try {
      const dossier = await apiFetch<{ id: string }>('/dossiers', {
        method: 'POST',
        body: JSON.stringify({
          anneeDossier: annee,
          codeRole,
          numeroDossier: numero,
          courAppel,
          tribunalPrimaire: recherchePrimaire ? tribunalPrimaire : undefined,
          titreAffaire: titreAffaire || undefined,
          evenements: searchResult.evenements,
          rawData: {
            infosCarte: searchResult.infosCarte,
            parties: searchResult.parties,
            expertises: searchResult.expertises,
            recours: searchResult.recours,
            dossiersLies: searchResult.dossiersLies,
          },
        }),
      })
      window.location.href = `/dossiers/${dossier.id}`
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setSearchResult(null)
    setFormError('')
  }

  const handleScrape = async (id: string) => {
    await apiFetch(`/dossiers/${id}/scraper`, { method: 'POST' }).catch(() => {})
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce dossier et toutes ses données ?')) return
    setDeleting(id)
    try {
      await apiFetch(`/dossiers/${id}`, { method: 'DELETE' })
      refetch()
    } catch {
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const numComplet = `${annee}/${codeRole}/${numero}`

  const infoGridItems = searchResult?.infosCarte
    ? Object.entries(searchResult.infosCarte).map(([label, value]) => ({
        label,
        value: value || '—',
        arabic: true,
      }))
    : []

  const eventsForTimeline = searchResult?.evenements?.map((ev) => ({
    date: new Date(ev.datePublication).toLocaleDateString('fr-MA'),
    time: ev.dateAudience
      ? new Date(ev.dateAudience).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
      : undefined,
    titreAr: ev.texteArabe,
    titreFr: ev.dateAudience ? `Audience: ${new Date(ev.dateAudience).toLocaleDateString('fr-MA')}` : undefined,
  })) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes dossiers"
        subtitle={`${dossiers?.length ?? 0} dossier${(dossiers?.length ?? 0) > 1 ? 's' : ''} surveillé${(dossiers?.length ?? 0) > 1 ? 's' : ''}`}
      >
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Ajouter un dossier
        </Button>
      </PageHeader>

      <div>
        <Input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Rechercher par numéro de dossier, tribunal ou titre..."
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={handleAdd} className="space-y-5">
              <Card padding="lg">
                <h2 className="font-display text-2xl font-semibold text-primary mb-6 text-center" dir="rtl">
                  أدخل رقم الملف للبحث في محاكم المغرب
                </h2>

                {formError && (
                  <div className="bg-danger-bg border border-danger/30 text-danger text-sm font-sans px-4 py-3 rounded-sm mb-4">
                    {formError}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted mb-2">
                      رقم الملف *
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        value={annee}
                        onChange={(e) => setAnnee(e.target.value)}
                        placeholder="السنة"
                        className="text-center"
                      />
                      <Input
                        value={codeRole}
                        onChange={(e) => setCodeRole(e.target.value)}
                        placeholder="رمز الملف"
                        className="text-center"
                      />
                      <Input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="رقم الملف"
                        className="text-center"
                      />
                    </div>
                    {numComplet.includes('/') && (
                      <p className="text-xs text-text-muted font-sans mt-2">
                        Format : {numComplet}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                      محكمة الاستئناف *
                    </p>
                    <select
                      value={courAppel}
                      onChange={(e) => { setCourAppel(e.target.value); setTribunalPrimaire(''); setRecherchePrimaire(false) }}
                      required
                      className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm font-sans text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                      dir="rtl"
                    >
                      <option value="">-- اختر محكمة الاستئناف --</option>
                      {COURS_APPEL.map((ca) => (
                        <option key={ca.nomAr} value={ca.nomAr}>{ca.nomAr}</option>
                      ))}
                    </select>
                  </div>

                  {courAppel && caCourant && caCourant.tribunauxPrimaires.length > 0 && (
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recherchePrimaire}
                          onChange={(e) => { setRecherchePrimaire(e.target.checked); setTribunalPrimaire('') }}
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                        />
                        <span className="text-sm font-sans font-medium text-text-secondary">
                          هل تريد البحث بالمحاكم الابتدائية؟
                        </span>
                      </label>
                    </div>
                  )}

                  {recherchePrimaire && caCourant && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                        المحكمة الابتدائية *
                      </p>
                      <select
                        value={tribunalPrimaire}
                        onChange={(e) => setTribunalPrimaire(e.target.value)}
                        required
                        className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm font-sans text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                        dir="rtl"
                      >
                        <option value="">-- اختر المحكمة الابتدائية --</option>
                        {caCourant.tribunauxPrimaires.map((tp) => (
                          <option key={tp} value={tp}>{tp}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <Separator className="my-5" />

                {searching && (
                  <div className="flex items-center justify-center gap-3 py-6 text-text-secondary font-sans">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    Recherche en cours sur mahakim.ma...
                  </div>
                )}

                {!searchResult && !searching && (
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                      Annuler
                    </Button>
                    <Button type="button" onClick={handleSearch} disabled={!courAppel}>
                      Rechercher sur mahakim.ma
                    </Button>
                  </div>
                )}

                {searchResult && !searchResult.trouve && (
                  <div className="space-y-4">
                    <Card padding="md" className="border-danger/30 bg-danger-bg">
                      <p className="font-medium text-danger font-sans">Dossier non trouvé sur mahakim.ma</p>
                      <p className="text-sm text-danger font-sans mt-1">Vérifiez le numéro, l'année et le tribunal saisis.</p>
                    </Card>
                    <Button type="button" variant="secondary" onClick={() => { setSearchResult(null); setSearching(false) }}>
                      Modifier les informations et réessayer
                    </Button>
                  </div>
                )}

                {searchResult && searchResult.trouve && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted mb-1">
                        Titre de l'affaire
                      </p>
                      <Input
                        value={titreAffaire}
                        onChange={(e) => setTitreAffaire(e.target.value)}
                        placeholder="Ex: Société X c/ Société Y"
                      />
                    </div>

                    {infoGridItems.length > 0 && (
                      <InfoGrid title="بطاقة الملف" items={infoGridItems} columns={3} />
                    )}

                    <EventsTimeline events={eventsForTimeline} />

                    <PartiesTable
                      parties={(searchResult.parties ?? []).map((p) => ({
                        nom: p.nom,
                        qualite: p.qualite,
                        conseil: p.avocats || p.delegues || p.agents || p.representants || undefined,
                      }))}
                    />

                    {searchResult.expertises && searchResult.expertises.length > 0 && (
                      <Card padding="md">
                        <h3 className="font-display text-xl font-semibold text-primary mb-3" dir="rtl">لائحة الخبرات</h3>
                        <div className="space-y-2">
                          {searchResult.expertises.map((exp, i) => (
                            <div key={i} className="rounded-sm bg-surface-alt p-3">
                              <p className="text-sm font-sans text-text-primary font-arabic text-base" dir="rtl">{exp}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    <AppealsTable
                      recours={(searchResult.recours ?? []).map((r) => ({
                        type: r.type,
                        date: r.dateDepot || r.dateEnvoi || undefined,
                        statut: r.tribunal || undefined,
                        details: `Partie: ${r.partie || '—'} · N°: ${r.numero || '—'}`,
                      }))}
                    />

                    <RelatedFilesTable
                      dossiers={(searchResult.dossiersLies ?? []).map((d) => ({
                        numero: d.numeroDossier,
                        tribunal: d.tribunal,
                        type: d.type,
                      }))}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" loading={submitting}>
                        {submitting ? 'Création en cours...' : 'Ajouter et surveiller'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleCancel}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des dossiers */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      ) : filteredDossiers.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="py-12">
            <p className="font-display text-xl text-text-muted mb-2">
              {filterQuery ? 'Aucun dossier ne correspond à votre recherche' : 'Aucun dossier surveillé'}
            </p>
            <p className="text-sm text-text-muted font-sans">
              {filterQuery ? 'Essayez un autre terme de recherche' : 'Ajoutez votre premier dossier pour commencer la surveillance'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredDossiers.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                className="relative group"
              >
                <CaseCard
                  id={d.id}
                  dossierNumber={d.numeroDossier}
                  tribunal={d.tribunal}
                  typeAffaire={d.titreAffaire}
                  statut={d._count.evenements > 0 ? 'en_cours' : 'nouveau'}
                  updatedAt={new Date(d.updatedAt).toLocaleDateString('fr-MA')}
                />
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); handleScrape(d.id) }}
                    title="Forcer la mise à jour"
                    className="p-1.5 rounded-sm bg-surface border border-border text-text-muted hover:text-accent hover:border-accent transition-colors"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(d.id) }}
                    disabled={deleting === d.id}
                    title="Supprimer"
                    className="p-1.5 rounded-sm bg-surface border border-border text-text-muted hover:text-danger hover:border-danger transition-colors"
                  >
                    {deleting === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {d.estCourAppel && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge variant="accent">CA</Badge>
                  </div>
                )}
                {d.echeances.length > 0 && (
                  <div className="absolute bottom-3 right-3 z-10">
                    <Badge variant="danger">
                      {d.echeances.length} délai{d.echeances.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
