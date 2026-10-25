// « تحضير ملف العمل » : documents administratifs d'un dossier, mis en page en HTML et ouverts par Word (.doc).
// Même méthode que lib/exportDocument.ts (HTML → Word) : c'est la seule qui garde l'arabe de droite à gauche.
// Aucune donnée inventée : un champ inconnu devient « ………… » à compléter à la main.
import { dh, MODE, TYPE_FACTURE, totalLigne, type Client, type Facture, type Ligne, type ModeReglement, type Profil } from '../facturation'

export interface PackData {
  dossier: {
    id: string; numeroDossier: string; tribunal: string; tribunalAr: string; ville: string | null; estCourAppel: boolean; typeProcedure: string
    titreAffaire: string | null; objet: string; roleClient: 'DEMANDEUR' | 'DEFENDEUR' | 'INCONNU'; honorairesConvenusCentimes: number | null
    createdAt: string; prochaineAudience: string | null
  }
  client: Client | null
  nomClient: string
  nomAdversaire: string
  avocat: { nom: string; prenom: string; barreau: string | null; telephone: string | null; email: string } | null
  profil: Profil
  evenements: { texteArabe: string; typeEvenement: string | null; dateAudience: string | null; datePublicationGreffe: string }[]
  echeances: { descriptionAr: string | null; description: string; dateLimite: string; camp: 'AGIR' | 'SURVEILLER' }[]
  factures: { id: string; numero: string | null; type: string; statut: string; dateEmission: string | null; totalTtcCentimes: number }[]
  reglements: { id: string; montantCentimes: number; date: string; mode: ModeReglement; reference: string | null; factureId: string | null }[]
  jugement: { texte: string; date: string } | null
  actesIA: { typeActe: string; titreAr: string; raison: string; variables: Record<string, string> }[]
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ou = (s: unknown) => (s != null && String(s).trim() ? esc(s) : '…………………')
const num = (s: unknown) => `<span dir="ltr">${ou(s)}</span>`
const p2 = (n: number) => String(n).padStart(2, '0')
export const date = (d: string | Date | null | undefined) => { if (!d) return '…… / …… / ……'; const x = new Date(d); return `${p2(x.getDate())}/${p2(x.getMonth() + 1)}/${x.getFullYear()}` }
const aujourdhui = () => date(new Date())
const PROCEDURE: Record<string, string> = { CIVILE: 'مدنية', PENALE: 'زجرية', COMMERCIALE: 'تجارية', ADMINISTRATIVE: 'إدارية', TRAVAIL: 'اجتماعية (شغل)', FAMILLE: 'أسرة', REFERE: 'استعجالية' }
const ROLE: Record<string, string> = { DEMANDEUR: 'مدعٍ', DEFENDEUR: 'مدعى عليه', INCONNU: '…………' }

const CSS = `
@page { size: A4; margin: 2cm; }
body { font-family: 'Arial', sans-serif; font-size: 12.5pt; line-height: 1.8; color: #111; direction: rtl; text-align: right; }
h1 { font-size: 17pt; text-align: center; margin: 12pt 0 14pt; }
h2 { font-size: 13.5pt; margin: 14pt 0 6pt; }
p { margin: 0 0 6pt; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; }
td, th { border: 1px solid #555; padding: 5pt 7pt; vertical-align: top; text-align: right; }
th { background: #EDEDED; font-weight: bold; }
.entete { border-bottom: 2px solid #0E5A4E; padding-bottom: 6pt; margin-bottom: 10pt; }
.entete td { border: 0; padding: 0; }
.petit { font-size: 10pt; color: #444; }
.signature { margin-top: 28pt; }
.signature td { border: 0; width: 50%; height: 70pt; }
.total td { font-weight: bold; }
.cadre { border: 1px solid #555; padding: 8pt; }
`

/** Fichier .doc (HTML lu par Word). `ltr` pour un document en français. */
export function documentWord(titre: string, corps: string, ltr = false): string {
  const css = ltr ? CSS.replace('direction: rtl; text-align: right;', 'direction: ltr; text-align: left;').replace(/text-align: right;/g, 'text-align: left;') : CSS
  // Direction et bordures répétées sur chaque bloc : Word et LibreOffice n'héritent pas toujours celles du <body> / du CSS
  const dir = ltr ? 'ltr' : 'rtl'
  const html = corps
    .replace(/<(p|h1|h2|td|th|table)(?![^>]*\bdir=)([\s>])/g, `<$1 dir="${dir}"$2`)
    .replace(/<table dir="(rtl|ltr)">/g, '<table dir="$1" border="1" cellspacing="0" cellpadding="6" width="100%">')
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(titre)}</title><style>${css}</style></head>
<body dir="${dir}" lang="${ltr ? 'fr' : 'ar'}">${html}</body></html>`
}

/** En-tête du cabinet (profil de facturation). */
function entete(pr: Profil, avecFiscal = false): string {
  const fiscal = avecFiscal
    ? `<br><span class="petit" dir="ltr">ICE : ${ou(pr.ice)} · IF : ${ou(pr.identifiantFiscal)} · TP : ${ou(pr.taxeProfessionnelle)}</span>`
    : ''
  return `<table class="entete"><tr><td><b>${ou(pr.nom)}</b><br>محامٍ ${pr.barreau ? `ب${esc(pr.barreau)}` : ''}<br>
<span class="petit">${ou(pr.adresse)}${pr.ville ? ` — ${esc(pr.ville)}` : ''}<br>الهاتف: ${num(pr.telephone)}${pr.email ? ` · ${num(pr.email)}` : ''}</span>${fiscal}</td></tr></table>`
}

const lieuDate = (p: PackData) => `<p style="text-align:left">${ou(p.profil.ville || p.dossier.ville)} في ${aujourdhui()}</p>`
const identite = (c: Client | null, nom: string) => c
  ? `${esc(c.nom)}${c.type === 'SOCIETE' ? `، شركة${c.rc ? `، مسجلة بالسجل التجاري تحت رقم ${num(c.rc)}` : ''}${c.ice ? `، <span dir="ltr">ICE ${ou(c.ice)}</span>` : ''}${c.representant ? `، في شخص ممثلها القانوني ${esc(c.representant)}` : ''}` : c.cin ? `، الحامل(ة) للبطاقة الوطنية رقم ${num(c.cin)}` : '، الحامل(ة) للبطاقة الوطنية رقم …………'}، العنوان: ${ou(c.adresse)}${c.ville ? ` — ${esc(c.ville)}` : ''}`
  : `${ou(nom)}، الحامل(ة) للبطاقة الوطنية رقم …………، العنوان: …………………`

const signatures = (gauche: string, droite: string) => `<table class="signature"><tr><td>${droite}</td><td style="text-align:left">${gauche}</td></tr></table>`

// ─── Page de garde ───────────────────────────────────────────────────────────
export function pageDeGarde(p: PackData): string {
  const d = p.dossier
  const audiences = p.evenements.filter((e) => e.dateAudience).map((e) => e.dateAudience!).sort().slice(-8)
  const lignesAud = [...audiences.map((a) => `<tr><td>${date(a)}</td><td></td><td></td></tr>`), ...Array.from({ length: Math.max(6, 12 - audiences.length) }, () => '<tr><td>&nbsp;</td><td></td><td></td></tr>')].join('')
  return `${entete(p.profil)}
<h1>ملف رقم <span dir="ltr">${esc(d.numeroDossier)}</span></h1>
<table>
<tr><th style="width:32%">الموكل</th><td>${ou(p.client?.nom || p.nomClient)}</td></tr>
<tr><th>الهاتف</th><td>${num(p.client?.telephone)}</td></tr>
<tr><th>صفة الموكل</th><td>${ROLE[d.roleClient]}</td></tr>
<tr><th>الخصم</th><td>${ou(p.nomAdversaire)}</td></tr>
<tr><th>المحكمة</th><td>${ou(d.tribunalAr)}</td></tr>
<tr><th>نوع القضية</th><td>${PROCEDURE[d.typeProcedure] ?? ou(d.typeProcedure)}</td></tr>
<tr><th>الموضوع</th><td>${ou(d.objet)}</td></tr>
<tr><th>تاريخ فتح الملف بالمكتب</th><td>${date(d.createdAt)}</td></tr>
<tr><th>الأتعاب المتفق عليها</th><td>${d.honorairesConvenusCentimes != null ? dh(d.honorairesConvenusCentimes) : '…………'}</td></tr>
</table>
<h2>سجل الجلسات</h2>
<table><tr><th style="width:22%">تاريخ الجلسة</th><th>الإجراء المتخذ</th><th style="width:22%">الجلسة المقبلة</th></tr>${lignesAud}</table>
<h2>الآجال الجارية</h2>
${p.echeances.length ? `<table><tr><th>الأجل</th><th style="width:22%">آخر يوم</th><th style="width:18%">على من</th></tr>${p.echeances.map((e) => `<tr><td>${esc(e.descriptionAr || e.description)}</td><td>${date(e.dateLimite)}</td><td>${e.camp === 'AGIR' ? 'علينا' : 'على الخصم'}</td></tr>`).join('')}</table>` : '<p>لا آجال جارية عند إعداد هذه الورقة.</p>'}`
}

// ─── Convention d'honoraires ─────────────────────────────────────────────────
export function conventionHonoraires(p: PackData): string {
  const d = p.dossier
  const montant = d.honorairesConvenusCentimes != null ? dh(d.honorairesConvenusCentimes) : '………………… درهم'
  const etape = d.estCourAppel ? 'المرحلة الاستئنافية' : 'المرحلة الابتدائية'
  return `${entete(p.profil)}
<h1>اتفاقية تحديد الأتعاب</h1>
<p><b>بين الموقعين أسفله:</b></p>
<p>${ou(p.profil.nom)}، المحامي ${p.profil.barreau ? `ب${esc(p.profil.barreau)}` : 'بهيئة …………'}، الكائن مكتبه ب${ou(p.profil.adresse)}، <b>(المحامي)</b>،</p>
<p><b>و</b> ${identite(p.client, p.nomClient)}، <b>(الموكل)</b>.</p>
<p><b>تم الاتفاق على ما يلي:</b></p>
<h2>البند الأول: موضوع الاتفاقية</h2>
<p>يكلّف الموكل المحامي بالنيابة عنه والدفاع عن مصالحه في الملف رقم ${num(d.numeroDossier)} المعروض على ${ou(d.tribunalAr)}${p.nomAdversaire ? `، في مواجهة ${esc(p.nomAdversaire)}` : ''}${d.objet ? `، وموضوعه: ${esc(d.objet)}` : ''}.</p>
<h2>البند الثاني: نطاق المهمة</h2>
<p>تشمل هذه الاتفاقية ${etape} إلى غاية صدور الحكم فيها. ولا تشمل مراحل الطعن والتنفيذ إلا باتفاق مكتوب جديد أو بملحق لهذه الاتفاقية.</p>
<h2>البند الثالث: الأتعاب</h2>
<p>حُددت أتعاب المحامي في مبلغ إجمالي قدره <b>${montant}</b> (المبلغ بالحروف: ……………………………………………)، ${'يُضاف إليه عند الاقتضاء الرسم على القيمة المضافة بالسعر الجاري به العمل'}.</p>
<p>تُؤدى الأتعاب كما يلي: تسبيق قدره ………………… درهم عند توقيع هذه الاتفاقية، والباقي …………………………………………… .</p>
<h2>البند الرابع: المصاريف</h2>
<p>لا تدخل في الأتعاب المصاريف القضائية والرسوم، وأتعاب المفوضين القضائيين والخبراء والتراجمة، ومصاريف التنقل خارج دائرة المحكمة. وتبقى على عاتق الموكل وتُؤدى بناءً على مبررات.</p>
<h2>البند الخامس: التزامات الطرفين</h2>
<p>يلتزم المحامي ببذل العناية اللازمة في الدفاع عن مصالح الموكل، وبالحفاظ على السر المهني، وبإخباره بمآل الملف. والتزامه التزام ببذل عناية لا بتحقيق نتيجة.</p>
<p>يلتزم الموكل بتقديم الوثائق والمعلومات الصحيحة في الوقت المناسب، وبإخبار المحامي بكل تغيير في عنوانه أو وسائل الاتصال به.</p>
<h2>البند السادس: إنهاء الاتفاقية</h2>
<p>يمكن لكل طرف إنهاء هذه الاتفاقية بإشعار كتابي، وتبقى الأتعاب مستحقة عن الأعمال المنجزة إلى تاريخ الإنهاء.</p>
<h2>البند السابع: النزاعات</h2>
<p>كل خلاف حول الأتعاب يُعرض على السيد نقيب هيئة المحامين المختصة، وفق القانون رقم 28.08 المنظم لمهنة المحاماة.</p>
${lieuDate(p)}<p>حُررت هذه الاتفاقية في نظيرين، بيد كل طرف نظير.</p>
${signatures('توقيع المحامي', 'توقيع الموكل<br><span class="petit">(مسبوق بعبارة «قرأت ووافقت»)</span>')}`
}

// ─── Procuration ─────────────────────────────────────────────────────────────
export function procuration(p: PackData): string {
  const d = p.dossier
  return `<h1>وكالة خاصة</h1>
<p>أنا الموقع(ة) أسفله: ${identite(p.client, p.nomClient)}،</p>
<p>أوكّل بمقتضى هذه الوكالة ${ou(p.profil.nom)}، المحامي ${p.profil.barreau ? `ب${esc(p.profil.barreau)}` : 'بهيئة …………'}، وأمنحه صلاحية النيابة عني والدفاع عن مصالحي في الملف رقم ${num(d.numeroDossier)} المعروض على ${ou(d.tribunalAr)}${p.nomAdversaire ? ` في مواجهة ${esc(p.nomAdversaire)}` : ''}، وفي كل ما يتفرع عنه.</p>
<p>وله في سبيل ذلك (يُشطب على ما لا يُراد منحه):</p>
<p>— تقديم المقالات والمذكرات وكل الوثائق، وحضور الجلسات والإجراءات؛</p>
<p>— ممارسة طرق الطعن العادية وغير العادية (التعرض، الاستئناف، النقض…)؛</p>
<p>— طلب التبليغ والتنفيذ وكل الإجراءات المرتبطة بهما؛</p>
<p>— الصلح والتنازل عن الدعوى أو عن الحكم؛</p>
<p>— قبض المبالغ المحكوم بها لفائدتي وتسليم التوصيل بها.</p>
${lieuDate(p)}
${signatures('', 'توقيع الموكل(ة)<br><span class="petit">(مصادق عليه لدى السلطة المختصة)</span>')}`
}

// ─── Reçu de provision ───────────────────────────────────────────────────────
export function recuProvision(p: PackData, r?: PackData['reglements'][number]): string {
  return `${entete(p.profil)}
<h1>وصل تسلّم تسبيق على الأتعاب</h1>
${r ? `<p class="petit" style="text-align:left">المرجع: <span dir="ltr">R-${esc(r.id.slice(-8).toUpperCase())}</span></p>` : ''}
<p>يشهد ${ou(p.profil.nom)}، المحامي ${p.profil.barreau ? `ب${esc(p.profil.barreau)}` : ''}، أنه تسلّم من ${ou(p.client?.nom || p.nomClient)}:</p>
<table>
<tr><th style="width:35%">المبلغ</th><td><b>${r ? dh(r.montantCentimes) : '………………… درهم'}</b></td></tr>
<tr><th>المبلغ بالحروف</th><td>……………………………………………………………</td></tr>
<tr><th>طريقة الأداء</th><td>${r ? MODE[r.mode] : 'نقداً / شيك / تحويل'}${r?.reference ? ` — رقم ${num(r.reference)}` : ''}</td></tr>
<tr><th>تاريخ الأداء</th><td>${date(r?.date)}</td></tr>
<tr><th>الملف</th><td>${num(p.dossier.numeroDossier)} — ${ou(p.dossier.tribunalAr)}</td></tr>
</table>
<p>وذلك كتسبيق على الأتعاب المتفق عليها، يُخصم من المبلغ الإجمالي عند تحرير مذكرة الأتعاب.</p>
${lieuDate(p)}
${signatures('توقيع المحامي وطابعه', '')}`
}

// ─── Bordereau de pièces ─────────────────────────────────────────────────────
export function bordereauPieces(p: PackData): string {
  const connus: string[] = []
  if (p.jugement) connus.push(`نسخة من الحكم الصادر بتاريخ ${date(p.jugement.date)}`)
  if (p.evenements.some((e) => /تبليغ/.test(e.texteArabe))) connus.push('شهادة التسليم (طي التبليغ)')
  const lignes = [...connus, ...Array.from({ length: Math.max(6, 10 - connus.length) }, () => '')]
  return `${entete(p.profil)}
<h1>حافظة مستندات</h1>
<table>
<tr><th style="width:30%">المحكمة</th><td>${ou(p.dossier.tribunalAr)}</td></tr>
<tr><th>رقم الملف</th><td>${num(p.dossier.numeroDossier)}</td></tr>
<tr><th>لفائدة</th><td>${ou(p.client?.nom || p.nomClient)}</td></tr>
<tr><th>ضد</th><td>${ou(p.nomAdversaire)}</td></tr>
</table>
<table><tr><th style="width:8%">رقم</th><th>المستند</th><th style="width:14%">عدد النسخ</th><th style="width:22%">ملاحظات</th></tr>
${lignes.map((l, i) => `<tr><td>${i + 1}</td><td>${l ? esc(l) : '&nbsp;'}</td><td></td><td></td></tr>`).join('')}</table>
${lieuDate(p)}
${signatures('الإمضاء', '')}`
}

// ─── Lettre d'information au client ──────────────────────────────────────────
export function lettreClient(p: PackData): string {
  const derniers = p.evenements.slice(0, 4)
  const agir = p.echeances.filter((e) => e.camp === 'AGIR')
  return `${entete(p.profil)}
${lieuDate(p)}
<p>إلى ${ou(p.client?.nom || p.nomClient)}<br><span class="petit">${ou(p.client?.adresse)}</span></p>
<p><b>الموضوع:</b> وضعية الملف رقم ${num(p.dossier.numeroDossier)} — ${ou(p.dossier.tribunalAr)}</p>
<p>تحية طيبة، وبعد،</p>
<p>يشرفني أن أحيطكم علماً بآخر مستجدات ملفكم المشار إليه أعلاه:</p>
${derniers.length ? `<table><tr><th style="width:22%">التاريخ</th><th>الإجراء</th></tr>${derniers.map((e) => `<tr><td>${date(e.datePublicationGreffe)}</td><td>${esc(e.texteArabe)}</td></tr>`).join('')}</table>` : '<p>لم يُسجّل أي إجراء جديد بعد.</p>'}
<p><b>الجلسة المقبلة:</b> ${p.dossier.prochaineAudience ? date(p.dossier.prochaineAudience) : 'لم تُحدّد بعد'}.</p>
${agir.length ? `<p><b>آجال جارية:</b></p>${agir.map((e) => `<p>— ${esc(e.descriptionAr || e.description)}، آخر يوم: ${date(e.dateLimite)}.</p>`).join('')}` : ''}
<p><b>المطلوب منكم:</b> ……………………………………………………………………………</p>
<p>وتفضلوا بقبول فائق التقدير والاحترام.</p>
${signatures(`${ou(p.profil.nom)}`, '')}
<p class="petit">رسالة سرية موجهة إلى الموكل وحده، مشمولة بالسر المهني.</p>`
}

// ─── Facture / note d'honoraires ─────────────────────────────────────────────
export function factureHtml(f: Pick<Facture, 'type' | 'numero' | 'statut' | 'dateEmission' | 'dateEcheance' | 'lignes' | 'tauxTva' | 'totalHtCentimes' | 'tvaCentimes' | 'totalTtcCentimes' | 'modePaiement' | 'notes'> & { factureOrigine?: { numero: string | null } | null; dossier?: { numeroDossier: string } | null }, emetteur: Partial<Profil>, client: Partial<Client>): string {
  const brouillon = f.statut === 'BROUILLON' || !f.numero
  const lignes = (f.lignes as Ligne[]).map((l) => `<tr><td>${esc(l.designation)}</td><td style="text-align:center"><span dir="ltr">${esc(l.quantite)}</span></td><td><span dir="ltr">${dh(l.prixUnitaireCentimes, false)}</span></td><td><span dir="ltr">${dh(totalLigne(l), false)}</span></td></tr>`).join('')
  return `${entete(emetteur as Profil, true)}
<h1>${TYPE_FACTURE[f.type]} ${brouillon ? '<span class="petit">(مسودة غير مرقّمة)</span>' : `رقم <span dir="ltr">${esc(f.numero)}</span>`}</h1>
${f.factureOrigine?.numero ? `<p>تلغي الفاتورة رقم <span dir="ltr">${esc(f.factureOrigine.numero)}</span>.</p>` : ''}
<table>
<tr><th style="width:30%">التاريخ</th><td>${date(f.dateEmission)}</td><th style="width:20%">أجل الأداء</th><td>${f.dateEcheance ? date(f.dateEcheance) : '—'}</td></tr>
<tr><th>الموكل</th><td colspan="3"><b>${ou(client.nom)}</b><br><span class="petit">${ou(client.adresse)}${client.ville ? ` — ${esc(client.ville)}` : ''}${client.ice ? `<br>ICE : <span dir="ltr">${esc(client.ice)}</span>` : client.cin ? `<br>ب.و.ت : <span dir="ltr">${esc(client.cin)}</span>` : ''}${client.identifiantFiscal ? ` · IF : <span dir="ltr">${esc(client.identifiantFiscal)}</span>` : ''}</span></td></tr>
${f.dossier ? `<tr><th>الملف</th><td colspan="3"><span dir="ltr">${esc(f.dossier.numeroDossier)}</span></td></tr>` : ''}
</table>
<table><tr><th>البيان</th><th style="width:10%">الكمية</th><th style="width:20%">الثمن دون رسوم (درهم)</th><th style="width:20%">المجموع دون رسوم (درهم)</th></tr>${lignes}
<tr class="total"><td colspan="3">المجموع دون احتساب الرسوم</td><td><span dir="ltr">${dh(f.totalHtCentimes, false)}</span></td></tr>
<tr class="total"><td colspan="3">الرسم على القيمة المضافة (<span dir="ltr">${esc(f.tauxTva)}%</span>)</td><td><span dir="ltr">${dh(f.tvaCentimes, false)}</span></td></tr>
<tr class="total"><td colspan="3">المجموع مع احتساب الرسوم</td><td><span dir="ltr">${dh(f.totalTtcCentimes, false)}</span></td></tr></table>
<p>حُصرت هذه ${f.type === 'FACTURE' ? 'الفاتورة' : f.type === 'AVOIR' ? 'الفاتورة المضادة' : 'المذكرة'} في مبلغ: ${dh(f.totalTtcCentimes)} (بالحروف: ……………………………………………).</p>
${f.modePaiement ? `<p>طريقة الأداء: ${esc(f.modePaiement)}</p>` : ''}
${emetteur.rib ? `<p>الحساب البنكي (RIB): <span dir="ltr">${esc(emetteur.rib)}</span>${emetteur.banque ? ` — ${esc(emetteur.banque)}` : ''}</p>` : ''}
${f.notes ? `<p class="petit">${esc(f.notes)}</p>` : ''}
${signatures('التوقيع والطابع', '')}
${emetteur.piedPage ? `<p class="petit" style="text-align:center">${esc(emetteur.piedPage)}</p>` : ''}`
}

/** Note d'honoraires du dossier : la dernière émise, sinon un projet non numéroté (convenu − déjà réglé). */
export function noteHonorairesProjet(p: PackData): string {
  const regle = p.reglements.reduce((s, r) => s + r.montantCentimes, 0)
  const convenu = p.dossier.honorairesConvenusCentimes ?? 0
  const lignes: Ligne[] = [{ designation: `أتعاب النيابة والدفاع في الملف رقم ${p.dossier.numeroDossier} — ${p.dossier.tribunalAr}`, quantite: 1, prixUnitaireCentimes: convenu }]
  return factureHtml({
    type: 'NOTE_HONORAIRES', numero: null, statut: 'BROUILLON', dateEmission: new Date().toISOString(), dateEcheance: null, lignes, tauxTva: 0,
    totalHtCentimes: convenu, tvaCentimes: 0, totalTtcCentimes: convenu,
    modePaiement: null, notes: regle ? `سبق أداء ${dh(regle)} كتسبيق، يُخصم من هذا المبلغ. مشروع للمراجعة: يُرقّم ويُصدر من صفحة الفوترة.` : 'مشروع للمراجعة: يُرقّم ويُصدر من صفحة الفوترة.',
    dossier: { numeroDossier: p.dossier.numeroDossier },
  }, p.profil, p.client ?? { nom: p.nomClient })
}

export interface DocAdministratif { cle: string; titre: string; description: string; html: () => string }

/** Liste des documents administratifs du pack, dans l'ordre d'usage. */
export function documentsAdministratifs(p: PackData): DocAdministratif[] {
  const provisions = p.reglements.filter((r) => !r.factureId)
  return [
    { cle: 'garde', titre: 'ورقة غلاف الملف', description: 'الأطراف، المحكمة، سجل الجلسات والآجال', html: () => pageDeGarde(p) },
    { cle: 'convention', titre: 'اتفاقية تحديد الأتعاب', description: p.dossier.honorairesConvenusCentimes != null ? `المبلغ المتفق عليه: ${dh(p.dossier.honorairesConvenusCentimes)}` : 'أدخلوا الأتعاب في الملف لملء المبلغ', html: () => conventionHonoraires(p) },
    { cle: 'procuration', titre: 'وكالة خاصة', description: 'من الموكل إلى المحامي، للمصادقة على التوقيع', html: () => procuration(p) },
    { cle: 'recu', titre: 'وصل تسلّم تسبيق', description: provisions.length ? `آخر تسبيق: ${dh(provisions[0].montantCentimes)}` : 'نموذج فارغ للملء', html: () => recuProvision(p, provisions[0]) },
    { cle: 'bordereau', titre: 'حافظة مستندات', description: 'لائحة المرفقات المرقّمة', html: () => bordereauPieces(p) },
    { cle: 'lettre', titre: 'رسالة إخبار الموكل', description: 'آخر الإجراءات، الجلسة المقبلة والآجال', html: () => lettreClient(p) },
    { cle: 'honoraires', titre: 'مذكرة الأتعاب', description: 'مشروع غير مرقّم من الأتعاب المتفق عليها', html: () => noteHonorairesProjet(p) },
  ]
}

/** Nom de fichier sûr : « ورقة غلاف الملف - 2026-1201-55.doc ». */
export function nomFichier(titre: string, numero: string) {
  return `${titre} - ${numero.replace(/\//g, '-')}.doc`.replace(/[\\/:*?"<>|]/g, '')
}

/** Texte brut produit par l'IA (titres « # », gras « ** ») → corps HTML pour Word. */
export function texteVersHtml(titre: string, texte: string): string {
  const corps = texte.split('\n').map((l) => {
    const h = l.match(/^(#{1,3})\s+(.*)$/)
    if (h) return `<h2>${esc(h[2].replace(/\*\*/g, ''))}</h2>`
    if (!l.trim()) return '<p>&nbsp;</p>'
    return `<p>${esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-*•]\s+(.*)$/, '— $1')}</p>`
  }).join('')
  return `<h1>${esc(titre)}</h1>${corps}`
}
