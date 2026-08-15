#!/usr/bin/env bash
set -Eeuo pipefail

deployment_directory="${XBOOKS_DEPLOYMENT_DIRECTORY:-/opt/xbooks}"
environment_file="${deployment_directory}/.env.production"
application_directory="${XBOOKS_APPLICATION_DIRECTORY:-${deployment_directory}/current}"

if [[ ! -f "${application_directory}/docker-compose.production.yml" ]]; then
  application_directory="${deployment_directory}"
fi
compose_file="${application_directory}/docker-compose.production.yml"
restore_database="xbooks_restore_check"
restore_database_created=false

if [[ ! -r "${environment_file}" ]]; then
  echo "Missing ${environment_file}." >&2
  exit 1
fi

set -a
source "${environment_file}"
set +a

for variable_name in POSTGRES_USER BACKUP_ENCRYPTION_KEY SPACES_BUCKET SPACES_ENDPOINT SPACES_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "${variable_name} must be configured before a backup can be verified." >&2
    exit 1
  fi
done

temporary_directory="$(mktemp -d)"
encrypted_backup="${temporary_directory}/latest.dump.enc"
plain_backup="${temporary_directory}/latest.dump"
spaces_host="${SPACES_ENDPOINT#https://}"
spaces_host="${spaces_host#http://}"
spaces_host="${spaces_host%/}"

cleanup() {
  if [[ "${restore_database_created}" == true ]]; then
    docker compose --project-name xbooks --project-directory "${application_directory}" \
      --env-file "${environment_file}" -f "${compose_file}" \
      exec -T database dropdb --if-exists --username "${POSTGRES_USER}" "${restore_database}" >/dev/null
  fi
  rm -rf "${temporary_directory}"
}
trap cleanup EXIT

latest_object="$(s3cmd \
  --access_key="${AWS_ACCESS_KEY_ID}" \
  --secret_key="${AWS_SECRET_ACCESS_KEY}" \
  --host="${spaces_host}" \
  --host-bucket="%(bucket)s.${spaces_host}" \
  --bucket-location="${SPACES_REGION}" \
  ls "s3://${SPACES_BUCKET}/postgres/" | awk '{print $4}' | sort | tail -n 1)"

if [[ -z "${latest_object}" ]]; then
  echo "No PostgreSQL backup exists in the Spaces bucket." >&2
  exit 1
fi

s3cmd \
  --access_key="${AWS_ACCESS_KEY_ID}" \
  --secret_key="${AWS_SECRET_ACCESS_KEY}" \
  --host="${spaces_host}" \
  --host-bucket="%(bucket)s.${spaces_host}" \
  --bucket-location="${SPACES_REGION}" \
  get \
  "${latest_object}" \
  "${encrypted_backup}" \
  --no-progress

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "${encrypted_backup}" \
  -out "${plain_backup}"

docker compose --project-name xbooks --project-directory "${application_directory}" \
  --env-file "${environment_file}" -f "${compose_file}" \
  exec -T database dropdb --if-exists --username "${POSTGRES_USER}" "${restore_database}" >/dev/null
docker compose --project-name xbooks --project-directory "${application_directory}" \
  --env-file "${environment_file}" -f "${compose_file}" \
  exec -T database createdb --username "${POSTGRES_USER}" "${restore_database}"
restore_database_created=true

docker compose --project-name xbooks --project-directory "${application_directory}" \
  --env-file "${environment_file}" -f "${compose_file}" \
  exec -T database pg_restore \
  --exit-on-error \
  --no-owner \
  --username "${POSTGRES_USER}" \
  --dbname "${restore_database}" < "${plain_backup}"

table_count="$(docker compose --project-name xbooks --project-directory "${application_directory}" \
  --env-file "${environment_file}" -f "${compose_file}" \
  exec -T database psql \
  --username "${POSTGRES_USER}" \
  --dbname "${restore_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"

if [[ "${table_count}" -lt 1 ]]; then
  echo "The restored backup contains no public tables." >&2
  exit 1
fi

echo "Verified ${latest_object}: restored ${table_count} public tables into a temporary database."
