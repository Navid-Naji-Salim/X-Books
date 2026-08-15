#!/usr/bin/env bash
set -Eeuo pipefail

deployment_directory="${XBOOKS_DEPLOYMENT_DIRECTORY:-/opt/xbooks}"
environment_file="${deployment_directory}/.env.production"
application_directory="${XBOOKS_APPLICATION_DIRECTORY:-${deployment_directory}/current}"

if [[ ! -f "${application_directory}/docker-compose.production.yml" ]]; then
  application_directory="${deployment_directory}"
fi
compose_file="${application_directory}/docker-compose.production.yml"

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
spaces_host="${SPACES_ENDPOINT#https://}"
spaces_host="${spaces_host#http://}"
spaces_host="${spaces_host%/}"
retention_days="${BACKUP_RETENTION_DAYS:-35}"

if [[ ! "${retention_days}" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a positive whole number." >&2
  exit 1
fi

s3cmd_arguments=(
  "--access_key=${AWS_ACCESS_KEY_ID}"
  "--secret_key=${AWS_SECRET_ACCESS_KEY}"
  "--host=${spaces_host}"
  "--host-bucket=%(bucket)s.${spaces_host}"
  "--bucket-location=${SPACES_REGION}"
)

cleanup() {
  rm -rf "${temporary_directory}"
}
trap cleanup EXIT

docker compose --project-name xbooks --project-directory "${application_directory}" \
  --env-file "${environment_file}" -f "${compose_file}" \
  exec -T database pg_dump \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --format custom > "${plain_backup}"

openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "${plain_backup}" \
  -out "${encrypted_backup}"

s3cmd "${s3cmd_arguments[@]}" \
  put \
  "${encrypted_backup}" \
  "s3://${SPACES_BUCKET}/postgres/${timestamp}.dump.enc" \
  --no-progress

echo "Uploaded encrypted PostgreSQL backup for ${timestamp}."

cutoff_epoch="$(date -u -d "${retention_days} days ago" +%s)"

while IFS= read -r backup_uri; do
  if [[ "${backup_uri}" =~ ^s3://${SPACES_BUCKET}/postgres/([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2})-([0-9]{2})-([0-9]{2})Z\.dump\.enc$ ]]; then
    backup_epoch="$(date -u -d "${BASH_REMATCH[1]} ${BASH_REMATCH[2]}:${BASH_REMATCH[3]}:${BASH_REMATCH[4]} UTC" +%s)"

    if (( backup_epoch < cutoff_epoch )); then
      s3cmd "${s3cmd_arguments[@]}" del "${backup_uri}"
      echo "Deleted encrypted PostgreSQL backup older than ${retention_days} days: ${backup_uri}"
    fi
  fi
done < <(s3cmd "${s3cmd_arguments[@]}" ls "s3://${SPACES_BUCKET}/postgres/" | awk '{print $4}')
