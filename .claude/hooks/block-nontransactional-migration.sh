#!/usr/bin/env bash
# PreToolUse(Write|Edit): refuse statements inside a Prisma migration that cannot
# run in a transaction. Prisma wraps each migration in one, so CREATE INDEX
# CONCURRENTLY aborts `migrate deploy` mid-migration and reddens CI.
set -uo pipefail

payload=$(cat)

file_path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')
case "$file_path" in
  */prisma/migrations/*.sql) ;;
  *) exit 0 ;;
esac

# Write uses `content`; Edit uses `new_string`.
text=$(printf '%s' "$payload" | jq -r '[.tool_input.content, .tool_input.new_string] | map(select(. != null)) | join("\n")')

if printf '%s' "$text" | grep -Eiq '(create|drop)[[:space:]]+index[[:space:]]+concurrently|concurrently'; then
  cat >&2 <<'MSG'
Blocked: CONCURRENTLY cannot run inside a transaction, and Prisma wraps every
migration in one — `prisma migrate deploy` aborts mid-migration and CI goes red.

Use a plain `CREATE INDEX "..." ON "..."(...)`. See the `migration` skill.
MSG
  exit 2
fi

if printf '%s' "$text" | grep -Eiq 'vacuum|reindex[[:space:]]+database|alter[[:space:]]+system|create[[:space:]]+database|drop[[:space:]]+database'; then
  echo 'Blocked: this statement cannot run inside a transaction, so it will abort `prisma migrate deploy`. Run it manually against the database instead of putting it in a migration.' >&2
  exit 2
fi

exit 0
