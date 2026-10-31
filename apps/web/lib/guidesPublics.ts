// Guides pratiques : adresses publiques, en arabe (racine) et en français (/fr/guides). Contenu : components/guides/.
// Même principe que lib/pagesPubliques.ts : `ar` = adresse publique en écriture arabe, `arRoute` = dossier interne latin
// (Next.js ne pré-génère pas un dossier au nom arabe) ; next.config.ts réécrit `ar` → `arRoute` et redirige `arRoute` → `ar`.
// `maj` = date réelle de dernière modification du contenu (lastmod du sitemap, dateModified du JSON-LD).
import { encoder } from './pagesPubliques'

export type GuideId = 'suivi-mahakim' | 'audiences-echeances' | 'clients-dossiers' | 'alertes-whatsapp' | 'facturation-honoraires' | 'intelligence-artificielle'

export const HUB_GUIDES = { ar: '/أدلة-المحامي', arRoute: '/adilla', fr: '/fr/guides', maj: '2026-10-31' }

export const GUIDES: { id: GuideId; ar: string; arRoute: string; fr: string; slugFr: string; maj: string }[] = [
  { id: 'suivi-mahakim', ar: '/أدلة-المحامي/تتبع-ملف-قضائي-عبر-بوابة-محاكم', arRoute: '/adilla/suivi-mahakim', fr: '/fr/guides/suivre-un-dossier-sur-mahakim', slugFr: 'suivre-un-dossier-sur-mahakim', maj: '2026-10-31' },
  { id: 'audiences-echeances', ar: '/أدلة-المحامي/تنظيم-الجلسات-والآجال-في-مكتب-المحاماة', arRoute: '/adilla/audiences-echeances', fr: '/fr/guides/organiser-audiences-et-echeances-cabinet-avocat', slugFr: 'organiser-audiences-et-echeances-cabinet-avocat', maj: '2026-10-31' },
  { id: 'clients-dossiers', ar: '/أدلة-المحامي/إدارة-الموكلين-والملفات-في-مكتب-المحاماة', arRoute: '/adilla/clients-dossiers', fr: '/fr/guides/gerer-clients-et-dossiers-cabinet-avocat', slugFr: 'gerer-clients-et-dossiers-cabinet-avocat', maj: '2026-10-31' },
  { id: 'alertes-whatsapp', ar: '/أدلة-المحامي/أهمية-تنبيهات-واتساب-للمحامين', arRoute: '/adilla/alertes-whatsapp', fr: '/fr/guides/alertes-whatsapp-avocats-avantages', slugFr: 'alertes-whatsapp-avocats-avantages', maj: '2026-10-31' },
  { id: 'facturation-honoraires', ar: '/أدلة-المحامي/تنظيم-فواتير-وأتعاب-المحاماة', arRoute: '/adilla/facturation-honoraires', fr: '/fr/guides/organiser-facturation-et-honoraires-avocat', slugFr: 'organiser-facturation-et-honoraires-avocat', maj: '2026-10-31' },
  { id: 'intelligence-artificielle', ar: '/أدلة-المحامي/الذكاء-الاصطناعي-في-مكتب-المحاماة', arRoute: '/adilla/intelligence-artificielle', fr: '/fr/guides/intelligence-artificielle-cabinet-avocat', slugFr: 'intelligence-artificielle-cabinet-avocat', maj: '2026-10-31' },
]

/** Chemin encodé (UTF-8) d'un guide : pour liens, canonical, hreflang, sitemap et JSON-LD. */
export const cheminGuide = (id: GuideId, lang: 'ar' | 'fr') => encoder(GUIDES.find((g) => g.id === id)![lang])
export const cheminHub = (lang: 'ar' | 'fr') => encoder(HUB_GUIDES[lang])
