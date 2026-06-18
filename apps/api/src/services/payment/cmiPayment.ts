import crypto from 'crypto'

const CMI_CONFIG = {
  merchantId: process.env.CMI_MERCHANT_ID!,
  storeKey: process.env.CMI_STORE_KEY!,
  apiUrl: process.env.CMI_API_URL || 'https://payment.cmi.co.ma/fim/est3Dgate',
}

interface CMIPaymentParams {
  amount: number
  orderId: string
  description: string
  callbackUrl: string
  okUrl: string
  failUrl: string
  email: string
}

export function generateCMIHash(params: CMIPaymentParams): string {
  const data = [
    CMI_CONFIG.storeKey,
    params.orderId,
    params.amount.toFixed(2),
    'MAD',
    CMI_CONFIG.merchantId,
    params.okUrl,
    params.failUrl,
    '3D_PAY_HOSTING',
    params.email,
  ].join('|')
  return crypto.createHash('sha512').update(data).digest('hex').toUpperCase()
}

export function generateCMIPaymentForm(params: CMIPaymentParams): string {
  const hash = generateCMIHash(params)

  return `
    <form method="POST" action="${CMI_CONFIG.apiUrl}" id="cmi-payment-form">
      <input type="hidden" name="clientid" value="${CMI_CONFIG.merchantId}" />
      <input type="hidden" name="amount" value="${params.amount.toFixed(2)}" />
      <input type="hidden" name="currency" value="504" />
      <input type="hidden" name="oid" value="${params.orderId}" />
      <input type="hidden" name="okUrl" value="${params.okUrl}" />
      <input type="hidden" name="failUrl" value="${params.failUrl}" />
      <input type="hidden" name="callbackUrl" value="${params.callbackUrl}" />
      <input type="hidden" name="storetype" value="3D_PAY_HOSTING" />
      <input type="hidden" name="lang" value="fr" />
      <input type="hidden" name="encoding" value="UTF-8" />
      <input type="hidden" name="email" value="${params.email}" />
      <input type="hidden" name="rnd" value="${Date.now()}" />
      <input type="hidden" name="hash" value="${hash}" />
      <input type="hidden" name="shopurl" value="${params.okUrl}" />
      <input type="hidden" name="description" value="${params.description}" />
    </form>
    <script>document.getElementById('cmi-payment-form').submit();</script>
  `
}

export function verifyCMICallback(body: Record<string, string>): boolean {
  const { hash, ...rest } = body
  if (!hash) return false

  const sortedKeys = Object.keys(rest).sort()
  const data = CMI_CONFIG.storeKey + sortedKeys.map((k) => rest[k]).join('|')
  const expected = crypto.createHash('sha512').update(data).digest('hex').toUpperCase()
  return expected === hash.toUpperCase()
}

export const PLAN_TARIFS: Record<string, number> = {
  SOLO: 190,
  PRO: 390,
  CABINET: 790,
}
