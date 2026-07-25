#!/usr/bin/env bash
# PreToolUse(Bash): refuse Prisma commands that are known-broken or destructive
# in this repo. `migrate dev` needs a shadow database the local container does
# not provide and fails after writing partial state; `migrate reset` / `db push`
# discard the hand-authored migration history.
#
# Only real command text is inspected: heredoc bodies and quoted strings are
# stripped first, so a commit message or a grep pattern that merely mentions one
# of these commands is not blocked.
set -uo pipefail

command=$(jq -r '.tool_input.command // ""')

# Drop heredoc bodies (git commit -F -, cat <<'MSG', ...).
code=''
delim=''
while IFS= read -r line; do
  if [[ -n $delim ]]; then
    [[ $line =~ ^[[:space:]]*"$delim"[[:space:]]*$ ]] && delim=''
    continue
  fi
  code+="$line"$'\n'
  if [[ $line =~ \<\<-?[[:space:]]*[\'\"]?([A-Za-z_][A-Za-z0-9_]*) ]]; then
    delim=${BASH_REMATCH[1]}
  fi
done <<<"$command"

# Drop quoted string contents (-m "…", grep '…') and flatten to one line.
code=$(printf '%s' "$code" | sed -e "s/'[^']*'/''/g" -e 's/"[^"]*"/""/g' | tr '\n' ' ')

blocked() {
  printf '%s' "$code" | grep -Eq "$1"
}

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
