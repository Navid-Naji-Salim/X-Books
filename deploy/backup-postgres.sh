#!/usr/bin/env bash
set -Eeuo pipefail

deployment_directory="${XBOOKS_DEPLOYMENT_DIRECTORY:-/opt/xbooks}"
environment_file="${deployment_directory}/.env.production"

if [[ ! -r "${environment_file}" ]]; then
  echo "Missing ${environment_file}." >&2
  exit 1
fi

set -a
source "${environment_file}"
set +a

for variable_name in POSTGRES_DB POSTGRES_USER BACKUP_ENCRYPTION_KEY SPACES_BUCKET SPACES_ENDPOINT SPACES_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "${variable_name} must be configured before backups can run." >&2
    exit 1
  fi
done

timestamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
temporary_directory="$(mktemp -d)"
plain_backup="${temporary_directory}/xbooks-${timestamp}.dump"
encrypted_backup="${plain_backup}.enc"

cleanup() {
  rm -rf "${temporary_directory}"
}
trap cleanup EXIT

cd "${deployment_directory}"

docker compose --env-file .env.production -f docker-compose.production.yml \
  exec -T database pg_dump \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --format custom \
  --file - > "${plain_backup}"

openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "${plain_backup}" \
  -out "${encrypted_backup}"

AWS_DEFAULT_REGION="${SPACES_REGION}" aws s3 cp \
  "${encrypted_backup}" \
  "s3://${SPACES_BUCKET}/postgres/${timestamp}.dump.enc" \
  --endpoint-url "${SPACES_ENDPOINT}" \
  --only-show-errors

echo "Uploaded encrypted PostgreSQL backup for ${timestamp}."
