import { logger } from '../../utils/logger'

/**
 * Envoi d'e-mails via l'API HTTP de Resend (pas de dépendance ajoutée).
 * Variables : RESEND_API_KEY, EMAIL_FROM (ex. « MalafiPro <noreply@malafipro.ma> », domaine vérifié chez Resend).
 */
const RESEND_URL = 'https://api.resend.com/emails'

export const emailConfigure = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM

export async function envoyerEmail(m: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (!emailConfigure()) return false
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) {
      // Jamais l'adresse dans les journaux : seulement le statut et le message de Resend
      logger.error(`E-mail refusé par Resend : HTTP ${r.status} — ${(await r.text()).slice(0, 300)}`)
      return false
    }
    return true
  } catch (e: any) {
    logger.error(`E-mail non envoyé : ${e?.message ?? e}`)
    return false
  }
}

const echapper = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Code de réinitialisation du mot de passe (6 chiffres, 10 minutes). */
export function messageCodeReinitialisation(prenom: string, code: string) {
  const lisible = `${code.slice(0, 3)} ${code.slice(3)}`
  const p = echapper(prenom)
  return {
    subject: `رمز إعادة تعيين كلمة المرور: ${lisible} · MalafiPro`,
    text: `مرحباً ${prenom}،\n\nرمز إعادة تعيين كلمة المرور على ملفاتي: ${lisible}\nصالح لمدة 10 دقائق. لا تشاركوه مع أي أحد.\n\nإن لم تطلبوا هذا الرمز، تجاهلوا هذه الرسالة: كلمة مروركم لم تتغير.\n\nMalafiPro — ملفاتي`,
    html: `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#F5F3EE;font-family:Tahoma,Arial,sans-serif;color:#15201E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;overflow:hidden">
<tr><td style="background:#083B34;padding:18px 24px;color:#FFFFFF;font-size:20px;font-weight:bold" dir="ltr" align="right">MalafiPro</td></tr>
<tr><td style="padding:24px;text-align:right;font-size:15px;line-height:1.8">
<p style="margin:0 0 12px">مرحباً ${p}،</p>
<p style="margin:0 0 16px">هذا رمز إعادة تعيين كلمة المرور على ملفاتي:</p>
<p dir="ltr" style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:6px;color:#0E5A4E;background:#E3F0EC;border-radius:12px;padding:14px 0">${lisible}</p>
<p style="margin:0 0 8px;color:#3B4A47">صالح لمدة 10 دقائق. لا تشاركوه مع أي أحد، ولن نطلبه منكم أبداً.</p>
<p style="margin:0;color:#5E6B67;font-size:13px">إن لم تطلبوا هذا الرمز، تجاهلوا هذه الرسالة: كلمة مروركم لم تتغير.</p>
</td></tr></table></td></tr></table></body></html>`,
  }
}
