#!/usr/bin/env bash
set -euo pipefail
set -f

[ $# -ne 1 ] && {
  echo "Usage: $0 <manifest-path>" >&2
  exit 1
}

manifest=$1

extract_version() {
  local file=$1
  case "$file" in
    *.toml) grep -m1 -oE '^version = "[0-9]+\.[0-9]+\.[0-9]+"' "$file" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' ;;
    *.json) grep -m1 -oE '"version": "[0-9]+\.[0-9]+\.[0-9]+"' "$file" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' ;;
    *) echo "Unsupported manifest: $file" >&2; exit 1 ;;
  esac
}

version=$(extract_version "$manifest")
[ -z "$version" ] && { echo "Failed to extract version from $manifest" >&2; exit 1; }

run_num="${GITHUB_RUN_NUMBER:-0}"
date_str=$(date -u +%Y%m%d)
sha="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo "0000000")}"
short_sha="${sha:0:7}"

dev_version="${version}-dev.${run_num}.${date_str}.${short_sha}"

echo "$dev_version"
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "DEV_VERSION=$dev_version" >> "$GITHUB_ENV"
fi
