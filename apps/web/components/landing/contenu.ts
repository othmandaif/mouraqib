// Textes de la landing en deux langues (arabe = / , français = /fr).
// Prix : copie de apps/api/src/services/abonnements/offres.ts (source de vérité). Les changer aux deux endroits.
// Pas de faux témoignages ni de chiffres inventés.

export type Langue = 'ar' | 'fr'

/** Fonctions annoncées mais pas encore livrées : badge « قريباً / Bientôt ». Passer à false à la mise en ligne. */
export const BIENTOT = { crm: true, horsLigne: true }

export const PRIX = {
  solo: { mois: 290, fondateur: 149 },
  cabinet: { mois: 790, fondateur: 449, utilisateurs: 5 },
  moisPayesParAn: 10, // paiement annuel : 10 mois payés pour 12
  essaiJours: 30,
  essaiFondateurMois: 3,
  placesFondateurs: 50,
}

type Paire = { pb: string; pbDetail: string; sol: string; solDetail: string; icone: string; bientot?: boolean }
type Carte = { icone: string; titre: string; texte: string; bientot?: boolean; large?: boolean }
type Offre = { id: 'solo' | 'cabinet' | 'surMesure'; nom: string; pour: string; inclus: string[]; cta: string; populaire?: boolean }

export type Contenu = {
  lang: Langue; dir: 'rtl' | 'ltr'; autreLangue: { href: string; label: string; court: string }
  nav: { probleme: string; fonctions: string; donnees: string; tarifs: string; faq: string; connexion: string }
  hero: { badge: string; titre1: string; titre2: string; sousTitre: string; ctaEssai: string; ctaDemo: string; confiance: string[] }
  mock: { titre: string; acte: string; ia: string; delai: string; question: string; reponse: string; source: string; wa: string; waTexte: string; agir: string; surveiller: string }
  bientot: string
  pb: { pastille: string; titre: string; sousTitre: string; motPb: string; motSol: string; paires: Paire[] }
  fonctions: { pastille: string; titre: string; sousTitre: string; cartes: Carte[] }
  crm: { pastille: string; titre: string; texte: string; points: string[]; fiche: { nom: string; type: string; dossiers: string; honoraires: string; regle: string; reste: string; dernier: string; conflit: string } }
  donnees: { pastille: string; titre: string; texte: string; options: { titre: string; texte: string; pour: string; bientot?: boolean }[]; dossierBureau: string; fichiers: string[]; synchro: string }
  tarifs: {
    pastille: string; titre: string; sousTitre: string; mensuel: string; annuel: string; economie: string
    parMois: string; parAn: string; dh: string; fondateurBadge: (r: number | null) => string; fondateurNote: string; prixNormal: string
    parJour: (p: number) => string; surDevis: string; surDevisNote: string; offres: Offre[]
    tousInclus: string; garanties: string[]; utilisateurs: (n: number) => string
  }
  compare: { titre: string; sans: string; avec: string; lignes: [string, string, string][] }
  faq: { titre: string; sousTitre: string; items: { q: string; r: string }[] }
  fin: { titre: string; texte: string }
  pied: { slogan: string; liens: [string, string][]; droits: string }
  wa: { demo: string; fondateur: string; devis: string }
  avertissement: string
}

export const AR: Contenu = {
  lang: 'ar', dir: 'rtl', autreLangue: { href: '/fr', label: 'Français', court: 'FR' },
  nav: { probleme: 'المشاكل والحلول', fonctions: 'المزايا', donnees: 'بياناتكم', tarifs: 'الأسعار', faq: 'الأسئلة', connexion: 'الدخول' },
  hero: {
    badge: 'برنامج المحامي المغربي · سحابة أو على حاسوبكم',
    titre1: 'مكتبكم كاملاً في مكان واحد.',
    titre2: 'ولا أجل يفوتكم بعد اليوم.',
    sousTitre: 'ملفاتي يتابع ملفاتكم على محاكم، يحسب آجال الطعن، ينبّهكم على واتساب، ويجمع موكليكم ووثائقكم في مكان واحد. على الهاتف، على الحاسوب، وحتى بدون إنترنت.',
    ctaEssai: 'جرّبوا مجاناً 30 يوماً',
    ctaDemo: 'عرض مجاني على واتساب',
    confiance: ['بدون بطاقة بنكية', 'لا نطلب حسابكم على محاكم', 'بياناتكم ملككم، تصدّرونها متى شئتم'],
  },
  mock: {
    titre: 'إجراء جديد على محاكم', acte: '«صدر الحكم وتم تبليغه للطرف المدعى عليه»', ia: 'الذكاء الاصطناعي: تبليغ حكم', delai: 'أجل الاستئناف',
    question: 'متى ينتهي أجل الاستئناف في هذا الملف؟', reponse: 'ثلاثون يوماً من تاريخ التبليغ. آخر أجل:', source: 'قانون المسطرة المدنية',
    wa: 'واتساب · ملفاتي', waTexte: 'بقي يومان على أجل الاستئناف في الملف', agir: 'عليكم', surveiller: 'على الخصم',
  },
  bientot: 'قريباً',
  pb: {
    pastille: 'يوم المحامي', titre: 'نعرف يومكم. لهذا صنعنا ملفاتي.', sousTitre: 'ثماني مشاكل يعيشها كل محامٍ في المغرب، وجواب واضح لكل واحدة.', motPb: 'المشكلة', motSol: 'مع ملفاتي',
    paires: [
      { icone: 'search', pb: 'تفتحون محاكم ملفاً ملفاً، كل يوم', pbDetail: 'ساعة أو أكثر يومياً للبحث عن تأجيل أو حكم جديد.', sol: 'نتابع كل ملفاتكم تلقائياً', solDetail: 'عدة مرات في اليوم. لا نخبركم إلا عندما يتحرك ملف.' },
      { icone: 'clock', pb: 'أجل طعن يمرّ دون انتباه', pbDetail: 'تبليغ لم يُلاحظ، فيضيع حق الموكل وتُثار مسؤوليتكم.', sol: 'الأجل محسوب وتنبيه على واتساب', solDetail: 'قبل 7 أيام، ثم قبل 48 ساعة، ثم صباح آخر يوم.' },
      { icone: 'calendar', pb: 'الجلسات في المذكرة والهاتف والرسائل', pbDetail: 'لا مكان واحد يجمع كل الجلسات، والخطأ في التاريخ وارد.', sol: 'أجندة واحدة تمتلئ وحدها', solDetail: 'من محاكم مباشرة، مع ملخص كل صباح على واتساب.' },
      { icone: 'phone', pb: '«فين وصل الملف ديالي؟»', pbDetail: 'الموكلون يتصلون طوال اليوم، والمعلومة متفرقة.', sol: 'ملف كل موكل في شاشة واحدة', solDetail: 'ملفاته، آخر إجراء، وملخص جاهز ترسلونه له في ثانية.', bientot: true },
      { icone: 'wallet', pb: 'أتعاب غير مؤدّاة لا يتابعها أحد', pbDetail: 'التسبيقات والباقي في دفتر أو في الذاكرة.', sol: 'الأتعاب والتسبيقات والباقي', solDetail: 'لكل موكل ولكل ملف، مع تذكير عند التأخر.', bientot: true },
      { icone: 'folder', pb: 'وثائق في الورق وواتساب وقرص USB', pbDetail: 'البحث عن مقال أو حكم يأخذ وقتاً، والضياع وارد.', sol: 'مجلد لكل ملف على سطح المكتب', solDetail: 'مرتب تلقائياً، قابل للبحث، ومحفوظ في نسخة احتياطية.', bientot: true },
      { icone: 'wifi', pb: 'لا إنترنت في المحكمة', pbDetail: 'تحتاجون معلومة الملف أمام القاضي، والشبكة مقطوعة.', sol: 'يعمل بدون إنترنت', solDetail: 'كل ملفاتكم على حاسوبكم، وتتزامن عند عودة الاتصال.', bientot: true },
      { icone: 'pen', pb: 'نفس المعطيات تُكتب في كل مقال', pbDetail: 'الأطراف ورقم الملف والمحكمة… والبحث في النصوص يأخذ ساعات.', sol: 'مسودات جاهزة ومساعد قانوني', solDetail: 'مقالات من معطيات الملف، وأجوبة مع فصول القانون المغربي.' },
    ],
  },
  fonctions: {
    pastille: 'كل المزايا', titre: 'كل ما يحتاجه مكتبكم، في برنامج واحد', sousTitre: 'كل المزايا متوفرة في كل العروض. لا خيارات مخفية.',
    cartes: [
      { icone: 'search', titre: 'متابعة محاكم تلقائياً', texte: 'المحاكم الابتدائية ومحاكم الاستئناف. يكفي رقم الملف: لا نطلب حسابكم.', large: true },
      { icone: 'clock', titre: 'آجال «عليكم» و«على الخصم»', texte: 'ما عليكم بلون وزر إجراء. آجال الخصم تحت المراقبة دون إزعاج.' },
      { icone: 'bell', titre: 'تنبيهات واتساب', texte: 'دون أسماء الأطراف، مع ساعات هدوء تختارونها.' },
      { icone: 'users', titre: 'إدارة الموكلين (CRM)', texte: 'بطاقة الموكل، ملفاته، الأتعاب، سجل التواصل، وكشف تعارض المصالح.', bientot: true, large: true },
      { icone: 'sparkles', titre: 'مساعد قانوني بالعربية', texte: 'أجوبة مع الإحالة على النصوص، لتتحققوا بأنفسكم.' },
      { icone: 'file', titre: 'تحرير المقالات والإنذارات', texte: 'من معطيات الملف، ثم تحميل بصيغة Word.' },
      { icone: 'laptop', titre: 'تطبيق الحاسوب بدون إنترنت', texte: 'وثائقكم في مجلد على سطح المكتب، ونسخة احتياطية يومية.', bientot: true, large: true },
      { icone: 'team', titre: 'فريق المكتب', texte: 'محامون، متمرنون، كتابة: كل واحد بدوره وصلاحياته.' },
      { icone: 'shield', titre: 'سرّية وأمان', texte: 'اتصال مشفّر، تحقق بخطوتين، ولا نشارك بياناتكم مع أحد.' },
    ],
  },
  crm: {
    pastille: 'جديد · إدارة الموكلين', titre: 'موكلوكم، ملفاتهم، وأتعابكم في شاشة واحدة',
    texte: 'كل ما يخص الموكل في بطاقة واحدة: لا بحث في الدفاتر ولا في الرسائل.',
    points: ['بطاقة الموكل: شخص أو شركة، الهاتف، العنوان، الوثائق', 'كل ملفاته مرتبطة تلقائياً بمحاكم', 'الأتعاب: المتفق عليه، التسبيقات، الباقي', 'سجل المكالمات والمواعيد والرسائل', 'كشف تعارض المصالح قبل قبول ملف جديد', 'ملخص وضعية الملف جاهز للإرسال إلى الموكل'],
    fiche: { nom: 'شركة الأطلس للتوزيع', type: 'شركة · موكل منذ 2024', dossiers: 'ملفات نشطة', honoraires: 'الأتعاب', regle: 'مؤدّى', reste: 'الباقي', dernier: 'آخر تواصل: مكالمة، أمس', conflit: 'لا تعارض مصالح' },
  },
  donnees: {
    pastille: 'بياناتكم', titre: 'بياناتكم حيث تريدون',
    texte: 'السر المهني ليس تفصيلاً. اختاروا أين تُحفظ ملفاتكم ووثائقكم.',
    options: [
      { titre: 'في السحابة', texte: 'من الهاتف والحاسوب، في أي مكان. اتصال مشفّر ونسخ احتياطية.', pour: 'للمحامي المتنقل' },
      { titre: 'على حاسوبكم', texte: 'تطبيق للحاسوب يعمل بدون إنترنت. الوثائق في مجلد على سطح المكتب.', pour: 'لمن يريد بياناته عنده', bientot: true },
      { titre: 'الاثنان معاً', texte: 'تعملون بدون إنترنت، والتزامن يتم وحده عند عودة الاتصال.', pour: 'الأكثر أماناً وراحة', bientot: true },
    ],
    dossierBureau: 'سطح المكتب ‹ ملفاتي ‹ 2026-1801-77', fichiers: ['مقال افتتاحي.docx', 'الحكم الابتدائي.pdf', 'محضر التبليغ.pdf'], synchro: 'متزامن · يعمل بدون إنترنت',
  },
  tarifs: {
    pastille: 'الأسعار', titre: 'أسعار واضحة، كل المزايا مشمولة', sousTitre: 'نفس البرنامج للجميع. يتغير فقط عدد المستعملين والمرافقة.',
    mensuel: 'شهري', annuel: 'سنوي', economie: 'شهران مجاناً',
    parMois: 'درهم / شهر', parAn: 'درهم / سنة', dh: 'درهم',
    fondateurBadge: (r) => r === null ? 'سعر الأعضاء المؤسسين' : `سعر المؤسسين · تبقّى ${r} من 50`,
    fondateurNote: '3 أشهر مجاناً، ثم هذا السعر ثابت مدى الحياة',
    prixNormal: 'بدل',
    parJour: (p) => `أي حوالي ${p} دراهم في اليوم`,
    surDevis: 'حسب الطلب', surDevisNote: 'تثبيت على خوادم مكتبكم أو عدد كبير من المستعملين',
    utilisateurs: (n) => `حتى ${n} مستعملين`,
    offres: [
      { id: 'solo', nom: 'فردي', pour: 'للمحامي المستقل', inclus: ['مستعمل واحد', 'ملفات غير محدودة', 'كل المزايا: محاكم، آجال، واتساب، ذكاء اصطناعي، موكلون، تطبيق الحاسوب', 'دعم على واتساب'], cta: 'جرّبوا مجاناً' },
      { id: 'cabinet', nom: 'مكتب', pour: 'للمكاتب والشركاء', populaire: true, inclus: ['حتى 5 مستعملين (محامون وكتابة)', 'ملفات غير محدودة', 'كل مزايا «فردي»', 'أدوار وصلاحيات لكل عضو', 'مستشار يضيف ملفاتكم الأولى معكم'], cta: 'جرّبوا مجاناً' },
      { id: 'surMesure', nom: 'مكتب+ / تثبيت محلي', pour: 'للمكاتب الكبيرة', inclus: ['مستعملون بلا حد', 'تثبيت على خوادمكم داخل المكتب', 'نقل بياناتكم القديمة من Excel وغيره', 'تكوين الفريق في المكتب', 'دعم ذو أولوية'], cta: 'اطلبوا عرض سعر' },
    ],
    tousInclus: 'مشمول في كل العروض',
    garanties: ['30 يوماً تجربة مجانية', 'بدون بطاقة بنكية', 'بدون التزام: توقفون متى شئتم', 'تصدير كل بياناتكم في أي وقت', 'الأداء بالتحويل أو الشيك'],
  },
  compare: {
    titre: 'قبل ملفاتي وبعده', sans: 'اليوم', avec: 'مع ملفاتي',
    lignes: [
      ['متابعة محاكم', 'يدوياً، ملفاً ملفاً', 'تلقائياً، عدة مرات يومياً'],
      ['آجال الطعن', 'حساب يدوي', 'محسوبة مع تنبيه واتساب'],
      ['الموكلون والأتعاب', 'دفتر وإكسيل', 'بطاقة واحدة لكل موكل'],
      ['الوثائق', 'ورق، واتساب، USB', 'مجلد مرتب لكل ملف'],
      ['بدون إنترنت', 'لا شيء', 'كل الملفات على الحاسوب'],
      ['المقالات', 'من الصفر كل مرة', 'مسودة من معطيات الملف'],
    ],
  },
  faq: {
    titre: 'الأسئلة الشائعة', sousTitre: 'أجوبة عن أكثر ما يسأل عنه المحامون قبل البدء.',
    items: [
      { q: 'كم الثمن بالضبط؟', r: 'فردي 290 درهماً في الشهر، ومكتب 790 درهماً في الشهر حتى 5 مستعملين. الأعضاء المؤسسون (أول 50) يحصلون على 3 أشهر مجاناً ثم 149 أو 449 درهماً ثابتة مدى الحياة. الأداء السنوي: 10 أشهر بدل 12.' },
      { q: 'هل تحتاجون إلى حسابي على محاكم؟', r: 'لا. يكفي رقم الملف والمحكمة: نقرأ المعطيات العمومية كما تظهر على بوابة محاكم.' },
      { q: 'كيف تُحسب الآجال؟', r: 'حسب قانون المسطرة المدنية، انطلاقاً من الإجراءات المنشورة (حكم، تبليغ…). نختار دائماً التاريخ الأقرب احتياطاً. التنبيه وسيلة مساعدة، ويبقى التحقق النهائي من الأجل للمحامي.' },
      { q: 'هل يعمل بدون إنترنت؟', r: 'تطبيق الحاسوب (قريباً) يحفظ ملفاتكم ووثائقكم على جهازكم ويعمل بدون إنترنت. تحتاجون الاتصال فقط لمتابعة محاكم وإرسال التنبيهات، والتزامن يتم وحده.' },
      { q: 'أين تُحفظ وثائقي؟', r: 'كما تختارون: في السحابة، أو في مجلد «ملفاتي» على سطح مكتب حاسوبكم (قريباً)، أو في الاثنين. ملف لكل قضية، مرتب تلقائياً.' },
      { q: 'هل بياناتي محمية؟', r: 'الاتصال مشفّر، كلمات المرور محفوظة بشكل آمن، والتحقق بخطوتين متاح. لا نشارك بياناتكم مع أي طرف، وتُعالَج وفق القانون 09.08. ولا ترسل تنبيهات واتساب أسماء الأطراف.' },
      { q: 'ماذا يحدث إذا توقفت عن الاشتراك؟', r: 'تصدّرون كل بياناتكم متى شئتم. وحتى عند انتهاء الاشتراك، تبقى تنبيهات الآجال تصلكم خلال مهلة السماح.' },
      { q: 'كيف أبدأ؟', r: 'سجّلوا في دقيقة: نتصل بكم خلال يوم عمل، نفعّل الحساب، ويضيف معكم مستشارنا ملفاتكم الأولى. التجربة مجانية 30 يوماً.' },
    ],
  },
  fin: { titre: 'لا تتركوا أجلاً للصدفة.', texte: 'ملفاتكم تحت المراقبة من الليلة. التجربة مجانية 30 يوماً.' },
  pied: { slogan: 'برنامج المحامي المغربي: متابعة محاكم، آجال الطعن، الموكلون والوثائق.', liens: [['#المشاكل', 'المشاكل والحلول'], ['#المزايا', 'المزايا'], ['#الأسعار', 'الأسعار'], ['#الأسئلة', 'الأسئلة'], ['/register', 'التسجيل'], ['/login', 'الدخول']], droits: 'كل الحقوق محفوظة' },
  wa: { demo: 'السلام عليكم، أنا محامٍ وأريد عرضاً مجانياً لملفاتي.', fondateur: 'السلام عليكم، أريد حجز مقعد ضمن الأعضاء المؤسسين في ملفاتي.', devis: 'السلام عليكم، أريد عرض سعر لعرض مكتب+ أو التثبيت المحلي.' },
  avertissement: 'ملفاتي أداة مساعدة: الحساب والتنبيه لا يعوّضان تحقق المحامي من الأجل.',
}

export const FR: Contenu = {
  lang: 'fr', dir: 'ltr', autreLangue: { href: '/', label: 'العربية', court: 'ع' },
  nav: { probleme: 'Problèmes', fonctions: 'Fonctions', donnees: 'Vos données', tarifs: 'Tarifs', faq: 'FAQ', connexion: 'Connexion' },
  hero: {
    badge: 'Le logiciel de l’avocat marocain · cloud ou sur votre PC',
    titre1: 'Tout votre cabinet au même endroit.',
    titre2: 'Et plus aucun délai manqué.',
    sousTitre: 'MalafiPro suit vos dossiers sur mahakim, calcule vos délais de recours, vous prévient sur WhatsApp et réunit vos clients et vos documents. Sur mobile, sur ordinateur, et même sans internet.',
    ctaEssai: 'Essai gratuit 30 jours',
    ctaDemo: 'Démo gratuite sur WhatsApp',
    confiance: ['Sans carte bancaire', 'Pas besoin de votre compte mahakim', 'Vos données vous appartiennent, exportables à tout moment'],
  },
  mock: {
    titre: 'Nouvel acte sur mahakim', acte: '« صدر الحكم وتم تبليغه للطرف المدعى عليه »', ia: 'IA : notification de jugement', delai: 'Délai d’appel',
    question: 'Quand expire le délai d’appel dans ce dossier ?', reponse: 'Trente jours à compter de la notification. Date limite :', source: 'Code de procédure civile',
    wa: 'WhatsApp · MalafiPro', waTexte: 'Plus que 2 jours pour faire appel, dossier', agir: 'À vous', surveiller: 'À l’adversaire',
  },
  bientot: 'Bientôt',
  pb: {
    pastille: 'Le quotidien de l’avocat', titre: 'On connaît vos journées. C’est pour ça qu’on a créé MalafiPro.', sousTitre: 'Huit problèmes que vit chaque avocat au Maroc, et une réponse claire pour chacun.', motPb: 'Le problème', motSol: 'Avec MalafiPro',
    paires: [
      { icone: 'search', pb: 'Ouvrir mahakim dossier par dossier, chaque jour', pbDetail: 'Une heure ou plus par jour à chercher un renvoi ou un jugement.', sol: 'Tous vos dossiers suivis automatiquement', solDetail: 'Plusieurs fois par jour. On vous prévient seulement quand un dossier bouge.' },
      { icone: 'clock', pb: 'Un délai de recours qui passe inaperçu', pbDetail: 'Une notification ratée, le droit du client perdu, votre responsabilité engagée.', sol: 'Délai calculé, alerte WhatsApp', solDetail: '7 jours avant, puis 48 h avant, puis le matin du dernier jour.' },
      { icone: 'calendar', pb: 'Audiences dans l’agenda, le téléphone, les messages', pbDetail: 'Aucun endroit unique. Une erreur de date est vite arrivée.', sol: 'Un agenda qui se remplit seul', solDetail: 'Directement depuis mahakim, avec un résumé chaque matin sur WhatsApp.' },
      { icone: 'phone', pb: '« Où en est mon dossier ? »', pbDetail: 'Les clients appellent toute la journée, l’information est éparpillée.', sol: 'Chaque client sur un seul écran', solDetail: 'Ses dossiers, le dernier acte, et un point prêt à lui envoyer en une seconde.', bientot: true },
      { icone: 'wallet', pb: 'Des honoraires impayés que personne ne suit', pbDetail: 'Provisions et reliquats notés dans un cahier, ou de mémoire.', sol: 'Honoraires, provisions, reste à payer', solDetail: 'Par client et par dossier, avec rappel en cas de retard.', bientot: true },
      { icone: 'folder', pb: 'Documents sur papier, WhatsApp et clé USB', pbDetail: 'Retrouver une requête ou un jugement prend du temps, et on perd des pièces.', sol: 'Un dossier par affaire sur votre bureau', solDetail: 'Rangé automatiquement, consultable, sauvegardé.', bientot: true },
      { icone: 'wifi', pb: 'Pas d’internet au tribunal', pbDetail: 'Vous avez besoin du dossier devant le juge, et le réseau ne passe pas.', sol: 'Fonctionne sans internet', solDetail: 'Tous vos dossiers sur votre PC, synchronisés au retour de la connexion.', bientot: true },
      { icone: 'pen', pb: 'Les mêmes informations retapées à chaque acte', pbDetail: 'Parties, numéro, tribunal… et des heures de recherche juridique.', sol: 'Brouillons prêts et assistant juridique', solDetail: 'Actes générés depuis le dossier, réponses citant les textes marocains.' },
    ],
  },
  fonctions: {
    pastille: 'Toutes les fonctions', titre: 'Tout ce dont votre cabinet a besoin, dans un seul logiciel', sousTitre: 'Toutes les fonctions sont incluses dans toutes les offres. Aucune option cachée.',
    cartes: [
      { icone: 'search', titre: 'Suivi mahakim automatique', texte: 'Tribunaux de première instance et cours d’appel. Le numéro du dossier suffit : pas besoin de votre compte.', large: true },
      { icone: 'clock', titre: 'Délais « à vous » et « à l’adversaire »', texte: 'Vos délais en couleur avec un bouton d’action. Ceux de l’adversaire sous surveillance, sans bruit.' },
      { icone: 'bell', titre: 'Alertes WhatsApp', texte: 'Sans le nom des parties, avec des heures calmes que vous choisissez.' },
      { icone: 'users', titre: 'Gestion des clients (CRM)', texte: 'Fiche client, dossiers liés, honoraires, historique des échanges et détection des conflits d’intérêts.', bientot: true, large: true },
      { icone: 'sparkles', titre: 'Assistant juridique en arabe', texte: 'Des réponses qui citent les textes, pour vérifier vous-même.' },
      { icone: 'file', titre: 'Rédaction des actes', texte: 'Requêtes et mises en demeure depuis le dossier, export Word.' },
      { icone: 'laptop', titre: 'Application PC hors ligne', texte: 'Vos documents dans un dossier sur le bureau, sauvegarde quotidienne.', bientot: true, large: true },
      { icone: 'team', titre: 'Équipe du cabinet', texte: 'Avocats, stagiaires, secrétariat : chacun son rôle et ses droits.' },
      { icone: 'shield', titre: 'Confidentialité et sécurité', texte: 'Connexion chiffrée, double authentification, aucune donnée partagée.' },
    ],
  },
  crm: {
    pastille: 'Nouveau · Gestion des clients', titre: 'Vos clients, leurs dossiers et vos honoraires sur un seul écran',
    texte: 'Tout ce qui concerne un client sur une seule fiche : fini les cahiers et les messages éparpillés.',
    points: ['Fiche client : personne ou société, téléphone, adresse, pièces', 'Tous ses dossiers liés automatiquement à mahakim', 'Honoraires : convenu, provisions, reste à payer', 'Historique des appels, rendez-vous et messages', 'Détection des conflits d’intérêts avant d’accepter un dossier', 'Point d’avancement prêt à envoyer au client'],
    fiche: { nom: 'Atlas Distribution SARL', type: 'Société · cliente depuis 2024', dossiers: 'Dossiers actifs', honoraires: 'Honoraires', regle: 'Réglé', reste: 'Reste', dernier: 'Dernier échange : appel, hier', conflit: 'Aucun conflit d’intérêts' },
  },
  donnees: {
    pastille: 'Vos données', titre: 'Vos données, là où vous le voulez',
    texte: 'Le secret professionnel n’est pas un détail. Choisissez où sont gardés vos dossiers et vos documents.',
    options: [
      { titre: 'Dans le cloud', texte: 'Sur mobile et PC, partout. Connexion chiffrée et sauvegardes.', pour: 'Pour l’avocat mobile' },
      { titre: 'Sur votre PC', texte: 'Une application qui marche sans internet. Les documents dans un dossier sur le bureau.', pour: 'Pour garder ses données chez soi', bientot: true },
      { titre: 'Les deux', texte: 'Vous travaillez hors ligne, la synchronisation se fait seule au retour du réseau.', pour: 'Le plus sûr et le plus pratique', bientot: true },
    ],
    dossierBureau: 'Bureau › MalafiPro › 2026-1801-77', fichiers: ['Requête introductive.docx', 'Jugement 1re instance.pdf', 'PV de notification.pdf'], synchro: 'Synchronisé · fonctionne hors ligne',
  },
  tarifs: {
    pastille: 'Tarifs', titre: 'Des prix clairs, toutes les fonctions incluses', sousTitre: 'Le même logiciel pour tous. Seuls le nombre d’utilisateurs et l’accompagnement changent.',
    mensuel: 'Mensuel', annuel: 'Annuel', economie: '2 mois offerts',
    parMois: 'DH / mois', parAn: 'DH / an', dh: 'DH',
    fondateurBadge: (r) => r === null ? 'Prix membres fondateurs' : `Prix fondateurs · ${r} places sur 50`,
    fondateurNote: '3 mois offerts, puis ce prix bloqué à vie',
    prixNormal: 'au lieu de',
    parJour: (p) => `soit environ ${p} DH par jour`,
    surDevis: 'Sur devis', surDevisNote: 'Installation sur les serveurs du cabinet ou nombreux utilisateurs',
    utilisateurs: (n) => `Jusqu’à ${n} utilisateurs`,
    offres: [
      { id: 'solo', nom: 'Solo', pour: 'Pour l’avocat indépendant', inclus: ['1 utilisateur', 'Dossiers illimités', 'Toutes les fonctions : mahakim, délais, WhatsApp, IA, clients, application PC', 'Support WhatsApp'], cta: 'Essai gratuit' },
      { id: 'cabinet', nom: 'Cabinet', pour: 'Pour les cabinets et associés', populaire: true, inclus: ['Jusqu’à 5 utilisateurs (avocats et secrétariat)', 'Dossiers illimités', 'Tout le plan Solo', 'Rôles et droits par membre', 'Un conseiller ajoute vos premiers dossiers avec vous'], cta: 'Essai gratuit' },
      { id: 'surMesure', nom: 'Cabinet+ / installation locale', pour: 'Pour les grands cabinets', inclus: ['Utilisateurs illimités', 'Installation sur vos serveurs, au cabinet', 'Reprise de vos anciennes données (Excel…)', 'Formation de l’équipe sur place', 'Support prioritaire'], cta: 'Demander un devis' },
    ],
    tousInclus: 'Inclus dans toutes les offres',
    garanties: ['30 jours d’essai gratuit', 'Sans carte bancaire', 'Sans engagement : arrêtez quand vous voulez', 'Export de toutes vos données à tout moment', 'Paiement par virement ou chèque'],
  },
  compare: {
    titre: 'Avant et après MalafiPro', sans: 'Aujourd’hui', avec: 'Avec MalafiPro',
    lignes: [
      ['Suivi mahakim', 'À la main, dossier par dossier', 'Automatique, plusieurs fois par jour'],
      ['Délais de recours', 'Calcul manuel', 'Calculés, alerte WhatsApp'],
      ['Clients et honoraires', 'Cahier et Excel', 'Une fiche par client'],
      ['Documents', 'Papier, WhatsApp, clé USB', 'Un dossier rangé par affaire'],
      ['Sans internet', 'Rien', 'Tous les dossiers sur le PC'],
      ['Actes', 'Repartir de zéro', 'Brouillon depuis le dossier'],
    ],
  },
  faq: {
    titre: 'Questions fréquentes', sousTitre: 'Les réponses aux questions que posent les avocats avant de commencer.',
    items: [
      { q: 'Combien ça coûte, exactement ?', r: 'Solo : 290 DH par mois. Cabinet : 790 DH par mois jusqu’à 5 utilisateurs. Les membres fondateurs (les 50 premiers) ont 3 mois offerts, puis 149 ou 449 DH bloqués à vie. En annuel : 10 mois payés au lieu de 12.' },
      { q: 'Avez-vous besoin de mon compte mahakim ?', r: 'Non. Le numéro du dossier et le tribunal suffisent : nous lisons les informations publiques affichées sur mahakim.' },
      { q: 'Comment les délais sont-ils calculés ?', r: 'Selon le Code de procédure civile, à partir des actes publiés (jugement, notification…). Nous retenons toujours la date la plus prudente. L’alerte est une aide : la vérification finale du délai reste celle de l’avocat.' },
      { q: 'Ça marche sans internet ?', r: 'L’application PC (bientôt) garde vos dossiers et documents sur votre ordinateur et fonctionne hors ligne. La connexion sert seulement au suivi mahakim et à l’envoi des alertes ; la synchronisation est automatique.' },
      { q: 'Où sont stockés mes documents ?', r: 'Comme vous voulez : dans le cloud, dans un dossier « MalafiPro » sur le bureau de votre PC (bientôt), ou les deux. Un dossier par affaire, rangé automatiquement.' },
      { q: 'Mes données sont-elles protégées ?', r: 'Connexion chiffrée, mots de passe protégés, double authentification disponible. Aucune donnée partagée avec des tiers, traitement conforme à la loi 09-08. Les alertes WhatsApp ne contiennent jamais le nom des parties.' },
      { q: 'Et si j’arrête mon abonnement ?', r: 'Vous exportez toutes vos données quand vous voulez. Même après la fin de l’abonnement, les alertes de délais continuent pendant la période de grâce.' },
      { q: 'Comment commencer ?', r: 'Inscrivez-vous en une minute : nous vous appelons sous un jour ouvré, nous activons le compte et notre conseiller ajoute vos premiers dossiers avec vous. Essai gratuit de 30 jours.' },
    ],
  },
  fin: { titre: 'Ne laissez plus aucun délai au hasard.', texte: 'Vos dossiers surveillés dès ce soir. Essai gratuit de 30 jours.' },
  pied: { slogan: 'Le logiciel de l’avocat marocain : suivi mahakim, délais de recours, clients et documents.', liens: [['#problemes', 'Problèmes'], ['#fonctions', 'Fonctions'], ['#tarifs', 'Tarifs'], ['#faq', 'FAQ'], ['/register', 'Inscription'], ['/login', 'Connexion']], droits: 'Tous droits réservés' },
  wa: { demo: 'Bonjour, je suis avocat et je souhaite une démo gratuite de MalafiPro.', fondateur: 'Bonjour, je souhaite réserver une place de membre fondateur MalafiPro.', devis: 'Bonjour, je souhaite un devis pour l’offre Cabinet+ ou l’installation locale.' },
  avertissement: 'MalafiPro est un outil d’aide : le calcul et l’alerte ne remplacent pas la vérification du délai par l’avocat.',
}

/** Ancres des sections (en arabe sur /, en français sur /fr). */
export const ANCRES: Record<Langue, { pb: string; fonctions: string; donnees: string; tarifs: string; faq: string }> = {
  ar: { pb: 'المشاكل', fonctions: 'المزايا', donnees: 'بياناتكم', tarifs: 'الأسعار', faq: 'الأسئلة' },
  fr: { pb: 'problemes', fonctions: 'fonctions', donnees: 'donnees', tarifs: 'tarifs', faq: 'faq' },
}
