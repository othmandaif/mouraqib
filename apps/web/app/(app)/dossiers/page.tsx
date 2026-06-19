'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, RotateCw, Trash2, X, Loader2, CheckCircle2, Lock, ArrowRight } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch, rechercherDossier } from '@/lib/api'
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
  const [statusFilter, setStatusFilter] = useState<'tous' | 'actifs' | 'delais' | 'appel'>('tous')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Compteurs pour les filtres rapides
  const counts = useMemo(() => {
    const list = dossiers ?? []
    return {
      tous: list.length,
      actifs: list.filter((d) => d._count.evenements > 0).length,
      delais: list.filter((d) => d.echeances.length > 0).length,
      appel: list.filter((d) => d.estCourAppel).length,
    }
  }, [dossiers])

  const filteredDossiers = useMemo(() => {
    let list = dossiers ?? []
    // Filtre rapide par catégorie
    if (statusFilter === 'actifs') list = list.filter((d) => d._count.evenements > 0)
    else if (statusFilter === 'delais') list = list.filter((d) => d.echeances.length > 0)
    else if (statusFilter === 'appel') list = list.filter((d) => d.estCourAppel)
    // Recherche texte
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase()
      list = list.filter((d) =>
        d.numeroDossier.toLowerCase().includes(q) ||
        d.tribunal.toLowerCase().includes(q) ||
        (d.titreAffaire?.toLowerCase() ?? '').includes(q),
      )
    }
    return list
  }, [dossiers, filterQuery, statusFilter])

  const caCourant = useMemo(
    () => COURS_APPEL.find((ca) => ca.nomAr === courAppel),
    [courAppel],
  )

  // UX : le numéro est-il complètement saisi ? (gate la prévisualisation + le bouton)
  const numeroComplet = annee.length === 4 && codeRole.length > 0 && numero.length > 0
  const peutRechercher = numeroComplet && !!courAppel && (!recherchePrimaire || !!tribunalPrimaire)
  const estCA = !recherchePrimaire

  // Champ unique "السنة / الرمز / العدد".
  // Année = 4 chiffres, Code (الرمز) = 4 chiffres, Numéro = le reste.
  // Comme les deux premiers segments ont une longueur fixe, on peut insérer les
  // DEUX "/" automatiquement : l'utilisateur tape uniquement des chiffres.
  // On garde annee/codeRole/numero séparés en interne (attendu par le backend).
  const numeroAffiche = (() => {
    let out = annee
    if (annee.length === 4 && (codeRole !== '' || numero !== '')) out += '/' + codeRole
    if (codeRole.length === 4 && numero !== '') out += '/' + numero
    return out
  })()

  const handleNumeroChange = (raw: string) => {
    const d = raw.replace(/\D/g, '') // on ignore les "/" : seuls les chiffres comptent
    setAnnee(d.slice(0, 4))
    setCodeRole(d.slice(4, 8))
    setNumero(d.slice(8))
  }

  const handleSearch = async () => {
    if (!annee || !codeRole || !numero || !courAppel) {
      setFormError('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    setFormError('')
    setSearching(true)
    setSearchResult(null)
    try {
      // Recherche asynchrone : lance un job côté serveur puis interroge jusqu'au résultat.
      // Aucun timeout de requête unique → plus d'erreur 500/504 si mahakim.ma est lent.
      const res = await rechercherDossier(
        {
          anneeDossier: annee,
          codeRole,
          numeroDossier: numero,
          courAppel,
          tribunalPrimaire: recherchePrimaire ? tribunalPrimaire : undefined,
        },
        { intervalMs: 2000, timeoutMs: 120000 },
      )
      setSearchResult(res)
      if (res.trouve && res.titreAffaire && !titreAffaire) {
        setTitreAffaire(res.titreAffaire)
      }
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء البحث في mahakim.ma')
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

  const resetForm = () => {
    setAnnee('')
    setCodeRole('')
    setNumero('')
    setCourAppel('')
    setRecherchePrimaire(false)
    setTribunalPrimaire('')
    setTitreAffaire('')
    setSearchResult(null)
    setFormError('')
  }

  const handleCancel = () => {
    setShowForm(false)
    resetForm()
  }

  const handleScrape = async (id: string) => {
    await apiFetch(`/dossiers/${id}/scraper`, { method: 'POST' }).catch(() => {})
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الملف وجميع بياناته؟')) return
    setDeleting(id)
    try {
      await apiFetch(`/dossiers/${id}`, { method: 'DELETE' })
      refetch()
    } catch {
      alert('حدث خطأ أثناء الحذف')
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
    titreFr: ev.dateAudience ? `الجلسة: ${new Date(ev.dateAudience).toLocaleDateString('ar-MA')}` : undefined,
  })) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="ملفاتي"
        subtitle={`${dossiers?.length ?? 0} ملف قيد المراقبة`}
      >
        <Button onClick={() => { showForm ? handleCancel() : setShowForm(true) }}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'إغلاق' : 'إضافة ملف'}
        </Button>
      </PageHeader>

      {/* Barre de filtres : recherche + filtres rapides */}
      <div dir="rtl" className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="ابحث برقم الملف أو المحكمة أو الموضوع..."
            className="w-full rounded-[10px] border border-border bg-white pr-10 pl-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { key: 'tous', label: 'الكل' },
            { key: 'actifs', label: 'نشطة' },
            { key: 'delais', label: 'بآجال' },
            { key: 'appel', label: 'استئناف' },
          ] as const).map((chip) => {
            const active = statusFilter === chip.key
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-secondary border-border hover:border-primary/40'
                }`}
              >
                {chip.label}
                <span className={`tabular-nums ${active ? 'text-white/80' : 'text-text-muted'}`} dir="ltr">
                  {counts[chip.key]}
                </span>
              </button>
            )
          })}
        </div>
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
                {/* En-tête — façon maquette : titre + sous-titre + gage de sécurité */}
                <div className="text-center mb-6">
                  <h2 className="font-display text-2xl font-semibold text-primary mb-2" dir="rtl">
                    تتبع ملفات المحاكم المغربية برقم الملف
                  </h2>
                  <p className="text-sm font-sans text-text-muted mb-3" dir="rtl">
                    أدخل رقم الملف للبحث في بيانات المحاكم المتاحة عبر mahakim.ma
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-sans text-accent">
                    <Lock className="h-3.5 w-3.5" />
                    بحث آمن ومشفر
                  </span>
                </div>

                {formError && (
                  <div className="bg-danger-bg border border-danger/30 text-danger text-sm font-sans px-4 py-3 rounded-sm mb-4">
                    {formError}
                  </div>
                )}

                {/* Le formulaire de saisie disparaît pendant la recherche et quand un résultat est trouvé */}
                {!searching && !(searchResult && searchResult.trouve) && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted mb-2">
                        رقم الملف *
                      </p>
                      <Input
                        value={numeroAffiche}
                        onChange={(e) => handleNumeroChange(e.target.value)}
                        placeholder="2024 / 8101 / 1234"
                        inputMode="numeric"
                        dir="ltr"
                        className="text-center tabular-nums text-lg tracking-wide"
                      />
                      <p className="text-[11px] text-text-muted font-sans mt-1 text-center">
                        أدخل الأرقام فقط، تُضاف العلامات «/» تلقائياً
                      </p>

                      {/* Aperçu "قرأنا الرقم هكذا" — confirme la lecture du numéro saisi */}
                      <AnimatePresence>
                        {numeroComplet && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 rounded-md border border-accent/30 bg-accent-subtle p-3" dir="rtl">
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                                <span className="text-sm font-sans font-medium text-text-secondary">
                                  قرأنا الرقم هكذا
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { label: 'السنة', value: annee },
                                  { label: 'الرمز', value: codeRole },
                                  { label: 'العدد', value: numero },
                                  { label: 'نوع المحكمة', value: estCA ? 'استئنافي' : 'ابتدائي' },
                                ].map((item) => (
                                  <div key={item.label} className="rounded-sm bg-white border border-border px-3 py-2 text-center">
                                    <p className="text-[10px] font-sans text-text-muted mb-0.5">{item.label}</p>
                                    <p className="text-sm font-semibold text-text-primary tabular-nums">{item.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="text-xs text-text-muted font-sans mt-2 text-center" dir="rtl">
                        مثال : <span className="font-semibold tabular-nums">2024 / 8101/ 1234</span>
                      </p>
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

                    <AnimatePresence>
                      {recherchePrimaire && caCourant && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1 overflow-hidden"
                        >
                          <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted pt-1">
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* État de chargement plein — façon maquette image 3 */}
                {searching && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center text-center py-16 px-6"
                    dir="rtl"
                  >
                    <RotateCw className="h-10 w-10 text-accent animate-spin mb-5" />
                    <p className="font-display text-2xl font-semibold text-primary mb-2">
                      جار البحث في سجلات المحكمة...
                    </p>
                    <p className="text-sm font-sans text-text-muted">
                      تجهيز الملف...
                    </p>
                  </motion.div>
                )}

                {/* Boutons de recherche — visibles seulement avant le résultat */}
                {!searchResult && !searching && (
                  <>
                    <Separator className="my-5" />
                    <div className="flex gap-3">
                      <Button type="button" variant="secondary" onClick={handleCancel}>
                        إلغاء
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSearch}
                        disabled={!peutRechercher}
                        className="flex-1"
                      >
                        <Search className="h-4 w-4" />
                        ابحث عن الملف
                      </Button>
                    </div>
                  </>
                )}

                {/* Dossier non trouvé */}
                {searchResult && !searchResult.trouve && (
                  <div className="space-y-4">
                    <Separator className="my-5" />
                    <Card padding="md" className="border-danger/30 bg-danger-bg">
                      <p className="font-medium text-danger font-sans">لم يتم العثور على الملف في mahakim.ma</p>
                      <p className="text-sm text-danger font-sans mt-1">Vérifiez le numéro, l'année et le tribunal saisis.</p>
                    </Card>
                    <Button type="button" variant="secondary" onClick={() => { setSearchResult(null); setSearching(false) }}>
                      تعديل المعلومات وإعادة المحاولة
                    </Button>
                  </div>
                )}

                {/* Dossier trouvé */}
                {searchResult && searchResult.trouve && (
                  <div className="space-y-5">
                    {/* Bannière de succès — façon maquette image 4 */}
                    <div className="rounded-md border border-success/30 bg-success-bg p-4 text-center" dir="rtl">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                        <p className="font-display text-lg font-semibold text-success">تم العثور على الملف</p>
                      </div>
                      <p className="text-xl font-bold text-text-primary tabular-nums">{numComplet}</p>
                    </div>

                    <div dir="rtl">
                      <p className="text-[11px] font-medium font-sans text-text-muted mb-1 text-right">
                        موضوع القضية
                      </p>
                      <Input
                        value={titreAffaire}
                        onChange={(e) => setTitreAffaire(e.target.value)}
                        placeholder="مثال: شركة س ضد شركة ص"
                        dir="rtl"
                        className="text-right font-arabic"
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
                        avocats: p.avocats,
                        delegues: p.delegues,
                        agents: p.agents,
                        representants: p.representants,
                      }))}
                    />

                    {searchResult.expertises && searchResult.expertises.length > 0 && (
                      <Card padding="md">
                        <div dir="rtl">
                          <h3 className="font-display text-xl font-semibold text-primary mb-3">لائحة الخبرات</h3>
                          <div className="space-y-2">
                            {searchResult.expertises.map((exp, i) => (
                              <div key={i} className="rounded-sm bg-surface-alt p-3">
                                <p className="text-base font-sans text-text-primary font-arabic">{exp}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    )}

                    <AppealsTable
                      recours={(searchResult.recours ?? []).map((r) => ({
                        type: r.type,
                        partie: r.partie,
                        dateDepot: r.dateDepot,
                        numero: r.numero,
                        numeroEnvoi: r.numeroEnvoi,
                        dateEnvoi: r.dateEnvoi,
                        tribunal: r.tribunal,
                      }))}
                    />

                    <RelatedFilesTable
                      dossiers={(searchResult.dossiersLies ?? []).map((d) => ({
                        numero: d.numeroDossier,
                        tribunal: d.tribunal,
                        type: d.type,
                        dateInscription: d.dateInscription,
                      }))}
                    />

                    <Separator className="my-2" />

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" loading={submitting} className="flex-1">
                        {!submitting && <CheckCircle2 className="h-4 w-4" />}
                        {submitting ? 'جارٍ الإضافة...' : 'إضافة ومتابعة'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setSearchResult(null); setSearching(false) }}>
                        بحث جديد
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
          <div className="py-12" dir="rtl">
            <p className="text-xl font-semibold text-text-secondary mb-2">
              {filterQuery || statusFilter !== 'tous' ? 'لا يوجد ملف يطابق بحثك' : 'لا يوجد ملف قيد المراقبة'}
            </p>
            <p className="text-sm text-text-muted mb-5">
              {filterQuery || statusFilter !== 'tous' ? 'جرّب كلمة بحث أو تصنيفاً آخر' : 'أضف ملفك الأول لبدء المراقبة'}
            </p>
            {!filterQuery && statusFilter === 'tous' && !showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                أضف ملفك الأول
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                  statut={d.echeances.length > 0 ? 'critique' : d._count.evenements > 0 ? 'en_cours' : 'nouveau'}
                  updatedAt={new Date(d.updatedAt).toLocaleDateString('ar-MA')}
                />
                {/* Actions : en RTL, on les place en haut à GAUCHE */}
                <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); handleScrape(d.id) }}
                    title="تحديث الآن"
                    className="p-1.5 rounded-md bg-surface border border-border text-text-muted hover:text-accent hover:border-accent transition-colors"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(d.id) }}
                    disabled={deleting === d.id}
                    title="حذف"
                    className="p-1.5 rounded-md bg-surface border border-border text-text-muted hover:text-danger hover:border-danger transition-colors"
                  >
                    {deleting === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {/* Badge "استئناف" : en haut à droite (RTL) */}
                {d.estCourAppel && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge variant="accent">استئناف</Badge>
                  </div>
                )}
                {/* Badge délais : en bas à gauche (RTL) */}
                {d.echeances.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-10">
                    <Badge variant="danger">
                      {d.echeances.length} {d.echeances.length > 1 ? 'آجال' : 'أجل'}
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