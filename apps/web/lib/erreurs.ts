// Messages d'erreur de l'API (en français) → texte arabe affiché dans l'interface.
const AR: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/Identifiants incorrects \((\d+) essais restants\)/i, (m) => m[1] === '0'
    ? 'البريد أو كلمة المرور غير صحيحين. أُوقف الدخول مؤقتاً لمدة 15 دقيقة.'
    : `البريد أو كلمة المرور غير صحيحين. تبقّت ${m[1]} محاولات قبل إيقاف مؤقت.`],
  [/Identifiants incorrects/i, 'البريد أو كلمة المرور غير صحيحين.'],
  [/Compte en attente d'activation/i, 'طلبكم قيد المعالجة: سنتصل بكم قريباً لتفعيل حسابكم.'],
  [/Compte désactivé/i, 'هذا الحساب معطّل. تواصلوا معنا على واتساب لإعادة تفعيله.'],
  [/Adresse e-mail non acceptée/i, 'استعملوا بريداً من مزوّد معروف (Gmail، Outlook، Hotmail، Yahoo، iCloud…).'],
  [/différent du mot de passe provisoire/i, 'اختاروا كلمة مرور مختلفة عن الكلمة المؤقتة.'],
  [/différent de l'actuel/i, 'اختاروا كلمة مرور مختلفة عن الحالية.'],
  [/Mot de passe provisoire à changer/i, 'اختاروا كلمة مرور جديدة للمتابعة.'],
  [/Changez votre propre mot de passe/i, 'غيّروا كلمة مروركم من قسم المشرفين.'],
  [/Impossible de retirer votre propre compte/i, 'لا يمكنكم حذف حسابكم الخاص.'],
  [/Réservé aux avocats/i, 'هذه الخاصية خاصة بحسابات المحامين.'],
  [/Compte déjà traité/i, 'هذا الطلب عولج من قبل.'],
  [/Demande introuvable/i, 'الطلب غير موجود أو عولج من قبل.'],
  [/Trop de tentatives/i, 'محاولات كثيرة. أعيدوا المحاولة بعد 15 دقيقة.'],
  [/Code expiré, reconnectez-vous/i, 'انتهت صلاحية الرمز. أعيدوا تسجيل الدخول.'],
  [/Pas de connexion internet/i, 'لا اتصال بالإنترنت. أعيدوا المحاولة عند عودة الشبكة.'],
  [/Connexion impossible/i, 'تعذّر الاتصال بالخادم. تحققوا من الإنترنت ثم أعيدوا المحاولة.'],
  [/Trop de requêtes/i, 'طلبات كثيرة في وقت قصير. انتظروا قليلاً ثم أعيدوا المحاولة.'],
  [/Contenu trop volumineux/i, 'المحتوى كبير جداً.'],
  [/Erreur interne du serveur/i, 'حدث خطأ في الخادم. أعيدوا المحاولة بعد لحظات.'],
  [/Abonnement expiré/i, 'انتهى اشتراككم. تواصلوا معنا للتجديد، والملفات الحالية ما زالت تحت المتابعة.'],
  [/Limite de dossiers atteinte/i, 'بلغتم الحد الأقصى لعدد الملفات في عرضكم. تواصلوا معنا لتوسيعه.'],
  [/Lien expiré/i, 'انتهت صلاحية الرابط. اطلبوا رابطاً جديداً من مستشارنا.'],
  [/Email déjà utilisé/i, 'هذا البريد مستعمل في حساب آخر.'],
  [/Code invalide/i, 'الرمز غير صحيح.'],
  [/Code expiré/i, 'انتهت صلاحية الرمز، اطلبوا رمزاً جديداً.'],
  [/Patientez une minute/i, 'انتظروا دقيقة قبل طلب رمز جديد.'],
  [/Échec d'envoi WhatsApp : service non configuré/i, 'خدمة واتساب غير مفعّلة حالياً. تواصلوا مع الدعم.'],
  [/Échec d'envoi WhatsApp : jeton Meta expiré/i, 'خدمة واتساب متوقفة مؤقتاً (إعدادات). تواصلوا مع الدعم.'],
  [/Échec d'envoi WhatsApp : numéro non autorisé/i, 'هذا الرقم غير مسموح به بعد في حساب واتساب التجريبي. تواصلوا مع الدعم.'],
  [/Échec d'envoi WhatsApp : modèle/i, 'خدمة واتساب قيد الإعداد (نموذج الرسالة). تواصلوا مع الدعم.'],
  [/Échec d'envoi/i, 'تعذّر إرسال الرمز على واتساب. تحققوا من الرقم.'],
  [/Mot de passe actuel incorrect/i, 'كلمة المرور الحالية غير صحيحة.'],
  [/au moins 8 caractères/i, 'كلمة المرور الجديدة يجب أن تتضمن 8 أحرف على الأقل.'],
  [/Confirmez d'abord votre numéro WhatsApp/i, 'أكّدوا رقم واتساب أولاً.'],
  [/Réservé au responsable/i, 'هذا الإجراء خاص بمسؤول المكتب.'],
  [/Dossier déjà ajouté/i, 'هذا الملف مضاف من قبل.'],
  [/trop de temps/i, 'الخادم تأخر في الرد. أعيدوا المحاولة.'],
  [/Offre cabinet requise/i, 'دعوة أعضاء الفريق متاحة في عرض «مكتب». تواصلوا معنا لتغيير العرض.'],
  [/Limite d'utilisateurs atteinte/i, 'بلغتم عدد المستخدمين المسموح به في عرضكم (مع الدعوات المعلّقة).'],
  [/Invitation destinée à une autre adresse/i, 'هذه الدعوة موجّهة إلى بريد آخر. سجّلوا بالبريد الذي وصلته الدعوة.'],
  [/Invitation expirée/i, 'انتهت صلاحية الدعوة. اطلبوا دعوة جديدة من مسؤول المكتب.'],
  [/Numéro de téléphone invalide/i, 'رقم الهاتف غير صحيح.'],
  [/at most 80 character/i, 'الاسم طويل جداً (80 حرفاً على الأكثر).'],
  [/Date invalide/i, 'تاريخ غير صحيح.'],
  [/Rendez-vous introuvable/i, 'الموعد غير موجود أو حُذف من قبل.'],
  [/Réservé à l'avocat/i, 'هذا الإجراء خاص بالمحامي (غير متاح لحساب الكتابة).'],
  [/^\{"formErrors"/, 'تحققوا من المعطيات المدخلة.'],
]

export function erreurAr(message: string | null | undefined): string {
  if (!message) return 'حدث خطأ. أعيدوا المحاولة.'
  for (const [re, ar] of AR) {
    const m = message.match(re)
    if (m) return typeof ar === 'string' ? ar : ar(m)
  }
  return message
}
