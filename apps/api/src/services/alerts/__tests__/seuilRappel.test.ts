import { describe, it, expect, vi } from 'vitest'
vi.mock('../../../utils/prisma', () => ({ prisma: {} }))
vi.mock('../../whatsapp/whatsappService', () => ({ WhatsAppService: class {} }))
vi.mock('../../ai/audienceMessage', () => ({ redigerMessageEvenement: vi.fn() }))
import { seuilRappel } from '../alertService'

describe('seuilRappel — aucun rappel sauté', () => {
  const rappels = [7, 3, 1, 0]
  it('J-7 exact', () => expect(seuilRappel(7, rappels, 'AGIR')).toBe(7))
  it('serveur arrêté le jour J-7 : rattrapé à J-5 (seuil 7)', () => expect(seuilRappel(5, rappels, 'AGIR')).toBe(7))
  it('J-2 toujours prévenu même si non choisi', () => expect(seuilRappel(2, [7], 'AGIR')).toBe(2))
  it('dernier jour (J-0) toujours prévenu', () => expect(seuilRappel(0, [], 'AGIR')).toBe(0))
  it('trop loin : rien', () => expect(seuilRappel(20, rappels, 'AGIR')).toBeUndefined())
  it('adversaire : seulement à 2 jours', () => {
    expect(seuilRappel(5, rappels, 'SURVEILLER')).toBeUndefined()
    expect(seuilRappel(1, rappels, 'SURVEILLER')).toBe(2)
  })
})
