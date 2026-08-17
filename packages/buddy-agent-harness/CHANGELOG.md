# buddy-agent-harness

## 0.4.0

### Minor Changes

- 9f1ee23: Run the CLI that ships with the skill, and pin the `npx` fallback.
  
  Both skills told an agent to run `npx -y buddy-agent-harness`, which downloads the package even when an installed plugin already has it on disk. Each skill now ships a launcher at `skills/<name>/scripts/<name>.mjs` that resolves the CLI from its own location, so it runs against the working directory without fetching anything.
  
  `npx` stays documented as the fallback, now pinned to the caret range of the version that generated the skill. Unpinned, a skill from an older install drove whatever npm called latest, and its flags and findings table stopped describing the command it had just run.
  
  The fallback is not redundant. A plugin installed from git is a source checkout whose dependencies are never installed, so the launcher cannot resolve `clibuilder` and `npx` is the only path that works. An npm-installed plugin has them and takes the launcher.
  
  `renderDoctorSkill` now takes the version to pin, and `scripts/generate-doctor-skill.ts` becomes `scripts/generate-skills.ts` (`pnpm skill:gen`), which writes both launchers, regenerates the `doctor` skill, and rewrites the pinned fallback in the hand-written `init` skill. It runs during `changeset version` so the pin follows the release.

## 0.3.1

### Patch Changes

- bebd1d7: Use "agent harness" as the single term for a coding-agent runtime.
  
  The published package description, the three plugin manifests, both READMEs, the project spec, and the `init` skill's `description` all said "coding-agent harness" while the rest of the project said "agent harness". One concept carried two names across exactly the metadata a user reads first, in a package whose own name is `buddy-agent-harness`.
  
  Only the wording changes. The clause edited in the skill `description` sits after the harness names that do the trigger matching, so when the skill loads is unaffected.

## 0.3.0

### Minor Changes

- 46d24e6: Teach the `init` skill to take arguments, so `doctor` can hand it a repair verbatim.
  
  `doctor` names repairs like `--copy --force`, and until now the `init` skill had no documented way to receive them. It now reads flags and their prose equivalents out of the invocation, passes them through to the command in Phase 4, and still stops for the Phase 3 approval that `--force` would otherwise skip.
  
  The mechanism is deliberately not a placeholder. Claude Code appends what the caller typed as `ARGUMENTS: <value>` whenever the body omits `$ARGUMENTS`, Codex skills have no argument mechanism at all, and the Agent Skills spec defines none — so a body that says how to read the invocation is the only form that works everywhere, while a literal `$ARGUMENTS` would resolve on one harness and stay on the page on the rest.
  
  `argument-hint` is added for Claude Code's autocomplete. The new references explain why that field is the exception to harness-specific frontmatter being dropped in silence: claude.ai uploads and the Skills API reject it with a hard error.
- ee027bb: Add a read-only `doctor` command and a generated `doctor` skill.
  
  `doctor` reports whether the skill bridges `init` creates still resolve into `.agents/skills`, deriving the bridge list from the same harness registry `init` projects into. It detects the silent Windows failure — a checkout with `core.symlinks=false` materializes a committed symlink as a regular file holding the target path, and the harness loads zero project skills with no warning — along with missing bridges, symlinks pointing elsewhere, and copies that have drifted from the canonical directory.
  
  A diverged copy is reported with a direction, computed against the last commit where the two sides agreed, so the report says which side moved rather than only that they differ. A tracked copy is also checked for its `skip-worktree` bit, which some checkout and merge operations clear.
  
  The command writes nothing and exits `0` even with findings; each finding names its repair. The command names an `init` invocation for a person at a shell, while the skill hands the same repair to the `init` skill, because rebuilding a bridge can move skills a user wrote. `skills/doctor/SKILL.md` is generated from the same guidance the command prints, with `pnpm skill:doctor:check` in `verify` failing when the committed skill goes stale.
- 46d24e6: Mount the plugin's commands as `agent-harness` rather than `harness`.
  
  `repobuddy` puts every plugin's commands in one namespace, where `harness` is generic enough for a second plugin to want it. The commands are otherwise unchanged: `buddy agent-harness doctor` and `buddy agent-harness init`.
  
  This renames the mount point. A consumer running `buddy harness init` has to update the call; the `npx buddy-agent-harness` invocations are unaffected.
- e46215a: Add `--format text` to `init` and `doctor`.
  
  TOON stays the default because it is what an agent parses. `--format text` renders the same result for a person: scalars as `key: value`, each collection of records as a table with its columns aligned, and lists of names as bullets.
  
  `--format` now rejects an unknown value with `--format must be toon, json, or text.`

### Patch Changes

- 2992e06: Use `codex,gemini-cli` as the `init --harness` help example, matching `doctor`.
  
  The previous example named `windsurf`, which is a deprecated alias for `devin-desktop`, so the one name the help text taught was the one the result reports back as deprecated.

## 0.2.0

### Minor Changes

- 6fc3d80: Adopt the Agent Plugins 1.0.0 canonical manifest. `plugin.json` at the package root is now the single source the vendor manifests are generated from, with skills and per-harness settings under `extensions["org.cyberuni.universal-plugin"]`. The superseded `.plugin/plugin.json` is removed.
- 2988ece: Tell the `init` skill what belongs in `AGENTS.md`.
  
  The skill created the file and said not to invent policy, which left a repository with no existing instruction content getting an empty heading. An empty `AGENTS.md` is worse than none: it looks authoritative and invites the next agent to fill it with guesses.
  
  The new `references/agents-md.md` splits the two cases — consolidate existing instruction content preserving its wording, or derive candidates from the repository and confirm each one with the user before writing. Deriving a fact from `package.json` is not invention; asserting a rule nobody agreed to is.
  
  It also carries the test for whether a line earns its place. `AGENTS.md` is read every session, so a fact the agent could get in one read costs more than it returns, and anything a linter or type checker already enforces is a second source of truth that goes stale. What survives is the constraint that fails a build in a non-obvious way, the workflow with an unguessable step, and the decision that resolves a real ambiguity. Everything else is pushed into a skill, where only its description stays resident and the body loads on match.
- 0d1b8af: Align initialization with how harnesses actually discover skills.
  
  `.agents/skills/` is read natively by Codex, Cursor, and GitHub Copilot CLI, so those harnesses no longer receive projected files. Only Claude Code, Gemini CLI, and Windsurf are linked, and the link is now a single directory-level symlink to `.agents/skills` rather than one symlink per skill — a skill added later appears in every enabled harness without re-running the command.
  
  Claude Code and Cursor are always enabled; other harnesses are added by detection or with the new `--harness` option. The result reports `native` and `linked` harnesses separately so it is clear what was written to disk. Gemini CLI is now a supported harness, and the Cursor, Codex, and Windsurf skill paths have been corrected.
  
  The `init` skill is rewritten as a guided survey → classify → confirm → apply → verify workflow. It detects agent configuration a repository already has — instruction files, skills, commands, subagents, rules, MCP servers, hooks — consolidates what has a safe canonical home, reports the rest, and never rewrites a user-authored file without approval. New references cover per-harness support and the cross-harness frontmatter rules that decide whether a shared skill loads at all.
- 0d1b8af: Add `devin-desktop` and deprecate `windsurf`.
  
  Cognition rebranded Windsurf to Devin Desktop on 2026-06-02. More consequentially, Devin scans nine project-scope skill paths and lists `.agents/skills/` first as the recommended one, so it reads the canonical directory natively and needs no projection at all.
  
  `devin-desktop` is now a supported harness with no projection target. `windsurf` remains accepted as a deprecated alias and still creates the legacy `.windsurf/skills` symlink, which Devin continues to scan — existing repositories keep working unchanged. The initialization result gains a `deprecated` field listing any enabled superseded names alongside their replacements.
  
  This leaves **only Claude Code and Gemini CLI** requiring a skills projection.
  
  Documentation adds Antigravity and VS Code as native `.agents/skills` readers. Neither is a registry entry: both need nothing written, and neither has a safe project-scope detection marker — VS Code's `.vscode/` indicates the editor rather than skills support. Harness Support also now records per-claim evidence confidence and the agent list published by `npx skills`.
- 3fe068e: Support portable plugin manifests for Claude Code, Cursor, Codex, and Copilot CLI.

### Patch Changes

- ab2589a: Update `clibuilder` to v10.
- 22fe775: Document the Claude Code marketplace as the single install path and drop the `npx skills add` instructions, which vendor a copy of the skill into the consumer's harness directories and make the `init` skill's own projection step fail. Rename the plugin marketplace to `repobuddy` so the documented `buddy-agent-harness@repobuddy` install resolves.
