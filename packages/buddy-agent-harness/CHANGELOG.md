# buddy-agent-harness

## 0.7.0

### Minor Changes

- 99db013: Give the CLI a callable entry point, so `bin` owns the process and skills stop mutating `argv`.
  
  `src/cli.ts` exported `main()`, which built the app, read `process.argv` and wrote
  `process.exitCode`. Nothing could invoke a command without going through the process, and the cost
  showed up in generated code: every skill launcher spliced the subcommand into global `process.argv`
  and then side-effect-imported the executable.
  
  The two boundaries are now separate. `bin/buddy-agent-harness.mjs` is the **process** boundary, the
  only place that reads `process.argv` or writes `process.exitCode`. `src/cli.ts` is the
  **application** boundary: it takes an argv and returns an exit code.
  
  New export `run(argv: string[]): Promise<number>`. The `clibuilder` application stays internal —
  exporting it would make `clibuilder`'s builder shape part of this package's public API, so a
  `clibuilder` major would become a major here. The generated launchers now compose an argv and call
  `run`, mutating nothing:
  
  ```js
  const code = await run([...process.argv.slice(0, 2), 'doctor', ...process.argv.slice(2)])
  if (code !== 0) process.exitCode = code
  ```
  
  The code is applied only when non-zero because `clibuilder` reports an unknown option or unknown
  command by writing `process.exitCode` itself and returning nothing, so `run` reports `0` on a path
  where the process must still exit `2`.
  
  `doctor` and `init` now **return** their exit codes rather than writing `process.exitCode`. A
  command that writes the code reports its failure past the caller instead of to it, so `run` would
  have returned `0` for the commonest failure there is. Nothing changes for a shell caller.
  
  New export `buildDoctorReport`, with its `DoctorReport` type. `doctor`'s assembled report — the
  `bin` line, the healthy-answer sentence, the deduped `help` section — was reachable only by running
  the CLI and re-parsing its own TOON. Three layers are now each reachable on their own:
  `diagnoseBridges` and its siblings return the raw diagnosis, `buildDoctorReport` returns the report
  as a value, and `run` returns that report serialized plus an exit code.
  
  Two fixes in the lines this touched:
  
  - **Errors went to stdout.** `doctor`'s default output is TOON that agents parse, and the error line
    landed in the stream they were parsing. It goes to `stderr`.
  - **`--version` was wrong.** It reported `0.1.0` while the package was at `0.6.0`, five minors
    behind. It is read from the manifest.
  
  Also fixed: `skills/repair/`'s launcher was labelled generated but was not on the generator's list,
  so nothing rewrote it and nothing caught it going stale. The generator now keys each launcher by the
  subcommand it runs, and a test asserts every shipped launcher is a target it checks.
- 3550496: The `doctor` skill is split into a lean `SKILL.md` and lazy-loaded reference pages, the way `init` is.
  
  Everything `doctor` knows was in one 125-line file, so an agent acting on a single MCP credential finding read the skills-bridge table, the instruction-bridge table, the configuration table and the Windows case to get there. `SKILL.md` is now 62 lines — how to run it, how to read the report, the routing rule, and a pointer table — and the finding tables live one family per page under `references/`, with a page per harness under `references/harnesses/`.
  
  The pages are generated from the same guidance table and the harness registry that the command reports from, so they cannot drift from it. Editorial judgment about a harness stays hand-written in the `init` skill, and each generated harness page links to it where one exists; which harnesses have one is read off the filesystem rather than listed.
  
  Three checks come with the split: every reference page matches what the generator would write, every page the pointer table names exists, and every cross-reference into the `init` skill resolves.
- 3550496: `doctor` reports agent configuration that only one harness can read.
  
  Four finding families all answered a version of "is something broken". None of them asked how far the configuration that is there actually reaches, so a `.cursor/rules/*.mdc` — which works, in Cursor, and nowhere else — was invisible to the one command that is safe to run from a session-start hook. The guidance in it reaches one tool, and nobody finds out except by noticing an agent behave differently somewhere else.
  
  The new family reports each artifact with the canonical form it converts to: legacy instruction files and always-on rules to `AGENTS.md`, harness commands and harness-directory skills to `.agents/skills`. A `.mdc` rule splits on whether its frontmatter binds it to globs — always-on prose is what `AGENTS.md` holds verbatim, while a rule bound to paths converts to a skill only where the scoping is incidental. A subagent names no owner at all: no cross-harness format exists, so the finding reports that gap rather than promising a conversion.
  
  Nothing here is repaired by `repair`, which corrects configuration that is wrong; nothing here is wrong. Nothing is offered by `enhance`, which adds guidance a repository is missing; this guidance is present. Every conversion with a destination is `init`'s, and every one is approved before it lands.
  
  The artifacts are declared per harness in the registry, beside that harness's other paths, and the per-harness reference pages are generated from the same declaration. Hooks, LSP settings, and output styles are deliberately not covered: their shapes differ per harness with no safe projection, so no canonical form can be named for them.
- 2927512: `doctor` now reports each repair as a runnable command and a prose instruction, instead of wrapping every repair in `Run`
  
  Every `help` entry used to be rendered as ``Run `<repair>` ``, whether or not the repair was a command. Most are not, so the report published lines like ``Run `remove .windsurf/skills and enable the harness that replaced it` `` — an invitation to paste prose into a shell.
  
  `help` is now one row per repair with two columns:
  
  ```
  help[3]{command,instruction}:
    buddy-agent-harness init --copy --force,run `buddy-agent-harness init --copy --force` to rebuild .claude/skills as a real directory
    buddy-agent-harness init,run `buddy-agent-harness init` to create the bridge at .windsurf/skills
    "","hand .gemini/settings.json to `/buddy-agent-harness:init`, which writes the bridge into it"
  ```
  
  `command` runs verbatim and completes the repair. It is empty when no single invocation does, which is the signal to act on `instruction` instead — and it stays empty for a repair whose prose quotes a runnable diagnostic, so a caller that executes every non-empty `command` never rebuilds a diverged bridge over the side holding the newer edit.
  
  Both keys are always emitted, so TOON renders `help` in its tabular form rather than degrading to a nested list.
- 3550496: `init` lists the configuration only one harness can read, and asks before migrating any of it.
  
  `doctor` now reports these artifacts; `init` is the skill that acts on them. It reads the list from `doctor` rather than deriving a second one, presents each with the canonical form it is a candidate for, and asks per artifact — never for the set, because two rules can be in the list for opposite reasons and one approval would carry a file the owner never looked at.
  
  Rules leave the canonical-only bucket. A rule whose paths are incidental to what it says converts to a skill, which every harness reads; a rule whose path scoping is the point has no equivalent and stays. Which one a given rule is cannot be read off the file, so it is offered rather than assumed. Subagents, hooks, output styles and MCP servers stay canonical-only and are reported as having no candidate at all, so the list is not read as a queue of pending work.
  
  No conversion is offered that would leave fewer readers than before. Cursor reads `AGENTS.md` in Agent mode only, so consolidating `.cursorrules` and deleting it takes that guidance out of Chat and Composer; the offer is always the consolidation together with the generated copy that keeps them working. The existing rule against rewriting those files is not removed — it is the reason the migration is offered rather than applied.
  
  The `init` skill now ships a `doctor` launcher beside its own, the way `repair` already does.
- 9be4f0b: `doctor` diagnoses a golden MCP server set.
  
  A repository may now keep one canonical MCP server per entry at `.agents/buddy-agent-harness/mcp.toml`, in the superset of fields the supported hosts accept. Where that file exists, `doctor` compares it against each harness's own project-scope MCP configuration — Claude Code's `.mcp.json`, Cursor's `.cursor/mcp.json`, Codex's `.codex/config.toml`, and Gemini CLI's `.gemini/settings.json` — and reports how the two have drifted, in either direction. No golden set means no MCP findings, and `init` still converts nothing.
  
  Comparison is semantic rather than textual: no two of those files ever share bytes, so each side is parsed into one model. A field the golden set leaves unset is never a difference, because a host restating its own default cannot be told apart from a deliberate edit. Direction comes from a last-projected record where there is one and from git history for a tracked target, and is reported as unknown rather than guessed when neither answers.
  
  `doctor` also reports a literal credential sitting in any of those files, including the golden set. A finding carries the file, the server, and the field and never the value — no truncated preview either — and an unreadable golden set is reported by line and column, because a parser's own message quotes the line that holds the secret. A literal in a tracked file is reported as committed, and its repair is to rotate the credential rather than to move it.
  
  `doctor` remains read-only. Projecting the golden set into a harness and reconciling a harness-side edit back into it are writes and are not part of this change.
- 2b3b42d: Add a `repair` skill, and grow `doctor` to detect what it repairs.
  
  `init` consolidates what a repository has, `enhance` offers what it is missing, and `doctor`
  reports what is wrong. Configuration that is present but **wrong** had no home: not missing, so
  `enhance` would not offer it; user-authored, so `init` would not rewrite it.
  
  `doctor` gains a third section alongside its bridge and instruction findings — configuration that
  resolves fine and is still wrong: `deprecated-harness`, `ignored-bridge`, `unread-local-override`,
  and `unloadable-skill`. It stays read-only, so it is still safe in a session-start hook.
  
  The new `repair` skill runs `doctor` and repairs what it reported, detecting nothing itself, so
  detection cannot drift into two homes. Every correction is offered with its before and after and
  written only on approval. Bridge and instruction findings are handed to `init`, which writes both
  kinds of bridge in the first place — and writes a `CLAUDE.md` stub without asking, where `repair`
  asks for everything.
  
  `doctor`'s `findings` rows now carry a `problem` field naming the finding, alongside `path` and
  `detail`. Route on `problem`: `detail` is prose meant to be read, and improving its wording must
  not change what a caller does.
  
  `BridgeFinding` gains a required `problem` field. Reading one is unaffected; code that
  *constructs* one needs the new field. This is the breaking edge of the release.
  
  New exports: `diagnoseConfiguration`, and the types `ConfigurationFinding`,
  `DiagnoseConfigurationOptions`, `ConfigurationFault`, and `ConfigurationProblem`.
- 46a7b16: `init --force` now takes the targets to replace, so a run cannot reach past the conflict it was invoked for.
  
  The flag was a single boolean: the command preflighted every projection target and, when it was set, replaced every conflicting one. Two harnesses whose targets were both occupied were both replaced by a run intended to fix one of them, and `doctor` emitted a bare `init --force` as the repair for a single bridge — so following that repair could silently delete a second harness's user-authored directory.
  
  `--force .claude/skills` now replaces that projection and reports any other conflicting target as skipped instead of replacing it. Naming a target no enabled harness projects is an error rather than a run that quietly forces nothing. A bare `--force` still replaces every conflicting target, so existing invocations keep their meaning; the repairs `doctor` prints now name the bridge they are for.
  
  The conflict message now prints its targets repo-relative, so what it names is what `--force` accepts back. The initialization result gains a `skipped` field listing the harnesses left untouched.

### Patch Changes

- 990972f: Teach the `enhance` skill that a heading inside a fenced code block is not a heading.
  
  Every addition `enhance` offers is a fenced block containing its own heading, so a repository that
  documents this tool — or an `AGENTS.md` that quotes an addition — carries the exact heading the
  addition would write while remaining entirely uncovered. Coverage is now judged only against the
  prose an agent reads as instruction, and the fence is stripped when the approved section is written,
  so an addition lands as prose rather than as a code block.
- 804a542: `doctor` reads each file once per commit while deciding which side of a diverged MCP server moved.
  
  Naming the side that moved walks git history for the newest commit where the golden set and the harness config agreed on a field. That walk ran once per diverged field and re-read and re-parsed both files at every commit each time: three targets, five servers, two diverged fields each and fifty commits of history is on the order of three thousand `git show` calls and as many parses. Drift is the case the walk exists for, and the shipped `doctor` skill says the command is cheap enough to run from a session-start hook.
  
  The parse is now memoized per commit and file, and the commit walk per target, for the lifetime of the one diagnosis. The reported direction is unchanged.
- 804a542: `doctor` names a dotted MCP server in full in its repair.
  
  A finding's locator addresses a place inside a file — `.cursor/mcp.json#servers.linear.command` — and the two membership repairs recovered the server name from it by splitting on `.` and taking the last segment. For `.codex/config.toml#servers.io.github.foo` that gave `foo`, a server present in neither file, so the repair for an `mcp-unprojected` or `mcp-undeclared` finding named something the user could not act on. `io.github.*` is a common way to name an MCP server.
  
  The file, server, and field now travel with the finding as parts and are assembled into the locator at the one place that renders it. Nothing splits a locator back apart, because no separator survives the dotted case.
- 41338f9: Correct the `init` skill's reason for leaving MCP servers alone. It said no safe cross-harness mapping exists; one does, published across fourteen hosts. The reason that survives is that the mapping is not lossless — some servers cannot be expressed for some hosts, and writing one into another host's format means supplying fields the source never carried. `init` still reports MCP configuration rather than converting it, and now says why accurately.
- 4177091: Route the `repair` skill's family split on the finding's `problem` name.
  
  The skill told an agent that every `doctor` finding's repair in `help` names a skill, and to decide the `init`/`repair` split on that name. It does not: `help` carries the command rendering of a repair, which names a shell invocation for every bridge finding and nothing at all for every MCP finding. Only the instruction and configuration families name a skill there — eight of twenty-seven problems — so an agent following the rule literally had no match and no stated fallback for the other nineteen, including the whole MCP family, which the skill never mentioned.
  
  Routing is now on `problem`, which every finding carries and which `references/classes.md` is keyed by: a `problem` with a section there is the skill's, and one without it is not. Who a handed-on finding goes to is read off its repair — `init` where the repair names it, a person where it names no skill — and the skill now says outright that an owner is never to be inferred.
- aa7d27d: Judge a skill bridge by where it resolves, not by how it is spelled.
  
  `init` and `doctor` both decided a symbolic link was correct by comparing its text against the one
  relative path `init` writes. A link that resolves to `.agents/skills` but is spelled differently —
  one a user wrote as an absolute path, or any repository reached through a symbolic link in a parent
  directory — was read as a foreign target: `doctor` reported it `stale` and `init` refused to run
  without `--force`. Both now compare resolved paths, so a bridge that works reports as working.
  
  Write the link target the way the platform resolves it. Windows resolves a relative junction target
  against the process directory rather than the link's own, so the target is now absolute there and
  stays relative everywhere else, where a relative link survives the repository moving.

## 0.6.0

### Minor Changes

- 74a17e8: Stop projecting `.agents/skills` into `.gemini/skills`. Gemini CLI reads the `.agents/skills` alias at project scope as well as user scope, and that alias takes precedence over `.gemini/skills` in each tier — confirmed against the vendor's own discovery code (`packages/core/src/config/storage.ts`, `packages/core/src/skills/skillManager.ts`) and its skills documentation, recorded as E-GEM-02.
  
  `init` now writes nothing for `gemini-cli`, and `doctor` no longer reports a `.gemini/skills` bridge for it. Claude Code is the only harness left with a skills projection. Gemini CLI's instruction bridge is unaffected: it still does not read `AGENTS.md`, so `context.fileName` in `.gemini/settings.json` still has to name it.
  
  An existing `.gemini/skills` symlink keeps working — that path is still scanned — so nothing has to be removed from a repository that already has one.
- 1a33cca: Model user scope as well as project scope in the harness registry. `Harness` now carries a `project` record and an optional `user` record, each with its own `detect` directory and optional `skillsDirectory`, so a harness that answers the canonical-directory question differently at each scope can be recorded truthfully — Gemini CLI needs a projection inside a repository and none at user scope. A missing `user` record means no vendor path is documented, as with Devin Desktop.
  
  The published `harnessRegistry` entries change shape: read `harness.project.detect` and `harness.project.skillsDirectory` in place of `harness.detect` and `harness.skillsDirectory`. The `Harness`, `HarnessScope`, and `HarnessScopeName` types are now exported. `init` and `doctor` are unchanged and still act only inside the repository.
- 0ce8068: `doctor` now verifies the instruction bridges as well as the skill bridges. It reports a new `instructions` section covering the root `CLAUDE.md` import, one stub per nested `AGENTS.md`, and the `context.fileName` entry in `.gemini/settings.json`, gated per harness the same way the skill bridges are. Every repair there is `/buddy-agent-harness:init`: those files carry prose someone wrote, so restoring a bridge without discarding what displaced it is the `init` skill's judgment.
  
  The harness registry records an `instructionBridge` per harness scope, so the checked set cannot drift from what the `init` skill writes.

### Patch Changes

- 14a925c: `init` now says how to edit a user-authored settings file: amend it in place rather than round-tripping it through `JSON.parse`, keeping key order, indentation, and comments. `.gemini/settings.json` legally carries comments that a whole-file rewrite would silently delete; `.claude/settings.json` rejects them outright, so nothing may add one.

## 0.5.0

### Minor Changes

- 090bfce: Add an `enhance` skill that offers guidance a repository's `AGENTS.md` is missing.
  
  `init` consolidates what a repository already has and bridges the harnesses that cannot read it. It carries no opinions, which is what makes it safe to run anywhere. `enhance` is the other half: it proposes content the repository does not have, one vetted section at a time, and writes only what you approve. `init` now ends by asking whether to run it.
  
  Detection decides every run. `enhance` reads the root `AGENTS.md` together with any harness instruction file whose content still belongs in it, because that combined text is what an agent effectively reads — guidance living in a Cursor always-on rule counts as already present. It reads those files and never consolidates them; that stays `init`'s work. Coverage is judged by meaning rather than by heading, so a repository covering the subject under its own wording is left alone.
  
  One addition ships: a `## Delegation` section telling an agent when to hand work to a subagent, when to do the work itself, which decisions to keep, and what every brief must carry. It names no model, vendor, or version, so it does not go stale as model lineups change.

## 0.4.1

### Patch Changes

- e40dc14: Name the launcher relative to the skill, without a placeholder.
  
  Both skills said `node "<skill>/scripts/<name>.mjs"`, which asked the reader to substitute something the agent already knows. An agent reads the `SKILL.md` from a directory, so `node scripts/<name>.mjs` resolves against that directory on its own.
  
  `node` stays in front. The launcher ships as mode `100644`, so its shebang never runs it, and on Windows a shebang does nothing regardless of mode. Naming the file alone would fail on both counts.

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
