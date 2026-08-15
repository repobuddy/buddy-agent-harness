---
name: init
description: Use this skill when initializing, adopting, or migrating a repository's agent configuration to the open AGENTS.md and Agent Skills standards, so one canonical source works across Claude Code, Codex, Cursor, Copilot CLI, and other coding-agent harnesses.
---

# Harness Init

Give the repository one canonical agent configuration — a root `AGENTS.md` and an `.agents/` tree — then bridge the harnesses that cannot read it directly.

Most of the field already reads `.agents/skills/` natively: Codex, Cursor, GitHub Copilot CLI, and Devin Desktop need no projection at all. Only Claude Code and Gemini CLI read solely their own directory and need a link. Keep that asymmetry in mind — this is a consolidation job, not a copy-everywhere job.

`references/standard.md` defines the baseline every repository gets. `references/harnesses.md` routes from there to the per-harness augmentation in `references/<harness>.md` — read only the ones you are enabling.

Work in five phases. Do not skip Phase 3.

## 1. Survey

Locate the Git repository root; the canonical configuration always lives there, including in a monorepo.

Inventory both the canonical surface (`AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/`, `.agents/repobuddy/config.json`) and every pre-existing harness artifact listed in `references/detection.md`. Read what you find. Write nothing yet.

## 2. Classify

Sort each finding into exactly one bucket:

- **already canonical** — leave it.
- **already linked** — a symlink resolving into `.agents/`; skip it. This is what makes re-runs idempotent.
- **consolidatable** — harness instruction files whose content belongs in `AGENTS.md`.
- **portable** — skill and command directories that move into `.agents/skills/`.
- **canonical-only** — MCP servers, rules, subagents, hooks, output styles. No safe cross-harness mapping exists, so report them and leave them alone.

## 3. Confirm

Present the plan before touching anything the user wrote: what will be created, which content moves into `AGENTS.md`, which harness files would become pointers, any frontmatter to be added (show the derived `name` and `description` verbatim), which harnesses will be enabled, and what is being left alone and why.

Get explicit approval before any step that deletes, replaces, or rewrites a user-authored file. Creating a missing directory or a missing `AGENTS.md` needs no approval.

## 4. Apply

1. Scaffold the baseline in `references/standard.md`: `.agents/`, `.agents/skills/`, and a root `AGENTS.md` if absent. Never rewrite an existing `AGENTS.md`.
2. Move approved skills and commands to `.agents/skills/<name>/SKILL.md`, preferring `git mv` so history follows. Fix frontmatter per `references/frontmatter.md` — this is where cross-harness portability is won or lost.
3. Merge approved instruction content into `AGENTS.md`, preserving the author's wording. Append; do not restructure. Replace a harness file with a pointer only where approved.
4. Run `npx -y buddy-agent-harness init` at the repository root. It links `.agents/skills` into the harnesses that need it, skips those that read it natively, and records the enabled set in `.agents/repobuddy/config.json`. Add harnesses the user names with `--harness codex,gemini-cli`.
5. If the command reports a conflict, resolve the named target and retry. Use `--force` only to replace that exact projection; use `--copy` only where links are unavailable.
6. Apply the instruction bridges `init` does not write. Claude Code reads `CLAUDE.md`, not `AGENTS.md` — create a `CLAUDE.md` containing `@AGENTS.md`. Gemini CLI needs `AGENTS.md` added to `context.fileName` in `.gemini/settings.json`. Both are detailed in the matching `references/<harness>.md`; apply only the ones you enabled.

## 5. Verify and report

Confirm each projection resolves into `.agents/skills`, every migrated `SKILL.md` parses and has valid frontmatter, and `config.json` lists the expected harnesses. Report what was created, consolidated, linked, and left canonical-only.

## Rules

- Never invent project policy, and never rewrite a user's `AGENTS.md`.
- Never convert tool settings between formats without a documented mapping. Unmapped settings stay canonical.
- Symlinks belong in version control. Leave them tracked; do not add them to `.gitignore`.
- Only `.agents/skills/` is an established convention. Do not invent `.agents/rules/`, `.agents/commands/`, or `.agents/agents/` and present them as standard.
- Local agent configuration only. Do not change workflows, GitHub Actions, repository settings, security scanning, branch rules, or unrelated project files.
