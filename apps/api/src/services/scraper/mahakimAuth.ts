import * as crypto from 'crypto'

const IV_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY ?? '0'.repeat(64)
  return Buffer.from(key, 'hex')
}

export function encryptCredential(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptCredential(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv)
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString()
}

// Credentials stored in-memory per session (production: use dedicated encrypted DB columns)
const credentialStore = new Map<string, { login: string; password: string }>()

export class MahakimAuth {
  async storeCredentials(userId: string, login: string, password: string): Promise<void> {
    credentialStore.set(userId, { login, password })
  }

  async getCredentials(userId: string): Promise<{ login: string; password: string } | null> {
    return credentialStore.get(userId) ?? null
  }
}
