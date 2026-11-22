# init-buddy-agent-harness

The `init-buddy-agent-harness` skill consolidates a repository's agent configuration into the canonical form.

## What

A repository that has been worked on with several coding agents collects instructions and skills in each one's own
files: a `CLAUDE.md`, a `.cursorrules`, a `.claude/skills/` folder, a `GEMINI.md`. Each harness reads its own files
and misses the rest, so the same repository tells each agent something different. Some of these files also stop a
harness from reading `AGENTS.md` at all. A tool that fixes this by rewriting files can destroy what a person wrote, or
fill `AGENTS.md` with claims about the project nobody made.

The skill gives the repository one canonical configuration, a root `AGENTS.md` and an `.agents/` tree, that every
enabled harness reaches. It surveys what the repository has, sorts each artifact, presents a plan, applies what the
owner approved, and verifies what landed. It creates what is absent without asking, and asks before it replaces,
rewrites, or removes anything a person wrote. It projects the skills by running the `init` command, and writes the one
instruction bridge the command does not. It hands back a report of what it created, consolidated, linked, and left
alone, offers to continue with the `repair` skill for the `doctor` findings it does not own, and offers the
`enhance` skill once. Its offer of Claude Code's agent-worktree settings has a spec of its own,
[agent-worktree-settings](../agent-worktree-settings/README.md).

It is also where every instruction-bridge finding of `doctor` is repaired, so a finding handed to it must end with the
bridge written.

## Non-goals

- N1 The `init` command's own behavior: its options, its output, its conflict check, and the enabled set
  ([harness-init](../harness-init/README.md)). This spec covers what the skill does around that call.
- N2 Checking a repository for problems ("check my agent setup for problems", "why is Claude not reading my
  AGENTS.md"). That is `doctor` ([diagnosis-report](../diagnosis-report/README.md)), which routes instruction findings
  here.
- N3 Correcting configuration that is present and wrong ("fix the broken `.claude/skills` link", "repair my agent
  config"). That is the `repair` skill ([repair](../repair/README.md)).
- N4 Proposing guidance the repository lacks ("what should my AGENTS.md say about testing"). That is the `enhance`
  skill ([enhance](../enhance/README.md)), which this skill offers once and does not decide for.
- N5 Converting MCP server definitions, hooks, subagents, or output styles into another harness's format. MCP
  projection has its own spec ([mcp-projection](../mcp-projection/README.md)).
- N6 Writing a new skill for the repository ("write a skill that drafts release notes").
- N7 Changing CI workflows, repository settings, security scanning, branch rules, or unrelated project files.
- N8 Formatting files. The skill runs the repository's formatter when it has one and imposes none.

## Key terms

- **K1 canonical configuration**: see [glossary](../glossary.md#canonical-configuration).
- **K2 canonical skills directory**: see [glossary](../glossary.md#canonical-skills-directory).
- **K3 canonical instructions**: see [glossary](../glossary.md#canonical-instructions).
- **K4 harness**: see [glossary](../glossary.md#harness).
- **K5 enabled harness**: see [glossary](../glossary.md#enabled-harness).
- **K6 authored file**: a file a person wrote that carries content. A file a previous run of this tool wrote, and a
  file holding nothing but a heading, are not authored files.
- **K7 material**: content that stays true whether or not this tool ever ran, such as "use pnpm". Material content
  belongs to the owner: it is derived from the repository, shown, and written only on approval.
- **K8 non-material region**: the marked block at the end of the root `AGENTS.md` that describes the bridges this
  tool created in the repository. Every line in it stops being true once the tool's output is removed.
- **K9 consolidate**: move instruction content from a harness's own file into the root `AGENTS.md`, keeping the
  author's wording.
- **K10 bridge**: what a harness that cannot read the canonical configuration is given instead: a skills projection,
  written by the `init` command, or an instruction bridge, an `AGENTS.md` entry in a harness settings file such as
  `.gemini/settings.json`, written by this skill.
- **K11 shadowing file**: a file a harness reads instead of the `AGENTS.md` beside it. For Claude Code these are
  `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`.
- **K12 superseded bridge**: a `CLAUDE.md` whose whole body is the `AGENTS.md` import, or a link to `AGENTS.md`,
  written by an earlier run before Claude Code read `AGENTS.md` itself.
- **K13 personal override**: a `CLAUDE.local.md`, someone's own instructions, usually ignored by Git.
- **K14 single-harness artifact**: an artifact only one harness reads, such as a `.cursor/rules/` rule or a
  `.claude/agents/` subagent.
- **K15 candidate**: the canonical form a single-harness artifact would convert to. Some have none.
- **K16 canonical-only**: an artifact with no cross-harness form, or none that is lossless: subagents, hooks, output
  styles, and MCP server definitions.
- **K17 nested AGENTS.md**: an `AGENTS.md` below the repository root, scoped to its subtree.
- **K18 agent-worktree settings**: see [agent-worktree-settings](../agent-worktree-settings/README.md) K1.
- **K20 consolidated harness instruction file**: a harness's own instruction file, other than a shadowing file and a
  personal override, whose content an approved step has moved into the root `AGENTS.md`, such as a `.cursorrules`, a
  `GEMINI.md`, or a `.github/copilot-instructions.md`.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | user who asks for the setup | the repository ends with one canonical configuration every enabled harness reaches |
| A2.1 | repository owner | nothing they wrote is replaced, rewritten, or removed without their word |
| A2.2 | repository owner | nothing is asserted in `AGENTS.md` about the project that the repository does not show and they did not approve |
| A3.1 | `doctor` and `repair` skills | an instruction-bridge finding handed here ends with the bridge written |
| A4.1 | later agent session in an enabled harness, which never runs the skill | loads the instructions and skills the repository meant |
| A4.2 | later agent session asked to change a skill | edits the canonical copy, not a projection |
| A5.1 | invoking agent | knows from the result what was done and what is left |

## Use cases

The graph is in [graph.md](./graph.md). Every use case is delivered by the skill: its criteria are checked by an eval
run of the skill.

### UC1 — Start the setup (A1.1, A3.1)

- **Trigger**: the user asks to initialize, adopt, or migrate the repository's agent configuration, for example
  "set up AGENTS.md and agent skills for this repo", "migrate our CLAUDE.md and .cursorrules to the open standard",
  or "make our Claude skills work in Codex and Cursor too"; or `doctor` or `repair` hands over an instruction-bridge
  finding that names this skill.
- **Entry node**: `invoke`
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:init-buddy-agent-harness`, with or without the `init` command's flags.
- **Inputs**: the repository, the harnesses to enable, and any flags or prose the invocation carries.
- **Success**: the skill runs, reading the invocation's flags the same way on every harness.
- **Extensions**:
  - UC1.1 The invocation carries something that is not one of the command's flags: it is named and ignored.
  - UC1.2 A flag asks for a write that needs approval: it is still asked.

### UC2 — Survey and plan (A1.1, A2.1)

- **Trigger**: the skill starts.
- **Entry node**: `survey`
- **Entry points**:
  - Skill (primary): its survey, classify, and confirm phases.
- **Inputs**: every canonical and harness artifact in the repository.
- **Success**: a plan, composed from what is on disk, says what will be created, moved, converted, and left alone.
- **Extensions**:
  - UC2.1 An artifact is a previous run's work: it is not content and not a conflict.
  - UC2.2 An artifact has no candidate, or no lossless one: it is reported, not converted.
  - UC2.3 A nested `AGENTS.md` reverses a root rule: it is named, not changed.
  - UC2.4 A skill has nothing to derive frontmatter from: the owner is asked.

### UC3 — Approve or decline each step (A2.1)

- **Trigger**: the plan is presented.
- **Entry node**: `step`
- **Entry points**:
  - Skill (primary): its confirm phase.
- **Inputs**: the owner's answer to each step that needs one.
- **Success**: every approved step and every step that needs no approval is applied.
- **Extensions**:
  - UC3.1 The owner declines a step: that write is dropped and the rest go on.

### UC4 — Derive a root AGENTS.md (A2.2)

- **Trigger**: the repository has no root `AGENTS.md` with authored content.
- **Entry node**: `derive`
- **Entry points**:
  - Skill (primary): its classify and confirm phases.
- **Inputs**: the repository's configuration files, its history, and any index of where facts live.
- **Success**: `AGENTS.md` holds only approved lines, each backed by a file in the repository.
- **Extensions**:
  - UC4.1 No candidate line survives: the file is a heading and one line.
  - UC4.2 A line serves only a minority of the repository's work: it is folded into another or cut.

### UC5 — Consolidate instructions and skills (A1.1, A2.1, A4.1)

- **Trigger**: the plan holds harness instruction files, skills, or rules to move.
- **Entry node**: `classify`
- **Entry points**:
  - Skill (primary): its confirm and apply phases.
- **Inputs**: the approved steps.
- **Success**: the approved content is in the canonical configuration, and no harness reads less than before.
- **Extensions**:
  - UC5.1 A shadowing file holds content: the harness reads none of `AGENTS.md` until it is dealt with.
  - UC5.2 A consolidation would leave a harness reading less: it is offered only with the bridge that prevents it.
  - UC5.3 The file is a personal override: it is never consolidated or removed.
  - UC5.4 A consolidated harness instruction file is left: deleting it, a pointer, or leaving it as it is are each
    put to the owner, and no copy of `AGENTS.md` takes its place.
  - UC5.5 A harness that read the consolidated file would not read `AGENTS.md` after the run: deleting it is not
    offered.
  - UC5.6 The consolidated file has readers that are not agent harnesses: the offer names them.

### UC6 — Bridge the harnesses (A3.1, A4.1)

- **Trigger**: the approved steps are applied.
- **Entry node**: `run`
- **Entry points**:
  - Skill (primary): its apply phase, which runs the `init` command bundled with the skill.
- **Inputs**: the enabled harnesses and the flags the invocation carried.
- **Success**: each enabled harness that needs a bridge has one.
- **Extensions**:
  - UC6.1 The command reports a conflicting target: that target is resolved and the command runs again.
  - UC6.2 Links are unavailable: copies are used and the report says what that means.
  - UC6.3 The command reports a copy file changed on both sides since the copy and `.agents/skills` last agreed: the
    owner picks the side for each such file.

### UC7 — Note the bridges in AGENTS.md (A4.2)

- **Trigger**: the command has run.
- **Entry node**: `bridge`
- **Entry points**:
  - Skill (primary): its apply phase.
- **Inputs**: the bridges the repository now has, and the root `AGENTS.md`.
- **Success**: the non-material region names each bridge the repository has.
- **Extensions**:
  - UC7.1 The owner emptied the region's markers: the region stays empty.
  - UC7.2 The repository has no bridge: no region is written.

### UC9 — Verify and report (A5.1, A1.1)

- **Trigger**: every applied step is done.
- **Entry node**: `verify`
- **Entry points**:
  - Skill (primary): its verify and report phase.
- **Inputs**: what the run wrote.
- **Success**: the report says what was created, consolidated, linked, and left; continuing with `repair` is offered
  for the `doctor` findings this skill does not own; and `enhance` is offered once.
- **Extensions**:
  - UC9.1 The repository has no formatter: none is run.
  - UC9.2 `doctor` reports no finding that `repair` owns: no `repair` offer is made.

## Criteria

### Starting (UC1)

- R1 (UC1, E1) A request to initialize, adopt, or migrate a repository's agent configuration to the open standards,
  such as "migrate our CLAUDE.md and .cursorrules to the open standard", loads this skill, and none of the requests
  named in N2, N3, N4, and N6 does.
- R2 (UC1, E1) Each of the `init` command's flags in the invocation reaches the command in the run, whichever harness
  ran the skill, and so does its prose form: "links are unavailable here" acts as the copy flag, and "replace the
  bridge" acts as the replace flag naming that bridge.
- R3 (UC1, E1) An argument that is not one of the `init` command's flags is named in the report as not recognized,
  causes no flag to be passed to the command, and the rest of the run still happens.
- R4 (UC1, E15) An invocation that asks to replace a target that already holds something still gets the survey first,
  and the replacement is presented for approval before the command runs.

### Surveying and planning (UC2)

- R5 (UC2, E1) No file is created or modified before the plan is presented, and every artifact the plan names exists
  in the repository.
- R6 (UC2, E3) A link that already resolves into `.agents/`, and a superseded bridge, are neither consolidated as
  content nor reported as conflicts.
- R7 (UC2, E3) A nested `AGENTS.md` keeps its place and its content: nothing from it is appended to the root
  `AGENTS.md`, nothing is written in its directory, and the report names each nested file and says whether it was
  judged additive, rather than giving a count alone.
- R8 (UC2, E3) A nested `AGENTS.md` that reverses a rule of the root `AGENTS.md` is named in the plan with what each
  enabled harness will do with it; rewording it as additive is offered, not applied, and the file is unchanged
  whatever the owner answers.
- R9 (UC2, E7) The plan lists each single-harness artifact with its path, the harness that reads it, and its
  candidate, and says plainly of each one with no candidate, such as a subagent, that it has none.
- R10 (UC2, E8) Each subagent, hook, output style, and MCP server definition is reported as canonical-only with the
  reason it was left, and none is written into another harness's format; the reason given for an MCP server is that
  the mapping would supply fields its source never carried.
- R11 (UC2, E15) For a skill whose `SKILL.md` has no frontmatter, the plan shows the `name` and `description` exactly
  as they would be written, neither is written before approval, and where the repository gives nothing to derive a
  value from, the owner is asked for it rather than given a placeholder.
- R12 (UC2, E15) The plan states what will be created, what content moves into `AGENTS.md`, which harness files would
  become pointers, which harnesses will be enabled, and what is left alone and why.

### Approval (UC3)

- R13 (UC3, E16) Creating an absent `.agents/`, `.agents/skills/`, or root `AGENTS.md`, and, with Gemini CLI enabled,
  an absent `.gemini/settings.json` holding the `AGENTS.md` entry, happens without an approval being asked, and each
  creation is reported.
- R14 (UC3, E17) A step that replaces, rewrites, or edits an authored file, such as replacing a `.cursorrules` with a
  pointer or adding the `AGENTS.md` entry to an existing `.gemini/settings.json`, is presented for approval, and the
  file is unchanged until the owner approves.
- R15 (UC3, E17) Every removal of a file is presented for approval before it is made, including a superseded bridge
  an earlier run wrote.
- R16 (UC3, E17) The offer to remove a superseded bridge names the Claude Code sessions that still read only
  `CLAUDE.md`, and the file is unchanged unless the owner approves its removal.
- R17 (UC3, E17) Each single-harness artifact's conversion is asked about on its own, and approving one converts only
  that one.
- R63 (UC3, E19) A declined step leaves its file byte-identical, with no pointer and no copy of `AGENTS.md` written
  in its place, and the other approved steps are applied without being asked again.

### Deriving AGENTS.md (UC4)

- R19 (UC4, E10) A root `AGENTS.md` that holds only a heading, or nothing, is treated as absent, and its derived lines
  are confirmed before any is written; a root `AGENTS.md` with authored content is never rewritten.
- R20 (UC4, E11) Each derived line is shown beside the repository file it was derived from, a candidate line with no
  such file is dropped, and only the approved lines reach `AGENTS.md`.
- R21 (UC4, E11) A candidate line that serves a kind of work the repository's commit history shows is a minority is
  folded into a line that is kept, or cut, and a cut line is reported with where the repository already catches what
  it would have said.
- R22 (UC4, E11) A candidate line phrased as if it served one kind of work, whose fact serves most of the
  repository's sessions, is restated in the form that says what it covers and kept.
- R23 (UC4, E11) When the repository keeps a file that says where each kind of fact lives, that file is read before
  any line is derived, and `AGENTS.md` names it in one line instead of copying its rows.
- R24 (UC4, E11) Every command offered as a line of `AGENTS.md` was run in the repository first, and a command another
  offered command already covers is not offered.
- R25 (UC4, E12) When no candidate line survives, `AGENTS.md` is planned as a heading and one line saying what the
  repository is, and nothing more.

### Consolidating (UC5)

- R26 (UC5, E5) For a shadowing file other than a personal override that holds content of its own beside an
  `AGENTS.md`, the offer says the harness reads that file instead of `AGENTS.md`, and is either to consolidate and
  remove it or to consolidate the shared part and leave it holding the `AGENTS.md` import above what only Claude Code
  needs; no copy of the consolidated content is left under its name.
- R27 (UC5, E6) A personal override is neither consolidated nor removed, and the only change offered is the
  `AGENTS.md` import at its top.
- R62 (UC5, E5) For a harness that reads `AGENTS.md` only once a settings file names it, consolidating its
  instruction file is offered only together with the bridge that keeps the content reachable.
- R59 (UC5.4, E5, E17) What is left of a consolidated harness instruction file is put to the owner as three answers,
  each asked on its own: delete it, replace it with a pointer to `AGENTS.md`, or leave it as it is; under no answer
  is a copy of `AGENTS.md` written in its place.
- R60 (UC5.5, E5, E17) Deleting a consolidated harness instruction file is offered only when every harness that read
  it reads `AGENTS.md` after the run; for `GEMINI.md`, only together with, or after, the settings entry that names
  `AGENTS.md` as a Gemini CLI context file.
- R61 (UC5.6, E5, E17) The offer for a consolidated `.github/copilot-instructions.md` names the readers of that file
  that are not agent harnesses, and says that deleting it or replacing it with a pointer takes its content from
  them.
- R29 (UC5, E5) The offer to consolidate a Cursor rule that loads only when its globs or description match describes
  the trade as that rule becoming always loaded, and claims no loss of readers.
- R30 (UC5, E18) Approved consolidated content is appended to `AGENTS.md` in the author's wording, and the existing
  sections of `AGENTS.md` are neither reordered nor rewritten.
- R31 (UC5, E18) An approved move of a skill directory into `.agents/skills/` keeps its files' Git history, and the
  skill is found at its canonical path.
- R32 (UC5, E18) A migrated `SKILL.md` whose `description` does not parse gets it quoted with its text unchanged, and
  one whose `name` differs from its directory gets the name aligned to the directory.
- R33 (UC5, E18) An approved edit to a settings file adds `AGENTS.md` to the existing list of context files rather
  than replacing the list, and leaves the file's comments, key order, and indentation unchanged.
- R34 (UC5, E18) No `CLAUDE.md` is written anywhere, at the root or beside a nested `AGENTS.md`.
- R35 (UC5, E18) No `.agents/` folder other than `.agents/skills/` is created, and `.agents/` is described as a
  convention, not a standard.
- R36 (UC5, E18) No `AGENTS.local.md` is created; a request to keep personal instructions out of version control is
  pointed at the personal override, with the note that it hides `AGENTS.md` unless it opens with the `AGENTS.md`
  import.
- R37 (UC5, E18) No file outside the agent configuration is changed (a CI workflow, a repository setting, a branch
  rule, or an unrelated project file), except the agent-worktree lines the owner approved.

### Bridging (UC6)

- R38 (UC6, E21) The `init` command runs at the repository root with every harness the user named.
- R39 (UC6, E22) When the command reports a conflicting target, the agent resolves that target with the owner and runs
  the command again naming only it, and no other projection is replaced.
- R40 (UC6, E24) When links are unavailable and the skills are copied, the report says a copy is a snapshot, not a
  live projection.
- R64 (UC6.3, E22) For each copy file the command reports as changed on both sides since the copy and `.agents/skills`
  last agreed, the skill shows that file's difference between the two sides, asks which side wins, and writes nothing
  for that file without an answer.
- R41 (UC6, E24) With Gemini CLI enabled, after the run its settings name `AGENTS.md` as a context file, unless the
  owner declined that edit to an existing settings file.
- R42 (UC6, E24) A run started from an instruction-bridge finding, with every step it needs approved, leaves the
  repository in a state where [instruction-bridges](../instruction-bridges/README.md) no longer reports that finding.

### The non-material region (UC7)

- R43 (UC7, E25) When the repository has a skills bridge and the root `AGENTS.md` has no region markers, the region is
  written at the end of the file without an approval being asked, and nothing above it is reordered or removed.
- R44 (UC7, E25) The region names each bridge the repository has and says nothing about a bridge it does not have.
- R45 (UC7, E25) A run over an `AGENTS.md` that already has the region rewrites it in place, leaving one region.
- R46 (UC7, E26) Region markers present with nothing between them are left with nothing between them.
- R47 (UC7, E27) When every enabled harness reads the canonical configuration natively, no region is written, on this
  run or a later one.

### Verifying and reporting (UC9)

- R54 (UC9, E28) Before the report, the run has confirmed that each projection resolves into `.agents/skills`, that
  each migrated `SKILL.md` parses and carries a `description`, and that no shadowing file other than a personal
  override is left holding content beside an `AGENTS.md`, unless the owner declined its consolidation.
- R55 (UC9, E29) When the repository has a formatter of its own, it is run over the files the run wrote, and the
  report says so.
- R56 (UC9, E31) When the repository has no formatter, none is installed, configured, or run.
- R57 (UC9, E31) The report names what was created, consolidated, linked, and left canonical-only with the reason for
  each; each agent-worktree offer as written, declined, or already covered; and each single-harness artifact still
  present, split by declined or no canonical form.
- R65 (UC9, UC9.2, E30, E31) After the report and before the `enhance` offer, the run lists each `doctor` finding
  that the `repair` skill owns, as [detect-and-repair](../detect-and-repair/README.md) assigns it, and offers once to
  continue with `repair`; when there is no such finding, no `repair` offer is made.
- R58 (UC9, E31) After the report, the `enhance` skill is offered exactly once, and this skill writes no instruction
  content whichever way the owner answers.

## Open questions

None.

## References

- [harness-init](../harness-init/README.md): the `init` command this skill runs.
- [instruction-bridges](../instruction-bridges/README.md) and [detect-and-repair](../detect-and-repair/README.md):
  route every instruction-bridge finding to this skill.
- [repair](../repair/README.md): the other writing skill, which asks before every correction.
- [enhance](../enhance/README.md): the skill offered at the end of a run.
- [agent-worktree-settings](../agent-worktree-settings/README.md): the agent-worktree settings this skill offers.
- [worktree-diagnosis](../worktree-diagnosis/README.md): reports the agent-worktree settings this skill offers.
- [glossary](../glossary.md): the shared terms.
- The shipped skill, `packages/buddy-agent-harness/skills/init-buddy-agent-harness/`: its `SKILL.md` and the
  references `agents-md.md` (the material line and the region), `frontmatter.md`, and `harnesses/` (each harness's
  bridge).
- [AGENTS.md](https://agents.md/) and [Agent Skills](https://agentskills.io/): the open standards the canonical form
  follows.
