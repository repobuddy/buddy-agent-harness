# Changes — Agentic Configuration Standards

## 2026-09-20 — Posit Assistant is native on both axes, and upstream understated two more

**What changed**: E-POSIT-01 through E-POSIT-04, E-DROID-01, and E-KILO-01 added. Posit Assistant
reads `.agents/skills/` at project scope and `~/.agents/skills/` at user scope by default, and reads
`AGENTS.md` in the project root as its project memory. It needs neither a skills projection nor an
instruction bridge.

**Why**: issue #83. The weekly drift check flagged `posit-assistant` as a new upstream agent with
`skillsDir` `.posit/assistant/skills`, which reads as non-canonical. Upstream is a tripwire, so the
finding was taken to the vendor, and by the time the research ran the drift had grown to five
findings rather than one.

**Material conclusions**:

- **Nothing the package ships changes.** No registry entry gained or lost a path, no projection
  target moved, no bridge appeared. Posit Assistant is native on both axes, and the four other
  findings concern agents this project does not register. The change is documentation and evidence.
- **Upstream's single `skillsDir` cannot express "also".** Posit Assistant scans four skill
  directories by default and upstream records one of them; Droid scans eight and upstream moved its
  one entry from `.factory/skills` to `.agents/skills` as though the first had been dropped, which
  the vendor's own scope table contradicts. Both are the false signal the `harness-update` skill
  names, and this is the first run where it fired twice at once.
- **Posit Assistant is the first native harness with a usable detection marker and no registry
  entry.** Antigravity and VS Code are unregistered because neither can be detected safely;
  `.posit/assistant/` can be. Whether to register it is a product question about which harnesses
  this tool maintains — registering would write zero files and add a `--harness` name — so it is
  recorded as open rather than answered by the evidence. See **Open** below.
- **`AGENTS.md` support can carry a consent gate without being a bridge.** Posit Assistant loads
  project memory only in a trusted workspace. That is a prompt the user answers once, not a file
  anything writes, so it belongs in the table's cell text and not in `instructionBridge`.
- **A vendor page can belong to the superseded product.** Positron's own site documents Positron
  Assistant appending any of six instruction filenames, including `claude.md`. Posit Assistant
  replaced that product in Positron 2026.07 and names one project file. Reading the older page as
  current would have produced a `shadowedBy`-shaped claim with nothing behind it.
- **Kilo Code is left contested.** Its docs claim `.agents/skills` support; its own tracker carries
  unresolved reports that skills there are not detected, and the issue was closed "not planned"
  without a confirmed fix. Nothing here depends on the answer, and settling it needs a behavioral
  test rather than another document.
- **The drift detector had failed closed for a month.** `assertParsed` cross-checked the parsed
  registry against the count of `HarnessName` union members, and that union is deliberately wider
  than the registry — `mcp-inventory.ts` names three harnesses there that have no entry. Since
  2026-09-17 every run exited 2 with "parsed 7 harnesses but HarnessName declares 10", and the
  weekly workflow errored instead of reporting. The cross-check now counts entry braces inside the
  `harnessRegistry` literal, which is independent of the `name:` split `parseLocal` uses and does
  not track the union. The 2026-08-18 entry below records the same function failing *open*; this is
  the other direction, and the pair is why the check is now anchored to the array it parses.

**Triggering evidence**: E-POSIT-01, E-POSIT-02, E-POSIT-03, E-POSIT-04, E-DROID-01, E-KILO-01.

**Open**: whether `posit-assistant` earns a registry entry. The evidence supports one — detect
`.posit/assistant`, no `skillsDirectory` at either scope, no `instructionBridge`, `mcpServers` in
`.posit/assistant/settings.json` at both scopes, and `.posit/assistant/skills` plus the legacy
`.positai/` as nonstandard artifacts. What it does not settle is whether a data-science assistant
belongs in the maintained set. Not implemented here.

**Not changed**: `fx` and `sarvam-code`, the two other new upstream agents, were not researched.
Neither is in the registry and neither appears in any published table, so no claim here rests on
them. Also left alone: the "unresolved third-party discrepancy" on [Sources &
Confidence](https://buddy-agent-harness.js.org/sources/), which reads the `vercel-labs/skills`
README as claiming 75 agents. The README now names four and says "75 more", so the figure it
supports is 79 — the same as the registry. Correcting a published claim has its own process and
its own evidence, and it is not this finding's.

## 2026-09-19 — Claude Code reads AGENTS.md, and a CLAUDE.md now hides it

**What changed**: E-CC-14 added, superseding E-CC-03. Claude Code reads `AGENTS.md` as project instructions from v2.1.277 — "without adding a `CLAUDE.md`, an import, or a setting" — but only where no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` sits in the working directory or above it. The import bridge this project wrote for four years of releases is now redundant, and a `CLAUDE.md` that is *not* a bridge is actively harmful.

**Why**: the vendor shipped it, and the project's central claim about that harness — the one every page and the registry itself was built on — stopped being true.

**Material conclusions**:

- **The instruction bridge leaves the registry.** `claude-code` carries no `instructionBridge`. Gemini CLI is the only harness that still needs one, and Claude Code is the only one that still needs a skills projection. The two axes have now fully crossed.
- **The opposite axis replaces it.** `shadowedBy` records the filenames whose presence stops a harness reading the `AGENTS.md` beside them. `doctor` gained `instructions-shadowing` for a file carrying its own content — the harness reads it instead, and nothing looks wrong — and `instructions-superseded` for one that still imports or links to `AGENTS.md`. A harness has a bridge or shadow filenames, never both.
- **`init` writes no `CLAUDE.md`, and removes none unasked.** Consolidation is the instruction job now. A file with content is consolidated and removed on approval, never left as a generated copy: under this filename a copy is read *instead of* the canonical file, so the safeguard that protects `.cursorrules` is the harm here. A pure pointer is offered for removal and kept on a no.
- **The import is a fallback, not a workaround to delete.** Direct reading is unavailable on a version before v2.1.277, on Amazon Bedrock and other third-party providers, with telemetry disabled, in the first session after an upgrade, and where hooks or the built-in `agents-md` plugin are off. That is why the removal is offered rather than made.
- **Nested `AGENTS.md` files need no stub at all.** Claude Code reads each one at and above the working directory at session start, and a subdirectory's when it opens a file there. The per-directory stub writing, and the approval gate guarding it, are both gone. What survives is the *reporting*: nested precedence still differs between the standard's nearest-wins rule and Claude Code's concatenation, so a file that reverses a root rule is named rather than silently bridged.
- **A repository cannot opt its contributors in or out.** The **Project instructions** setting is read from user, `--settings`, and managed settings only. Nothing this tool writes can change which files a contributor's sessions load.
- **`no-instructions` changed trigger, not meaning.** It fired when a bridge pointed at a missing `AGENTS.md`. With almost no bridges left it would have gone silent, so it now also fires when a shadowing file stands where the canonical one is missing — the same finding, reached from the other side.

**Triggering evidence**: E-CC-14, E-CC-03 (superseded), E-CC-05 (the concatenation rule the nested-precedence divergence still rests on).

## 2026-08-18 — Gemini CLI reads the canonical path at project scope, so its projection is redundant

**What changed**: E-GEM-02 added, superseding E-GEM-01's project-scope skills path. Gemini CLI discovers skills from `.agents/skills/` at **workspace scope as well as user scope**, with the alias taking precedence over `.gemini/skills/` in each tier. Verified in the vendor's own discovery code, not only its prose.

**Why**: The weekly drift check (issue #40) flagged that upstream `vercel-labs/skills` now classifies `gemini-cli` as canonical-reading while we still project into `.gemini/skills`. Upstream is a tripwire, so the finding was taken to the vendor.

**Material conclusions**:

- **Gemini CLI needs no skills projection at either scope.** `.gemini/skills` moves out of the registry's project record. Claude Code is now the only harness in the registry that needs a skills projection anywhere.
- **The per-scope split introduced days earlier did not answer this finding — it recorded the wrong answer more precisely.** E-GEM-01 was incomplete about workspace scope, and re-shaping the registry around it preserved that error in a new shape. A scope split is a place to put evidence, not a substitute for re-checking it.
- **The instruction bridge is unaffected.** Gemini CLI still defaults to `GEMINI.md`, so `context.fileName` must still list `AGENTS.md` (E-GEM-01). Gemini stops being a skills-projection target while remaining an instruction-bridge target — the clearest case yet that the two axes are independent.
- **An existing `.gemini/skills` bridge keeps working**, exactly as `.windsurf/skills` does for Devin: still scanned, now redundant. Nothing has to be torn out of a repository that already has one.
- **`scripts/harness-drift.mjs` had gone blind.** Its `parseLocal` matched `name` and `skillsDirectory` on one line, which the per-scope reshape (PR #46) broke: it silently dropped every multi-line entry — `claude-code`, `gemini-cli`, `windsurf` — and reported "No drift" while this finding stood. A detector that fails open is worse than none, because a clean run is read as evidence. It now parses per-scope entries and asserts it can see every registry name.

**Triggering evidence**: E-GEM-02, E-GEM-01 (superseded in part), E-WS-02 (the redundant-but-functional precedent).

## 2026-08-18 — MCP has a cross-harness mapping, and it is not lossless

**What changed**: Established that a published cross-harness MCP mapping exists, so the project's stated reason for leaving MCP alone ("no safe cross-harness mapping exists") is false as written. Replaced it with the reason that survives the evidence.

**Why**: Issue #41. The claim had seven homes and was inherited by every page that linked to `configuration-layout.md#what-stays-canonical`. It also sourced itself to an `.research/agent-install-implementation/` topic that does not exist in this repository, so nothing here could check it.

**Material conclusions**:

- **A mapping exists.** `agent-install@0.0.8` maps MCP server config across fourteen hosts, six config keys, and three serialization formats. The impossibility claim is refuted.
- **It is not lossless, and the loss is per host and per transport.** Claude Desktop's config file carries stdio servers only — a remote server is added through the Connectors UI, so it has no representation in the file a converter would write. Refusal has to be per individual server, not per host.
- **Conversion invents values.** Writing into Goose emits `description`, `enabled`, and `timeout`; writing into Zed emits `source: "custom"`. `init`'s safety property is that it invents nothing, and a conforming converter cannot hold it. That, not impossibility, is why `init` still leaves MCP alone.
- **Only MCP's row was wrong.** Subagents, hooks, rules, commands, and output styles have no published specification at all, which `persona.md` already states. The corrected wording splits MCP out of that list rather than weakening the sentence for all five.
- **Two of the issue's per-host claims did not survive verification.** Zed accepts stdio and remote alike (E-MCP-04), and Codex's `CODEX_HOME` support is implementation behavior with no vendor page behind it (E-MCP-02). Neither is restated in the docs.

**Triggering evidence**: E-MCP-01, E-MCP-02, E-MCP-03, E-MCP-04, E-MCP-05.

**Open**: whether `doctor` should report MCP configuration that exists for one harness and not another. Recommended in issue #41 and not implemented here; reporting is inside `doctor`'s remit as a diagnosis, but it needs its own detection evidence per harness before it can be accurate.

## 2026-08-18 — The registry models user scope as well as project scope

**What changed**: No new vendor research. `Harness` in `src/harness-registry/harness-registry.ts` was re-shaped to hold one record per scope (`project`, optional `user`), so the evidence already on file can be recorded where it applies instead of being collapsed to the project-scope answer and explained in prose.

**Why**: The existing evidence disagrees across scopes and the registry could hold only one answer. E-GEM-01 gives Gemini CLI `.gemini/skills/` at project scope and a `~/.agents/skills/` alias at user scope, so "does it read the canonical directory" is yes at one scope and no at the other. `harness-differences.md` recorded that as the string "User scope only" in a column whose source could not express it.

**Material conclusions**:

- **Two scopes is the shape the convention has.** E-AGT-01's four-cell table is scope × location, so a single path pair per harness cannot be truthful in general — Gemini is the case that already exists, not a special case.
- **Detection is per scope.** "This harness is configured in this repository" and "this harness is configured for this user" are different questions with different markers: Copilot CLI is `.github/skills` in a repository and `~/.copilot` for the user.
- **Absent user scope means unsourced, not none.** E-WS-02 states Devin documents no user-scope path, so `devin-desktop` carries no `user` record rather than a guessed one.
- **Only project scope decides a projection.** `init` and `doctor` still act inside the repository; the user record is describable and diagnosable, not writable.
- `harness-differences.md` now asks the skills question once per scope, so the Gemini row is a pair of cells rather than a prose exception.

**Triggering evidence**: E-AGT-01, E-GEM-01, E-CC-01, E-COPILOT-01, E-CUR-01, E-CODEX-01, E-WS-02, E-AG-01, E-VSC-01.

**Open**: issue #44 cites an `agent-install` implementation study as E-AI-02 in `.research/agent-install-implementation/`. That topic directory does not exist in this repository, so the two-field prior art it describes is uncited here. Record it, or drop the reference from the issue.

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

## 2026-08-18 — Settings and manifest files disagree about comments

**What changed**: E-JSON-01 and E-JSON-02 added.

**Why**: The user asked whether `settings.json`, `marketplace.json`, and `plugin.json` can carry
comments, having seen that `agent-install` goes to the trouble of preserving them when editing other
tools' JSON (`.research/agent-install-implementation/`, E-AI-03).

**Material conclusions**:

- **Claude Code is strict everywhere.** Comments break `.claude/settings.json`,
  `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`, as does a trailing comma. The
  failure is total for the file, not per-key. This is undocumented — the vendor settings page says
  nothing either way — so it was established by testing rather than cited.
- **Gemini CLI is not strict.** It strips comments before parsing `settings.json`.
- **Consequence for `init`**, which edits `.gemini/settings.json`: that file may carry user comments,
  and a parse-and-stringify rewrite would delete them without a word. An edit there has to preserve
  what it does not understand.
- **Consequence for anything writing Claude Code files**: never add a comment to explain a generated
  block. There is no comment syntax available; explanation has to live outside the file.

**Triggering evidence**: E-JSON-01, E-JSON-02.

## 2026-08-18 — What MCP actually standardizes

**What changed**: E-MCP-01 and E-MCP-02 added.

**Why**: This project documented in six places that MCP servers have "no safe cross-harness mapping".
`agent-install` implements that mapping across fourteen hosts (`.research/agent-install-implementation/`,
E-AI-02), so the claim needed replacing with what is true.

**Material conclusions**:

- **MCP standardizes the protocol and a publishing format. It standardizes no client configuration
  file.** Each host picks its own path, top-level key, and serialization.
- **`server.json` does not close that gap and does not try to.** It describes a server for publishing
  and discovery, not for storage by a client.
- **So the correct claim is that the mapping is unspecified and lossy, not that it does not exist.**
  Lossiness is per host and per transport: some hosts accept stdio servers only, others remote only.
  A converter has to be able to refuse.
- This separates MCP from subagents, hooks, commands, and output styles, which have no published
  specification at all. The old wording grouped all five under one reason that only ever fit four.

**Triggering evidence**: E-MCP-01, E-MCP-02, and E-AI-02.
