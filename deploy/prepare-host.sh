#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y awscli ca-certificates curl docker.io docker-compose-v2 openssl ufw unattended-upgrades

systemctl enable --now docker
systemctl enable --now unattended-upgrades

if ! swapon --show=NAME --noheadings | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

mkdir -p /opt/xbooks
install -m 0644 /opt/xbooks/deploy/xbooks-backup.service /etc/systemd/system/xbooks-backup.service
install -m 0644 /opt/xbooks/deploy/xbooks-backup.timer /etc/systemd/system/xbooks-backup.timer
chmod 0700 /opt/xbooks/deploy/backup-postgres.sh
chmod 0700 /opt/xbooks/deploy/verify-latest-backup.sh

systemctl daemon-reload
systemctl enable xbooks-backup.timer

echo "Host preparation complete. Start X Books after configuring /opt/xbooks/.env.production."
