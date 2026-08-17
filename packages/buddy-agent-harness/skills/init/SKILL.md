---
name: init
description: Use this skill when initializing, adopting, or migrating a repository's agent configuration to the open AGENTS.md and Agent Skills standards, so one canonical source works across Claude Code, Codex, Cursor, Copilot CLI, and other agent harnesses.
argument-hint: '[--root <dir>] [--harness <names>] [--copy] [--force]'
---

# Harness Init

Give the repository one canonical agent configuration — a root `AGENTS.md` and an `.agents/` tree — then bridge the harnesses that cannot read it directly.

Most of the field already reads `.agents/skills/` natively: Codex, Cursor, GitHub Copilot CLI, and Devin Desktop need no projection at all. Only Claude Code and Gemini CLI read solely their own directory and need a link. Keep that asymmetry in mind — this is a consolidation job, not a copy-everywhere job.

`references/standard.md` defines the baseline every repository gets. Read the file below for each harness you are enabling, and only those.

| Harness | Skills projection | Instruction bridge | Read |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills` | `CLAUDE.md` with `@AGENTS.md` | `references/harnesses/claude-code.md` |
| Gemini CLI | `.gemini/skills` | `.gemini/settings.json` edit | `references/harnesses/gemini-cli.md` |
| Codex | none | none | `references/harnesses/codex.md` |
| Cursor | none | none written; one gap to report | `references/harnesses/cursor.md` |
| GitHub Copilot CLI | none | none | `references/harnesses/copilot-cli.md` |
| Devin Desktop | none | none | `references/harnesses/devin-desktop.md` |

`init` writes skills projections only. Every instruction bridge above is manual work in Phase 4.

## Arguments

An invocation may carry the command's own flags, most often when `doctor` hands back a repair: `/buddy-agent-harness:init --copy --force`.

Read them from the invocation itself rather than from a placeholder. Claude Code appends what the caller typed as `ARGUMENTS: <value>`, and Codex substitutes nothing at all, so on every harness the flags arrive as text you can read. Writing `$ARGUMENTS` into this body would resolve on Claude Code and stay literal everywhere else.

- `--root`, `--harness`, `--copy`, `--force`, and `--format` pass through to the command in Phase 4.
- Prose carries the same weight: "links are unavailable here" means `--copy`, and "replace the bridge" means `--force`.
- An argument never skips a phase. `--force` still needs the Phase 3 approval, and the survey still runs first.
- Say what you did not recognize and carry on. Never guess at a flag.

Work in five phases. Do not skip Phase 3.

## 1. Survey

Locate the Git repository root; the canonical configuration always lives there, including in a monorepo.

Inventory both the canonical surface (`AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/`, and any nested `AGENTS.md` below the root) and every pre-existing harness artifact listed in `references/detection.md`. Read what you find. Write nothing yet.

## 2. Classify

Sort each finding into exactly one bucket:

- **already canonical** — leave it. Nested `AGENTS.md` files belong here: they are scoped instructions, never content to merge upward.
- **already linked** — a symlink resolving into `.agents/`; skip it. This is what makes re-runs idempotent.
- **consolidatable** — harness instruction files whose content belongs in `AGENTS.md`.
- **portable** — skill and command directories that move into `.agents/skills/`.
- **canonical-only** — MCP servers, rules, subagents, hooks, output styles. No safe cross-harness mapping exists, so report them and leave them alone.

## 3. Confirm

Present the plan before touching anything the user wrote: what will be created, which content moves into `AGENTS.md`, which harness files would become pointers, any frontmatter to be added (show the derived `name` and `description` verbatim), which harnesses will be enabled, and what is being left alone and why.

Get explicit approval before any step that deletes, replaces, or rewrites a user-authored file. Creating a missing directory, a missing `AGENTS.md`, or a `CLAUDE.md` bridge stub needs no approval, and neither does the non-material region in `references/agents-md.md` — report these rather than asking.

One case does need asking even though it only creates a file: a nested `AGENTS.md` that reverses a root rule, where bridging it hands Claude Code a contradiction it has no rule for resolving. Raise that file, bridge the others, and keep going.

## 4. Apply

1. Scaffold the baseline in `references/standard.md`: `.agents/`, `.agents/skills/`, and a root `AGENTS.md` if absent. Never clobber an existing one. `references/agents-md.md` decides what belongs in that file — a repository with no instruction content still needs one derived and confirmed, not an empty heading.
2. Move approved skills and commands to `.agents/skills/<name>/SKILL.md`, preferring `git mv` so history follows. Fix frontmatter per `references/frontmatter.md` — this is where cross-harness portability is won or lost.
3. Merge approved instruction content into `AGENTS.md`, preserving the author's wording. Append; do not restructure. Replace a harness file with a pointer only where approved. Content only some tasks need belongs in a skill, not in `AGENTS.md`.
4. Run `node scripts/init.mjs` at the repository root, resolving that path against this skill's own directory. The launcher runs the CLI that shipped beside it, so nothing is downloaded; fall back to `npx -y buddy-agent-harness@^0.4.1 init` when the path cannot be resolved. It links `.agents/skills` into the harnesses that need it and skips those that read it natively. Add harnesses the user names with `--harness codex,gemini-cli`.
5. If the command reports a conflict, resolve the named target and retry. Use `--force` only to replace that exact projection; use `--copy` only where links are unavailable — a copy is a snapshot, not a live projection, so say so when you fall back.
6. Apply the instruction bridges `init` does not write. Claude Code reads `CLAUDE.md`, not `AGENTS.md` — create a `CLAUDE.md` containing `@AGENTS.md`. Gemini CLI needs `AGENTS.md` added to `context.fileName` in `.gemini/settings.json`. Both are detailed in the matching `references/harnesses/<harness>.md`; apply only the ones you enabled. Where nested `AGENTS.md` files exist, write the same stub in each directory holding one — `references/agents-md.md` covers the one case that stops for approval first.
7. If any bridge now exists, write or restore the non-material region in `AGENTS.md` per `references/agents-md.md`, unless the markers are present and empty. Without it, an agent asked to change a skill edits `.claude/skills/<name>/SKILL.md` — which a link resolves back to canonical, but a copy silently forks. Skip this when every enabled harness reads `.agents/skills/` natively; with no bridge there is nothing to warn about.

## 5. Verify and report

Confirm each projection resolves into `.agents/skills` and that every migrated `SKILL.md` parses and has valid frontmatter. The command reports the enabled set itself; it records nothing on disk, so there is no file to reconcile against. Report what was created, consolidated, linked, and left canonical-only.

`init` is not a formatter. If the repository has one, run it over the written files and say so.

Then offer to continue with the `enhance` skill, which proposes guidance the repository is missing rather than consolidating what it has. Ask once and take the answer; `init` writes no instruction content of its own either way, and `enhance` decides for itself whether anything is worth offering.

## Rules

- Never invent project policy, and never make a material change to a user's `AGENTS.md`. `references/agents-md.md` draws the line: a statement that would stop being true if `init`'s output were removed describes the tool's own artifact and is non-material.
- Never convert tool settings between formats without a documented mapping. Unmapped settings stay canonical.
- Symlinks belong in version control. Leave them tracked; do not add them to `.gitignore`.
- Only `.agents/skills/` is an established convention. Do not invent `.agents/rules/`, `.agents/commands/`, or `.agents/agents/` and present them as standard.
- Never merge a nested `AGENTS.md` into the root. Merging changes which files it governs.
- Do not create `AGENTS.local.md`. The standard has no local-override file — two filenames and two meanings are still under discussion upstream. Personal instructions go in `CLAUDE.local.md`, gitignored, and only Claude Code reads them.
- Local agent configuration only. Do not change workflows, GitHub Actions, repository settings, security scanning, branch rules, or unrelated project files.
