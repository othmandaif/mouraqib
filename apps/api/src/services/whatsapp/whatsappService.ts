import axios from 'axios'
import { logger } from '../../utils/logger'

const META_API_URL = 'https://graph.facebook.com/v19.0'

export class WhatsAppService {
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
  private accessToken = process.env.WHATSAPP_ACCESS_TOKEN!

  async envoyerAlerteEvenement(params: {
    telephone: string
    numeroDossier: string
    tribunal: string
    texteEvenement: string
    typeEvenement: string
    dateLimite?: Date
  }): Promise<boolean> {
    let msg = `⚖️ *MOURAQIB — Alerte Dossier*\n\n`
    msg += `📁 Dossier: *${params.numeroDossier}*\n`
    msg += `🏛️ Tribunal: ${params.tribunal}\n`
    msg += `📋 Événement: ${params.typeEvenement}\n`
    msg += `📝 Greffe: _${params.texteEvenement}_\n`

    if (params.dateLimite) {
      const jours = Math.ceil((params.dateLimite.getTime() - Date.now()) / 86_400_000)
      msg += `\n⏰ *Délai: ${jours} jours restants*\n`
      msg += `📅 Échéance: ${params.dateLimite.toLocaleDateString('fr-MA')}\n`
    }

    msg += `\n🔗 https://app.mouraqib.ma/dossier/${params.numeroDossier}`
    return this.envoyer(params.telephone, msg)
  }

  async envoyerAlerteDelai(params: {
    telephone: string
    numeroDossier: string
    description: string
    joursRestants: number
    dateLimite: Date
  }): Promise<boolean> {
    const emoji = params.joursRestants <= 1 ? '🔴' : params.joursRestants <= 3 ? '🟠' : '🟡'
    let msg = `${emoji} *MOURAQIB — Délai critique*\n\n`
    msg += `📁 Dossier: *${params.numeroDossier}*\n`
    msg += `⏰ ${params.description}\n`
    msg += `*J-${params.joursRestants}* (${params.dateLimite.toLocaleDateString('fr-MA')})\n`
    msg += `\n🔗 https://app.mouraqib.ma/echeances`
    return this.envoyer(params.telephone, msg)
  }

  async envoyerDigestQuotidien(params: {
    telephone: string
    nomAvocat: string
    nbDossiersBouges: number
    echeancesCritiques: Array<{ numeroDossier: string; description: string; joursRestants: number }>
    renvoisDetectes: Array<{ numeroDossier: string; tribunal: string }>
  }): Promise<boolean> {
    const today = new Date().toLocaleDateString('fr-MA', {
      weekday: 'long', day: 'numeric', month: 'long',
    })

    let msg = `☀️ *Bonjour Maître ${params.nomAvocat}*\n📅 ${today}\n\n`
    msg += `📊 *Résumé matinal MOURAQIB*\n\n`

    if (params.nbDossiersBouges > 0) {
      msg += `📁 *${params.nbDossiersBouges} dossier(s) mis à jour* cette nuit\n\n`
    }

    if (params.echeancesCritiques.length > 0) {
      msg += `⚠️ *DÉLAIS CRITIQUES:*\n`
      for (const e of params.echeancesCritiques.slice(0, 5)) {
        const em = e.joursRestants <= 1 ? '🔴' : e.joursRestants <= 3 ? '🟠' : '🟡'
        msg += `${em} ${e.numeroDossier}: ${e.description} — *J-${e.joursRestants}*\n`
      }
      msg += '\n'
    }

    if (params.renvoisDetectes.length > 0) {
      msg += `🚫 *RENVOIS (évitez le déplacement):*\n`
      for (const r of params.renvoisDetectes) {
        msg += `• ${r.numeroDossier} @ ${r.tribunal}\n`
      }
    }

    if (params.nbDossiersBouges === 0 && params.echeancesCritiques.length === 0) {
      msg += `✅ Aucune urgence aujourd'hui. Bonne journée !\n`
    }

    msg += `\n🔗 https://app.mouraqib.ma/dashboard`
    return this.envoyer(params.telephone, msg)
  }

  async envoyerCodeVerification(telephone: string, code: string): Promise<boolean> {
    const msg = `🔐 *MOURAQIB — Code de vérification*\n\nVotre code: *${code}*\n\nExpire dans 10 minutes.`
    return this.envoyer(telephone, msg)
  }

  private async envoyer(telephone: string, message: string): Promise<boolean> {
    const numero = telephone.replace(/[^0-9]/g, '').replace(/^0/, '212')

    try {
      const response = await axios.post(
        `${META_API_URL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: numero,
          type: 'text',
          text: { body: message, preview_url: false },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      logger.debug(`WhatsApp envoyé à ${numero}: HTTP ${response.status}`)
      return response.status === 200
    } catch (error: any) {
      logger.error('WhatsApp send error:', error?.response?.data ?? error.message)
      return false
    }
  }
}
