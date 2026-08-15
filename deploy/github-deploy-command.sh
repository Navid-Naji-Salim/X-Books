#!/usr/bin/env bash
set -Eeuo pipefail

release_sha="${SSH_ORIGINAL_COMMAND:-}"
deployment_root="${XBOOKS_DEPLOYMENT_ROOT:-/opt/xbooks}"

if [[ ! "${release_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Only a full Git commit SHA is accepted." >&2
  exit 1
fi

umask 077
archive_path="/tmp/xbooks-${release_sha}.tar.gz"
cat > "${archive_path}"

deployment_script="${deployment_root}/current/deploy/deploy-production.sh"
if [[ ! -x "${deployment_script}" ]]; then
  deployment_script="${deployment_root}/deploy/deploy-production.sh"
fi

exec "${deployment_script}" "${release_sha}"
