---
name: init-buddy-agent-harness
description: Use this skill when initializing, adopting, or migrating a repository's agent configuration to the open AGENTS.md and Agent Skills standards, so one canonical source works across Claude Code, Codex, Cursor, Copilot CLI, and other agent harnesses.
argument-hint: '[--root <dir>] [--harness <names>] [--copy] [--force <targets>]'
---

# Harness Init

Give the repository one canonical agent configuration — a root `AGENTS.md` and an `.agents/` tree — then bridge the harnesses that cannot read it directly.

Most of the field already reads `.agents/skills/` natively: Codex, Cursor, GitHub Copilot CLI, Gemini CLI, and Devin Desktop need no projection at all. Only Claude Code reads solely its own directory and needs a link. Keep that asymmetry in mind — this is a consolidation job, not a copy-everywhere job.

Skills and instructions are separate questions, and the two harnesses that need anything need opposite things. Gemini CLI reads the canonical skills directory and still does not read `AGENTS.md`, so it needs an instruction bridge and no skills projection. Claude Code is the mirror image: it needs the skills link, and it reads `AGENTS.md` itself.

**Every harness here now reads `AGENTS.md`, given nothing in the way.** Claude Code is the one that can be stopped: it reads `AGENTS.md` only where it finds no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` in that directory or above it, so one of those files beside an `AGENTS.md` takes the canonical file out of that harness's context entirely. The instruction job is therefore removal and consolidation, not bridging: **this skill writes no `CLAUDE.md`, ever.**

`references/standard.md` defines the baseline every repository gets. Read the file below for each harness you are enabling, and only those.

| Harness | Skills projection | Instruction bridge | Read |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills` | none — reads `AGENTS.md`; a `CLAUDE.md` suppresses it | `references/harnesses/claude-code.md` |
| Gemini CLI | none | `.gemini/settings.json` edit | `references/harnesses/gemini-cli.md` |
| Codex | none | none | `references/harnesses/codex.md` |
| Cursor | none | none written; one gap to report | `references/harnesses/cursor.md` |
| GitHub Copilot CLI | none | none | `references/harnesses/copilot-cli.md` |
| Devin Desktop | none | none | `references/harnesses/devin-desktop.md` |

`init` writes skills projections only. The one instruction bridge left is manual work in Phase 4, and so is every `CLAUDE.md` removal.

## Arguments

An invocation may carry the command's own flags, most often when `doctor` hands back a repair: `/buddy-agent-harness:init-buddy-agent-harness --copy --force .claude/skills`.

Read them from the invocation itself rather than from a placeholder. Claude Code appends what the caller typed as `ARGUMENTS: <value>`, and Codex substitutes nothing at all, so on every harness the flags arrive as text you can read. Writing `$ARGUMENTS` into this body would resolve on Claude Code and stay literal everywhere else.

- `--root`, `--harness`, `--copy`, `--force`, and `--format` pass through to the command in Phase 4.
- Prose carries the same weight: "links are unavailable here" means `--copy`, and "replace the bridge" means `--force` naming that bridge.
- An argument never skips a phase. `--force` still needs the Phase 3 approval, and the survey still runs first.
- Say what you did not recognize and carry on. Never guess at a flag.

Work in five phases. Do not skip Phase 3.

## 1. Survey

Locate the Git repository root; the canonical configuration always lives there, including in a monorepo.

Inventory both the canonical surface (`AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/`, and any nested `AGENTS.md` below the root) and every pre-existing harness artifact listed in `references/detection.md`. Read what you find. Write nothing yet.

Run `node scripts/doctor.mjs` for the artifacts only one harness can read. It reports each with the canonical form it is a candidate for, and that report is the list — detection lives in the command, so deriving a second one here would drift from it.

## 2. Classify

Sort each finding into exactly one bucket:

- **already canonical** — leave it. Nested `AGENTS.md` files belong here: they are scoped instructions, never content to merge upward.
- **already linked** — a symlink resolving into `.agents/`; skip it. This is what makes re-runs idempotent.
- **superseded** — a `CLAUDE.md` whose whole body is `@AGENTS.md`, or a symlink to it: the bridge this tool wrote before Claude Code read `AGENTS.md` itself. It still works and nothing needs it. Offer its removal in Phase 3; never remove it unasked, and never treat it as content to consolidate.
- **consolidatable** — harness instruction files whose content belongs in `AGENTS.md`. A `CLAUDE.md` with a body of its own is the urgent one: until it moves, Claude Code reads it *instead of* `AGENTS.md`, so every line the rest of the repository maintains is invisible there.
- **portable** — skill and command directories that move into `.agents/skills/`.
- **convertible with judgment** — a rule only one harness reads. Where its guidance is generally true and the paths it names are incidental, a skill carries it to every harness; where the path scoping is the point, nothing reproduces it and the rule stays. Which of the two it is cannot be read off the file, so it is offered and never assumed.
- **canonical-only** — subagents, hooks, output styles, MCP servers. Report them and leave them alone. For the first three there is no cross-harness format to convert into. For MCP there is a mapping, but it is not lossless — some servers cannot be expressed for some hosts, and writing one into another host's format means supplying fields the source never carried. Never convert one.

## 3. Confirm

Present the plan before touching anything the user wrote: what will be created, which content moves into `AGENTS.md`, which harness files would become pointers, any frontmatter to be added (show the derived `name` and `description` verbatim), which harnesses will be enabled, and what is being left alone and why.

Get explicit approval before any step that deletes, replaces, or rewrites a user-authored file. Creating a missing directory or a missing `AGENTS.md` needs no approval, and neither does the non-material region in `references/agents-md.md` — report these rather than asking.

**A superseded `CLAUDE.md` is offered, never assumed.** Deleting it is safe on a current Claude Code and not on every session: a version before v2.1.277, a third-party provider such as Amazon Bedrock, telemetry disabled, or hooks disabled all fall back to reading `CLAUDE.md` alone. Say that, name the file, and take the answer. Keeping it costs nothing — the import never makes Claude read `AGENTS.md` twice.

**List every artifact only one harness can read, and ask about each one separately.** Give its path, what reads it today, and the canonical form it is a candidate for. Ask per artifact rather than for the set: they convert for different reasons and a single yes would carry files the owner never looked at. Say plainly which ones have no candidate at all — a subagent has none — so the list is not read as a queue of pending work.

**A conversion that would narrow what reads the content is not offered without the bridge that prevents it.** Cursor reads `AGENTS.md` in Agent mode only, so moving `.cursorrules` there and deleting it takes that guidance out of Chat and Composer. The offer is therefore always *consolidate into `AGENTS.md` and leave a generated copy behind*, never *consolidate and delete* — `references/harnesses/cursor.md` has the detail. Where no such bridge exists, say so and leave the artifact alone.

`CLAUDE.md` is the one artifact where the generated copy is the harm rather than the safeguard: a copy left behind is read *instead of* `AGENTS.md`, so the consolidation would reach every harness but the one the file was written for. Offer to consolidate and **remove** it, or — where something in it is genuinely Claude-only — to consolidate the shared part and leave the file holding an `@AGENTS.md` import above whatever stays.

A `CLAUDE.local.md` is its own case. It is personal, usually gitignored, and it suppresses `AGENTS.md` exactly as a committed `CLAUDE.md` does. Never consolidate it — it is not project content — and never delete it. Report it, and offer the one fix that keeps both: an `@AGENTS.md` import at the top of it.

## 4. Apply

1. Scaffold the baseline in `references/standard.md`: `.agents/`, `.agents/skills/`, and a root `AGENTS.md` if absent. Never clobber an existing one. `references/agents-md.md` decides what belongs in that file — a repository with no instruction content still needs one derived and confirmed, not an empty heading.
2. Move approved skills and commands to `.agents/skills/<name>/SKILL.md`, preferring `git mv` so history follows. Fix frontmatter per `references/frontmatter.md` — this is where cross-harness portability is won or lost.
3. Merge approved instruction content into `AGENTS.md`, preserving the author's wording. Append; do not restructure. Replace a harness file with a pointer only where approved. Content only some tasks need belongs in a skill, not in `AGENTS.md`.
4. Apply the conversions that were approved, one at a time, and nothing else from the list. A rule approved as a skill moves to `.agents/skills/<name>/SKILL.md` with frontmatter per `references/frontmatter.md`; instruction content approved for consolidation is appended as in the step above and its harness file left as a generated copy — except a `CLAUDE.md`, which is removed or left holding the import, because a copy under that name is read instead of `AGENTS.md`. Everything declined, and everything with no candidate, stays exactly where it is.
5. Run `node scripts/init.mjs` at the repository root, resolving that path against this skill's own directory: `scripts/init.mjs` is a self-contained bundle shipped inside this skill folder through the npm package, so it runs with nothing downloaded and no `node_modules` needed. Fall back to `npx -y buddy-agent-harness@^0.12.0 init` when `scripts/init.mjs` is missing or cannot be run — the case for a skill installed from git rather than from the npm package, which does not carry the bundle. It links `.agents/skills` into the harnesses that need it and skips those that read it natively. Add harnesses the user names with `--harness codex,gemini-cli`.
6. If the command reports a conflict, resolve the named target and retry. Pass the target to `--force` — `--force .claude/skills` replaces that projection and reports any other conflict untouched, where a bare `--force` replaces every conflicting target at once. Reach for the bare form only when replacing all of them is what you came for. Use `--copy` only where links are unavailable — a copy is a snapshot, not a live projection, so say so when you fall back.
7. Apply the instruction work `init` does not do. Gemini CLI needs `AGENTS.md` added to `context.fileName` in `.gemini/settings.json` — the only bridge left, detailed in `references/harnesses/gemini-cli.md`, and only if you enabled it. Then remove each superseded `CLAUDE.md` the user approved, in every directory it was found in, and no others. Write no `CLAUDE.md` anywhere, at the root or beside a nested `AGENTS.md`: Claude Code reads both by itself, and a stub written beside one is the very file that would suppress it if anyone later put content in it.
8. If a skills bridge now exists, write or restore the non-material region in `AGENTS.md` per `references/agents-md.md`, unless the markers are present and empty. Without it, an agent asked to change a skill edits `.claude/skills/<name>/SKILL.md` — which a link resolves back to canonical, but a copy silently forks. Skip this when every enabled harness reads `.agents/skills/` natively; with no bridge there is nothing to warn about.

## 5. Verify and report

Confirm each projection resolves into `.agents/skills`, that no `CLAUDE.md` is left carrying content beside an `AGENTS.md`, and that every migrated `SKILL.md` parses and has valid frontmatter. The command reports the enabled set itself; it records nothing on disk, so there is no file to reconcile against. Report what was created, consolidated, linked, and left canonical-only.

Report the artifacts only one harness can read that are still there, split by why: declined, or no canonical form to convert into. Re-running `doctor` gives the same list, and a repository works toward having none of them — that is a direction, not a state anything here blocks on.

`init` is not a formatter. If the repository has one, run it over the written files and say so.

Then offer to continue with the `enhance` skill, which proposes guidance the repository is missing rather than consolidating what it has. Ask once and take the answer; `init` writes no instruction content of its own either way, and `enhance` decides for itself whether anything is worth offering.

## Rules

- Never write a `CLAUDE.md`. Every harness reads `AGENTS.md`, and the one that can be stopped from reading it is stopped by exactly this file.
- Never invent project policy, and never make a material change to a user's `AGENTS.md`. `references/agents-md.md` draws the line: a statement that would stop being true if `init`'s output were removed describes the tool's own artifact and is non-material.
- Never convert tool settings between formats without a documented mapping. Unmapped settings stay canonical.
- Never convert an artifact only one harness reads without asking, and never in a way that leaves fewer readers than before. The content is the user's, the conversion is a judgment about what their guidance is *for*, and a consolidation with no bridge behind it silently narrows who sees it.
- Edit a user-authored settings file in place: change the one key or array element you came for and leave the rest byte-identical, including key order, indentation, and comments. Harnesses disagree about whether a JSON settings file may hold comments, so reading one with `JSON.parse` and writing the object back either deletes what the author wrote or produces a file the harness rejects. The matching `references/harnesses/<harness>.md` says which case a file is.
- Symlinks belong in version control. Leave them tracked; do not add them to `.gitignore`.
- Only `.agents/skills/` is an established convention. Do not invent `.agents/rules/`, `.agents/commands/`, or `.agents/agents/` and present them as standard.
- Never merge a nested `AGENTS.md` into the root. Merging changes which files it governs.
- Do not create `AGENTS.local.md`. The standard has no local-override file — two filenames and two meanings are still under discussion upstream. Personal instructions go in `CLAUDE.local.md`, gitignored, read by Claude Code alone — and that file suppresses `AGENTS.md` unless it opens with an `@AGENTS.md` import. Say so whenever you point anyone at it.
- Local agent configuration only. Do not change workflows, GitHub Actions, repository settings, security scanning, branch rules, or unrelated project files.
