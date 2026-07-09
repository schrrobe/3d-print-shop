<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, always prefix with `rtk`. This reduces context
usage by 60-90% with zero behavior change. If `rtk` has no filter for a command,
it passes through unchanged, so it is always safe to use.

## Key Commands

```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) - shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) - shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules

- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`.
- For debugging, use raw command without `rtk` prefix.
- `rtk proxy <cmd>` runs command without filtering but tracks usage.
<!-- /headroom:rtk-instructions -->

<!-- context7 -->
# Current Documentation Lookup

Use the `ctx7` CLI to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service, including API syntax,
configuration, version migration, library-specific debugging, setup
instructions, and CLI tool usage. Prefer this over web search for library docs.

Do not use for refactoring, writing scripts from scratch, debugging business
logic, code review, or general programming concepts.

## Steps

1. Resolve library: `npx ctx7@latest library <name> "<user's question>"`.
2. Pick the best match by exact name, description relevance, source reputation,
   snippet count, and benchmark score.
3. Fetch docs: `npx ctx7@latest docs <libraryId> "<user's question>"`.
4. Answer using the fetched documentation.

Call `library` first unless the user provides an ID in `/org/project` format.
Do not run more than 3 Context7 commands per question. Do not include sensitive
information in queries.
<!-- context7 -->

# Cross-agent planning and review protocol

`AGENTS.md` is the shared source of truth for both Codex and Claude Code. Keep
instructions here when they should affect both agents; keep agent-specific
behavior in that agent's own file.

For non-trivial changes, start by creating or updating
`docs/agent-handoff/current-plan.md`. The plan should cover the goal, relevant
context, likely files, implementation steps, test plan, risks or assumptions,
and open questions.

Claude Code should use `docs/agent-handoff/current-plan.md` as the active
implementation handoff. Codex should use the same file as the primary artifact
when reviewing Claude's proposed work.

When Codex is asked to review a plan, it should review skeptically for gaps,
incorrect assumptions, missed files, missing tests, and avoidable risk. During a
review, Codex must not implement the plan or edit code unless the user
explicitly asks for implementation.

Codex plan reviews should use this structure:

```markdown
## Verdict

## Blockers

## Risks

## Missing tests

## Suggested plan changes

## Questions for Claude Code
```
