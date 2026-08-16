# buddy-agent-harness

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
