# MalafiPro — Guide de marque (v1, 18 octobre 2026)

## 1. Le logo

**Idée :** le dossier de l'avocat, avec son étiquette, et une pastille cochée dans le coin.
Vos dossiers sont identifiés, surveillés et à jour : l'app vous signale ce qui change et confirme ce qui est fait.

- **Symbole** : dossier (vert) + pastille d'alerte cochée (ambre).
- **Nom** : « MalafiPro » (Inter Display, Malafi en SemiBold, Pro en Regular) + « ملفاتي » (IBM Plex Sans Arabic Bold).
- Les deux polices sont sous licence libre SIL OFL : leur usage dans un logo est autorisé. Dans les fichiers, les lettres sont déjà vectorisées.

### Fichiers

| Fichier | Usage |
|---|---|
| `malafipro-horizontal.svg` | Version principale : en-tête de site, documents, signature e-mail |
| `malafipro-stacked.svg` | Version empilée : formats carrés, page de connexion, réseaux sociaux |
| `malafipro-symbol.svg` | Symbole seul, à partir de 40 px |
| `malafipro-symbol-small.svg` | Symbole simplifié (sans étiquette), de 16 à 40 px |
| `*-reversed.svg` | Versions sur fond vert profond |
| `*-black.svg` / `*-white.svg` | Versions une couleur : fax, tampon, gravure, impression N&B |
| `logo-symbol-white.svg` | Symbole blanc + pastille ambre, fond transparent, pour les fonds sombres de l'app |
| `web/` | favicon.ico, favicon.svg, apple-touch-icon, icon-192/512, site.webmanifest |

## 2. Couleurs

| Rôle | Nom | HEX | RGB | Usage |
|---|---|---|---|---|
| Primaire | Vert Malafi | `#0E5A4E` | 14 90 78 | Logo, structure (menu actif, en-têtes), liens |
| Action | Orange Action | `#F69320` | 246 147 32 | Bouton principal de chaque écran, état appuyé, élément actif du menu ; texte **blanc** |
| Choix | Orange clair + liseré | `#FEF0DC` / `#C2620C` | — | Option choisie : puce, onglet, segment, radio, case cochée, filtre appliqué |
| Sombre | Vert profond | `#083B34` | 8 59 52 | Fonds sombres, hero, barre latérale |
| Accent | Ambre Signal | `#F2A93B` | 242 169 59 | **Uniquement** pour les alertes, les badges et les délais proches |
| Texte | Encre | `#15201E` | 21 32 30 | Texte courant |
| Fond | Papier | `#F5F3EE` | 245 243 238 | Fond des pages |
| Fond doux | Menthe | `#E3F0EC` | 227 240 236 | Survol, fonds doux, ronds d'icônes |
| Secondaire | Gris ardoise | `#5E6B67` | 94 107 103 | Texte secondaire, libellés |
| Danger | Rouge délai | `#C0392B` | 192 57 43 | Délai dépassé, erreurs |

**Règle d'or : l'ambre est le signal.** Il ne sert qu'à ce qui demande l'attention (comme la pastille du logo). S'il est partout, il ne signale plus rien.

**Orange Action (octobre 2026)** : pour que le vert ne domine pas, les actions et les choix sont orange (règle 60-30-10 : vert = structure, papier/blanc = surfaces, orange = ce que l'on touche).
- **Un seul bouton orange plein par écran** (l'action principale). Les autres boutons restent blancs à bordure grise.
- Survol `#E8871E`, appui `#D9771A` + léger enfoncement (classe `.mp-action`, `app/globals.css`).
- Option choisie : fond `#FEF0DC` + liseré `#C2620C` (classe `.mp-choix`, pilotée par `aria-pressed` / `aria-selected` / `aria-checked`).
- L'orange ne remplace pas l'ambre : alertes et délais proches restent ambre (pastilles, compte à rebours).

### Contrastes vérifiés (norme WCAG)
- Vert Malafi sur blanc : 8,1 · sur Papier : 7,3 → OK pour le texte.
- Encre sur Papier : 15,1 → OK.
- Blanc sur Vert profond : 12,5 → OK.
- Encre sur Ambre : 8,4 → OK. **Ne jamais mettre de texte blanc sur l'ambre** (2,0 seulement).
- Ambre sur blanc : 2,0 → jamais pour du texte, seulement pour des pastilles ou des icônes.
- Blanc sur Orange Action : 2,3 (survol 2,7 · appui 3,2) → choix de la marque pour les boutons et le menu ; garder le texte en gras (600) et ≥ 15 px. Texte **Encre** sur l'orange clair des options choisies.
- Liseré `#C2620C` sur blanc : 3,75 → l'état « choisi » reste visible (minimum 3 pour un élément d'interface).

## 3. Règles d'usage

- **Espace de protection** : autour du logo, laissez au moins la hauteur de la pastille sur chaque côté.
- **Taille minimale** : logo horizontal 120 px de large (30 mm en impression) ; symbole complet 40 px ; en dessous, utilisez `malafipro-symbol-small.svg`.
- **Fonds autorisés** : blanc, Papier, Vert profond (version *reversed*), photo sombre et unie (version blanche).
- **Interdits** :
  - déformer ou incliner le logo ;
  - changer les couleurs, ou mettre la pastille en rouge ou en vert ;
  - ajouter une ombre ou un dégradé ;
  - retirer la pastille ;
  - poser le logo couleur sur un fond chargé ;
  - réécrire le nom avec une autre police.

## 4. Typographie de l'interface

- Arabe (UI RTL) : **IBM Plex Sans Arabic** (déjà utilisée dans l'app, à conserver).
- Latin et chiffres : **Inter** (ou IBM Plex Sans), chiffres en `tabular-nums`.

## 5. Avertissements

- Vérification de marque : faites faire une recherche d'antériorité à l'OMPIC (Maroc) avant le dépôt du nom et du logo. Je ne peux pas garantir qu'ils sont libres.
- Couleurs d'impression (CMJN/Pantone) : à faire valider par l'imprimeur sur épreuve. Valeurs de départ : Vert Malafi ≈ C88 M30 Y62 K40 ; Ambre ≈ C0 M36 Y82 K0.
