// Guides pratiques : types, textes d'interface et assemblage des contenus (FR : ./contenu.fr.ts, AR : ./contenu.ar.ts).
//
// RÈGLES DE RÉDACTION (à respecter à chaque modification) :
// - Un guide explique COMMENT BIEN FAIRE le travail ; les pages « fonction » (components/pages/) expliquent CE QUE FAIT MalafiPro.
// - Aucun article de loi, délai chiffré ou procédure n'est affirmé sans source officielle vérifiée. Ce qui n'est pas vérifié est
//   écrit comme une vérification à faire (« vérifiez… ») et figure dans la liste de validation : claude/GUIDES_SEO_VALIDATION.md.
// - Les sources sont des sites officiels marocains (liste `sources` de chaque guide). Ne citer un contenu précis que si on l'a lu.
// - Aucune fonctionnalité de MalafiPro qui n'existe pas dans le code ; aucun témoignage ni chiffre inventé.
import type { Langue } from '@/components/landing/contenu'
import type { PageId } from '@/lib/pagesPubliques'
import type { GuideId } from '@/lib/guidesPublics'
import { GUIDES_FR } from './contenu.fr'
import { GUIDES_AR } from './contenu.ar'

export type Section = {
  h2: string
  paras?: string[]
  items?: { h3: string; texte: string }[]
  etapes?: string[]
  puces?: string[]
  note?: string
}
export type Source = { nom: string; url: string; usage: string }
export type Guide = {
  nav: string // libellé court (fil d'Ariane, liens)
  resume: string // une ligne (index des guides, liens internes)
  titre: string // ≤ 60 caractères
  description: string // ≤ 160 caractères
  h1: string
  pastille: string
  lead: string
  sections: Section[]
  fonctions: { id: PageId; texte: string }[] // liens vers les pages MalafiPro pertinentes
  faq: { q: string; r: string }[]
  sources: Source[]
  lies: GuideId[]
}

export const GUIDES_TEXTES: Record<Langue, Record<GuideId, Guide>> = { fr: GUIDES_FR, ar: GUIDES_AR }

export const UI_GUIDES: Record<Langue, {
  hubNav: string; hubTitre: string; hubDescription: string; hubH1: string; hubPastille: string; hubLead: string; hubCriteres: string[]
  mis: string; avertissement: string; sources: string; sourcesTexte: string; lies: string; faq: string; fonctionsTitre: string
  essai: string; demo: string; lire: string; guidesLien: string; fil: string; aller: string; tarifs: string
}> = {
  fr: {
    hubNav: 'Guides',
    hubTitre: 'Guides pratiques pour cabinets d’avocat au Maroc | MalafiPro',
    hubDescription: 'Suivi des dossiers sur mahakim, audiences et échéances, clients, honoraires, WhatsApp, IA : des guides pratiques pour organiser un cabinet d’avocat au Maroc.',
    hubH1: 'Guides pratiques pour organiser un cabinet d’avocat',
    hubPastille: 'Guides',
    hubLead: 'Des méthodes concrètes pour tenir un cabinet : suivre ses dossiers, ne pas manquer une échéance, gérer ses clients et ses honoraires, utiliser WhatsApp et l’IA avec prudence.',
    hubCriteres: ['Chaque guide explique une méthode, pas un produit.', 'Les informations juridiques renvoient aux sources officielles et doivent être vérifiées.', 'Aucun conseil juridique : ces guides ne remplacent pas votre analyse d’avocat.'],
    mis: 'Mis à jour le 31 octobre 2026',
    avertissement: 'Ce guide donne une information générale d’organisation, pas un conseil juridique. Vérifiez les textes officiels cités avant toute décision.',
    sources: 'Sources officielles à consulter',
    sourcesTexte: 'Sites officiels de référence. Leur contenu évolue : consultez-les directement pour la version en vigueur.',
    lies: 'Guides liés', faq: 'Questions fréquentes', fonctionsTitre: 'Pour appliquer cette méthode dans MalafiPro',
    essai: 'Essai gratuit 20 jours', demo: 'Démo gratuite sur WhatsApp', lire: 'Lire le guide', guidesLien: 'Tous les guides', fil: 'Fil d’Ariane', aller: 'Découvrir', tarifs: 'Tarifs',
  },
  ar: {
    hubNav: 'الأدلة',
    hubTitre: 'أدلة عملية للمحامين ومكاتب المحاماة بالمغرب | ملفاتي',
    hubDescription: 'تتبع الملفات في محاكم، تنظيم الجلسات والآجال، الموكلون والأتعاب، واتساب والذكاء الاصطناعي: أدلة عملية لتنظيم مكتب المحاماة بالمغرب.',
    hubH1: 'أدلة عملية لتنظيم مكتب المحاماة',
    hubPastille: 'الأدلة',
    hubLead: 'طرق عملية لتسيير المكتب: تتبع الملفات، وعدم تفويت أي أجل، وإدارة الموكلين والأتعاب، واستعمال واتساب والذكاء الاصطناعي بحذر.',
    hubCriteres: ['كل دليل يشرح طريقة عمل، لا منتجاً.', 'المعلومات القانونية تحيل على المصادر الرسمية ويجب التحقق منها.', 'لا يُعدّ شيء منها استشارة قانونية، ولا تغني عن تحليلكم كمحامين.'],
    mis: 'آخر تحديث: 31 أكتوبر 2026',
    avertissement: 'هذا الدليل معلومات عامة في التنظيم وليس استشارة قانونية. تحققوا من النصوص الرسمية المشار إليها قبل أي قرار.',
    sources: 'مصادر رسمية للاطلاع',
    sourcesTexte: 'مواقع رسمية مرجعية. يتغير محتواها، فاطّلعوا عليها مباشرة للحصول على النسخة الجارية.',
    lies: 'أدلة ذات صلة', faq: 'أسئلة شائعة', fonctionsTitre: 'لتطبيق هذه الطريقة في ملفاتي',
    essai: 'جرّبوا مجاناً 20 يوماً', demo: 'عرض مجاني على واتساب', lire: 'قراءة الدليل', guidesLien: 'كل الأدلة', fil: 'مسار التصفح', aller: 'اكتشفوا', tarifs: 'الأسعار',
  },
}
