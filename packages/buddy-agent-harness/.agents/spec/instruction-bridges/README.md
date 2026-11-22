# Instruction bridges

Every enabled harness that can no longer read `AGENTS.md` is reported.

## What

A harness can end up reading none of a repository's `AGENTS.md` in two opposite ways, and neither looks wrong.

A harness that cannot read `AGENTS.md` where it lies is given an instruction bridge to it, such as an `AGENTS.md`
entry in `.gemini/settings.json`. When another tool rewrites that file without the entry, the harness reads none of
the repository's instructions and says nothing.

A harness that reads `AGENTS.md` by itself can still be stopped by a file it prefers in the same directory. Claude
Code reads `AGENTS.md` only where it finds no `CLAUDE.md` beside it. A `CLAUDE.md` holding an old project overview
shadows the canonical file: nothing is missing, and the canonical file goes unread.

The `doctor` command checks both, for the harnesses this repository uses, and reports each harness path that keeps
`AGENTS.md` from being read. It reads files a person wrote and never rewrites them, so it only reports.

## Non-goals

- N1 **Repairing.** Every repair touches prose a person wrote. Who owns it is
  [detect-and-repair](../detect-and-repair/README.md).
- N2 **Judging what the instructions say.** Whether a bridge exists is decidable; whether the instructions are good is
  not this spec's.
- N3 **A shadow beyond its own directory.** A shadow suppresses the `AGENTS.md` beside it and nothing deeper, so a
  `CLAUDE.md` in one subtree says nothing about another.
- N4 **User-scope instruction files.** Whether each harness loads `~/.agents/AGENTS.md` is
  [global-instructions](../global-instructions/README.md).
- N5 **Skills bridges.** [bridge-resolution](../bridge-resolution/README.md).
- N6 **The shape of the report.** [diagnosis-report](../diagnosis-report/README.md).

## Key terms

- K1 **canonical instructions**: see [glossary](../glossary.md#canonical-instructions). Here the root `AGENTS.md`
  and every nested `AGENTS.md`.
- K2 **harness**: see [glossary](../glossary.md#harness).
- K3 **checked harness**: see [bridge-resolution](../bridge-resolution/README.md), K5. The same set is checked here.
- K4 **instruction bridge**: what a harness needs in its own file to read `AGENTS.md`. At project scope it is an
  `AGENTS.md` entry in the harness's settings list of context files (Gemini CLI). Which harness needs one, and of
  which form, is the harness's rule.
- K5 **shadow filename**: a file whose presence in a directory stops a harness reading the `AGENTS.md` beside it. For
  Claude Code: `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`. A harness has an instruction bridge or shadow
  filenames, never both.
- K6 **shadowing**: a shadow file carrying its own content, read instead of the `AGENTS.md` beside it.
- K7 **superseded**: a shadow file that imports `AGENTS.md` on a line of its own, or is a symlink to it, so the
  canonical file still arrives. It works and is redundant: the bridge written before Claude Code read `AGENTS.md`
  itself, still useful for a session that cannot.
- K8 **unbridged**: a settings file that parses and does not name `AGENTS.md` among its context files.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | `doctor-buddy-agent-harness` skill | learn which harnesses cannot reach `AGENTS.md` |
| A2.1 | person at a shell | find out why a harness is ignoring the repository's instructions |
| A3.1 | session-start hook | learn of a broken instruction bridge at every session start with no risk of a write |
| A4.1 | `init-buddy-agent-harness` skill | receive every repair here, told which file and which cause |
| A5.1 | downstream agent session (never runs the command) | load the repository's `AGENTS.md` in every harness |

## Use cases

### UC1 — Learn which harnesses cannot read AGENTS.md (A1, A2, A5)

- **Trigger**: a caller asks whether every checked harness can still read this repository's instructions.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`. Harness selection is shared with
    [bridge-resolution](../bridge-resolution/README.md); the root and format options are
    [diagnosis-report](../diagnosis-report/README.md)'s.
  - Library: `diagnoseInstructions`, and `diagnoseBridges`, as [entry-point](../entry-point/README.md) exposes them.
  - Skill: `doctor-buddy-agent-harness` presents the report.
- **Inputs**: the repository root, and the checked harnesses.
- **Success**: every instruction bridge and every shadow file is listed with its form and state, and each one that
  keeps `AGENTS.md` unread, or is redundant, has a finding.
- **Extensions**:
  - UC1.1 No root `AGENTS.md`, and a bridge or a root shadow file depends on one.
  - UC1.2 The settings file is absent.
  - UC1.3 The settings file does not parse.
  - UC1.4 The settings file parses and does not name `AGENTS.md`.
  - UC1.5 A shadow file carries its own content.
  - UC1.6 A shadow file imports or links to `AGENTS.md`.
  - UC1.7 A directory cannot be listed.

### UC2 — Check at every session start without writing (A3)

- **Trigger**: a session-start hook runs the command unattended.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
- **Inputs**: the repository root.
- **Success**: the hook learns of every broken instruction bridge and the repository is unchanged.
- **Extensions**: extensions: none, every path of UC1 is a read and ends in a report.

### UC3 — Route an instruction finding to its owner (A4)

- **Trigger**: a skill reads the findings to decide which ones it owns.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Skill (primary): `init-buddy-agent-harness` and `repair` read the findings `doctor` reports.
- **Inputs**: the findings of one run.
- **Success**: the owning skill knows from the finding alone the file, the cause, and that no command fixes it.
- **Extensions**: extensions: none, every finding carries its path and cause.

## Criteria

### Diagnosis

- R1 In every run, `doctor` leaves the repository's files unchanged, whatever instruction bridges it finds. (UC2)
- R2 Only checked harnesses that have an instruction bridge or shadow filenames get instruction rows; a checked harness
  that reads `AGENTS.md` where it lies and prefers no other file (Cursor, Codex, Copilot CLI) gets none. (UC1, E2)
- R3 When no checked harness has an instruction bridge or shadow filenames, the run reports no instruction row and no
  instruction finding, even when the repository has no `AGENTS.md`. (UC1, E1)
- R4 When there is no root `AGENTS.md`, no checked instruction bridge, and no shadow file at the root, the run
  reports no instruction finding. (UC1, E4)
- R5 When there is no root `AGENTS.md` and a checked instruction bridge exists or a shadow file sits at the root, the
  run reports exactly one missing-instructions finding for the repository, not one per bridge. (UC1, E5)
- R6 A shadow file at the root with no root `AGENTS.md` beside it gets no shadow row and no shadowing finding.
  (UC1, E5)
- R7 A settings file whose context-file list names `AGENTS.md`, beside the harness's own default or alone, and with
  or without comments, is listed ok, whether or not `AGENTS.md` exists. (UC1, E11)
- R8 A checked instruction bridge whose settings file is absent is listed missing, with a missing-bridge finding
  naming the settings file. (UC1, E9)
- R9 A settings file that does not parse is listed unreadable, with an unreadable finding naming it, and nothing is
  inferred from its contents. (UC1, E10)
- R10 A settings file that parses and does not name `AGENTS.md`, including one with no context-file key, is listed
  unbridged, with an unbridged finding naming it. (UC1, E12)
- R11 For each directory holding an `AGENTS.md`, every shadow filename of each checked harness is checked beside it.
  (UC1, E15, E17)
- R12 A directory holding no `AGENTS.md` gets no row and no finding, even when a shadow file sits in it. (UC1, E14)
- R13 An `AGENTS.md` under a dot-directory or under `node_modules` is not checked. (UC1, E14)
- R14 A directory that cannot be listed is read as holding no `AGENTS.md`, and the run completes. (UC1, E14)
- R15 Where an `AGENTS.md` has no shadow file beside it, nothing is reported for that directory. (UC1, E16)
- R16 A shadow file that carries its own content without importing `AGENTS.md`, or is a symlink to any other file, is
  listed shadowing, with a shadowing finding naming it. (UC1, E19)
- R17 A shadow file that imports `AGENTS.md` on a line of its own, with or without other content below, or is a
  symlink to `AGENTS.md`, is listed superseded, with a superseded finding naming it and no shadowing finding.
  (UC1, E18)
- R18 Every instruction row carries its path, the form found (an import, a symlink, a settings entry, a file, or
  absent), and its state (ok, missing, unbridged, unreadable, shadowing, or superseded). (UC1, E8, E13)
- R19 Each bridge and each directory is judged on its own, so one run reports every fault it finds, including a
  clean root beside a shadowed nested directory. (UC1, E6, E7)

### Routing

- R20 Each of the six instruction causes in R5, R8, R9, R10, R16, and R17 is reported under a fault name of its own,
  as [detect-and-repair](../detect-and-repair/README.md) K4 defines it.
  (UC3, E5, E9, E10, E12, E18, E19)
- R21 No instruction finding carries a runnable command: each repair edits a file a person wrote. (UC3, E5, E9, E10,
  E12, E18, E19)

## Open questions

None.

## References

- [diagnosis-report](../diagnosis-report/README.md): the output shape.
- [detect-and-repair](../detect-and-repair/README.md): which surface owns each finding's repair.
- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): what arriving with an instruction finding does.
- [bridge-resolution](../bridge-resolution/README.md), [global-instructions](../global-instructions/README.md): the
  sibling families.
- `.research/agentic-configuration-standards/`: the per-harness sources for which harness needs a bridge and which
  filenames shadow `AGENTS.md`.
