#!/usr/bin/env bash
set -Eeuo pipefail

app_host="${1:?Usage: create-production-env.sh <app-host>}"
deployment_directory="${XBOOKS_DEPLOYMENT_DIRECTORY:-/opt/xbooks}"
environment_file="${deployment_directory}/.env.production"

if [[ -e "${environment_file}" ]]; then
  echo "Refusing to replace existing ${environment_file}." >&2
  exit 1
fi

umask 077
temporary_file="$(mktemp "${deployment_directory}/.env.production.XXXXXX")"

cleanup() {
  rm -f "${temporary_file}"
}
trap cleanup EXIT

postgres_password="$(openssl rand -hex 32)"
jwt_secret="$(openssl rand -hex 64)"
backup_key="$(openssl rand -hex 64)"

printf '%s\n' \
  "APP_HOST=${app_host}" \
  'POSTGRES_DB=xbooks' \
  'POSTGRES_USER=xbooks' \
  "POSTGRES_PASSWORD=${postgres_password}" \
  "JWT_SECRET=${jwt_secret}" \
  'SPACES_BUCKET=pending' \
  'SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com' \
  'SPACES_REGION=fra1' \
  'AWS_ACCESS_KEY_ID=pending' \
  'AWS_SECRET_ACCESS_KEY=pending' \
  "BACKUP_ENCRYPTION_KEY=${backup_key}" > "${temporary_file}"

chmod 0600 "${temporary_file}"
mv "${temporary_file}" "${environment_file}"

unset postgres_password jwt_secret backup_key
trap - EXIT

echo "Created ${environment_file} with server-generated secrets."
