#!/usr/bin/env bash
# PreToolUse(Bash): refuse Prisma commands that are known-broken or destructive
# in this repo. `migrate dev` needs a shadow database the local container does
# not provide and fails after writing partial state; `migrate reset` / `db push`
# discard the hand-authored migration history.
#
# Inspect the complete command text, including quoted commands and heredoc
# bodies. This is intentionally fail-closed: shell quoting must not turn into a
# bypass for destructive commands or protected paths.
set -uo pipefail

payload=$(cat)
if ! command=$(
  printf '%s' "$payload" |
    jq -er 'if (.tool_input.command | type) == "string" and (.tool_input.command | length) > 0 then .tool_input.command else error("missing command") end' 2>/dev/null
); then
  echo 'Blocked: could not parse a non-empty Bash command from the hook input.' >&2
  exit 2
fi

code=$(printf '%s' "$command" | tr '\n' ' ')

blocked() {
  printf '%s' "$code" | grep -Eiq "$1"
}

# Exempt only the exact committed template name. Keep longer filenames such as
# `.env.example.bak` intact so they are still treated as protected env files.
protected_code=$(printf '%s' "$code" |
  sed -E 's@(^|[^[:alnum:]_.-])(\./)?\.env\.example([^[:alnum:]_./-]|$)@\1\3@g')
if printf '%s' "$protected_code" | grep -Eiq '(^|[^[:alnum:]_])(\./)?\.env([.][[:alnum:]_-]+)?([^[:alnum:]_-]|$)|(^|[^[:alnum:]_])(\./)?apps/api/uploads(/|[^[:alnum:]_-]|$)'; then
  echo 'Blocked: Bash access to protected environment files or customer uploads is not allowed.' >&2
  exit 2
fi

# `pnpm db:migrate` and `prisma:migrate` are package-script aliases for `migrate dev`.
if blocked 'prisma[[:space:]]+migrate[[:space:]]+dev|(^|[[:space:]])(db:migrate|prisma:migrate)([[:space:]]|$)'; then
  cat >&2 <<'MSG'
Blocked: `prisma migrate dev` does not work here (no shadow database) and leaves
partial state behind.

Hand-author the migration instead:
  1. apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql
  2. pnpm --filter @print-shop/api prisma:validate
  3. pnpm --filter @print-shop/api prisma:deploy
  4. pnpm --filter @print-shop/api prisma:generate

See the `migration` skill (.claude/skills/migration/SKILL.md).
MSG
  exit 2
fi

if blocked 'prisma[[:space:]]+migrate[[:space:]]+reset'; then
  echo 'Blocked: `prisma migrate reset` drops the database. Use `pnpm --filter @print-shop/api prisma:reset-data` (guarded truncate) if you need a clean fixture.' >&2
  exit 2
fi

if blocked 'prisma[[:space:]]+db[[:space:]]+push'; then
  echo 'Blocked: `prisma db push` bypasses the migration history. Write a migration and run prisma:deploy.' >&2
  exit 2
fi

exit 0
