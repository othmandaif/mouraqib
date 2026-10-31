# Modèles WhatsApp à créer dans Meta (WhatsApp Manager › Modèles de messages)

Meta refuse les messages en texte libre envoyés à l'initiative de l'app (hors fenêtre de 24 h).
Créez ces modèles (langue **Arabe – ar**), attendez l'approbation, puis renseignez leurs noms
dans les variables d'environnement de l'API. Les `{{n}}` sont remplis automatiquement.
Aucun modèle ne contient le nom des parties.

| Variable d'environnement | Nom conseillé | Catégorie | Texte du modèle |
|---|---|---|---|
| `WA_TPL_DELAI` | `malafipro_delai` | Utilité | `*آخر أجل {{1}}*` ↵ `{{2}} · ملف {{3}}` ↵ `آخر يوم: {{4}}` — bouton lien « عرض الأجل » → `https://app.malafipro.ma/echeances` |
| `WA_TPL_NOUVEAU_DELAI` | `malafipro_nouveau_delai` | Utilité | `*بدأ {{1}}*` ↵ `ملف {{2}} · تبليغ مسجّل` ↵ `آخر يوم: {{3}}` |
| `WA_TPL_JUGEMENT` | `malafipro_jugement` | Utilité | `*صدر حكم في ملفكم*` ↵ `ملف {{1}} · {{2}}` ↵ `حدّدوا طبيعة الحكم لنحسب الآجال.` |
| `WA_TPL_AUDIENCE` | `malafipro_audience` | Utilité | `*جلسة {{1}}*` ↵ `{{2}}` ↵ `ملف {{3}}` |
| `WA_TPL_EVENEMENT` | `malafipro_mustajad` | Utilité | `*مستجد في ملفكم*` ↵ `ملف {{1}} · {{2}}` ↵ `التفاصيل في التطبيق.` |
| `WA_TPL_DIGEST` | `malafipro_resume` | Utilité | `*صباح الخير، اليوم {{1}}*` ↵ `{{2}}` ↵ `{{3}}` — bouton lien → `https://app.malafipro.ma/dashboard` |
| `WA_TPL_CODE` | `malafipro_code` | Authentification | modèle Meta « code de vérification » avec bouton « نسخ الرمز » (le code est `{{1}}`) |

Facultatif : `WA_TPL_LANGUE` (défaut `ar`).

Exemples de valeurs envoyées :
- `{{1}}` délai : « بعد يومين », `{{2}}` « أجل الاستئناف - 30 يوماً », `{{3}}` « …/1801/77 », `{{4}}` « الأربعاء 21/10 ».
- Résumé : `{{1}}` « الإثنين 19/10 », `{{2}}` « عليكم: 2 أجل · الأقرب بعد يومين », `{{3}}` « جلسات اليوم: 1 ».
