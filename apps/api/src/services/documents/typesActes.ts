// Registre des types d'actes. Ajouter un type = ajouter une entrée ici (pas de code).
// Chaque type porte : libellé, catégorie, langue par défaut, variables attendues,
// et des CONSIGNES juridiques (base légale marocaine) injectées dans le prompt.

export type CategorieActe = 'CONTRAT' | 'REQUETE' | 'CORRESPONDANCE' | 'SOCIETE' | 'AUTRE'

export interface VariableActe {
  cle: string
  label: string          // libellé arabe pour le formulaire
  type: 'text' | 'number' | 'date' | 'textarea'
  requis: boolean
}

export interface TypeActe {
  cle: string
  titreAr: string
  categorie: CategorieActe
  langue: 'AR' | 'FR'
  variables: VariableActe[]
  // Consignes juridiques spécifiques (base légale, mentions obligatoires).
  consignes: string
}

const V = (cle: string, label: string, type: VariableActe['type'] = 'text', requis = true): VariableActe => ({ cle, label, type, requis })

// Variables communes aux parties d'un contrat.
const PARTIES = [
  V('partie1_nom', 'الطرف الأول (الاسم الكامل)'),
  V('partie1_cin', 'بطاقة التعريف للطرف الأول'),
  V('partie1_adresse', 'عنوان الطرف الأول'),
  V('partie2_nom', 'الطرف الثاني (الاسم الكامل)'),
  V('partie2_cin', 'بطاقة التعريف للطرف الثاني'),
  V('partie2_adresse', 'عنوان الطرف الثاني'),
]

export const TYPES_ACTES: TypeActe[] = [
  // ─── CONTRATS ───
  {
    cle: 'BAIL_HABITATION',
    titreAr: 'عقد كراء سكني',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      ...PARTIES,
      V('adresse_bien', 'عنوان العقار المكترى'),
      V('montant_loyer', 'مبلغ الكراء الشهري (درهم)', 'number'),
      V('date_debut', 'تاريخ بداية الكراء', 'date'),
      V('duree', 'مدة الكراء'),
      V('caution', 'مبلغ الضمانة (درهم)', 'number', false),
    ],
    consignes: 'عقد كراء للسكن وفق القانون رقم 67.12 المنظم للعلاقات التعاقدية بين المكري والمكتري. أدرج: تحديد العقار، مبلغ الكراء وكيفية أدائه، مدة العقد، الضمانة، التزامات الطرفين، شرط الفسخ، والإحالة على القانون 67.12.',
  },
  {
    cle: 'BAIL_COMMERCIAL',
    titreAr: 'عقد كراء تجاري',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      ...PARTIES,
      V('adresse_local', 'عنوان المحل التجاري'),
      V('activite', 'النشاط التجاري'),
      V('montant_loyer', 'مبلغ الكراء الشهري (درهم)', 'number'),
      V('date_debut', 'تاريخ بداية الكراء', 'date'),
      V('duree', 'مدة الكراء'),
    ],
    consignes: 'عقد كراء تجاري وفق القانون رقم 49.16 المتعلق بكراء العقارات أو المحلات المخصصة للاستعمال التجاري أو الصناعي أو الحرفي. أدرج مقتضيات حق التجديد والتعويض عن الإفراغ.',
  },
  {
    cle: 'CDI',
    titreAr: 'عقد عمل غير محدد المدة',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      V('employeur_nom', 'اسم المشغّل/الشركة'),
      V('employeur_adresse', 'عنوان المشغّل'),
      V('salarie_nom', 'اسم الأجير'),
      V('salarie_cin', 'بطاقة التعريف للأجير'),
      V('poste', 'المنصب/الوظيفة'),
      V('salaire', 'الأجر الشهري (درهم)', 'number'),
      V('date_debut', 'تاريخ بداية العمل', 'date'),
      V('lieu_travail', 'مكان العمل'),
    ],
    consignes: 'عقد شغل غير محدد المدة وفق مدونة الشغل (القانون 65.99). أدرج: فترة الاختبار القانونية، الأجر، مدة العمل، العطلة السنوية المؤدى عنها، التصريح بالضمان الاجتماعي CNSS، والإحالة على مدونة الشغل.',
  },
  {
    cle: 'CDD',
    titreAr: 'عقد عمل محدد المدة',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      V('employeur_nom', 'اسم المشغّل/الشركة'),
      V('salarie_nom', 'اسم الأجير'),
      V('salarie_cin', 'بطاقة التعريف للأجير'),
      V('poste', 'المنصب/الوظيفة'),
      V('salaire', 'الأجر الشهري (درهم)', 'number'),
      V('date_debut', 'تاريخ البداية', 'date'),
      V('date_fin', 'تاريخ الانتهاء', 'date'),
      V('motif', 'سبب اللجوء للعقد المحدد المدة', 'textarea'),
    ],
    consignes: 'عقد شغل محدد المدة وفق مدونة الشغل. ⚠️ حالات اللجوء إليه محصورة قانوناً (المادة 16): تذكير بالمبرر القانوني وإلا اعتُبر غير محدد المدة.',
  },
  {
    cle: 'VENTE_IMMOBILIERE',
    titreAr: 'عقد بيع عقار',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      ...PARTIES,
      V('description_bien', 'وصف العقار', 'textarea'),
      V('reference_fonciere', 'الرسم العقاري / المرجع'),
      V('prix', 'ثمن البيع (درهم)', 'number'),
      V('modalites_paiement', 'كيفية الأداء', 'textarea'),
    ],
    consignes: 'عقد بيع عقاري وفق قانون الالتزامات والعقود والقانون 39.08 (مدونة الحقوق العينية). تنبيه: البيع العقاري يتطلب التوثيق والتسجيل والتقييد بالمحافظة العقارية.',
  },
  {
    cle: 'VENTE_FONDS_COMMERCE',
    titreAr: 'عقد بيع أصل تجاري',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [...PARTIES, V('designation_fonds', 'تعيين الأصل التجاري', 'textarea'), V('prix', 'ثمن البيع (درهم)', 'number')],
    consignes: 'بيع الأصل التجاري وفق مدونة التجارة (القانون 15.95)، المواد 81 وما بعدها. أدرج البيانات الإلزامية وإجراءات الإشهار.',
  },
  {
    cle: 'NDA',
    titreAr: 'اتفاقية عدم إفشاء (سرية)',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [...PARTIES, V('objet', 'موضوع السرية', 'textarea'), V('duree', 'مدة الالتزام بالسرية')],
    consignes: 'اتفاقية الحفاظ على السرية. حدّد المعلومات السرية، نطاق الالتزام، المدة، والجزاء عند الإخلال وفق ق.ل.ع.',
  },
  {
    cle: 'RECONNAISSANCE_DETTE',
    titreAr: 'إقرار بدين',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      V('debiteur_nom', 'اسم المدين'),
      V('debiteur_cin', 'بطاقة تعريف المدين'),
      V('creancier_nom', 'اسم الدائن'),
      V('montant', 'مبلغ الدين (درهم)', 'number'),
      V('date_echeance', 'تاريخ الاستحقاق', 'date'),
    ],
    consignes: 'إقرار بدين وفق ق.ل.ع. أدرج المبلغ بالأرقام والحروف، سبب الدين إن وُجد، أجل الأداء، وتوقيع المدين.',
  },
  {
    cle: 'PROCURATION',
    titreAr: 'وكالة',
    categorie: 'CONTRAT',
    langue: 'AR',
    variables: [
      V('moukil_nom', 'اسم الموكِّل'),
      V('moukil_cin', 'بطاقة تعريف الموكِّل'),
      V('wakil_nom', 'اسم الوكيل'),
      V('wakil_cin', 'بطاقة تعريف الوكيل'),
      V('objet', 'موضوع الوكالة وحدودها', 'textarea'),
    ],
    consignes: 'عقد وكالة وفق ق.ل.ع (المواد 879 وما بعدها). حدّد بدقة نطاق الوكالة (خاصة أو عامة) والصلاحيات الممنوحة.',
  },

  // ─── SOCIÉTÉS ───
  {
    cle: 'STATUTS_SARL',
    titreAr: 'النظام الأساسي لشركة ذات مسؤولية محدودة',
    categorie: 'SOCIETE',
    langue: 'AR',
    variables: [
      V('denomination', 'تسمية الشركة'),
      V('objet_social', 'الغرض الاجتماعي', 'textarea'),
      V('capital', 'رأس المال (درهم)', 'number'),
      V('siege', 'المقر الاجتماعي'),
      V('associes', 'الشركاء وحصصهم', 'textarea'),
      V('gerant', 'المسيّر'),
    ],
    consignes: 'النظام الأساسي لشركة ذات مسؤولية محدودة وفق القانون 5.96. أدرج: التسمية، الغرض، المقر، رأس المال والحصص، التسيير، توزيع الأرباح، مدة الشركة (99 سنة عادة).',
  },
  {
    cle: 'PV_AG',
    titreAr: 'محضر جمع عام',
    categorie: 'SOCIETE',
    langue: 'AR',
    variables: [V('denomination', 'تسمية الشركة'), V('date_ag', 'تاريخ الجمع العام', 'date'), V('ordre_du_jour', 'جدول الأعمال', 'textarea'), V('resolutions', 'القرارات', 'textarea')],
    consignes: 'محضر جمع عام لشركة. أدرج: التأكد من النصاب، جدول الأعمال، القرارات والتصويت عليها.',
  },

  // ─── REQUÊTES & MÉMOIRES JUDICIAIRES ───
  {
    cle: 'REQUETE_INTRODUCTIVE',
    titreAr: 'مقال افتتاحي للدعوى',
    categorie: 'REQUETE',
    langue: 'AR',
    variables: [
      V('demandeur', 'المدّعي (الاسم والصفة)'),
      V('defendeur', 'المدّعى عليه'),
      V('tribunal', 'المحكمة المختصة'),
      V('objet', 'موضوع الطلب', 'textarea'),
      V('faits', 'الوقائع', 'textarea'),
      V('demandes', 'الطلبات', 'textarea'),
    ],
    consignes: 'مقال افتتاحي وفق قانون المسطرة المدنية. أدرج البيانات الإلزامية (الفصل 32 ق.م.م): أطراف الدعوى، الموضوع، الوقائع، الأسانيد القانونية، الطلبات الواضحة، والمرفقات.',
  },
  {
    cle: 'MEMOIRE_DEFENSE',
    titreAr: 'مذكرة جوابية',
    categorie: 'REQUETE',
    langue: 'AR',
    variables: [
      V('partie', 'الطرف المدافِع'),
      V('adversaire', 'الطرف الخصم'),
      V('numero_dossier', 'رقم الملف'),
      V('moyens', 'وسائل الدفاع', 'textarea'),
    ],
    consignes: 'مذكرة جوابية/دفاعية. فنّد ادعاءات الخصم نقطة بنقطة، اعرض الدفوع الشكلية ثم الموضوعية، واستند إلى النصوص القانونية والوثائق.',
  },
  {
    cle: 'REQUETE_APPEL',
    titreAr: 'مقال استئنافي',
    categorie: 'REQUETE',
    langue: 'AR',
    variables: [
      V('appelant', 'المستأنِف'),
      V('intime', 'المستأنَف عليه'),
      V('jugement', 'الحكم المستأنف (المرجع والتاريخ)'),
      V('moyens_appel', 'أسباب الاستئناف', 'textarea'),
    ],
    consignes: 'مقال استئنافي وفق ق.م.م. ⚠️ ذكّر بأجل الاستئناف (30 يوماً عادة من التبليغ). اعرض أسباب الاستئناف ووجه الطعن في الحكم الابتدائي.',
  },
  {
    cle: 'REFERE',
    titreAr: 'مقال استعجالي',
    categorie: 'REQUETE',
    langue: 'AR',
    variables: [V('demandeur', 'الطالب'), V('defendeur', 'المطلوب ضده'), V('urgence', 'عنصر الاستعجال', 'textarea'), V('demande', 'الطلب', 'textarea')],
    consignes: 'مقال استعجالي أمام قاضي المستعجلات (الفصول 149 وما بعدها ق.م.م). أبرِز عنصر الاستعجال وعدم المساس بجوهر الحق.',
  },

  // ─── CORRESPONDANCES & MISES EN DEMEURE ───
  {
    cle: 'MISE_EN_DEMEURE',
    titreAr: 'إنذار',
    categorie: 'CORRESPONDANCE',
    langue: 'AR',
    variables: [
      V('expediteur', 'المُنذِر (الاسم والصفة)'),
      V('destinataire', 'المُنذَر إليه'),
      V('objet', 'موضوع الإنذار'),
      V('faits', 'الوقائع والالتزام المطلوب', 'textarea'),
      V('delai', 'الأجل الممنوح للتنفيذ'),
    ],
    consignes: 'إنذار قانوني وفق ق.ل.ع (الفصل 254 وما بعده). حدّد بوضوح الالتزام غير المنفّذ، امنح أجلاً معقولاً، وأشر إلى العواقب القانونية عند عدم الاستجابة (فسخ، تعويض، لجوء للقضاء).',
  },
  {
    cle: 'LETTRE_RESILIATION',
    titreAr: 'رسالة فسخ عقد',
    categorie: 'CORRESPONDANCE',
    langue: 'AR',
    variables: [V('expediteur', 'المُرسِل'), V('destinataire', 'المُرسَل إليه'), V('contrat', 'العقد المعني'), V('motif', 'سبب الفسخ', 'textarea'), V('date_effet', 'تاريخ سريان الفسخ', 'date')],
    consignes: 'رسالة فسخ/إنهاء عقد. استند إلى الشرط الفاسخ أو المقتضى القانوني، واحترم أجل الإشعار المسبق المنصوص عليه.',
  },
  {
    cle: 'LETTRE_LICENCIEMENT',
    titreAr: 'رسالة إنهاء عقد الشغل',
    categorie: 'CORRESPONDANCE',
    langue: 'AR',
    variables: [V('employeur', 'المشغّل'), V('salarie', 'الأجير'), V('motif', 'سبب الإنهاء', 'textarea'), V('date_effet', 'تاريخ الإنهاء', 'date')],
    consignes: '⚠️ رسالة إنهاء عقد شغل وفق مدونة الشغل: احترام مسطرة الاستماع (المادة 62)، الأجل، والتعليل. الإخلال يُعرّض لتعويضات عن الطرد التعسفي. ذكّر المحامي بضرورة احترام المسطرة.',
  },
]

export const TYPES_PAR_CLE: Record<string, TypeActe> = Object.fromEntries(TYPES_ACTES.map((t) => [t.cle, t]))

export function getTypeActe(cle: string): TypeActe | undefined {
  return TYPES_PAR_CLE[cle]
}