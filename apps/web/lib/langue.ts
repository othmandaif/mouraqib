'use client'
/**
 * Langue de l'interface : arabe (par défaut) ou français.
 * - Choix gardé sur l'appareil (localStorage), appliqué avant l'affichage par le script de app/layout.tsx.
 * - `t('نص عربي')` rend la traduction française si la langue est « fr » et que le texte est dans FR ;
 *   sinon le texte arabe. On traduit écran par écran en ajoutant les entrées ici.
 * La clé localStorage est relue aussi par le script de app/layout.tsx (même nom).
 */
import { useSyncExternalStore } from 'react'

export type Langue = 'ar' | 'fr'
const CLE = 'malafipro_langue'

const FR: Record<string, string> = {
  // Menu
  'الرئيسية': 'Accueil', 'الملفات': 'Dossiers', 'الآجال': 'Délais', 'الأجندة': 'Agenda',
  'الذكاء الاصطناعي': 'Intelligence artificielle', 'المساعد القانوني': 'Assistant juridique', 'محرّر الوثائق': 'Rédaction',
  'وثائقي': 'Mes documents', 'المتابعة': 'Suivi', 'التنبيهات': 'Alertes', 'الإعدادات': 'Paramètres', 'المساعد': 'Assistant',
  'المزيد': 'Plus', 'تسجيل الخروج': 'Se déconnecter', 'القائمة': 'Menu',
  // Espace admin
  'طلبات التسجيل': 'Demandes', 'الحسابات والاشتراكات': 'Comptes et abonnements', 'المحاسبة': 'Comptabilité',
  'سلامة النظام': 'Santé du système', 'المشرفون': 'Administrateurs', 'الطلبات': 'Demandes', 'الحسابات': 'Comptes', 'النظام': 'Système',
  'خروج': 'Déconnexion', 'بحث': 'Rechercher', 'إغلاق': 'Fermer', 'اللغة': 'Langue', 'ذ. ': 'Me ',
}

function lire(): Langue {
  try { return localStorage.getItem(CLE) === 'fr' ? 'fr' : 'ar' } catch { return 'ar' }
}

export function appliquerLangue(l: Langue) {
  document.documentElement.lang = l
  document.documentElement.dir = l === 'fr' ? 'ltr' : 'rtl'
}

export function changerLangue(l: Langue) {
  try { localStorage.setItem(CLE, l) } catch {}
  appliquerLangue(l)
  window.dispatchEvent(new Event('mp:langue'))
}

const abonner = (f: () => void) => { window.addEventListener('mp:langue', f); return () => window.removeEventListener('mp:langue', f) }

export function useLangue() {
  const langue = useSyncExternalStore(abonner, lire, () => 'ar' as Langue)
  const t = (ar: string) => (langue === 'fr' ? FR[ar] ?? ar : ar)
  return { langue, t, changerLangue }
}

