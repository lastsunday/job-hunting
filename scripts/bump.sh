#!/usr/bin/env bash
set -euo pipefail
set -f

[ $# -lt 2 ] && {
  echo "Usage: $0 <tag-prefix> <manifest> [path ...]" >&2
  exit 1
}

TAG_PREFIX=$1
MANIFEST=$2
shift 2

git diff --quiet HEAD || {
  echo "Working directory is not clean. Commit or stash changes first." >&2
  exit 1
}

INCLUDE_PATHS=()
SCOPE_PARTS=()
for p in "$@"; do
  INCLUDE_PATHS+=(--include-path "$p")
  if [[ "$p" == *"/**" ]]; then
    dir="${p%%/**}"
  else
    dir=$(dirname "$p")
  fi
  SCOPE_PARTS+=("${dir}/")
done

COMMIT_SCOPE="$TAG_PREFIX"
TAG_PATTERN="${TAG_PREFIX}@[0-9]+\.[0-9]+\.[0-9]+"
CONFIG="$(git rev-parse --show-toplevel)/scripts/cliff.toml"

if [ ${#SCOPE_PARTS[@]} -gt 0 ]; then
  _saved_ifs="$IFS"
  IFS='|'
  GIT_CLIFF_INCLUDE_PATTERNS="^(${SCOPE_PARTS[*]})"
  IFS="$_saved_ifs"
  export GIT_CLIFF_INCLUDE_PATTERNS
fi

extract_version() {
  local file=$1
  case "$file" in
    *.toml) grep -m1 -oE '^version = "[0-9]+\.[0-9]+\.[0-9]+"' "$file" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' ;;
    *.json) grep -m1 -oE '"version": "[0-9]+\.[0-9]+\.[0-9]+"' "$file" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' ;;
    *) echo "Unsupported manifest: $file" >&2; exit 1 ;;
  esac
}

update_version() {
  local file=$1 current=$2 new=$3
  case "$file" in
    *.toml) sed -i.bak "s/^version = \"$current\"/version = \"$new\"/" "$file" ;;
    *.json) sed -i.bak "s/\"version\": \"$current\"/\"version\": \"$new\"/" "$file" ;;
  esac
  rm -f "$file.bak"
}

commit_and_tag() {
  local version=$1
  git add "$MANIFEST" CHANGELOG.md
  git commit --no-verify -m "bump($COMMIT_SCOPE): $version"
  git tag -m "bump($COMMIT_SCOPE): $version" "${TAG_PREFIX}@$version"
}

print_recent_changelog() {
  local version=$1
  echo "---"
  awk '/^## /{if(++c>1) exit} 1' CHANGELOG.md
  echo "---"
  echo "   Run: git push origin ${TAG_PREFIX}@$version"
}

CURRENT=$(extract_version "$MANIFEST")
[ -z "$CURRENT" ] && { echo "Failed to extract current version from $MANIFEST" >&2; exit 1; }

LATEST_TAG=$(git tag -l "${TAG_PREFIX}@*" --sort=-version:refname | head -1)

if [ -z "$LATEST_TAG" ]; then
  touch CHANGELOG.md && git-cliff --unreleased --tag "$CURRENT" --tag-pattern "$TAG_PATTERN" "${INCLUDE_PATHS[@]}" --config "$CONFIG" --prepend CHANGELOG.md
  [ -s CHANGELOG.md ] || { echo "No unreleased changes for $TAG_PREFIX."; exit 0; }
  commit_and_tag "$CURRENT"
  echo "✔ First release — tagged ${TAG_PREFIX}@$CURRENT"
  print_recent_changelog "$CURRENT"
  exit 0
fi

RAW=$(git-cliff --bumped-version --tag-pattern "$TAG_PATTERN" "${INCLUDE_PATHS[@]}" --config "$CONFIG" 2>&1) || {
  echo "git-cliff error:" >&2
  echo "$RAW" >&2
  exit 1
}

NEW=$(echo "$RAW" | tail -1)
NEW=${NEW#"${TAG_PREFIX}@"}

[ "$NEW" = "$CURRENT" ] && { echo "No unreleased changes."; exit 0; }

update_version "$MANIFEST" "$CURRENT" "$NEW"
touch CHANGELOG.md && git-cliff --unreleased --tag "$NEW" --tag-pattern "$TAG_PATTERN" "${INCLUDE_PATHS[@]}" --config "$CONFIG" --prepend CHANGELOG.md
commit_and_tag "$NEW"

echo "✔ Bumped $CURRENT → $NEW, tagged ${TAG_PREFIX}@$NEW"
print_recent_changelog "$NEW"
