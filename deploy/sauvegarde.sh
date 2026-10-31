#!/usr/bin/env bash
# Sauvegarde quotidienne de la base (format compressé pg_dump), 14 jours gardés.
# Planifiée par cron (voir INSTALLATION_VPS.md). Copier AUSSI les fichiers hors du VPS.
set -euo pipefail
cd "$(dirname "$0")/.."
DOSSIER=/opt/malafipro-sauvegardes
FICHIER="$DOSSIER/malafipro-$(date +%Y-%m-%d_%H%M).dump"
set -a; . deploy/.env.prod; set +a

docker compose -f docker-compose.prod.yml --env-file deploy/.env.prod exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-mouraqib}" -d "${POSTGRES_DB:-mouraqib_dev}" -Fc > "$FICHIER"

# Une sauvegarde vide ou minuscule = échec (on ne garde pas un faux fichier)
if [ "$(stat -c %s "$FICHIER")" -lt 10000 ]; then echo "Sauvegarde suspecte : $FICHIER" >&2; rm -f "$FICHIER"; exit 1; fi
chmod 600 "$FICHIER"
find "$DOSSIER" -name 'malafipro-*.dump' -mtime +14 -delete
echo "OK $FICHIER ($(du -h "$FICHIER" | cut -f1))"
