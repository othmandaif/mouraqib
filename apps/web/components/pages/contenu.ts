// Pages « fonction » en deux langues. Chaque texte a été rédigé pour sa langue (pas de traduction mot à mot) et ne décrit
// que ce qui existe dans le code (vérifié le 31/10/2026) : pas de chiffre inventé, pas de témoignage, pas de texte de loi.
// Aucun délai légal n'est cité tant que le moteur de délais n'a pas été validé par un avocat (voir claude/SEO_RECHERCHE_MOTS_CLES.md).
// Les prix et l'essai gratuit viennent de ./landing/contenu.ts (PRIX), copie de apps/api/src/services/abonnements/offres.ts.
import type { Langue } from '@/components/landing/contenu'
import type { PageId } from '@/lib/pagesPubliques'

export type Bloc = {
  h2: string
  intro?: string
  cartes?: { h3: string; texte: string }[]
  puces?: string[]
  image?: { src: string; alt: string; w: number; h: number; legende: string }
}
export type Page = {
  nav: string // libellé court (liens, fil d'Ariane)
  resume: string // une ligne pour la section « en détail » de la landing
  titre: string // ≤ 60 caractères
  description: string // ≤ 160 caractères
  h1: string
  pastille: string
  lead: string
  blocs: Bloc[]
  limites: { h2: string; puces: string[] }
  faq: { q: string; r: string }[]
  voir: PageId[]
}

export const UI: Record<Langue, {
  accueil: string; voirAussi: string; faq: string; essai: string; demo: string; cta: string; ctaTexte: string
  hubTitre: string; hubTexte: string; avertissement: string; tarifs: string; menu: string; plus: string
}> = {
  ar: {
    accueil: 'ملفاتي', voirAussi: 'اطّلعوا أيضاً على', faq: 'أسئلة شائعة', essai: 'جرّبوا مجاناً 20 يوماً', demo: 'عرض مجاني على واتساب',
    cta: 'جرّبوا ملفاتي على ملفاتكم', ctaTexte: 'التجربة مجانية 20 يوماً، ونساعدكم على إضافة ملفاتكم الأولى.',
    hubTitre: 'تعرّفوا على كل مزية بالتفصيل', hubTexte: 'صفحة لكل حاجة من حاجات مكتبكم، بما يفعله ملفاتي فعلاً وبحدوده.',
    avertissement: 'ملفاتي أداة مساعدة: الحساب والتنبيه لا يعوّضان تحقق المحامي من الأجل.', tarifs: 'الأسعار', menu: 'القائمة', plus: 'التفاصيل',
  },
  fr: {
    accueil: 'MalafiPro', voirAussi: 'À voir aussi', faq: 'Questions fréquentes', essai: 'Essai gratuit 20 jours', demo: 'Démo gratuite sur WhatsApp',
    cta: 'Essayez MalafiPro sur vos propres dossiers', ctaTexte: 'L’essai est gratuit pendant 20 jours, et nous vous aidons à ajouter vos premiers dossiers.',
    hubTitre: 'Chaque fonction en détail', hubTexte: 'Une page par besoin du cabinet : ce que MalafiPro fait réellement, et ses limites.',
    avertissement: 'MalafiPro est un outil d’aide : le calcul et l’alerte ne remplacent pas la vérification du délai par l’avocat.', tarifs: 'Tarifs', menu: 'Menu', plus: 'En savoir plus',
  },
}

export const PAGES: Record<PageId, Record<Langue, Page>> = {
  // ───────────────────────────── Suivi mahakim ─────────────────────────────
  suivi: {
    fr: {
      nav: 'Suivi mahakim',
      resume: 'Vos dossiers relus sur mahakim plusieurs fois par jour, sans ouvrir le portail.',
      titre: 'Suivi automatique des dossiers mahakim | MalafiPro',
      description: 'MalafiPro consulte mahakim à votre place : numéro de dossier et tribunal suffisent. Nouvel acte, délai à vérifier, alerte WhatsApp. Essai gratuit 20 jours.',
      h1: 'Ne consultez plus mahakim dossier par dossier',
      pastille: 'Suivi des dossiers',
      lead: 'MalafiPro lit à votre place les informations publiques de vos dossiers sur le portail mahakim et vous signale chaque nouvel acte. Vous saisissez le numéro du dossier et le tribunal : aucun compte mahakim à confier.',
      blocs: [
        {
          h2: 'Pourquoi le suivi manuel coûte du temps',
          intro: 'Quand on plaide devant plusieurs juridictions, vérifier chaque dossier à la main revient à ouvrir le portail des dizaines de fois par semaine. Un renvoi ou une notification publiés en fin de journée peuvent passer inaperçus, alors qu’ils peuvent déplacer une audience ou faire courir un délai.',
        },
        {
          h2: 'Comment MalafiPro suit un dossier',
          cartes: [
            { h3: 'Vous ajoutez le dossier', texte: 'Numéro du dossier et tribunal, c’est tout. Le suivi couvre les tribunaux de première instance et les cours d’appel.' },
            { h3: 'La vérification est automatique', texte: 'Chaque dossier est relu au moins une fois par jour, et plus souvent quand l’enjeu monte : délai proche, jugement récent ou audience prochaine.' },
            { h3: 'Chaque acte est lu et classé', texte: 'Jugement, ordonnance, mise en délibéré, renvoi, notification : MalafiPro identifie le type d’acte et en tire, quand c’est possible, un délai à surveiller.' },
            { h3: 'Vous êtes prévenu', texte: 'L’alerte arrive dans l’application et sur WhatsApp, selon vos réglages.' },
          ],
        },
        {
          h2: 'Les délais « à vous » et ceux de l’adversaire',
          intro: 'Indiquez si votre client est demandeur ou défendeur. MalafiPro sépare alors les délais qui courent contre vous, mis en avant avec un bouton d’action, de ceux de la partie adverse, que vous gardez à l’œil sans être sollicité.',
        },
      ],
      limites: {
        h2: 'Ce que le suivi ne fait pas',
        puces: [
          'Il lit ce que le portail affiche : si mahakim est indisponible ou n’a pas encore publié un acte, MalafiPro ne peut pas le voir. Pour un acte urgent, vérifiez aussi sur le portail.',
          'Le délai affiché est une aide au suivi, calculé à partir des actes publiés. La vérification de la date reste celle de l’avocat.',
          'Seuls les dossiers que vous ajoutez sont suivis.',
        ],
      },
      faq: [
        { q: 'Faut-il donner mon compte mahakim ?', r: 'Non. Le numéro du dossier et le tribunal suffisent : MalafiPro lit les informations publiques affichées sur le portail.' },
        { q: 'À quelle fréquence mes dossiers sont-ils vérifiés ?', r: 'Au moins une fois par jour, et plusieurs fois par jour pour les dossiers à enjeu. Ces fréquences peuvent évoluer.' },
        { q: 'Quels actes sont détectés ?', r: 'Jugements, ordonnances, mises en délibéré, renvois (simples, pour expertise ou pour notification), notifications et significations.' },
        { q: 'Mes collaborateurs voient-ils les mêmes dossiers ?', r: 'Oui, avec l’offre Cabinet : l’équipe partage les dossiers, chaque membre selon les droits que le responsable lui accorde.' },
        { q: 'Combien de temps dure l’essai ?', r: '20 jours, gratuits. Vous pouvez y ajouter vos propres dossiers.' },
      ],
      voir: ['alertes', 'clients', 'assistant'],
    },
    ar: {
      nav: 'متابعة محاكم',
      resume: 'ملفاتكم تُفحص على بوابة محاكم عدة مرات في اليوم، دون أن تفتحوها.',
      titre: 'متابعة ملفات محاكم تلقائياً للمحامي | ملفاتي',
      description: 'ملفاتي يتابع ملفاتكم على بوابة محاكم بدل أن تفتحوها واحداً واحداً: يكفي رقم الملف والمحكمة، ويصلكم تنبيه عند أي إجراء جديد. تجربة مجانية 20 يوماً.',
      h1: 'لا تفتحوا بوابة محاكم ملفاً ملفاً: ملفاتي يتابعها عنكم',
      pastille: 'متابعة الملفات',
      lead: 'ملفاتي يقرأ عنكم المعطيات العمومية لملفاتكم في بوابة محاكم ويخبركم بكل إجراء جديد. تُدخلون رقم الملف والمحكمة فقط، دون تسليم حسابكم في محاكم لأي جهة.',
      blocs: [
        {
          h2: 'لماذا تأخذ المتابعة اليدوية كل هذا الوقت',
          intro: 'من يترافع أمام عدة محاكم يفتح البوابة عشرات المرات في الأسبوع. وقد يُنشر تأجيل أو تبليغ في آخر النهار فيمرّ دون أن يُلاحَظ، مع أنه قد يغيّر موعد الجلسة أو يبدأ معه أجل.',
        },
        {
          h2: 'كيف يتابع ملفاتي ملفاً من ملفاتكم',
          cartes: [
            { h3: 'تضيفون الملف', texte: 'رقم الملف والمحكمة، لا غير. تشمل المتابعة المحاكم الابتدائية ومحاكم الاستئناف.' },
            { h3: 'الفحص يتم وحده', texte: 'يُعاد فحص كل ملف مرة في اليوم على الأقل، ويتكرر أكثر كلما ارتفع الرهان: أجل قريب، أو حكم حديث، أو جلسة وشيكة.' },
            { h3: 'كل إجراء يُقرأ ويُصنَّف', texte: 'حكم، أمر، حجز للمداولة، تأجيل، تبليغ: يتعرّف ملفاتي على نوع الإجراء ويستخرج منه عند الإمكان أجلاً تراقبونه.' },
            { h3: 'ويصلكم التنبيه', texte: 'في التطبيق وعلى واتساب، حسب إعداداتكم.' },
          ],
        },
        {
          h2: 'آجال «عليكم» وآجال «على الخصم»',
          intro: 'حدّدوا ما إذا كان موكلكم مدعياً أو مدعى عليه. فيفصل ملفاتي الآجال التي تسري ضدكم، وتظهر مع زر للإجراء، عن آجال الخصم التي تبقى تحت المراقبة دون إزعاجكم.',
        },
      ],
      limites: {
        h2: 'ما لا يفعله ملفاتي',
        puces: [
          'يقرأ ما تعرضه البوابة: إن تعذّر الولوج إلى محاكم أو لم يُنشر الإجراء بعد، لا يستطيع ملفاتي رؤيته. في الإجراء المستعجل، تحقّقوا أيضاً في البوابة نفسها.',
          'الأجل المعروض وسيلة مساعدة تُحسب من الإجراءات المنشورة، ويبقى التحقق النهائي من التاريخ للمحامي.',
          'لا تُتابَع إلا الملفات التي تضيفونها.',
        ],
      },
      faq: [
        { q: 'هل أحتاج إلى تسليم حسابي في محاكم؟', r: 'لا. يكفي رقم الملف والمحكمة، ونقرأ المعطيات العمومية كما تظهر في البوابة.' },
        { q: 'كم مرة تُفحص ملفاتي؟', r: 'مرة في اليوم على الأقل، وعدة مرات في اليوم للملفات التي فيها رهان. وقد تتغير هذه الوتيرة.' },
        { q: 'ما الإجراءات التي يتعرّف عليها؟', r: 'الأحكام والأوامر، وحجز الملف للمداولة، والتأجيلات (العادي أو لإجراء خبرة أو للتبليغ)، والتبليغات.' },
        { q: 'هل يرى زملائي في المكتب الملفات نفسها؟', r: 'نعم، مع عرض «مكتب» يتقاسم الفريق الملفات، وكل عضو بحسب الصلاحيات التي يمنحها له المسؤول.' },
        { q: 'كم تدوم التجربة المجانية؟', r: '20 يوماً، ويمكنكم إضافة ملفاتكم الحقيقية خلالها.' },
      ],
      voir: ['alertes', 'clients', 'assistant'],
    },
  },

  // ───────────────────────────── Alertes WhatsApp et agenda ─────────────────────────────
  alertes: {
    fr: {
      nav: 'Alertes WhatsApp',
      resume: 'Un message avant chaque audience et chaque délai, avec des heures calmes.',
      titre: 'Alertes WhatsApp pour audiences et délais | MalafiPro',
      description: 'Recevez sur WhatsApp l’alerte d’une audience ou d’un délai qui approche, avec des heures calmes que vous choisissez. Agenda inclus. Essai gratuit 20 jours.',
      h1: 'Une alerte WhatsApp avant chaque audience et chaque délai',
      pastille: 'Alertes et agenda',
      lead: 'MalafiPro vous prévient sur WhatsApp et dans l’application quand un acte apparaît, qu’une audience approche ou qu’un délai court. Vous choisissez quoi recevoir, où, et à quelle heure.',
      blocs: [
        {
          h2: 'Ce que vous recevez',
          cartes: [
            { h3: 'Un nouvel acte', texte: 'Jugement, audience ou autre événement détecté sur mahakim : le message donne le numéro du dossier et le tribunal.' },
            { h3: 'Un nouveau délai', texte: 'Quand MalafiPro calcule un délai à partir d’un acte, vous en êtes informé.' },
            { h3: 'Des rappels avant l’échéance', texte: 'Par défaut à 7, 3 et 1 jours, puis le jour même. Vous pouvez modifier ces rappels, jusqu’à six.' },
            { h3: 'L’alerte des 48 dernières heures', texte: 'Elle est toujours active : elle ne peut pas être désactivée, et elle passe même pendant vos heures calmes.' },
            { h3: 'Le point du matin', texte: 'Un résumé quotidien : les délais du jour, les dossiers qui ont bougé et les renvois détectés. Par défaut à 7 h.' },
          ],
        },
        {
          h2: 'Vous gardez la main',
          intro: 'Pour chaque type d’alerte (nouvel acte, jugement, audience, nouveau délai, délais de l’adversaire), vous choisissez WhatsApp, l’application, ou les deux.',
          puces: [
            'Heures calmes : de 21 h à 7 h par défaut, vous pouvez changer la plage. Les messages WhatsApp sont mis en attente puis envoyés ensuite.',
            'Les délais de l’adversaire restent visibles dans l’application, sans message WhatsApp par défaut.',
            'Votre numéro est vérifié par un code reçu sur WhatsApp avant tout envoi.',
          ],
        },
        {
          h2: 'Des messages discrets',
          intro: 'Les messages WhatsApp portent le numéro du dossier et le tribunal, pas le nom des parties. Chaque alerte est aussi conservée dans l’application, au cas où un message n’arriverait pas.',
        },
        {
          h2: 'L’agenda des audiences et des délais',
          intro: 'Une vue par semaine ou par mois rassemble vos audiences, vos délais (à vous ou à l’adversaire) et les rendez-vous que vous ajoutez, sur ordinateur comme sur mobile.',
          image: { src: '/landing/app-agenda-1200.webp', alt: 'Agenda des audiences et délais sur PC et mobile', w: 1200, h: 800, legende: 'L’agenda : audiences, délais et rendez-vous' },
        },
      ],
      limites: {
        h2: 'Ce qu’il faut savoir',
        puces: [
          'Une alerte WhatsApp n’est envoyée qu’à un numéro vérifié. Sans vérification, les alertes restent dans l’application.',
          'Les alertes sont une aide : elles ne remplacent pas votre propre vérification des délais.',
        ],
      },
      faq: [
        { q: 'Les alertes WhatsApp révèlent-elles le nom de mes clients ?', r: 'Non : le message donne le numéro du dossier et le tribunal, sans le nom des parties.' },
        { q: 'Puis-je couper les alertes la nuit ?', r: 'Oui. Les heures calmes sont réglables ; seule l’alerte des 48 dernières heures avant un délai à agir passe quand même.' },
        { q: 'Que contient le point du matin ?', r: 'Les délais du jour, le nombre de dossiers qui ont bougé et les renvois détectés. Vous pouvez le désactiver ou changer son heure.' },
        { q: 'Les délais de l’adversaire déclenchent-ils des messages ?', r: 'Par défaut ils apparaissent dans l’application sans message WhatsApp. Vous pouvez changer ce réglage.' },
        { q: 'Que se passe-t-il si je n’ai pas vérifié mon numéro ?', r: 'Aucun message WhatsApp n’est envoyé, mais les alertes restent visibles dans l’application. Le code de vérification se demande depuis vos paramètres.' },
      ],
      voir: ['suivi', 'assistant', 'clients'],
    },
    ar: {
      nav: 'تنبيهات واتساب',
      resume: 'رسالة قبل كل جلسة وكل أجل، وبساعات هدوء تختارونها.',
      titre: 'تنبيهات واتساب للجلسات والآجال | ملفاتي',
      description: 'تنبيه على واتساب قبل الجلسة وقبل آخر أجل، بساعات هدوء تختارونها، مع أجندة للجلسات. جرّبوا ملفاتي مجاناً 20 يوماً.',
      h1: 'تنبيه على واتساب قبل كل جلسة وقبل كل أجل',
      pastille: 'التنبيهات والأجندة',
      lead: 'ينبّهكم ملفاتي على واتساب وفي التطبيق حين يظهر إجراء جديد، أو تقترب جلسة، أو يسري أجل. وأنتم تحدّدون ما تتلقونه، وأين، وفي أي ساعة.',
      blocs: [
        {
          h2: 'ما الذي يصلكم',
          cartes: [
            { h3: 'إجراء جديد', texte: 'حكم أو جلسة أو أي إجراء آخر يُرصد في محاكم: تتضمن الرسالة رقم الملف والمحكمة.' },
            { h3: 'أجل جديد', texte: 'حين يحسب ملفاتي أجلاً انطلاقاً من إجراء، يخبركم به.' },
            { h3: 'تذكيرات قبل الأجل', texte: 'افتراضياً قبل 7 أيام و3 أيام ويوم واحد، ثم يوم الأجل نفسه. ويمكنكم تغييرها، حتى ستة تذكيرات.' },
            { h3: 'تنبيه الـ48 ساعة الأخيرة', texte: 'يعمل دائماً ولا يمكن إيقافه، ويصلكم حتى خلال ساعات الهدوء.' },
            { h3: 'نظرة الصباح', texte: 'ملخص يومي بآجال اليوم والملفات التي تحرّكت والتأجيلات المرصودة. افتراضياً عند السابعة صباحاً.' },
          ],
        },
        {
          h2: 'الاختيار بيدكم',
          intro: 'لكل نوع من التنبيهات (إجراء جديد، حكم، جلسة، أجل جديد، آجال الخصم) تختارون واتساب أو التطبيق أو الاثنين معاً.',
          puces: [
            'ساعات الهدوء: من 21:00 إلى 07:00 افتراضياً، ويمكنكم تغيير المدة. تبقى رسائل واتساب في الانتظار ثم تُرسل بعدها.',
            'آجال الخصم تظهر في التطبيق، دون رسالة واتساب افتراضياً.',
            'يُتحقق من رقمكم برمز يصلكم على واتساب قبل أي إرسال.',
          ],
        },
        {
          h2: 'رسائل تحفظ سرّية الموكلين',
          intro: 'تحمل رسائل واتساب رقم الملف والمحكمة، دون أسماء الأطراف. وكل تنبيه يُحفظ أيضاً داخل التطبيق، تحسباً لأي رسالة لا تصل.',
        },
        {
          h2: 'أجندة الجلسات والآجال',
          intro: 'عرض بالأسبوع أو بالشهر يجمع جلساتكم وآجالكم (عليكم أو على الخصم) والمواعيد التي تضيفونها، على الحاسوب وعلى الهاتف.',
          image: { src: '/landing/app-agenda-1200.webp', alt: 'أجندة الجلسات والآجال على الحاسوب والهاتف', w: 1200, h: 800, legende: 'الأجندة: الجلسات والآجال والمواعيد' },
        },
      ],
      limites: {
        h2: 'ما يجب أن تعرفوه',
        puces: [
          'لا تُرسل رسائل واتساب إلا إلى رقم تم التحقق منه. وبدون التحقق، تبقى التنبيهات داخل التطبيق.',
          'التنبيهات وسيلة مساعدة، ولا تعوّض تحقّقكم الشخصي من الآجال.',
        ],
      },
      faq: [
        { q: 'هل تكشف رسائل واتساب أسماء موكليّ؟', r: 'لا. تتضمن الرسالة رقم الملف والمحكمة فقط، دون أسماء الأطراف.' },
        { q: 'هل يمكنني إيقاف التنبيهات ليلاً؟', r: 'نعم، ساعات الهدوء قابلة للتعديل. ويستثنى فقط تنبيه الـ48 ساعة الأخيرة قبل أجل يلزمكم التحرك فيه.' },
        { q: 'ماذا تتضمن نظرة الصباح؟', r: 'آجال اليوم، وعدد الملفات التي تحرّكت، والتأجيلات المرصودة. ويمكنكم إيقافها أو تغيير ساعتها.' },
        { q: 'هل تُرسل رسائل عن آجال الخصم؟', r: 'افتراضياً تظهر في التطبيق دون رسالة واتساب، ويمكنكم تغيير هذا الإعداد.' },
        { q: 'ماذا لو لم أتحقق من رقمي؟', r: 'لا تُرسل أي رسالة واتساب، لكن التنبيهات تبقى ظاهرة داخل التطبيق. ويُطلب رمز التحقق من الإعدادات.' },
      ],
      voir: ['suivi', 'assistant', 'clients'],
    },
  },

  // ───────────────────────────── Gestion des clients ─────────────────────────────
  clients: {
    fr: {
      nav: 'Gestion des clients',
      resume: 'Fiche client, dossiers liés, historique, et contrôle des noms proches avant d’accepter une affaire.',
      titre: 'Gestion des clients d’un cabinet d’avocat | MalafiPro',
      description: 'Fiche client, dossiers liés, historique des échanges et signal en cas de nom proche d’un client ou d’un adversaire. Pour avocats seuls et cabinets.',
      h1: 'Chaque client, ses dossiers et vos échanges au même endroit',
      pastille: 'Gestion des clients',
      lead: 'MalafiPro réunit pour chaque client sa fiche, ses dossiers, l’historique de vos échanges et ses factures. Avant d’accepter une nouvelle affaire, un contrôle des noms proches vous aide à repérer un possible conflit d’intérêts.',
      blocs: [
        {
          h2: 'Une fiche par client',
          cartes: [
            { h3: 'Identité et coordonnées', texte: 'Personne ou société : nom ou raison sociale, CIN, ICE, registre de commerce, représentant, téléphone, e-mail et adresse.' },
            { h3: 'Dossiers liés', texte: 'Rattachez les dossiers au client : vous retrouvez sur un seul écran tout ce que vous traitez pour lui.' },
            { h3: 'Historique des échanges', texte: 'Consignez vos échanges avec le client pour retrouver l’historique d’un coup d’œil avant de le rappeler.' },
            { h3: 'Factures et règlements', texte: 'Les factures et les règlements du client sont rattachés à sa fiche.' },
          ],
          image: { src: '/landing/ecran-client.webp', alt: 'Écran fiche client : dossiers, factures, règlements', w: 1048, h: 1106, legende: 'La fiche client : dossiers, factures et règlements' },
        },
        {
          h2: 'Un contrôle avant d’accepter une affaire',
          intro: 'Saisissez un nom, trois lettres au minimum : MalafiPro cherche parmi vos clients et parmi les adversaires de vos dossiers les noms proches, et vous montre les dossiers concernés.',
          puces: [
            'Il porte sur les clients et les dossiers de votre équipe.',
            'C’est un signal, pas une décision : c’est à l’avocat d’apprécier s’il existe un conflit.',
          ],
        },
        {
          h2: 'Pour un cabinet à plusieurs',
          intro: 'L’offre Cabinet accueille jusqu’à cinq utilisateurs : avocats, secrétariat, associé gérant. Chacun a un rôle, et le responsable peut retirer certains droits, comme celui de supprimer ou d’archiver des dossiers, aux membres de son choix.',
        },
      ],
      limites: {
        h2: 'Ce que le contrôle ne fait pas',
        puces: [
          'Il repose sur ce que vous avez saisi : un client ou un adversaire jamais enregistré ne peut pas être trouvé.',
          'Il n’applique aucune règle de déontologie à votre place.',
        ],
      },
      faq: [
        { q: 'Comment fonctionne la détection de conflit ?', r: 'En saisissant un nom, vous voyez les clients et les adversaires de vos dossiers dont le nom est proche, avec les dossiers concernés.' },
        { q: 'Puis-je lier un client à plusieurs dossiers ?', r: 'Oui, et vous pouvez retirer un lien sans supprimer ni le client ni le dossier.' },
        { q: 'Mes collaborateurs voient-ils tous mes clients ?', r: 'Les clients et les dossiers sont partagés au sein de l’équipe du cabinet ; chaque membre agit selon les droits qui lui sont accordés.' },
        { q: 'Puis-je exporter mes données ?', r: 'Oui. Vous pouvez demander l’export de vos données depuis votre compte.' },
      ],
      voir: ['facturation', 'suivi', 'actes'],
    },
    ar: {
      nav: 'إدارة الموكلين',
      resume: 'بطاقة لكل موكل بملفاته وسجل تواصله، وفحص الأسماء المتقاربة قبل قبول قضية.',
      titre: 'برنامج إدارة الموكلين للمحامي | ملفاتي',
      description: 'بطاقة لكل موكل بملفاته وسجل التواصل معه وفواتيره، وتنبيه عند وجود اسم قريب من موكل أو خصم في ملفاتكم. للمحامي المنفرد وللمكتب.',
      h1: 'كل موكل بملفاته وسجل التواصل معه في مكان واحد',
      pastille: 'إدارة الموكلين',
      lead: 'يجمع ملفاتي لكل موكل بطاقته وملفاته وسجل تواصلكم معه وفواتيره. وقبل قبول قضية جديدة، يساعدكم فحص الأسماء المتقاربة على رصد احتمال تعارض المصالح.',
      blocs: [
        {
          h2: 'بطاقة لكل موكل',
          cartes: [
            { h3: 'الهوية ومعلومات الاتصال', texte: 'شخص ذاتي أو شركة: الاسم أو التسمية، بطاقة التعريف، رقم التعريف الموحد للمقاولة، السجل التجاري، الممثل، الهاتف، البريد والعنوان.' },
            { h3: 'ملفات مرتبطة بالموكل', texte: 'اربطوا الملفات بموكلها، فتجدون في شاشة واحدة كل ما تتولونه من أجله.' },
            { h3: 'سجل التواصل', texte: 'دوّنوا مراسلاتكم مع الموكل لتطّلعوا على تاريخها بنظرة واحدة قبل الاتصال به.' },
            { h3: 'الفواتير والأداءات', texte: 'تُربط فواتير الموكل وأداءاته ببطاقته.' },
          ],
          image: { src: '/landing/ecran-client.webp', alt: 'شاشة بطاقة الموكل: الملفات والفواتير والأداءات', w: 1048, h: 1106, legende: 'بطاقة الموكل: الملفات والفواتير والأداءات' },
        },
        {
          h2: 'فحص قبل قبول القضية',
          intro: 'اكتبوا اسماً من ثلاثة أحرف فأكثر، فيبحث ملفاتي بين موكليكم وبين خصوم ملفاتكم عن الأسماء المتقاربة، ويعرض لكم الملفات المعنية.',
          puces: [
            'يشمل الفحص موكلي فريقكم وملفاته.',
            'هو إشارة وليس قراراً: للمحامي وحده تقدير وجود تعارض من عدمه.',
          ],
        },
        {
          h2: 'لمكتب فيه أكثر من محامٍ',
          intro: 'يستقبل عرض «مكتب» حتى خمسة مستعملين: محامون وكتابة وشريك مسيّر. لكل واحد دوره، وللمسؤول أن يسحب بعض الصلاحيات، كحذف الملفات أو أرشفتها، ممن يشاء.',
        },
      ],
      limites: {
        h2: 'ما لا يفعله الفحص',
        puces: [
          'يعتمد على ما أدخلتموه: موكل أو خصم لم يُسجَّل من قبل لا يمكن العثور عليه.',
          'لا يطبّق أي قاعدة من قواعد أخلاقيات المهنة نيابة عنكم.',
        ],
      },
      faq: [
        { q: 'كيف يعمل كشف التعارض؟', r: 'عند كتابة اسم، تظهر لكم الأسماء القريبة منه بين الموكلين وخصوم الملفات، مع الملفات المعنية.' },
        { q: 'هل أربط موكلاً بعدة ملفات؟', r: 'نعم، ويمكنكم فك الربط دون حذف الموكل ولا الملف.' },
        { q: 'هل يرى زملائي كل موكليّ؟', r: 'يُتقاسم الموكلون والملفات داخل فريق المكتب، وكل عضو يتصرف بحسب الصلاحيات الممنوحة له.' },
        { q: 'هل يمكنني تصدير بياناتي؟', r: 'نعم، يمكنكم طلب تصدير بياناتكم من حسابكم.' },
      ],
      voir: ['facturation', 'suivi', 'actes'],
    },
  },

  // ───────────────────────────── Facturation et honoraires ─────────────────────────────
  facturation: {
    fr: {
      nav: 'Facturation',
      resume: 'Factures numérotées, avoirs, règlements et synthèse de ce qui reste à encaisser.',
      titre: 'Facturation et suivi des honoraires d’avocat | MalafiPro',
      description: 'Factures numérotées, règlements et reste à payer par client et par dossier. Suivez vos honoraires sans cahier ni tableur. Essai gratuit 20 jours.',
      h1: 'Vos honoraires, factures et règlements, client par client',
      pastille: 'Facturation',
      lead: 'MalafiPro prépare vos factures et notes d’honoraires, enregistre les règlements et les provisions, et vous montre ce qui reste à encaisser.',
      blocs: [
        {
          h2: 'De la facture au règlement',
          cartes: [
            { h3: 'Un en-tête à votre nom', texte: 'Renseignez une fois votre identité professionnelle : barreau, adresse, ICE, identifiant fiscal, taxe professionnelle, RIB et pied de page. Elle figure sur chaque facture.' },
            { h3: 'Brouillon, puis émission', texte: 'Vous préparez la facture en brouillon, puis vous l’émettez : le numéro est attribué à ce moment, dans une série annuelle continue.' },
            { h3: 'Une facture émise ne se modifie pas', texte: 'Pour la corriger, vous l’annulez par un avoir : la trace reste claire.' },
            { h3: 'Totaux calculés', texte: 'Montants hors taxes, TVA et TTC sont calculés à partir des lignes de la facture.' },
            { h3: 'Règlements et provisions', texte: 'Chaque paiement est enregistré et rattaché à une facture, ou conservé comme provision non imputée.' },
          ],
          image: { src: '/landing/ecran-facture.webp', alt: 'Écran facture numérotée avec règlements', w: 1048, h: 1202, legende: 'Une facture numérotée avec ses règlements' },
        },
        {
          h2: 'Savoir ce qui reste à encaisser',
          intro: 'La synthèse de l’année montre ce que vous avez facturé, ce que vous avez encaissé et ce qui reste impayé, mois par mois, avec la liste des factures non soldées.',
        },
        {
          h2: 'Du dossier à la facture',
          intro: 'La convention d’honoraires, le reçu de provision et la note d’honoraires se préparent depuis le dossier de travail. C’est la fonction de rédaction d’actes, décrite sur une page à part.',
        },
      ],
      limites: {
        h2: 'Ce qu’il faut savoir',
        puces: [
          'Les mentions obligatoires d’une facture dépendent de votre situation fiscale : faites-les valider par votre comptable avant d’émettre vos premières factures.',
          'MalafiPro ne tient pas votre comptabilité : il suit vos factures et vos encaissements.',
        ],
      },
      faq: [
        { q: 'Puis-je corriger une facture déjà émise ?', r: 'Non : une facture émise ne se modifie pas. On l’annule par un avoir, puis on en émet une nouvelle si nécessaire.' },
        { q: 'La numérotation est-elle automatique ?', r: 'Oui. Le numéro est attribué à l’émission, dans une série annuelle continue propre à votre cabinet.' },
        { q: 'Mon secrétariat peut-il annuler une facture ?', r: 'L’annulation d’une facture et la suppression d’un règlement exigent le droit de suppression, que le responsable du cabinet peut retirer à un membre.' },
        { q: 'Puis-je facturer une société ?', r: 'Oui : la fiche client prévoit l’ICE, le registre de commerce et l’identifiant fiscal d’une société.' },
        { q: 'Comment suivre les provisions ?', r: 'Un règlement non rattaché à une facture est conservé comme provision non imputée, visible dans la synthèse.' },
      ],
      voir: ['clients', 'actes', 'alertes'],
    },
    ar: {
      nav: 'الفوترة',
      resume: 'فواتير مرقمة وفواتير دائنة وأداءات، وخلاصة لما بقي للتحصيل.',
      titre: 'فواتير المحامي وتتبع الأتعاب | ملفاتي',
      description: 'فواتير مرقمة وتسبيقات وباقٍ للأداء لكل موكل ولكل ملف، لتتبعوا أتعابكم دون دفتر أو جدول. تجربة مجانية 20 يوماً.',
      h1: 'أتعابكم وفواتيركم وأداءات موكليكم في مكان واحد',
      pastille: 'الفوترة',
      lead: 'يُعدّ ملفاتي فواتيركم ومذكرات أتعابكم، ويسجّل الأداءات والتسبيقات، ويريكم ما بقي للتحصيل.',
      blocs: [
        {
          h2: 'من الفاتورة إلى الأداء',
          cartes: [
            { h3: 'ترويسة باسمكم', texte: 'تُدخلون هويتكم المهنية مرة واحدة: الهيئة، العنوان، رقم التعريف الموحد للمقاولة، المعرّف الجبائي، الضريبة المهنية، الحساب البنكي وتذييل الصفحة. وتظهر في كل فاتورة.' },
            { h3: 'مسودة ثم إصدار', texte: 'تُعدّون الفاتورة مسودةً ثم تُصدرونها: يُمنح الرقم عند الإصدار ضمن سلسلة سنوية متصلة.' },
            { h3: 'الفاتورة الصادرة لا تُعدَّل', texte: 'لتصحيحها تُلغونها بفاتورة دائنة، فيبقى الأثر واضحاً.' },
            { h3: 'مجاميع محسوبة', texte: 'تُحسب المبالغ دون احتساب الرسوم، والضريبة على القيمة المضافة، والمبلغ الإجمالي من بنود الفاتورة.' },
            { h3: 'الأداءات والتسبيقات', texte: 'يُسجَّل كل أداء ويُربط بفاتورة، أو يُحفظ كتسبيق غير مخصَّص بعد.' },
          ],
          image: { src: '/landing/ecran-facture.webp', alt: 'شاشة فاتورة مرقمة مع الأداءات', w: 1048, h: 1202, legende: 'فاتورة مرقمة مع أداءاتها' },
        },
        {
          h2: 'اعرفوا ما بقي للتحصيل',
          intro: 'تعرض خلاصة السنة ما فوترتموه وما حصّلتموه وما بقي غير مؤدّى، شهراً بشهر، مع لائحة الفواتير غير المسدّدة.',
        },
        {
          h2: 'من الملف إلى الفاتورة',
          intro: 'تُعدّ اتفاقية الأتعاب ووصل التسبيق ومذكرة الأتعاب من ملف العمل. وهذه من وظائف تحرير الوثائق، وتجدونها في صفحة مستقلة.',
        },
      ],
      limites: {
        h2: 'ما يجب أن تعرفوه',
        puces: [
          'البيانات الإلزامية في الفاتورة تتوقف على وضعكم الجبائي، فاعرضوها على محاسبكم قبل إصدار أولى فواتيركم.',
          'ملفاتي لا يمسك محاسبتكم: هو يتتبع فواتيركم وتحصيلاتكم.',
        ],
      },
      faq: [
        { q: 'هل أصحّح فاتورة صدرت؟', r: 'لا، الفاتورة الصادرة لا تُعدَّل. تُلغى بفاتورة دائنة، ثم تُصدر فاتورة جديدة عند الحاجة.' },
        { q: 'هل الترقيم تلقائي؟', r: 'نعم، يُمنح الرقم عند الإصدار ضمن سلسلة سنوية متصلة خاصة بمكتبكم.' },
        { q: 'هل تستطيع الكتابة إلغاء فاتورة؟', r: 'إلغاء الفاتورة وحذف أي أداء يتطلبان صلاحية الحذف، وللمسؤول عن المكتب أن يسحبها من أي عضو.' },
        { q: 'هل أفوتر شركة؟', r: 'نعم، فبطاقة الموكل تتضمن رقم التعريف الموحد للمقاولة والسجل التجاري والمعرّف الجبائي للشركة.' },
        { q: 'كيف أتتبع التسبيقات؟', r: 'الأداء غير المرتبط بفاتورة يُحفظ كتسبيق غير مخصَّص، ويظهر في الخلاصة.' },
      ],
      voir: ['clients', 'actes', 'alertes'],
    },
  },

  // ───────────────────────────── Assistant juridique IA ─────────────────────────────
  assistant: {
    fr: {
      nav: 'Assistant IA',
      resume: 'Des réponses en arabe qui citent les textes, et un résumé de dossier avant l’audience.',
      titre: 'Assistant juridique IA en arabe pour avocats | MalafiPro',
      description: 'Posez vos questions comme à un confrère : réponses en arabe avec les textes cités, que vous vérifiez. Résumé de dossier et mémoire de vos préférences.',
      h1: 'Un assistant juridique en arabe, qui cite ses sources',
      pastille: 'Intelligence artificielle',
      lead: 'L’assistant de MalafiPro répond à vos questions juridiques en arabe et affiche les articles sur lesquels il s’appuie, pour que vous les ouvriez et les vérifiiez. Il peut aussi s’appuyer sur l’état de vos dossiers.',
      blocs: [
        {
          h2: 'Ce qu’il fait pour vous',
          cartes: [
            { h3: 'Répondre avec les textes', texte: 'Les articles cités dans la réponse s’affichent comme sources ; ceux qui ne sont pas utilisés ne sont pas montrés.' },
            { h3: 'Parler de vos dossiers', texte: 'Posez une question sur un dossier ou sur l’ensemble de votre portefeuille : l’assistant dispose d’une vue d’ensemble de vos dossiers.' },
            { h3: 'Résumer un dossier', texte: 'Un résumé court, les prochaines échéances et des points d’attention, à relire avant l’audience.' },
            { h3: 'Garder le fil', texte: 'Vos conversations sont conservées, et vous pouvez noter une réponse pour signaler qu’elle est utile ou fausse.' },
          ],
        },
        {
          h2: 'Une relecture avant que vous ne fassiez confiance',
          intro: 'Après la rédaction, une seconde passe automatique cherche les erreurs graves : demandes contradictoires, article d’un ancien texte rattaché à une loi récente, délai ou montant affirmé sans source, conclusion contraire aux sources. Quand elle en trouve, la réponse est corrigée.',
        },
        {
          h2: 'Une mémoire que vous contrôlez',
          intro: 'Vos préférences de rédaction, votre pratique, les corrections que vous apportez et vos formules favorites peuvent être mémorisées pour personnaliser les réponses. Vous les consultez, les modifiez, les supprimez, ou vous mettez la mémoire en pause. Une règle mémorisée ne contient ni nom, ni numéro de dossier, ni montant.',
        },
      ],
      limites: {
        h2: 'Ce qu’il faut garder en tête',
        puces: [
          'L’assistant peut se tromper. Ouvrez les articles cités et vérifiez-les avant de vous en servir.',
          'Un texte très récent peut ne pas encore figurer dans ses sources : contrôlez toujours la version en vigueur.',
          'La relecture automatique est un filet de sécurité, pas une garantie : en cas de doute ou d’indisponibilité, la réponse reste affichée.',
          'Il ne remplace ni votre analyse ni votre responsabilité d’avocat.',
        ],
      },
      faq: [
        { q: 'L’assistant répond-il en arabe ?', r: 'Oui, ses réponses sont rédigées en arabe.' },
        { q: 'Sur quoi s’appuie-t-il ?', r: 'Sur des textes juridiques marocains qu’il consulte avant de répondre et qu’il cite lorsqu’il les utilise, et sur vos dossiers pour les questions qui les concernent.' },
        { q: 'Peut-il rédiger mes actes ?', r: 'La rédaction d’actes est une fonction à part, qui part des données du dossier : elle a sa propre page.' },
        { q: 'Peut-on contrôler ce qu’il mémorise ?', r: 'Oui. Vous voyez la liste, vous modifiez ou supprimez chaque élément, et vous pouvez mettre la mémoire en pause.' },
        { q: 'Dois-je vérifier ses réponses ?', r: 'Toujours. Les sources affichées servent précisément à cela.' },
      ],
      voir: ['actes', 'suivi', 'clients'],
    },
    ar: {
      nav: 'المساعد الذكي',
      resume: 'أجوبة بالعربية تحيل على النصوص، وتلخيص للملف قبل الجلسة.',
      titre: 'مساعد قانوني بالذكاء الاصطناعي للمحامي | ملفاتي',
      description: 'اسألوه كزميل: أجوبة بالعربية مع الإحالة على النصوص لتتحققوا بأنفسكم، وتلخيص للملف قبل الجلسة. القرار الأخير دائماً للمحامي.',
      h1: 'مساعد قانوني بالعربية يحيل على النصوص',
      pastille: 'الذكاء الاصطناعي',
      lead: 'يجيب مساعد ملفاتي عن أسئلتكم القانونية بالعربية ويعرض الفصول التي اعتمد عليها، لتفتحوها وتتحققوا منها. ويمكنه كذلك أن يستند إلى وضع ملفاتكم.',
      blocs: [
        {
          h2: 'ما يقدّمه لكم',
          cartes: [
            { h3: 'جواب مع النصوص', texte: 'تظهر الفصول المستشهَد بها في الجواب كمصادر، أما التي لم تُستعمل فلا تُعرض.' },
            { h3: 'حديث عن ملفاتكم', texte: 'اسألوا عن ملف بعينه أو عن مجمل ملفاتكم، فللمساعد نظرة عامة على ملفاتكم.' },
            { h3: 'تلخيص الملف', texte: 'ملخص قصير وآجال قادمة ونقاط تستحق الانتباه، تراجعونها قبل الجلسة.' },
            { h3: 'متابعة الحديث', texte: 'تُحفظ محادثاتكم، ويمكنكم تقييم الجواب لتنبيهوا إلى أنه مفيد أو خاطئ.' },
          ],
        },
        {
          h2: 'مراجعة قبل أن تعتمدوا الجواب',
          intro: 'بعد كتابة الجواب، تبحث مراجعة آلية ثانية عن الأخطاء الجسيمة: طلبات متناقضة، أو رقم فصل من نص قديم منسوب لقانون حديث، أو أجل أو مبلغ يُقدَّم بلا مصدر، أو استنتاج يخالف المصادر. وإذا وجدت خطأً صُحِّح الجواب.',
        },
        {
          h2: 'ذاكرة تتحكمون فيها',
          intro: 'يمكن حفظ تفضيلاتكم في التحرير وطبيعة عملكم وتصحيحاتكم وصيغكم المفضلة لتخصيص الأجوبة. تطّلعون عليها وتعدّلونها وتحذفونها، أو توقفون الذاكرة مؤقتاً. ولا يحتوي ما يُحفظ على اسم أو رقم ملف أو مبلغ.',
        },
      ],
      limites: {
        h2: 'ما يجب أن تبقوه في بالكم',
        puces: [
          'قد يخطئ المساعد. افتحوا الفصول المذكورة وتحققوا منها قبل الاعتماد عليها.',
          'قد لا يوجد نص حديث جداً بعدُ ضمن مصادره، فتأكدوا دائماً من النسخة الجارية.',
          'المراجعة الآلية شبكة أمان وليست ضماناً: عند الشك أو تعذّرها يبقى الجواب معروضاً.',
          'لا يعوّض تحليلكم ولا مسؤوليتكم كمحامين.',
        ],
      },
      faq: [
        { q: 'هل يجيب المساعد بالعربية؟', r: 'نعم، تُكتب أجوبته بالعربية.' },
        { q: 'على ماذا يعتمد؟', r: 'على نصوص قانونية مغربية يطّلع عليها قبل الجواب ويشير إليها حين يستعملها، وعلى ملفاتكم في الأسئلة التي تخصها.' },
        { q: 'هل يحرّر لي مقالاتي؟', r: 'تحرير الوثائق وظيفة مستقلة تنطلق من معطيات الملف، ولها صفحتها الخاصة.' },
        { q: 'هل أتحكم فيما يحفظه؟', r: 'نعم، ترون اللائحة وتعدّلون أو تحذفون كل عنصر، ويمكنكم إيقاف الذاكرة مؤقتاً.' },
        { q: 'هل أتحقق من أجوبته؟', r: 'دائماً. والمصادر المعروضة وُضعت لهذا الغرض.' },
      ],
      voir: ['actes', 'suivi', 'clients'],
    },
  },

  // ───────────────────────────── Rédaction d'actes ─────────────────────────────
  actes: {
    fr: {
      nav: 'Rédaction d’actes',
      resume: '23 types d’actes préparés depuis le dossier, modifiables par chat, exportés en Word.',
      titre: 'Rédiger vos actes d’avocat avec l’IA | MalafiPro',
      description: 'Requêtes, mémoires, mises en demeure, contrats : 23 types d’actes préparés depuis votre dossier, modifiés par chat et exportés en Word.',
      h1: 'Rédigez vos actes à partir du dossier, pas d’une page blanche',
      pastille: 'Rédaction d’actes',
      lead: 'MalafiPro prépare un premier jet de vos actes à partir des données du dossier : parties, tribunal, numéro, faits. Vous le relisez, le modifiez en discutant avec l’assistant, puis l’exportez en Word.',
      blocs: [
        {
          h2: 'Vingt-trois types d’actes',
          cartes: [
            { h3: 'Procédure', texte: 'Requête introductive, mémoire en défense, mémoire en réplique, requête d’appel, requête en référé, pourvoi en cassation, demande de notification d’un jugement, de copie exécutoire et d’exécution.' },
            { h3: 'Correspondance', texte: 'Mise en demeure, lettre de résiliation de contrat, lettre de fin de contrat de travail.' },
            { h3: 'Contrats', texte: 'Baux d’habitation et commerciaux, contrats de travail à durée indéterminée et déterminée, vente immobilière, vente de fonds de commerce, accord de confidentialité, reconnaissance de dette, procuration.' },
            { h3: 'Société', texte: 'Statuts de SARL et procès-verbal d’assemblée générale.' },
          ],
        },
        {
          h2: 'Un premier jet qui part de votre dossier',
          cartes: [
            { h3: 'Des champs préremplis', texte: 'Selon l’étape du dossier, MalafiPro vous propose les actes utiles et préremplit les champs avec les informations dont il dispose.' },
            { h3: 'Une modification par discussion', texte: 'Décrivez en langage naturel la correction voulue : l’assistant modifie le texte.' },
            { h3: 'Vos propres modèles', texte: 'Importez vos modèles Word : MalafiPro s’en inspire pour reprendre votre style de rédaction.' },
            { h3: 'Un export Word', texte: 'Le document s’exporte en Word pour les dernières retouches.' },
          ],
        },
        {
          h2: 'Le dossier de travail en un clic',
          intro: 'À partir d’un dossier, MalafiPro prépare les documents d’administration du cabinet : page de garde, convention d’honoraires, procuration, reçu de provision, bordereau de pièces, lettre d’information au client et note d’honoraires. Vous les téléchargez ensemble dans un fichier .zip.',
          image: { src: '/landing/ecran-pack.webp', alt: 'Écran dossier de travail : documents et actes', w: 1048, h: 1220, legende: 'Le dossier de travail : documents du cabinet et actes suggérés' },
        },
      ],
      limites: {
        h2: 'Ce qu’il faut savoir',
        puces: [
          'Le texte généré est un projet : relisez-le en entier avant de l’utiliser.',
          'Vérifiez les références légales citées avant tout dépôt, en particulier pour les textes récemment réformés.',
          'L’outil rédige ; l’avocat signe et engage sa responsabilité.',
        ],
      },
      faq: [
        { q: 'Puis-je utiliser mes propres modèles ?', r: 'Oui. Vous importez vos modèles Word et MalafiPro s’en sert pour reprendre votre style.' },
        { q: 'Dans quel format l’acte est-il exporté ?', r: 'En Word, pour pouvoir le retoucher comme n’importe quel document.' },
        { q: 'L’acte est-il prêt à être déposé ?', r: 'Non : c’est un premier jet à relire et à compléter. La vérification juridique reste celle de l’avocat.' },
        { q: 'Que contient le dossier de travail ?', r: 'Une page de garde, une convention d’honoraires, une procuration, un reçu de provision, un bordereau de pièces, une lettre d’information au client et une note d’honoraires.' },
        { q: 'En quelle langue sont rédigés les actes ?', r: 'Les types d’actes disponibles sont rédigés en arabe.' },
      ],
      voir: ['assistant', 'facturation', 'clients'],
    },
    ar: {
      nav: 'تحرير المقالات',
      resume: '23 نوعاً من الوثائق تنطلق من الملف، تعدّلونها بالمحادثة وتحمّلونها بصيغة Word.',
      titre: 'تحرير المقالات والإنذارات بالذكاء الاصطناعي | ملفاتي',
      description: 'مقال استئنافي، مذكرة جوابية، إنذار، عقود: 23 نوعاً من معطيات الملف، تعدّلونها بالمحادثة وتحمّلونها بصيغة Word.',
      h1: 'حرّروا مقالاتكم من معطيات الملف لا من صفحة بيضاء',
      pastille: 'تحرير الوثائق',
      lead: 'يعدّ ملفاتي مسودة أولى لوثائقكم انطلاقاً من معطيات الملف: الأطراف والمحكمة والرقم والوقائع. تراجعونها وتعدّلونها بمحادثة المساعد، ثم تحمّلونها بصيغة Word.',
      blocs: [
        {
          h2: 'ثلاثة وعشرون نوعاً من الوثائق',
          cartes: [
            { h3: 'المسطرة', texte: 'مقال افتتاحي، مذكرة جوابية، مذكرة تعقيبية، مقال استئنافي، مقال استعجالي، مقال الطعن بالنقض، وطلبات: تبليغ حكم، والحصول على نسخة تنفيذية، وتنفيذ حكم.' },
            { h3: 'المراسلات', texte: 'إنذار، ورسالة فسخ عقد، ورسالة إنهاء عقد الشغل.' },
            { h3: 'العقود', texte: 'كراء سكني وتجاري، وعقد شغل غير محدد المدة وآخر محدد المدة، وبيع عقار، وبيع أصل تجاري، واتفاقية عدم إفشاء، وإقرار بدين، ووكالة.' },
            { h3: 'الشركات', texte: 'النظام الأساسي لشركة ذات مسؤولية محدودة ومحضر جمع عام.' },
          ],
        },
        {
          h2: 'مسودة أولى تنطلق من ملفكم',
          cartes: [
            { h3: 'حقول معبّأة مسبقاً', texte: 'بحسب مرحلة الملف، يقترح عليكم ملفاتي الوثائق المفيدة ويعبّئ الحقول بما لديه من معطيات.' },
            { h3: 'تعديل بالمحادثة', texte: 'صفوا بلغتكم التعديل المطلوب، فيعدّل المساعد النص.' },
            { h3: 'نماذجكم الخاصة', texte: 'استوردوا نماذجكم بصيغة Word، فيستلهمها ملفاتي لاعتماد أسلوبكم في التحرير.' },
            { h3: 'تصدير إلى Word', texte: 'تُصدَّر الوثيقة بصيغة Word لإدخال اللمسات الأخيرة.' },
          ],
        },
        {
          h2: 'ملف العمل بنقرة واحدة',
          intro: 'من الملف، يعدّ ملفاتي وثائق تسيير المكتب: ورقة غلاف الملف، واتفاقية تحديد الأتعاب، ووكالة خاصة، ووصل تسلّم تسبيق، وحافظة مستندات، ورسالة إخبار الموكل، ومذكرة الأتعاب. وتحمّلونها معاً في ملف مضغوط.',
          image: { src: '/landing/ecran-pack.webp', alt: 'شاشة ملف العمل: وثائق المكتب والأعمال الإجرائية', w: 1048, h: 1220, legende: 'ملف العمل: وثائق المكتب والوثائق المقترحة' },
        },
      ],
      limites: {
        h2: 'ما يجب أن تعرفوه',
        puces: [
          'النص المولَّد مسودة: اقرؤوه كاملاً قبل استعماله.',
          'تحقّقوا من المراجع القانونية المذكورة قبل أي إيداع، خاصة في النصوص التي شملها إصلاح حديث.',
          'الأداة تحرّر، والمحامي يوقّع ويتحمل مسؤوليته.',
        ],
      },
      faq: [
        { q: 'هل أستعمل نماذجي الخاصة؟', r: 'نعم، تستوردون نماذجكم بصيغة Word فيعتمدها ملفاتي لاستلهام أسلوبكم.' },
        { q: 'بأي صيغة تُصدَّر الوثيقة؟', r: 'بصيغة Word، لتعدّلوها كأي وثيقة أخرى.' },
        { q: 'هل الوثيقة جاهزة للإيداع؟', r: 'لا، هي مسودة أولى تراجعونها وتستكملونها. ويبقى التحقق القانوني للمحامي.' },
        { q: 'ماذا يتضمن ملف العمل؟', r: 'ورقة غلاف، واتفاقية أتعاب، ووكالة خاصة، ووصل تسبيق، وحافظة مستندات، ورسالة إخبار الموكل، ومذكرة أتعاب.' },
        { q: 'بأي لغة تُحرَّر الوثائق؟', r: 'أنواع الوثائق المتوفرة تُحرَّر بالعربية.' },
      ],
      voir: ['assistant', 'facturation', 'clients'],
    },
  },
}
