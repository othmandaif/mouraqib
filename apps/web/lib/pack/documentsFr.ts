// Versions françaises des documents administratifs du dossier (compte réglé en français dans Paramètres).
// Même structure et mêmes règles que documents.ts : aucune donnée inventée, champ inconnu → « ………… ».
// Les noms venus de mahakim (tribunal, parties, actes) restent tels quels (en arabe).
import { dh, MODE, TYPE_FACTURE, totalLigne, type Client, type Facture, type Ligne, type Profil } from '../facturation'
import { date, type PackData } from './documents'

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ou = (s: unknown) => (s != null && String(s).trim() ? esc(s) : '…………………')
const num = (s: unknown) => `<span dir="ltr">${ou(s)}</span>`
// Texte arabe (tribunal, parties, actes de mahakim) inséré dans un document français
const ar = (s: unknown) => (s != null && String(s).trim() ? `<span dir="rtl">${esc(s)}</span>` : '…………………')
const aujourdhui = () => date(new Date())
const PROCEDURE: Record<string, string> = { CIVILE: 'Civile', PENALE: 'Pénale', COMMERCIALE: 'Commerciale', ADMINISTRATIVE: 'Administrative', TRAVAIL: 'Sociale (travail)', FAMILLE: 'Famille', REFERE: 'Référé' }
const ROLE: Record<string, string> = { DEMANDEUR: 'Demandeur', DEFENDEUR: 'Défendeur', INCONNU: '…………' }
const barreau = (pr: Profil) => (pr.barreau ? `inscrit au ${esc(pr.barreau)}` : 'inscrit au Barreau de …………')

function entete(pr: Profil, avecFiscal = false): string {
  const fiscal = avecFiscal
    ? `<br><span class="petit">ICE : ${ou(pr.ice)} · IF : ${ou(pr.identifiantFiscal)} · TP : ${ou(pr.taxeProfessionnelle)}</span>`
    : ''
  return `<table class="entete"><tr><td><b>${ou(pr.nom)}</b><br>Avocat${pr.barreau ? ` — ${esc(pr.barreau)}` : ''}<br>
<span class="petit">${ou(pr.adresse)}${pr.ville ? ` — ${esc(pr.ville)}` : ''}<br>Tél. : ${num(pr.telephone)}${pr.email ? ` · ${num(pr.email)}` : ''}</span>${fiscal}</td></tr></table>`
}

const lieuDate = (p: PackData) => `<p style="text-align:right">Fait à ${ou(p.profil.ville || p.dossier.ville)}, le ${aujourdhui()}</p>`
const identite = (c: Client | null, nom: string) => c
  ? `${esc(c.nom)}${c.type === 'SOCIETE' ? `, société${c.rc ? ` immatriculée au registre du commerce sous le n° ${num(c.rc)}` : ''}${c.ice ? `, ICE ${ou(c.ice)}` : ''}${c.representant ? `, représentée par son représentant légal ${esc(c.representant)}` : ''}` : c.cin ? `, titulaire de la CIN n° ${num(c.cin)}` : ', titulaire de la CIN n° …………'}, demeurant à ${ou(c.adresse)}${c.ville ? ` — ${esc(c.ville)}` : ''}`
  : `${ou(nom)}, titulaire de la CIN n° …………, demeurant à …………………`
const signatures = (droite: string, gauche: string) => `<table class="signature"><tr><td>${gauche}</td><td style="text-align:right">${droite}</td></tr></table>`

export function pageDeGarde(p: PackData): string {
  const d = p.dossier
  const audiences = p.evenements.filter((e) => e.dateAudience).map((e) => e.dateAudience!).sort().slice(-8)
  const lignesAud = [...audiences.map((a) => `<tr><td>${date(a)}</td><td></td><td></td></tr>`), ...Array.from({ length: Math.max(6, 12 - audiences.length) }, () => '<tr><td>&nbsp;</td><td></td><td></td></tr>')].join('')
  return `${entete(p.profil)}
<h1>Dossier n° <span dir="ltr">${esc(d.numeroDossier)}</span></h1>
<table>
<tr><th style="width:32%">Client</th><td>${ar(p.client?.nom || p.nomClient)}</td></tr>
<tr><th>Téléphone</th><td>${num(p.client?.telephone)}</td></tr>
<tr><th>Qualité du client</th><td>${ROLE[d.roleClient]}</td></tr>
<tr><th>Adversaire</th><td>${ar(p.nomAdversaire)}</td></tr>
<tr><th>Tribunal</th><td>${ar(d.tribunalAr)}</td></tr>
<tr><th>Type d'affaire</th><td>${PROCEDURE[d.typeProcedure] ?? ou(d.typeProcedure)}</td></tr>
<tr><th>Objet</th><td>${ar(d.objet)}</td></tr>
<tr><th>Ouverture du dossier au cabinet</th><td>${date(d.createdAt)}</td></tr>
<tr><th>Honoraires convenus</th><td>${d.honorairesConvenusCentimes != null ? dh(d.honorairesConvenusCentimes) : '…………'}</td></tr>
</table>
<h2>Registre des audiences</h2>
<table><tr><th style="width:22%">Date d'audience</th><th>Mesure prise</th><th style="width:22%">Prochaine audience</th></tr>${lignesAud}</table>
<h2>Délais en cours</h2>
${p.echeances.length ? `<table><tr><th>Délai</th><th style="width:22%">Dernier jour</th><th style="width:18%">À la charge de</th></tr>${p.echeances.map((e) => `<tr><td>${esc(e.description || e.descriptionAr)}</td><td>${date(e.dateLimite)}</td><td>${e.camp === 'AGIR' ? 'Nous' : "L'adversaire"}</td></tr>`).join('')}</table>` : '<p>Aucun délai en cours à la date de cette fiche.</p>'}`
}

export function conventionHonoraires(p: PackData): string {
  const d = p.dossier
  const montant = d.honorairesConvenusCentimes != null ? dh(d.honorairesConvenusCentimes) : '………………… DH'
  const etape = d.estCourAppel ? "la phase d'appel" : 'la première instance'
  return `${entete(p.profil)}
<h1>Convention d'honoraires</h1>
<p><b>Entre les soussignés :</b></p>
<p>${ou(p.profil.nom)}, avocat ${barreau(p.profil)}, dont le cabinet est situé à ${ou(p.profil.adresse)}, <b>(l'Avocat)</b>,</p>
<p><b>Et</b> ${identite(p.client, p.nomClient)}, <b>(le Client)</b>.</p>
<p><b>Il a été convenu ce qui suit :</b></p>
<h2>Article 1 : Objet</h2>
<p>Le Client confie à l'Avocat la mission de le représenter et de défendre ses intérêts dans le dossier n° ${num(d.numeroDossier)} pendant devant ${ar(d.tribunalAr)}${p.nomAdversaire ? `, contre ${ar(p.nomAdversaire)}` : ''}${d.objet ? `, ayant pour objet : ${ar(d.objet)}` : ''}.</p>
<h2>Article 2 : Étendue de la mission</h2>
<p>La présente convention couvre ${etape} jusqu'au prononcé de la décision. Les voies de recours et l'exécution n'y sont incluses que par une nouvelle convention écrite ou un avenant.</p>
<h2>Article 3 : Honoraires</h2>
<p>Les honoraires de l'Avocat sont fixés à la somme globale de <b>${montant}</b> (en lettres : ……………………………………………), majorée le cas échéant de la TVA au taux en vigueur.</p>
<p>Modalités de paiement : une provision de ………………… DH à la signature de la présente convention, le solde ……………………………………………… .</p>
<h2>Article 4 : Frais</h2>
<p>Ne sont pas compris dans les honoraires : les frais de justice et taxes, les honoraires des commissaires de justice, experts et traducteurs, ni les frais de déplacement hors du ressort du tribunal. Ils restent à la charge du Client et sont réglés sur justificatifs.</p>
<h2>Article 5 : Obligations des parties</h2>
<p>L'Avocat s'engage à apporter la diligence nécessaire à la défense des intérêts du Client, à respecter le secret professionnel et à l'informer de l'évolution du dossier. Son obligation est une obligation de moyens et non de résultat.</p>
<p>Le Client s'engage à fournir en temps utile des documents et informations exacts, et à informer l'Avocat de tout changement d'adresse ou de coordonnées.</p>
<h2>Article 6 : Résiliation</h2>
<p>Chaque partie peut mettre fin à la présente convention par notification écrite ; les honoraires restent dus pour les diligences accomplies jusqu'à la date de résiliation.</p>
<h2>Article 7 : Litiges</h2>
<p>Toute contestation relative aux honoraires est soumise au Bâtonnier de l'Ordre des avocats compétent, conformément à la loi n° 28.08 régissant la profession d'avocat.</p>
${lieuDate(p)}<p>Établie en deux exemplaires originaux, un pour chaque partie.</p>
${signatures("Signature de l'Avocat", 'Signature du Client<br><span class="petit">(précédée de la mention « Lu et approuvé »)</span>')}`
}

export function procuration(p: PackData): string {
  const d = p.dossier
  return `<h1>Procuration spéciale</h1>
<p>Je soussigné(e) : ${identite(p.client, p.nomClient)},</p>
<p>donne par la présente procuration à ${ou(p.profil.nom)}, avocat ${barreau(p.profil)}, pour me représenter et défendre mes intérêts dans le dossier n° ${num(d.numeroDossier)} pendant devant ${ar(d.tribunalAr)}${p.nomAdversaire ? ` contre ${ar(p.nomAdversaire)}` : ''}, ainsi que dans toute procédure qui en découle.</p>
<p>À cet effet, il pourra (rayer les mentions non accordées) :</p>
<p>— déposer requêtes, mémoires et toutes pièces, assister aux audiences et aux mesures d'instruction ;</p>
<p>— exercer les voies de recours ordinaires et extraordinaires (opposition, appel, pourvoi en cassation…) ;</p>
<p>— requérir la notification et l'exécution ainsi que toutes les procédures qui s'y rattachent ;</p>
<p>— transiger et se désister de l'action ou du jugement ;</p>
<p>— encaisser les sommes allouées en ma faveur et en donner quittance.</p>
${lieuDate(p)}
${signatures('Signature du / de la mandant(e)<br><span class="petit">(légalisée auprès de l\'autorité compétente)</span>', '')}`
}

export function recuProvision(p: PackData, r?: PackData['reglements'][number]): string {
  return `${entete(p.profil)}
<h1>Reçu de provision sur honoraires</h1>
${r ? `<p class="petit" style="text-align:right">Référence : <span dir="ltr">R-${esc(r.id.slice(-8).toUpperCase())}</span></p>` : ''}
<p>${ou(p.profil.nom)}, avocat${p.profil.barreau ? ` ${barreau(p.profil)}` : ''}, atteste avoir reçu de ${ar(p.client?.nom || p.nomClient)} :</p>
<table>
<tr><th style="width:35%">Montant</th><td><b>${r ? dh(r.montantCentimes) : '………………… DH'}</b></td></tr>
<tr><th>Montant en lettres</th><td>……………………………………………………………</td></tr>
<tr><th>Mode de paiement</th><td>${r ? MODE[r.mode] : 'Espèces / chèque / virement'}${r?.reference ? ` — n° ${num(r.reference)}` : ''}</td></tr>
<tr><th>Date du paiement</th><td>${date(r?.date)}</td></tr>
<tr><th>Dossier</th><td>${num(p.dossier.numeroDossier)} — ${ar(p.dossier.tribunalAr)}</td></tr>
</table>
<p>À titre de provision sur les honoraires convenus, à déduire du montant global lors de l'établissement de la note d'honoraires.</p>
${lieuDate(p)}
${signatures("Signature et cachet de l'Avocat", '')}`
}

export function bordereauPieces(p: PackData): string {
  const connus: string[] = []
  if (p.jugement) connus.push(`Copie du jugement rendu le ${date(p.jugement.date)}`)
  if (p.evenements.some((e) => /تبليغ/.test(e.texteArabe))) connus.push('Certificat de remise (pli de notification)')
  const lignes = [...connus, ...Array.from({ length: Math.max(6, 10 - connus.length) }, () => '')]
  return `${entete(p.profil)}
<h1>Bordereau de pièces</h1>
<table>
<tr><th style="width:30%">Tribunal</th><td>${ar(p.dossier.tribunalAr)}</td></tr>
<tr><th>Numéro de dossier</th><td>${num(p.dossier.numeroDossier)}</td></tr>
<tr><th>Pour le compte de</th><td>${ar(p.client?.nom || p.nomClient)}</td></tr>
<tr><th>Contre</th><td>${ar(p.nomAdversaire)}</td></tr>
</table>
<table><tr><th style="width:8%">N°</th><th>Pièce</th><th style="width:14%">Copies</th><th style="width:22%">Observations</th></tr>
${lignes.map((l, i) => `<tr><td>${i + 1}</td><td>${l ? esc(l) : '&nbsp;'}</td><td></td><td></td></tr>`).join('')}</table>
${lieuDate(p)}
${signatures('Signature', '')}`
}

export function lettreClient(p: PackData): string {
  const derniers = p.evenements.slice(0, 4)
  const agir = p.echeances.filter((e) => e.camp === 'AGIR')
  return `${entete(p.profil)}
${lieuDate(p)}
<p>À ${ar(p.client?.nom || p.nomClient)}<br><span class="petit">${ou(p.client?.adresse)}</span></p>
<p><b>Objet :</b> état du dossier n° ${num(p.dossier.numeroDossier)} — ${ar(p.dossier.tribunalAr)}</p>
<p>Madame, Monsieur,</p>
<p>J'ai l'honneur de vous informer des derniers développements de votre dossier visé en objet :</p>
${derniers.length ? `<table><tr><th style="width:22%">Date</th><th>Acte</th></tr>${derniers.map((e) => `<tr><td>${date(e.datePublicationGreffe)}</td><td>${ar(e.texteArabe)}</td></tr>`).join('')}</table>` : '<p>Aucun nouvel acte n\'a encore été enregistré.</p>'}
<p><b>Prochaine audience :</b> ${p.dossier.prochaineAudience ? date(p.dossier.prochaineAudience) : 'non encore fixée'}.</p>
${agir.length ? `<p><b>Délais en cours :</b></p>${agir.map((e) => `<p>— ${esc(e.description || e.descriptionAr)}, dernier jour : ${date(e.dateLimite)}.</p>`).join('')}` : ''}
<p><b>Ce que nous attendons de vous :</b> ……………………………………………………………………………</p>
<p>Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
${signatures(`${ou(p.profil.nom)}`, '')}
<p class="petit">Courrier confidentiel adressé au seul client, couvert par le secret professionnel.</p>`
}

export function factureHtml(f: Pick<Facture, 'type' | 'numero' | 'statut' | 'dateEmission' | 'dateEcheance' | 'lignes' | 'tauxTva' | 'totalHtCentimes' | 'tvaCentimes' | 'totalTtcCentimes' | 'modePaiement' | 'notes'> & { factureOrigine?: { numero: string | null } | null; dossier?: { numeroDossier: string } | null }, emetteur: Partial<Profil>, client: Partial<Client>): string {
  const brouillon = f.statut === 'BROUILLON' || !f.numero
  const lignes = (f.lignes as Ligne[]).map((l) => `<tr><td>${esc(l.designation)}</td><td style="text-align:center">${esc(l.quantite)}</td><td>${dh(l.prixUnitaireCentimes, false)}</td><td>${dh(totalLigne(l), false)}</td></tr>`).join('')
  return `${entete(emetteur as Profil, true)}
<h1>${TYPE_FACTURE[f.type]} ${brouillon ? '<span class="petit">(brouillon non numéroté)</span>' : `n° ${esc(f.numero)}`}</h1>
${f.factureOrigine?.numero ? `<p>Annule la facture n° ${esc(f.factureOrigine.numero)}.</p>` : ''}
<table>
<tr><th style="width:30%">Date</th><td>${date(f.dateEmission)}</td><th style="width:20%">Échéance</th><td>${f.dateEcheance ? date(f.dateEcheance) : '—'}</td></tr>
<tr><th>Client</th><td colspan="3"><b>${esc(client.nom ?? '') || '…………………'}</b><br><span class="petit">${ou(client.adresse)}${client.ville ? ` — ${esc(client.ville)}` : ''}${client.ice ? `<br>ICE : ${esc(client.ice)}` : client.cin ? `<br>CIN : ${esc(client.cin)}` : ''}${client.identifiantFiscal ? ` · IF : ${esc(client.identifiantFiscal)}` : ''}</span></td></tr>
${f.dossier ? `<tr><th>Dossier</th><td colspan="3"><span dir="ltr">${esc(f.dossier.numeroDossier)}</span></td></tr>` : ''}
</table>
<table><tr><th>Désignation</th><th style="width:10%">Qté</th><th style="width:20%">Prix unitaire HT (DH)</th><th style="width:20%">Total HT (DH)</th></tr>${lignes}
<tr class="total"><td colspan="3">Total hors taxes</td><td>${dh(f.totalHtCentimes, false)}</td></tr>
<tr class="total"><td colspan="3">TVA (${esc(f.tauxTva)} %)</td><td>${dh(f.tvaCentimes, false)}</td></tr>
<tr class="total"><td colspan="3">Total toutes taxes comprises</td><td>${dh(f.totalTtcCentimes, false)}</td></tr></table>
<p>Arrêté${f.type === 'FACTURE' ? 'e la présente facture' : f.type === 'AVOIR' ? ' le présent avoir' : 'e la présente note'} à la somme de : ${dh(f.totalTtcCentimes)} (en lettres : ……………………………………………).</p>
${f.modePaiement ? `<p>Mode de paiement : ${esc(f.modePaiement)}</p>` : ''}
${emetteur.rib ? `<p>Compte bancaire (RIB) : ${esc(emetteur.rib)}${emetteur.banque ? ` — ${esc(emetteur.banque)}` : ''}</p>` : ''}
${f.notes ? `<p class="petit">${esc(f.notes)}</p>` : ''}
${signatures('Signature et cachet', '')}
${emetteur.piedPage ? `<p class="petit" style="text-align:center">${esc(emetteur.piedPage)}</p>` : ''}`
}

export function noteHonorairesProjet(p: PackData): string {
  const regle = p.reglements.reduce((s, r) => s + r.montantCentimes, 0)
  const convenu = p.dossier.honorairesConvenusCentimes ?? 0
  const lignes: Ligne[] = [{ designation: `Honoraires de représentation et de défense — dossier n° ${p.dossier.numeroDossier}`, quantite: 1, prixUnitaireCentimes: convenu }]
  return factureHtml({
    type: 'NOTE_HONORAIRES', numero: null, statut: 'BROUILLON', dateEmission: new Date().toISOString(), dateEcheance: null, lignes, tauxTva: 0,
    totalHtCentimes: convenu, tvaCentimes: 0, totalTtcCentimes: convenu,
    modePaiement: null, notes: regle ? `Provision déjà versée : ${dh(regle)}, à déduire de ce montant. Projet à vérifier : à numéroter et émettre depuis la page Facturation.` : 'Projet à vérifier : à numéroter et émettre depuis la page Facturation.',
    dossier: { numeroDossier: p.dossier.numeroDossier },
  }, p.profil, p.client ?? { nom: p.nomClient })
}

/** Titres et descriptions de la liste des documents (même ordre et mêmes clés que la version arabe). */
export function libellesFr(p: PackData, provisions: PackData['reglements']): Record<string, [string, string]> {
  return {
    garde: ['Fiche de garde du dossier', 'Parties, tribunal, registre des audiences et délais'],
    convention: ["Convention d'honoraires", p.dossier.honorairesConvenusCentimes != null ? `Montant convenu : ${dh(p.dossier.honorairesConvenusCentimes)}` : 'Saisissez les honoraires dans le dossier pour remplir le montant'],
    procuration: ['Procuration spéciale', "Du client à l'avocat, signature à légaliser"],
    recu: ['Reçu de provision', provisions.length ? `Dernière provision : ${dh(provisions[0].montantCentimes)}` : 'Modèle vierge à remplir'],
    bordereau: ['Bordereau de pièces', 'Liste numérotée des pièces jointes'],
    lettre: ["Lettre d'information au client", 'Derniers actes, prochaine audience et délais'],
    honoraires: ["Note d'honoraires", 'Projet non numéroté à partir des honoraires convenus'],
  }
}
