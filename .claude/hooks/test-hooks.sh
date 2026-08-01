#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
UNSAFE_PRISMA_HOOK="$ROOT_DIR/.claude/hooks/block-unsafe-prisma.sh"
MIGRATION_HOOK="$ROOT_DIR/.claude/hooks/block-nontransactional-migration.sh"
failures=0

assert_status() {
  local expected=$1
  local name=$2
  local hook=$3
  local payload=$4
  local actual

  set +e
  printf '%s' "$payload" | bash "$hook" >/dev/null 2>&1
  actual=$?
  set -e

  if [[ $actual -ne $expected ]]; then
    printf 'FAIL: %s (expected %s, got %s)\n' "$name" "$expected" "$actual" >&2
    failures=$((failures + 1))
  fi
}

bash_payload() {
  jq -nc --arg command "$1" '{tool_input: {command: $command}}'
}

write_payload() {
  jq -nc --arg file_path "$1" --arg content "$2" \
    '{tool_input: {file_path: $file_path, content: $content}}'
}

assert_status 2 'Bash hook rejects malformed JSON' "$UNSAFE_PRISMA_HOOK" '{'
assert_status 2 'Bash hook requires command text' "$UNSAFE_PRISMA_HOOK" '{"tool_input":{}}'
assert_status 0 'Bash hook allows an ordinary command' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload 'pnpm test')"
assert_status 2 'Bash hook blocks direct migrate reset' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload 'npx prisma migrate reset')"
assert_status 2 'Bash hook blocks a quoted executable command' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload 'bash -c "npx prisma migrate reset"')"
assert_status 2 'Bash hook blocks an executable heredoc body' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload $'bash <<\'SCRIPT\'\nnpx prisma db push\nSCRIPT')"
assert_status 2 'Bash hook blocks protected env-file access' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload 'tail .env.local')"
assert_status 0 'Bash hook allows the committed env template' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload 'cat .env.example')"
assert_status 2 'Bash hook blocks upload-directory traversal' "$UNSAFE_PRISMA_HOOK" \
  "$(bash_payload 'find apps/api/uploads')"

assert_status 2 'Migration hook rejects malformed JSON' "$MIGRATION_HOOK" '{'
assert_status 2 'Migration hook requires a file path' "$MIGRATION_HOOK" '{"tool_input":{}}'
assert_status 0 'Migration hook ignores a valid non-migration write' "$MIGRATION_HOOK" \
  "$(write_payload '/workspace/README.md' 'CONCURRENTLY')"
assert_status 2 'Migration hook requires migration text' "$MIGRATION_HOOK" \
  '{"tool_input":{"file_path":"/workspace/apps/api/prisma/migrations/1_test/migration.sql"}}'
assert_status 2 'Migration hook blocks a non-transactional statement' "$MIGRATION_HOOK" \
  "$(write_payload '/workspace/apps/api/prisma/migrations/1_test/migration.sql' 'CREATE INDEX CONCURRENTLY "idx" ON "T"("id");')"
assert_status 0 'Migration hook allows transactional migration SQL' "$MIGRATION_HOOK" \
  "$(write_payload '/workspace/apps/api/prisma/migrations/1_test/migration.sql' 'CREATE INDEX "idx" ON "T"("id");')"

if [[ $failures -ne 0 ]]; then
  printf '%s hook regression test(s) failed\n' "$failures" >&2
  exit 1
fi

printf 'Hook regression tests passed\n'
