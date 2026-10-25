import axios from 'axios'
import { logger } from '../../utils/logger'
import { numeroCourt } from '../alerts/preferences'

const META_API_URL = 'https://graph.facebook.com/v19.0'
const APP_URL = process.env.WEB_URL || 'https://app.malafipro.ma'

const JOURS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const jj = (d: Date) => d.toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', timeZone: 'Africa/Casablanca' })
const jour = (d: Date) => JOURS[new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' })).getDay()]
const dureeAr = (j: number) => (j <= 0 ? 'اليوم' : j === 1 ? 'غداً' : j === 2 ? 'بعد يومين' : j <= 10 ? `بعد ${j} أيام` : `بعد ${j} يوماً`)

/**
 * Messages WhatsApp MalafiPro (maquette « نماذج رسائل واتساب ») :
 * 3 lignes max, chiffre/date en première ligne, jamais le nom des parties ni l'objet du litige,
 * seulement la fin du numéro de dossier.
 */
/**
 * Meta n'accepte le texte libre que dans les 24 h qui suivent un message de l'avocat. Pour les
 * alertes (envoyées à l'initiative de l'app), il faut des MODÈLES approuvés : leurs noms se règlent
 * par variables d'environnement (textes à créer : docs/MODELES_WHATSAPP.md). Sans nom configuré,
 * le texte libre est utilisé (développement, ou avocat qui vient d'écrire).
 */
const MODELES = {
  delai: process.env.WA_TPL_DELAI,
  nouveauDelai: process.env.WA_TPL_NOUVEAU_DELAI,
  jugement: process.env.WA_TPL_JUGEMENT,
  audience: process.env.WA_TPL_AUDIENCE,
  evenement: process.env.WA_TPL_EVENEMENT,
  digest: process.env.WA_TPL_DIGEST,
  code: process.env.WA_TPL_CODE,
}
const LANGUE_MODELES = process.env.WA_TPL_LANGUE ?? 'ar'
type Modele = { nom: string | undefined; params: string[]; code?: boolean }
// Meta refuse retours à la ligne, tabulations et plus de 4 espaces dans un paramètre
const param = (t: string) => t.replace(/\s*\n+\s*/g, ' · ').replace(/\t/g, ' ').replace(/ {4,}/g, '   ').slice(0, 900)

export class WhatsAppService {
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  private accessToken = process.env.WHATSAPP_ACCESS_TOKEN!
  /** Code d'erreur Meta du dernier échec (diagnostic : affiché à l'avocat pour l'envoi du code). */
  derniereErreur: number | null = null

  /** Délai à agir (rappels J-7, J-3, J-1, jour J…). */
  async envoyerAlerteDelai(params: { telephone: string; numeroDossier: string; description: string; joursRestants: number; dateLimite: Date }): Promise<boolean> {
    const msg = `*آخر أجل ${dureeAr(params.joursRestants)}*\n${params.description} · ملف ${numeroCourt(params.numeroDossier)}\nآخر يوم: ${jour(params.dateLimite)} ${jj(params.dateLimite)}\n\n${APP_URL}/echeances`
    return this.envoyer(params.telephone, msg, { nom: MODELES.delai, params: [dureeAr(params.joursRestants), params.description, numeroCourt(params.numeroDossier), `${jour(params.dateLimite)} ${jj(params.dateLimite)}`] })
  }

  /** Un nouveau délai vient de s'ouvrir (tabligh enregistré). */
  async envoyerNouveauDelai(params: { telephone: string; numeroDossier: string; description: string; dateLimite: Date }): Promise<boolean> {
    const msg = `*بدأ ${params.description}*\nملف ${numeroCourt(params.numeroDossier)} · تبليغ مسجّل\nآخر يوم: ${jour(params.dateLimite)} ${jj(params.dateLimite)}\n\n${APP_URL}/echeances`
    return this.envoyer(params.telephone, msg, { nom: MODELES.nouveauDelai, params: [params.description, numeroCourt(params.numeroDossier), `${jour(params.dateLimite)} ${jj(params.dateLimite)}`] })
  }

  /** Nouvel événement sur mahakim : jugement, audience ou autre. */
  async envoyerAlerteEvenement(params: {
    telephone: string
    numeroDossier: string
    tribunal: string
    texteEvenement: string
    typeEvenement: string
    dateAudience?: Date | null
    dateLimite?: Date
  }): Promise<boolean> {
    const num = numeroCourt(params.numeroDossier)
    let msg: string
    let modele: Modele
    if (params.typeEvenement === 'JUGEMENT_RENDU' || params.typeEvenement === 'ORDONNANCE_RENDUE') {
      msg = `*صدر حكم في ملفكم*\nملف ${num} · ${params.tribunal}\nحدّدوا طبيعة الحكم لنحسب الآجال.`
      modele = { nom: MODELES.jugement, params: [num, params.tribunal] }
    } else if (params.dateAudience) {
      // 00:00 UTC = date sans heure
      const avecHeure = params.dateAudience.getUTCHours() !== 0 || params.dateAudience.getUTCMinutes() !== 0
      const h = params.dateAudience.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' })
      const quand = `${jour(params.dateAudience)} ${jj(params.dateAudience)}${avecHeure ? ` · ${h}` : ''}`
      msg = `*جلسة ${quand}*\n${params.tribunal}\nملف ${num}`
      modele = { nom: MODELES.audience, params: [quand, params.tribunal, num] }
    } else {
      msg = `*مستجد في ملفكم*\nملف ${num} · ${params.tribunal}\nالتفاصيل في التطبيق.`
      modele = { nom: MODELES.evenement, params: [num, params.tribunal] }
    }
    return this.envoyer(params.telephone, `${msg}\n\n${APP_URL}/dossiers`, modele)
  }

  async envoyerDigestQuotidien(params: {
    telephone: string
    nomAvocat: string
    nbDossiersBouges: number
    echeancesCritiques: Array<{ numeroDossier: string; description: string; joursRestants: number }>
    renvoisDetectes: Array<{ numeroDossier: string; tribunal: string }>
    audiencesDuJour?: number
  }): Promise<boolean> {
    const today = new Date()
    const plusProche = params.echeancesCritiques[0]
    const ligneDelais = params.echeancesCritiques.length
      ? `عليكم: ${params.echeancesCritiques.length} أجل · الأقرب ${dureeAr(plusProche.joursRestants)}`
      : 'لا أجل عاجل عليكم.'
    let ligneJour = `جلسات اليوم: ${params.audiencesDuJour ?? 0}`
    if (params.nbDossiersBouges > 0) ligneJour += ` · ملفات تحرّكت: ${params.nbDossiersBouges}`
    if (params.renvoisDetectes.length > 0) ligneJour += ` · تأجيلات: ${params.renvoisDetectes.length}`
    const date = `${jour(today)} ${jj(today)}`
    const msg = `*صباح الخير، اليوم ${date}*\n${ligneDelais}\n${ligneJour}\n\n${APP_URL}/dashboard`
    return this.envoyer(params.telephone, msg, { nom: MODELES.digest, params: [date, ligneDelais, ligneJour] })
  }

  async envoyerCodeVerification(telephone: string, code: string): Promise<boolean> {
    const lisible = `${code.slice(0, 3)} ${code.slice(3)}`
    return this.envoyer(telephone, `*رمز ملفاتي: ${lisible}*\nصالح لمدة 10 دقائق. لا تشاركوه مع أحد.`, { nom: MODELES.code, params: [code], code: true })
  }

  /** Envoi public d'un texte brut. */
  async envoyerTexte(telephone: string, message: string): Promise<boolean> {
    return this.envoyer(telephone, message)
  }

  private async envoyer(telephone: string, message: string, modele?: Modele): Promise<boolean> {
    // « 0612… » → 212612… ; « 00212… » → 212… (avant : « 00212… » devenait « 2120212… », numéro faux)
    const numero = telephone.replace(/[^0-9]/g, '').replace(/^00/, '').replace(/^0/, '212')
    this.derniereErreur = null
    if (!this.phoneNumberId || !this.accessToken) {
      logger.error('WhatsApp : WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN absent')
      this.derniereErreur = -1
      return false
    }
    const contenu = modele?.nom
      ? {
          type: 'template',
          template: {
            name: modele.nom,
            language: { code: LANGUE_MODELES },
            components: [
              { type: 'body', parameters: modele.params.map((t) => ({ type: 'text', text: param(t) })) },
              // Modèle d'authentification : bouton « copier le code »
              ...(modele.code ? [{ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: modele.params[0] }] }] : []),
            ],
          },
        }
      : { type: 'text', text: { body: message, preview_url: false } }

    try {
      const response = await axios.post(
        `${META_API_URL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: numero,
          ...contenu,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000, // Meta lent : on n'immobilise pas la file d'envoi
        }
      )
      logger.debug(`WhatsApp envoyé: HTTP ${response.status}`)
      return response.status === 200
    } catch (error: any) {
      const e = error?.response?.data?.error
      this.derniereErreur = typeof e?.code === 'number' ? e.code : 0
      // Code Meta journalisé en clair (jamais le numéro) : 190 jeton, 131030 numéro non autorisé, 131047 hors 24 h…
      logger.error(`WhatsApp refusé par Meta : code ${e?.code ?? '?'}${e?.error_subcode ? `/${e.error_subcode}` : ''} — ${e?.message ?? error.message}`)
      return false
    }
  }
}
