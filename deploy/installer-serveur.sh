#!/usr/bin/env bash
# Préparation d'un VPS Ubuntu 24.04 neuf pour MalafiPro. À lancer UNE fois, en root :
#   bash deploy/installer-serveur.sh
set -euo pipefail

echo "== Mises à jour"
apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades

echo "== Fuseau horaire Maroc (affichage des journaux ; l'app calcule déjà en Africa/Casablanca)"
timedatectl set-timezone Africa/Casablanca || true

echo "== Mises à jour de sécurité automatiques"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "== Swap 4 Go (filet de sécurité si Chromium dépasse)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
fi

echo "== Docker"
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi
systemctl enable --now docker

echo "== Pare-feu : seulement SSH, HTTP, HTTPS"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "== Protection contre les tentatives de mot de passe SSH"
systemctl enable --now fail2ban

echo "== Dossier des sauvegardes"
mkdir -p /opt/malafipro-sauvegardes && chmod 700 /opt/malafipro-sauvegardes

echo
echo "Serveur prêt. Étape suivante : récupérer le code puis remplir deploy/.env.prod (voir INSTALLATION_VPS.md)."
