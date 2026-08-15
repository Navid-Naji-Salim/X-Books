#!/usr/bin/env bash
set -Eeuo pipefail

release_sha="${1:?Usage: deploy-production.sh <commit-sha>}"
deployment_root="${XBOOKS_DEPLOYMENT_ROOT:-/opt/xbooks}"
archive_path="/tmp/xbooks-${release_sha}.tar.gz"
release_directory="${deployment_root}/releases/${release_sha}"
current_link="${deployment_root}/current"
environment_file="${deployment_root}/.env.production"
health_url="https://xbooks.134.209.230.254.sslip.io/api/health"

if [[ ! "${release_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "The release identifier must be a full Git commit SHA." >&2
  exit 1
fi

if [[ ! -r "${archive_path}" || ! -r "${environment_file}" ]]; then
  echo "Missing release archive or production environment file." >&2
  exit 1
fi

previous_release=""
if [[ -L "${current_link}" ]]; then
  previous_release="$(readlink -f "${current_link}")"
elif [[ -f "${deployment_root}/docker-compose.production.yml" ]]; then
  previous_release="${deployment_root}"
fi

mkdir -p "${release_directory}"
tar -xzf "${archive_path}" -C "${release_directory}"
rm -f "${archive_path}"

compose() {
  local application_directory="$1"
  shift
  docker compose --project-name xbooks \
    --project-directory "${application_directory}" \
    --env-file "${environment_file}" \
    -f "${application_directory}/docker-compose.production.yml" "$@"
}

rollback() {
  local exit_code=$?
  if [[ -n "${previous_release}" && -f "${previous_release}/docker-compose.production.yml" ]]; then
    echo "Deployment failed; restoring the previous release." >&2
    compose "${previous_release}" up -d --build --remove-orphans || true
  fi
  exit "${exit_code}"
}
trap rollback ERR

compose "${release_directory}" up -d --build --remove-orphans

healthy=false
for _ in {1..24}; do
  if curl --fail --silent --show-error --max-time 10 "${health_url}" >/dev/null; then
    healthy=true
    break
  fi
  sleep 5
done

if [[ "${healthy}" != true ]]; then
  echo "The new release did not become healthy." >&2
  exit 1
fi

ln -sfn "${release_directory}" "${current_link}.next"
mv -Tf "${current_link}.next" "${current_link}"

install -m 0644 "${release_directory}/deploy/xbooks-backup.service" /etc/systemd/system/xbooks-backup.service
install -m 0644 "${release_directory}/deploy/xbooks-backup.timer" /etc/systemd/system/xbooks-backup.timer
systemctl daemon-reload
systemctl enable --now xbooks-backup.timer

trap - ERR
echo "Deployed ${release_sha} and verified ${health_url}."
