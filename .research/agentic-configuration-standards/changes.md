# Changes — Agentic Configuration Standards

## 2026-08-18 — JSON settings files disagree about comments

**What changed**: Established that `.gemini/settings.json` legally carries comments and `.claude/settings.json` legally cannot.

**Why**: `skills/init/references/harnesses/gemini-cli.md` tells the agent to edit `.gemini/settings.json` and "preserve surrounding settings" without saying how, and the obvious `JSON.parse`-and-rewrite silently deletes a user's comments (issue #43).

**Material conclusions**:

- Gemini CLI strips comments before parsing, so a user's settings file may hold them and a whole-file rewrite destroys them. The edit has to be targeted at the `context.fileName` array, preserving key order and indentation.
- Claude Code's parser is strict and rejects an invalid settings file as a whole, so nothing may add a comment there to annotate a permission or hook entry.
- The failure recurs anywhere a user-authored config is edited, so the rule belongs in `init`'s general rules rather than repeated per harness.

**Triggering evidence**: E-JSON-01, E-JSON-02.

## 2026-08-14 — Antigravity, VS Code, and the `npx skills` agent list

**What changed**: E-AG-01, E-VSC-01, and E-ECO-02 added.

**Why**: The user asked how Gemini CLI compares to Antigravity, whether VS Code should be supported, and for the `npx skills` supported-harness list to be recorded.

**Material conclusions**:

- **Antigravity is native** (`<workspace-root>/.agents/skills/`), while **Gemini CLI is not** (`.gemini/skills/` only). Two Google products on opposite sides of the projection line — they cannot be merged into one registry entry.
- **VS Code is native** and shares Copilot CLI's path set, because it *is* Copilot in VS Code.
- **Neither has a safe project-scope detection marker.** Antigravity documents none; VS Code's `.vscode/` means "editor", not "skills support". Auto-enabling either from directory detection would false-positive.
- Consequence: registering them would add config-record entries and a false-positive risk while writing zero files. The value is documentation, not registry membership.
- The `npx skills` listing names 20 agents, contradicting the README's claim of 75, and still says "Windsurf" — it lags the rebrand.

**Triggering evidence**: E-AG-01, E-VSC-01, E-ECO-02.

## 2026-08-14 — Windsurf is Devin Desktop, and is not a projection target

**What changed**: E-WS-02 added, superseding E-WS-01. Windsurf was rebranded to **Devin Desktop** on 2026-06-02, and Devin scans nine project-scope skill paths including `.agents/skills/` as the **recommended** one.

**Why**: The user flagged the rename. Verifying it overturned the weakest row in the harness matrix — the one the initial research explicitly marked as the most likely to be wrong.

**Material conclusions**:

- **Windsurf/Devin Desktop is a native `.agents/skills` reader, not a projection target.** This moves it from the Claude-Code-plus-tail group into the Codex/Cursor/Copilot group, leaving Claude Code and Gemini CLI as the only harnesses needing a skills projection.
- The E-WS-01 contradiction — whether Windsurf supported `SKILL.md` at all, or required rules-pasting — is resolved: it does support it.
- `.windsurf/skills/` is still one of the nine scanned paths, so existing projections keep working. They are redundant, not broken.
- `harnessRegistry` in `src/harness.ts` still names `windsurf` with a `.windsurf/skills` projection target, and is now wrong on both the name and the projection.

**Triggering evidence**: E-WS-02.

**Open**: the Devin skills page does not distinguish Devin Desktop from Devin cloud, so native `.agents/skills` support *specifically in Desktop* is medium confidence.

## 2026-08-14 — Initial research

**What changed**: Topic created. Established the two open standards (AGENTS.md, Agent Skills), traced the provenance of the `.agents/` convention, and built the per-harness support and deviation matrices.

**Why**: Needed to update `apps/web/src/content/docs/reference/standards.md` and `configuration-layout.md`, and to design the guided workflow for the `init` skill.

**Material conclusions**:

- `.agents/skills/` is a **convention**, not a spec. Documented in agentskills.io's client-implementation guide (not the specification page); hardened by `vercel-labs/skills`; adopted into primary docs by Codex, Cursor, Copilot CLI, Gemini CLI.
- Codex, Cursor, and Copilot CLI read `.agents/skills/` **natively**. Claude Code is the sole Tier-1 holdout on both skills discovery and AGENTS.md.
- The durable cost of cross-harness skills is **frontmatter divergence and silent field-dropping**, not linking.
- `apps/web/src/content/docs/reference/configuration-layout.md` and `harnessRegistry` in `src/harness.ts` are both factually wrong about harness skill paths.

**Triggering evidence**: E-AGT-01 (agentskills.io client-implementation guide, quoted verbatim), E-CODEX-01, E-COPILOT-01, E-CUR-01, E-CC-01, E-CC-03.

**Corrections applied during research**:

- An earlier reading concluded that symlinking the `.claude/skills` directory itself was unverified and that per-skill symlinks were the only safe path. The maintainer confirmed by empirical test that the directory-level symlink works. Recorded in E-CC-02 as supported-in-practice, unsupported-in-contract.
