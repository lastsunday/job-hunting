#!/usr/bin/env bash
set -euo pipefail
set -f

TAG_PREFIX=$1
MANIFEST=$2
INCLUDE_PATHS=$3

COMMIT_SCOPE="$TAG_PREFIX"
TAG_PATTERN="${TAG_PREFIX}@[0-9]+\.[0-9]+\.[0-9]+"
CONFIG="$(git rev-parse --show-toplevel)/cliff.toml"
CURRENT=$(grep -oE '[0-9]+\.[0-9]+\.[0-9]+' "$MANIFEST" | head -1)

LATEST_TAG=$(git tag -l "${TAG_PREFIX}@*" --sort=-version:refname | head -1)

if [ -z "$LATEST_TAG" ]; then
  touch CHANGELOG.md && git-cliff --unreleased --tag "$CURRENT" $INCLUDE_PATHS --config "$CONFIG" --prepend CHANGELOG.md
  git add "$MANIFEST" CHANGELOG.md && git commit --no-verify -m "bump($COMMIT_SCOPE): $CURRENT"
  git tag -m "bump($COMMIT_SCOPE): $CURRENT" "${TAG_PREFIX}@$CURRENT"
  echo "✔ First release — tagged ${TAG_PREFIX}@$CURRENT"
  echo "---"
  awk '/^## /{if(++c>1) exit} 1' CHANGELOG.md
  echo "---"
  echo "   Run: git push origin ${TAG_PREFIX}@$CURRENT"
  exit 0
fi

OUTPUT=$(git-cliff --bump --tag-pattern "$TAG_PATTERN" $INCLUDE_PATHS --config "$CONFIG" 2>&1)
echo "$OUTPUT" | grep -q 'There is nothing to bump' && { echo "No unreleased changes."; exit 0; }

NEW=$(echo "$OUTPUT" | grep '^## ' | head -1 | sed 's/^## *//; s/ (.*//; s/.*@//')

case "$MANIFEST" in
  *.toml) sed -i "s/version = \"$CURRENT\"/version = \"$NEW\"/" "$MANIFEST" ;;
  *.json) sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" "$MANIFEST" ;;
esac

touch CHANGELOG.md && git-cliff --unreleased --tag "$NEW" $INCLUDE_PATHS --config "$CONFIG" --prepend CHANGELOG.md
git add "$MANIFEST" CHANGELOG.md && git commit --no-verify -m "bump($COMMIT_SCOPE): $NEW"
git tag -m "bump($COMMIT_SCOPE): $NEW" "${TAG_PREFIX}@$NEW"

echo "✔ Bumped $CURRENT → $NEW, tagged ${TAG_PREFIX}@$NEW"
echo "---"
awk '/^## /{if(++c>1) exit} 1' CHANGELOG.md
echo "---"
echo "   Run: git push origin ${TAG_PREFIX}@$NEW"
