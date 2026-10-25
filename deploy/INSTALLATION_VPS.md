# Mettre MalafiPro en ligne sur le VPS Contabo

Durée : environ 1 h la première fois. Toutes les commandes sont à copier-coller.
`IP` = l'adresse de ton VPS (dans l'e-mail de Contabo).

---

## 1. Se connecter au VPS (depuis Windows)

Contabo t'envoie par e-mail : l'**IP**, l'utilisateur **root** et un **mot de passe**.

Ouvre **PowerShell** (menu Démarrer → « PowerShell ») :

```powershell
ssh root@IP
```

- Réponds `yes` à la première question, puis colle le mot de passe (rien ne s'affiche quand tu tapes, c'est normal).
- Change tout de suite le mot de passe : `passwd`

### Recommandé : connexion par clé (plus sûre qu'un mot de passe)

Dans un **nouveau** PowerShell, sur ton PC :

```powershell
ssh-keygen -t ed25519            # Entrée 3 fois
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Teste `ssh root@IP` : il ne doit plus demander de mot de passe. **Seulement si ça marche**, bloque les mots de passe :

```bash
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh
```

---

## 2. Récupérer le code sur le VPS

Le code doit être à jour sur GitHub (pousse d'abord les derniers zips copiés dans ton projet).

```bash
git clone https://github.com/othmandaif/mouraqib.git /opt/malafipro
cd /opt/malafipro
```

Dépôt privé : GitHub demande un nom d'utilisateur et un **mot de passe = jeton** (GitHub → Settings → Developer settings → Personal access tokens → *Fine-grained*, accès en lecture au dépôt `mouraqib`).

---

## 3. Préparer le serveur (une seule fois)

```bash
bash deploy/installer-serveur.sh
```

Installe : mises à jour, Docker, pare-feu (ports 22, 80, 443 seulement), fail2ban, swap 4 Go, fuseau horaire du Maroc.

---

## 4. Faire pointer le domaine vers le VPS

Chez le bureau d'enregistrement où tu as acheté **malafipro.ma**, section **DNS / Zone DNS** :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `@` (ou vide) | `IP` |
| A | `www` | `IP` |

Supprime les anciens enregistrements A ou « parking » s'il y en a. La propagation prend de 5 min à quelques heures. Vérification depuis le VPS : `getent hosts malafipro.ma` doit afficher l'IP.

---

## 5. Remplir la configuration

```bash
cp deploy/env.prod.example deploy/.env.prod
openssl rand -hex 32   # lance-la plusieurs fois pour JWT_SECRET, CREDENTIALS_ENCRYPTION_KEY, POSTGRES_PASSWORD…
nano deploy/.env.prod  # colle les valeurs ; Ctrl+O pour enregistrer, Ctrl+X pour quitter
chmod 600 deploy/.env.prod
```

⚠️ `deploy/.env.prod` contient tous les secrets : il n'est jamais envoyé sur GitHub (déjà exclu par `.gitignore`).

---

## 6. Les données : reprendre ta base locale (recommandé)

Ta base locale contient les **73 tribunaux**, les **textes de loi de l'assistant** (table `chunk_juridique`, qui n'est pas recréée automatiquement) et les comptes déjà créés. On la copie telle quelle.

**Sur ton PC (PowerShell, Docker Desktop lancé)** :

```powershell
docker ps                                   # repère le nom du conteneur postgres, ex. mouraqib-postgres-1
docker exec mouraqib-postgres-1 pg_dump -U mouraqib -d mouraqib_dev -Fc -f /tmp/malafipro.dump
docker cp mouraqib-postgres-1:/tmp/malafipro.dump .
scp malafipro.dump root@IP:/opt/malafipro/
```

**Sur le VPS** :

```bash
cd /opt/malafipro
C="docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod"
$C up -d postgres                     # la base seule, vide
sleep 15
$C cp malafipro.dump postgres:/tmp/malafipro.dump
$C exec postgres pg_restore -U mouraqib -d mouraqib_dev --no-owner /tmp/malafipro.dump
rm malafipro.dump
```

*Variante base neuve* (sans les textes de loi de l'assistant) : saute cette étape et, après l'étape 7, lance `$C run --rm seed` pour insérer les tribunaux.

---

## 7. Lancer MalafiPro

```bash
cd /opt/malafipro
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

Le premier lancement prend **10 à 20 minutes** (construction des images, installation de Chromium). Ensuite :

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod ps        # tout doit être « running » / « healthy »
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod logs -f api   # Ctrl+C pour quitter
```

Ouvre **https://malafipro.ma** : le cadenas HTTPS est créé automatiquement par Caddy (si le DNS de l'étape 4 est prêt).

---

## 8. Créer ton compte commercial (ADMIN)

1. Remplis le formulaire https://malafipro.ma/register avec ton e-mail (il crée une demande « en attente » : normal).
2. Donne-lui le rôle ADMIN :

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod exec postgres \
  psql -U mouraqib -d mouraqib_dev -c "UPDATE \"User\" SET role='ADMIN', statut='ACTIF' WHERE email='ton-email@exemple.ma';"
```

3. Déconnecte-toi, reconnecte-toi : l'écran **/admin** est disponible.

---

## 9. Brancher WhatsApp (Meta)

Dans Meta for Developers → ton app → WhatsApp → **Configuration** → Webhook :

- **URL de rappel** : `https://malafipro.ma/api/v1/webhooks/whatsapp`
- **Jeton de vérification** : la valeur de `WHATSAPP_VERIFY_TOKEN` de `deploy/.env.prod`
- Abonne-toi au champ **messages**.

Après chaque modification de `deploy/.env.prod` : `docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d`

---

## 10. Sauvegardes automatiques (indispensable)

```bash
crontab -e
```

Ajoute cette ligne (sauvegarde chaque nuit à 3 h, 14 jours gardés) :

```
0 3 * * * /opt/malafipro/deploy/sauvegarde.sh >> /var/log/malafipro-sauvegarde.log 2>&1
```

Teste tout de suite : `bash deploy/sauvegarde.sh`

**Une copie doit sortir du VPS** (si le VPS disparaît, les sauvegardes aussi). Le plus simple, chaque semaine depuis ton PC :

```powershell
scp root@IP:/opt/malafipro-sauvegardes/*.dump D:\Sauvegardes-MalafiPro\
```

(Mieux ensuite : un stockage objet dans l'Union européenne, par ex. Contabo Object Storage, avec `rclone`.)

---

## 11. Surveillance

Crée une sonde gratuite (UptimeRobot ou équivalent) sur :
`https://malafipro.ma/api/dossiers/ping` — alerte si le site ne répond plus.

Santé de la chaîne des délais : écran **/admin** (rubrique santé).

---

## Mettre à jour l'application (nouvelle version)

```bash
cd /opt/malafipro
git pull
docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

Les migrations de base s'appliquent toutes seules au démarrage de l'API. Fais une sauvegarde juste avant (`bash deploy/sauvegarde.sh`).

## Commandes utiles

| Besoin | Commande (dans /opt/malafipro, préfixe `docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod`) |
|---|---|
| État des services | `… ps` |
| Journaux de l'API | `… logs -f --tail 200 api` |
| Redémarrer l'API | `… restart api` |
| Mémoire utilisée | `docker stats --no-stream` |
| Arrêter tout | `… stop` |

⛔ **Ne jamais lancer `down -v`** : `-v` supprime les volumes, donc la base de données.

## Restaurer une sauvegarde (en cas de problème)

```bash
C="docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod"
$C stop api web
$C cp /opt/malafipro-sauvegardes/FICHIER.dump postgres:/tmp/r.dump
$C exec postgres pg_restore -U mouraqib -d mouraqib_dev --clean --if-exists --no-owner /tmp/r.dump
$C start api web
```
