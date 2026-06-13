import * as crypto from 'crypto'

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY! // 32 bytes hex
const IV_LENGTH = 16

export function encryptCredential(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptCredential(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString()
}
