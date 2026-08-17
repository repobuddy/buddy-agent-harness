# Evidence — Agentic Configuration Standards

Status values: `confirmed`, `contested`, `thin`. Confidence: high / medium / low.

## E-STD-01 — AGENTS.md is stewarded by the Agentic AI Foundation

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: AGENTS.md — https://agents.md/ — official spec site
- **Notes**: "now stewarded by the Agentic AI Foundation under the Linux Foundation." No mandatory fields; plain Markdown. Nearest-file-wins: "The closest AGENTS.md to the edited file wins; explicit user chat prompts override everything." 25+ listed compatible tools, "over 60k open-source projects."

## E-STD-02 — Agent Skills spec defines contents, not location

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: Agent Skills Specification — https://agentskills.io/specification — official spec
- **Notes**: Required `name` (1–64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens, **must match parent directory name**) and `description` (1–1024). Optional `license`, `compatibility` (≤500), `metadata` (string→string map), `allowed-tools` (space-separated, experimental). Optional dirs `scripts/`, `references/`, `assets/`. Progressive disclosure: metadata ~100 tokens at startup, body <5000 tokens on activation, resources on demand. Recommends SKILL.md under 500 lines. Validation via `skills-ref validate`. **Contains no discovery-path section.**

## E-AGT-01 — `.agents/skills/` is a convention documented outside the spec

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: "How to add skills support to your agent" — https://agentskills.io/client-implementation/adding-skills-support — official client-implementation guide
- **Notes**: Verbatim: "The `.agents/skills/` paths have emerged as a widely-adopted convention for cross-client skill sharing. While the Agent Skills specification does not mandate where skill directories live (it only defines what goes inside them), scanning `.agents/skills/` means skills installed by other compliant clients are automatically visible to yours, and vice versa." Publishes the four-cell table: `<project>/.<your-client>/skills/`, `<project>/.agents/skills/`, `~/.<your-client>/skills/`, `~/.agents/skills/`. Notes some implementations also scan `.claude/skills/` "for pragmatic compatibility, since many existing skills are installed there," plus ancestor dirs to git root, XDG dirs, and user-configured paths.
- **This is the closest thing to a source of authority for `.agents/`.**

## E-AGT-02 — `npx skills` is the reference implementation of the convention

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: vercel-labs/skills — https://github.com/vercel-labs/skills — implementation, Vercel Labs
- **Notes**: 75 supported agents. Agents flagged `isUniversal: true` read `.agents/skills/` directly; non-universal agents receive symlinks (recommended) or copies (`--copy` fallback) from a canonical copy. Project scope `.agents/skills/`; global `~/.agents/skills/` or `~/.config/agents/skills/` on XDG systems. Install method prompt: "Symlink (Recommended) | Creates symlinks from each agent to a canonical copy. Single source of truth, easy updates."

## E-AGT-03 — Global canonical path is contested

- **Date**: 2026-08
- **Status**: contested
- **Confidence**: low
- **Source**: vercel-labs/skills README + issues #519, #693, #896, #1060; vendor docs
- **Notes**: `npx skills` documents `~/.agents/skills/` *or* `~/.config/agents/skills/`. Codex, Copilot CLI, and Cursor docs only ever name `~/.agents/skills`. Unresolved which wins on an XDG system.

## E-CODEX-01 — Codex skill search paths

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: OpenAI Codex — https://learn.chatgpt.com/docs/build-skills.md (redirected from developers.openai.com/codex/skills.md) — official docs
- **Notes**: `$CWD/.agents/skills`, `$CWD/../.agents/skills`, `$REPO_ROOT/.agents/skills`, `$HOME/.agents/skills`, `/etc/codex/skills`, plus bundled. Required frontmatter `name`, `description`. Optional `agents/openai.yaml` sidecar for display name, icons, brand color, `allow_implicit_invocation` (default `true`), and MCP server dependency declarations.

## E-COPILOT-01 — Copilot CLI skill paths and frontmatter

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: GitHub Docs — https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills — official docs
- **Notes**: Project scope `.github/skills`, `.claude/skills`, `.agents/skills` — all three supported. Personal scope `~/.copilot/skills`, `~/.agents/skills`. Frontmatter required `name`, `description`; optional `license`, `allowed-tools`. Session commands `/skills reload`, `/skills list`, `/skills info`, `/skills add`.

## E-CUR-01 — Cursor skill paths and extra frontmatter

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: Cursor docs — https://cursor.com/docs/skills — official docs
- **Notes**: Project `.agents/skills/`, `.cursor/skills/`. User `~/.agents/skills/`, `~/.cursor/skills/`. Verbatim: "For compatibility, Cursor also loads skills from Claude and Codex directories: `.claude/skills/`, `.codex/skills/`, `~/.claude/skills/`, and `~/.codex/skills/`." Discovers skills in nested project subdirectories. Frontmatter: `name`, `description` required; `paths`, `disable-model-invocation`, `metadata` optional; legacy `globs` accepted as fallback.

## E-CC-01 — Claude Code does not read `.agents/skills`

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs — https://code.claude.com/docs/en/skills — official docs
- **Notes**: Personal `~/.claude/skills/<name>/SKILL.md`, project `.claude/skills/<name>/SKILL.md`. Project skills load from `.claude/skills/` in the launch directory and every parent up to the repo root. Nested `.claude/skills/` below the launch dir load lazily on first file access in that subtree. No `.agents/` path anywhere in the document. Precedence: enterprise > personal > project. `.claude/commands/*.md` and `.claude/skills/*/SKILL.md` both produce `/name`; **custom commands have been merged into skills**.

## E-CC-02 — Claude Code documents per-skill symlinks; directory symlink verified separately

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs (per-skill) + maintainer empirical test (directory-level)
- **Notes**: Docs verbatim: "A `<skill-name>` entry in the enterprise, personal, or project locations can be a symlink to a directory elsewhere on disk. Claude Code follows the symlink and reads `SKILL.md` from the target directory, and if the same target is reachable from more than one location, Claude Code loads the skill once." Symlinking the `.claude/skills` **directory itself** is undocumented but **tested working** by the maintainer (August 2026). Treat as supported-in-practice, unsupported-in-contract.

## E-CC-03 — Claude Code does not read AGENTS.md

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs — https://code.claude.com/docs/en/memory — official docs
- **Notes**: Verbatim: "Claude Code reads `CLAUDE.md`, not `AGENTS.md`." Prescribed bridges: a `CLAUDE.md` containing `@AGENTS.md` (import expands at session start, Claude-specific content may follow), or `ln -s AGENTS.md CLAUDE.md` when no Claude-specific content is needed. On Windows the symlink needs Administrator or Developer Mode, so the import is preferred. `/init` reads `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`; with `CLAUDE_CODE_NEW_INIT=1` it also reads `AGENTS.md`, `.devin/rules/`, `.windsurf/rules/`, `.windsurfrules`, `.clinerules`. `/import` (v2.1.213+) appends a one-time copy of instruction files and carries over MCP servers, commands, subagents, and skills.

## E-CC-04 — Claude Code cannot read `~/.agents/skills` (bug report)

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: medium
- **Source**: vercel-labs/skills issue #693 — https://github.com/vercel-labs/skills/issues/693 — issue thread
- **Notes**: "[Bug]: Claude Code cannot read globally installed skills from ~/.agents/skills". Independent corroboration of E-CC-01 at user scope.

## E-CUR-02 — Cursor reads AGENTS.md only in Agent mode

- **Date**: 2026-08
- **Status**: thin
- **Confidence**: medium
- **Source**: secondary comparisons (thepromptshelf.dev, agent-ready.dev, codersera.com) — not primary Cursor docs
- **Notes**: Agent mode reads AGENTS.md and `.cursor/rules/*.mdc`, not root `.cursorrules`. Chat/Composer read `.cursorrules` and `.cursor/rules/*.mdc` but **not** AGENTS.md. `.cursorrules` deprecated but still read; no globs, frontmatter, or per-mode activation. **Needs primary-source confirmation.**

## E-GEM-01 — Gemini CLI paths and configurable context filename

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: medium
- **Source**: gemini-cli docs — https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/skills.md, geminicli.com/docs/cli/gemini-md/, issue #12345
- **Notes**: Project skills at `.gemini/skills/<name>/SKILL.md`; user skills at `~/.gemini/skills/` or the `~/.agents/skills/` alias. Instructions default to `GEMINI.md`; `settings.json` `context.fileName` accepts an array such as `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]`. AGENTS.md not in the default list (issue #12345 open).

## E-WS-01 — Windsurf skills support is not primary-sourced

**Superseded by E-WS-02 (2026-08-14) on both counts.** Retained for provenance; do not cite.

- **Date**: 2026-08
- **Status**: thin
- **Confidence**: low
- **Source**: agensi.io Windsurf skills guide; vercel-labs/skills path table
- **Notes**: `.windsurf/skills/` project, `~/.codeium/windsurf/skills/` global. One source says Windsurf requires adding skill contents to Windsurf rules configuration instead. No `.agents/` support. **No primary Windsurf doc located.**

## E-WS-02 — Windsurf was rebranded to Devin Desktop, and reads `.agents/skills`

- **Date**: 2026-08-14
- **Status**: confirmed
- **Confidence**: high (rebrand), medium (Desktop scope)
- **Source**: Devin blog — https://devin.ai/blog/windsurf-is-now-devin-desktop — official vendor announcement; Devin docs — https://docs.devin.ai/product-guides/skills — official docs
- **Notes**: Cognition rebranded Windsurf to **Devin Desktop** on **2026-06-02**, delivered as an over-the-air update with plans, settings, and extensions carried over. Cascade's successor as the local agent is **Devin Local**, rewritten in Rust.

  Devin scans **nine** project-scope skill paths in every repository, verbatim ordering: `.agents/skills/` (**recommended**), `.devin/skills/`, `.github/skills/`, `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.cognition/skills/`, `.windsurf/skills/`, `.codeium/skills/`. The docs state *"All nine paths are scanned in every repo."* No user-scope path is documented.

  **This supersedes E-WS-01 on both counts.** Windsurf/Devin Desktop is a **native `.agents/skills` reader**, not a projection target, and it does support `SKILL.md` — resolving the contradiction E-WS-01 recorded. The legacy `.windsurf/skills/` path is still scanned, so an existing projection remains functional but is redundant.

  **Caveat**: the skills page does not state whether it describes Devin Desktop, Devin cloud, or both — it refers to "Devin's backend" indexing repositories without distinguishing client from deployment model. Treat native `.agents/skills` support *specifically in Devin Desktop* as medium confidence until a Desktop-scoped source confirms it.

## E-FM-01 — Frontmatter field support diverges by harness

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: medium
- **Source**: vercel-labs/skills compatibility matrix + individual vendor docs
- **Notes**: "Basic skills" universal. `allowed-tools` supported by most, **not** Kiro CLI or Zencoder. `context: fork` **Claude Code only**. Hooks: Claude Code, Cline, Kiro CLI. Cursor adds `paths`, `disable-model-invocation`, legacy `globs`. Copilot adds `model`. Codex uses the `agents/openai.yaml` sidecar. Unrecognized fields are silently dropped by each harness — the cross-harness context tax.

## E-FM-02 — Claude Code's `name` semantics deviate from the spec

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs — https://code.claude.com/docs/en/skills
- **Notes**: "In a personal or project skill, `name` sets only the display label shown in skill listings, and the command still comes from the directory name." The spec requires `name` to match the parent directory — complying with the spec makes the deviation invisible, which is a reason to enforce it.

## E-FM-03 — Lenient validation is the prescribed cross-client behavior

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: https://agentskills.io/client-implementation/adding-skills-support
- **Notes**: name ≠ parent dir → warn, load anyway. name > 64 → warn, load anyway. description missing/empty → **skip**. YAML unparseable → **skip**. Explicit warning about the most common real break: an unquoted colon in a description (`description: Use this skill when: the user asks about PDFs`) is invalid YAML some parsers accept; guide suggests a quoting/block-scalar retry fallback.

## E-AG-01 — Antigravity reads `.agents/skills` natively

- **Date**: 2026-08-14
- **Status**: confirmed
- **Confidence**: high (skills paths), unknown (instructions)
- **Source**: Antigravity docs — https://antigravity.google/docs/skills — official docs
- **Notes**: Workspace scope `<workspace-root>/.agents/skills/<skill-folder>/`. Global scope `~/.gemini/config/skills/<skill-folder>/`. Docs state: *"Antigravity now defaults to .agents/skills, but still maintains backward support for .agent/skills"* (note the singular `.agent`). `SKILL.md` required.

  **Antigravity is native — no projection needed.** Note the contrast with Gemini CLI: both are Google products, but Gemini CLI reads only `.gemini/skills/` at project scope and *does* need a projection. They are not interchangeable and must stay separate registry entries.

  **No project-scope vendor directory is documented**, so there is no reliable detection marker; the global path lives under `~/.gemini/config/`, which belongs to a different product.

  The docs page covers skills only. Whether Antigravity reads `AGENTS.md` for repository instructions is **not established** — do not assert it either way.

## E-VSC-01 — VS Code reads `.agents/skills` natively

- **Date**: 2026-08-14
- **Status**: confirmed
- **Confidence**: medium
- **Source**: VS Code docs — https://code.visualstudio.com/docs/agent-customization/agent-skills — official docs
- **Notes**: Project scope `.github/skills/`, `.claude/skills/`, `.agents/skills/`. Personal scope `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/`. Introduced experimentally in VS Code 1.108.

  This is GitHub Copilot *in VS Code*, and its path set matches Copilot CLI (E-COPILOT-01). **Native — no projection needed.**

  **Detection hazard**: the obvious marker `.vscode/` indicates the editor, not Copilot skills support, and exists in repositories with no agent configuration at all. Using it to auto-enable a harness would false-positive broadly.

## E-ECO-02 — Harnesses supported by `npx skills`

- **Date**: 2026-08-14
- **Status**: confirmed
- **Confidence**: medium
- **Source**: skills.sh agent listing — https://www.skills.sh/agent
- **Notes**: The public listing names **20** agents: Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini, Cline, AMP, Antigravity, OpenClaw, Droid (Factory), Goose (Block), Kilo, Kiro CLI, Nous Research, OpenCode, Roo (Roo Code), Trae, VS Code, Zed.

  **Contradiction**: the `vercel-labs/skills` README claims 75 supported agents (E-AGT-02), while this listing page shows 20. Unresolved — the README figure may count variants or unlisted adapters. Cite the count with that caveat, or cite the list rather than a number.

  The listing does not publish the per-agent `isUniversal` flag or skills directory paths, so the universal/non-universal split for these agents cannot be read off this page. It still names **Windsurf** rather than Devin Desktop, so the listing lags the 2026-06-02 rebrand (E-WS-02).

## E-ECO-01 — Ecosystem scale

- **Date**: 2026-08
- **Status**: confirmed
- **Confidence**: high
- **Source**: https://agentskills.io/clients.md ; skills.sh
- **Notes**: ~46 clients on the official showcase including Claude Code, Codex, Cursor, GitHub Copilot, VS Code, Gemini CLI, Goose, OpenCode, Amp, Junie, Kiro, Factory, Roo Code, Databricks Genie Code, Snowflake Cortex Code, Laravel Boost, Spring AI. `npx skills` claims 75 agents. Spec published as open standard 2025-12-18; governance at AAIF alongside MCP.

## E-STD-03 — Nested `AGENTS.md` is supported, and the published rule is nearest-file-wins

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: AGENTS.md — https://agents.md/ — official site, body copy and FAQ
- **Notes**: Verbatim: "Large monorepo? Use nested AGENTS.md files for subprojects. Place another AGENTS.md inside each package. Agents automatically read the nearest file in the directory tree, so the closest one takes precedence and every subproject can ship tailored instructions." FAQ, verbatim: "The closest AGENTS.md to the edited file wins; explicit user chat prompts override everything." Cites the main OpenAI repo as carrying 88 `AGENTS.md` files at time of writing.

  The site states **precedence**, not merge semantics. It does not say whether a nested file inherits ancestor content and overrides selectively, or replaces it wholesale. Do not assert either reading as published behavior — see E-STD-04, which would settle it in the inheriting direction but is unratified.

## E-STD-04 — A v1.1 proposal would change nested resolution from override to accumulation

- **Date**: 2026-08-15
- **Status**: contested
- **Confidence**: high (that the proposal exists and says this) / low (that it will be adopted)
- **Source**: agentsmd/agents.md issue #135 — https://github.com/agentsmd/agents.md/issues/135
- **Notes**: Open, no maintainer response at time of reading. Proposes two named principles. Accumulation, verbatim: "Guidance accumulates as you traverse the directory tree. A local AGENTS.md file extends and builds upon the guidance in ancestor AGENTS.md files rather than replacing it entirely." Precedence, verbatim: "When guidance conflicts, more specific instructions take precedence over more general ones. Local AGENTS.md files override ancestor AGENTS.md files."

  This is **not** the published rule. It matters because it moves the standard toward Claude Code's existing behavior (E-CC-05) rather than away from it, so the current divergence may be transitional. Cite as a live proposal, never as the standard.

## E-STD-05 — The standard has no local-override file; three open issues request one

- **Date**: 2026-08-15
- **Status**: confirmed (absence) / contested (proposals)
- **Confidence**: high
- **Source**: https://agents.md/ ; agentsmd/agents.md issues #13, #72, #211
- **Notes**: The published site does not mention `AGENTS.local.md`, `AGENTS.override.md`, or any gitignored/personal variant anywhere, including the FAQ. Three open issues request the capability: #13 "Feature Request: Allow uncommitted AGENTS files" (Aug 2025), #72 "Maintaining local preferences" (Sep 2025), #211 "Define AGENTS.md implementation specification document for standardization" (Jun 2026).

  #211 names both candidate filenames — "AGENTS.local.md (or AGENTS.override.md)" — and leans **additive** rather than overriding. Neither the filename nor the semantics is settled. Third-party blog posts recommending `AGENTS.local.md` with override semantics are describing a convention of their own, not the standard; do not cite them as such.

## E-CC-05 — Claude Code concatenates every discovered `CLAUDE.md` rather than overriding

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code memory documentation — https://code.claude.com/docs/en/memory
- **Notes**: Verbatim: "All discovered files are concatenated into context rather than overriding each other. Across the directory tree, content is ordered from the filesystem root down to your working directory... so instructions closer to where you launched Claude are read last." Nesting below the working directory, verbatim: "Claude also discovers `CLAUDE.md` and `CLAUDE.local.md` files in subdirectories under your current working directory. Instead of loading them at launch, they are included when Claude reads files in those subdirectories."

  Conflicts are explicitly **undefined**, verbatim: "if two rules contradict each other, Claude may pick one arbitrarily." So proximity buys recency, not authority — the opposite of E-STD-03's published rule.

  Same page confirms the Windows symlink guidance this project already gives, verbatim: "On Windows, creating a symlink requires Administrator privileges or Developer Mode, so use the `@AGENTS.md` import instead."

## E-CC-06 — `claudeMdExcludes` is the only lever over which instruction files load

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code memory documentation — https://code.claude.com/docs/en/memory
- **Notes**: Verbatim: "In large monorepos, ancestor CLAUDE.md files may contain instructions that aren't relevant to your work. The `claudeMdExcludes` setting lets you skip specific files by path or glob pattern." Patterns match **absolute** paths using glob syntax; also matches `.claude/rules/**` directories. Configurable at any settings layer — user, project, local, or managed policy — and "Arrays merge across layers." Managed policy `CLAUDE.md` cannot be excluded.

  It subtracts whole files only, so it cannot express "the nested file wins on conflicts." It is a mitigation for unwanted inheritance, not an implementation of E-STD-03.

## E-STD-06 — The spec caps reference-chain depth, not directory depth

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Agent Skills Specification — https://agentskills.io/specification — official spec
- **Notes**: Verbatim, under File references: "When referencing other files in your skill, use relative paths from the skill root... Keep file references one level deep from `SKILL.md`. Avoid deeply nested reference chains."

  The first sentence reads as a ban on subdirectories; the second glosses it as being about **chains** — `SKILL.md` → A → B — not path depth. A file two directories down that `SKILL.md` links to directly is one hop. Layout is explicitly unconstrained: "A skill directory may contain any files and directories beyond the required `SKILL.md`. The conventions below are recommendations," and the canonical tree ends with "Any additional files or directories."

  `skills-ref validate` checks frontmatter and naming only, so neither reading is enforced by tooling.

## E-CC-07 — Claude Code skill frontmatter carries runtime controls, all turn-scoped

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code skills documentation — https://code.claude.com/docs/en/skills — primary vendor documentation
- **Notes**: The frontmatter reference documents runtime fields beyond selection: `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `paths`, `shell`, plus `when_to_use`, `argument-hint`, and `arguments`.

  The scoping is the load-bearing detail, and it is narrower than "while the skill is active". Verbatim on `allowed-tools`: "grants permission for the listed tools during the turn that invokes the skill... The grant clears when you send your next message." On `disallowed-tools`: "The restriction clears when you send your next message." On `model`: "The override applies for the rest of the current turn and is not saved to settings; the session model resumes on your next prompt."

  `allowed-tools` grants and does not fence, verbatim: "It does not restrict which tools are available: every tool remains callable, and your permission settings still govern tools that are not listed."

  Skill content itself persists where permissions do not, verbatim: "the rendered `SKILL.md` content enters the conversation as a single message and stays there for the rest of the session."

## E-CC-08 — `user-invocable` and `disable-model-invocation` are independent axes

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code skills documentation — https://code.claude.com/docs/en/skills — primary vendor documentation
- **Notes**: `disable-model-invocation: true`, verbatim: "prevent Claude from automatically loading this skill... Also prevents the skill from being preloaded into subagents." `user-invocable: false`, verbatim: "Claude Code hides it from the `/` menu and doesn't run it when you type `/name`."

  The page's own comparison table separates them: `disable-model-invocation: true` yields user-invocable yes / model-invocable no, with "Description not in context"; `user-invocable: false` yields user-invocable no / model-invocable yes, with "Description always in context".

  So a visibility flag does not suppress description matching — the description remains the selection basis. This is the primary source for the claim that hiding a skill from the menu is not a way to stop it being auto-selected.

## E-CC-09 — A missing `description` falls back to the body's first paragraph

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code skills documentation — https://code.claude.com/docs/en/skills — primary vendor documentation
- **Notes**: Verbatim on `description`: "If omitted, uses the first paragraph of markdown content."

  Consequence for by-name-only skills: omitting or blanking the description does not make a skill unmatchable on Claude Code — it silently promotes the body's opening prose to the trigger. An explicit minimal marker string is required instead. Note this diverges from the Agent Skills spec's lenient-validation guidance (E-FM-03), where a missing description causes the skill to be **skipped**; the two behaviors are opposite, so a skill relying on either is not portable.

## E-CC-10 — Custom commands are merged into skills, not deprecated

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code skills documentation — https://code.claude.com/docs/en/skills — primary vendor documentation
- **Notes**: Verbatim: "**Custom commands have been merged into skills.** A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way. Your existing `.claude/commands/` files keep working."

  Corrects the common secondary-source claim that `commands/` is deprecated. The documented position is equivalence plus a feature superset on the skill side: "Skills add optional features: a directory for supporting files, frontmatter to control whether you or Claude invokes them, and the ability for Claude to load them automatically when relevant."

## E-CC-11 — Agent definitions hold the controls skills cannot express

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code subagents documentation — https://code.claude.com/docs/en/sub-agents — primary vendor documentation
- **Notes**: Agent frontmatter documents `tools`, `disallowedTools`, `model`, `effort`, `maxTurns`, `skills`, `permissionMode`, `memory`, `mcpServers`, and `isolation`. `tools` closes the set, verbatim: "Tools the subagent can use. Inherits every tool available to subagents if omitted."

  `skills` preloads rather than gates, verbatim: "Skills to preload into the subagent's context at startup. The full skill content is injected, not only the description. Subagents can still invoke unlisted project, user, and plugin skills through the Skill tool."

  The preload restriction, verbatim: "You can't preload skills that set `disable-model-invocation: true`, since preloading draws from the same set of skills Claude can invoke."

  So the honest reasons to reach for an agent definition over a skill are a closed tool allowlist, `permissionMode`, `maxTurns`, `memory`, `mcpServers`, and worktree `isolation` — not a model or effort override, which a skill can set turn-scoped (E-CC-07).

## E-CUR-03 — Cursor rules select by glob, description, or neither

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: Cursor rules documentation — https://cursor.com/docs/context/rules — primary vendor documentation
- **Notes**: Three frontmatter fields in `.cursor/rules/` decide activation: `alwaysApply` (boolean, applies to every session), `description` (the Agent "reads the description and pulls the rule in when relevant"), and `globs` (auto-attaches when matching files enter context).

  The four documented rule types are combinations: `alwaysApply: true` (other fields ignored); `description` with `alwaysApply: false`; `globs` with `alwaysApply: false`; and neither field set, which is manual-only — "Included only when you `@`-mention the rule in chat."

  This is the primary source for path-glob targeting being a harness-evaluated mechanism rather than a model judgment.

## E-COPILOT-02 — Copilot path-specific instructions use an `applyTo` glob

- **Date**: 2026-08-15
- **Status**: confirmed
- **Confidence**: high
- **Source**: GitHub Copilot — adding repository custom instructions — https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions — primary vendor documentation
- **Notes**: Verbatim: "At the start of the file, create a frontmatter block containing the `applyTo` keyword. Use glob syntax to specify what files or directories the instructions apply to." Files are `NAME.instructions.md` within or below `.github/instructions`.

  Documented examples: `applyTo: "app/models/**/*.rb"`, and comma-separated multiple patterns `applyTo: "**/*.ts,**/*.tsx"`.

  Together with E-CUR-03 this establishes that two major harnesses offer harness-evaluated path targeting for instructions, while neither offers it for `AGENTS.md` itself.

## E-CC-12 — Claude Code skills take arguments, through fields the spec does not allow

- **Date**: 2026-08-16
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code skills documentation — https://code.claude.com/docs/en/skills — primary vendor documentation
- **Notes**: Two frontmatter fields, verbatim: `argument-hint` is a "Hint shown during autocomplete to indicate expected arguments. Example: `[issue-number]` or `[filename] [format]`." `arguments` holds "Named positional arguments for `$name` substitution in the skill content. Accepts a space-separated string or a YAML list. Names map to argument positions in order."

  Four substitutions reach the body: `$ARGUMENTS` for everything passed, `$ARGUMENTS[N]` by 0-based index, `$N` as its shorthand, and `$name` from the `arguments` list. The fallback is the load-bearing part, verbatim: "If `$ARGUMENTS` is not present in the content, arguments are appended as `ARGUMENTS: <value>`." So a skill that declares nothing still sees what the caller typed.

  Both fields are Claude Code only. The distribution table limits claude.ai uploads, the Skills API, and `package_skill.py` to `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`, and the failure is hard rather than lenient, verbatim: "If you include any field the spec doesn't allow, packaging or upload fails with a hard error instead of ignoring the field" — the quoted error names `argument-hint` specifically.

  This is the primary source for arguments being usable in a plugin skill but unusable in a skill that also ships through claude.ai.

## E-CODEX-02 — Codex skills have no argument mechanism; only deprecated custom prompts do

- **Date**: 2026-08-16
- **Status**: confirmed
- **Confidence**: high
- **Source**: OpenAI Codex — https://learn.chatgpt.com/docs/build-skills and https://learn.chatgpt.com/docs/custom-prompts (both redirected from developers.openai.com/codex/) — primary vendor documentation
- **Notes**: The skills page documents no argument passing and no placeholder syntax. The `agents/openai.yaml` sidecar carries display, policy, and dependency fields only — `interface.display_name`, `short_description`, `icon_small`, `icon_large`, `brand_color`, `default_prompt`; `policy.allow_implicit_invocation`; `dependencies.tools`. `default_prompt` is an "Optional surrounding prompt", a fixed wrapper rather than a template.

  Placeholders exist in the separate custom-prompts feature (`~/.codex/prompts/*.md`), verbatim: "$1 through $9 expand from space-separated arguments you provide after the command. $ARGUMENTS includes them all." That feature also has its own `argument-hint` frontmatter field. It is on the way out, verbatim: "Custom prompts are deprecated. Use skills for reusable instructions that Codex can invoke explicitly or implicitly."

  Whether skills inherit the syntax is not stated either way. Absence from the page that supersedes custom prompts is the only signal, so treat "Codex skills substitute nothing" as the safe assumption rather than a documented guarantee.

## E-STD-07 — The Agent Skills specification has no argument concept

- **Date**: 2026-08-16
- **Status**: confirmed
- **Confidence**: high
- **Source**: Agent Skills Specification — https://agentskills.io/specification — official spec
- **Notes**: The word "argument" does not appear, nor "parameter", nor any placeholder syntax. The frontmatter table stops at six fields: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. On the body the spec says only "There are no format restrictions."

  So there is no cross-harness contract for parameterizing a skill, and none of the harnesses can be made to agree on one. A skill that must take arguments everywhere has to read them out of the invocation in prose, which is the one mechanism every harness shares — the model reads the body either way.

## E-CC-13 — A plugin's npm dependencies are installed for an npm source, not a git source

- **Date**: 2026-08
- **Status**: thin
- **Confidence**: low
- **Source**: direct observation of a local Claude Code install (`~/.claude/plugins/`), 2026-08-17. No vendor documentation found for plugin dependency installation.
- **Notes**: `installed_plugins.json` records `gitCommitSha` for git-sourced plugins and none for npm-sourced ones. A shared `~/.claude/plugins/npm-cache/package.json` lists npm-sourced plugins as dependencies (`cyber-sdd`), and those plugins' cache directories carry a populated `node_modules` (`gherkin-cli`, `@cucumber/*`, `commander`). Running an npm-sourced plugin's own script succeeded: `node ~/.claude/plugins/cache/cyberplace/sdd/0.0.0/skills/discover-specs/scripts/discover-specs.mts --root .` exited 0. A git-sourced plugin (`repobuddy/buddy-agent-harness/0.2.0`, carrying `src/` and `coverage/`, which its npm `files` list excludes) failed on a missing transitive dependency: `Cannot find package 'js-yaml' imported from .../node_modules/clibuilder/esm/config.js`. Single machine, single point in time; treat the mechanism as observed rather than specified.
