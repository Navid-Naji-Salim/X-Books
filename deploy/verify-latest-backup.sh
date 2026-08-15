#!/usr/bin/env bash
set -Eeuo pipefail

deployment_directory="${XBOOKS_DEPLOYMENT_DIRECTORY:-/opt/xbooks}"
environment_file="${deployment_directory}/.env.production"
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

cleanup() {
  if [[ "${restore_database_created}" == true ]]; then
    docker compose --env-file .env.production -f docker-compose.production.yml \
      exec -T database dropdb --if-exists --username "${POSTGRES_USER}" "${restore_database}" >/dev/null
  fi
  rm -rf "${temporary_directory}"
}
trap cleanup EXIT

cd "${deployment_directory}"

latest_key="$(AWS_DEFAULT_REGION="${SPACES_REGION}" aws s3api list-objects-v2 \
  --bucket "${SPACES_BUCKET}" \
  --prefix postgres/ \
  --endpoint-url "${SPACES_ENDPOINT}" \
  --query 'sort_by(Contents,&LastModified)[-1].Key' \
  --output text)"

if [[ -z "${latest_key}" || "${latest_key}" == "None" ]]; then
  echo "No PostgreSQL backup exists in the Spaces bucket." >&2
  exit 1
fi

AWS_DEFAULT_REGION="${SPACES_REGION}" aws s3 cp \
  "s3://${SPACES_BUCKET}/${latest_key}" \
  "${encrypted_backup}" \
  --endpoint-url "${SPACES_ENDPOINT}" \
  --only-show-errors

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "${encrypted_backup}" \
  -out "${plain_backup}"

docker compose --env-file .env.production -f docker-compose.production.yml \
  exec -T database dropdb --if-exists --username "${POSTGRES_USER}" "${restore_database}" >/dev/null
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec -T database createdb --username "${POSTGRES_USER}" "${restore_database}"
restore_database_created=true

docker compose --env-file .env.production -f docker-compose.production.yml \
  exec -T database pg_restore \
  --exit-on-error \
  --no-owner \
  --username "${POSTGRES_USER}" \
  --dbname "${restore_database}" < "${plain_backup}"

table_count="$(docker compose --env-file .env.production -f docker-compose.production.yml \
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

echo "Verified ${latest_key}: restored ${table_count} public tables into a temporary database."
