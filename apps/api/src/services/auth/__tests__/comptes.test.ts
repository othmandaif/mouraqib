import { describe, it, expect, afterEach } from 'vitest'
import { emailAutorise, motDePasseProvisoire, champNom, champTelephone } from '../comptes'

describe('emailAutorise', () => {
  afterEach(() => { delete process.env.EMAILS_DOMAINES_SUPPLEMENTAIRES })
  it('accepte les fournisseurs courants, sans tenir compte de la casse', () => {
    expect(emailAutorise('Avocat@Gmail.com')).toBe(true)
    expect(emailAutorise('x@hotmail.fr')).toBe(true)
  })
  it('refuse les domaines inconnus ou jetables', () => {
    expect(emailAutorise('x@mailinator.com')).toBe(false)
    expect(emailAutorise('x@gmail.co')).toBe(false)
    expect(emailAutorise('pas-un-email')).toBe(false)
  })
  it('accepte un domaine de cabinet ajouté par configuration', () => {
    process.env.EMAILS_DOMAINES_SUPPLEMENTAIRES = 'cabinet-alaoui.ma'
    expect(emailAutorise('k@cabinet-alaoui.ma')).toBe(true)
  })
})

describe('motDePasseProvisoire', () => {
  it('a le format attendu et varie', () => {
    const a = motDePasseProvisoire()
    expect(a).toMatch(/^Malafi-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/)
    expect(a).not.toBe(motDePasseProvisoire())
  })
})

describe('champs d\'identité', () => {
  it('borne la longueur du nom (une demande de 50 000 caractères cassait la page admin)', () => {
    expect(champNom.safeParse('  Alaoui ').data).toBe('Alaoui')
    expect(champNom.safeParse('A').success).toBe(false)
    expect(champNom.safeParse('A'.repeat(81)).success).toBe(false)
  })
  it('accepte un numéro marocain ou international et retire les séparateurs', () => {
    expect(champTelephone.safeParse('06 61-23.45 67').data).toBe('0661234567')
    expect(champTelephone.safeParse('+212 661 23 45 67').data).toBe('+212661234567')
  })
  it('refuse un téléphone sans chiffres ou trop long', () => {
    expect(champTelephone.safeParse('pas un numero!!').success).toBe(false)
    expect(champTelephone.safeParse('1234567890123456').success).toBe(false)
  })
})
