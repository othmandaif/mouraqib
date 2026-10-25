// En-tête des factures et des documents du cabinet. Sans profil enregistré : valeurs proposées depuis le compte.
import { prisma } from '../../utils/prisma'

export async function lireProfil(espace: string, userId: string) {
  const p = await prisma.profilFacturation.findUnique({ where: { espace: espace } })
  if (p) return { ...p, existe: true }
  // Valeurs proposées depuis le compte : l'avocat complète ICE, IF, TP
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { nom: true, prenom: true, barreau: true, telephone: true, email: true, cabinet: { select: { nom: true, adresse: true, ville: true } } } })
  return {
    existe: false, espace: espace,
    nom: u?.cabinet?.nom || `الأستاذ ${u?.prenom ?? ''} ${u?.nom ?? ''}`.trim(),
    barreau: u?.barreau ?? null, adresse: u?.cabinet?.adresse ?? null, ville: u?.cabinet?.ville ?? null,
    telephone: u?.telephone ?? null, email: u?.email ?? null,
    ice: null, identifiantFiscal: null, taxeProfessionnelle: null, rib: null, banque: null, piedPage: null,
  }
}
