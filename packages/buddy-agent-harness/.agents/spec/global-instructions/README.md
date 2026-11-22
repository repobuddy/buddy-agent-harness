# Global instructions

Every installed harness that does not load `~/.agents/AGENTS.md` is reported.

## What

`~/.agents/AGENTS.md` is the user-scope counterpart of a repository's `AGENTS.md`. The `enhance` skill hands global
placements over to it, and other tools hand text to it too. No harness reads it by itself. Each reads a user-scope
instruction file of its own, such as `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md`, and that file has to load the
global one. Where none does, every line put in the global file does nothing in that harness, and nobody is told.

The `doctor` command checks, for each harness installed for the user, whether its user-scope file loads the global
one, and hands the person the exact step that would make it load. A harness that keeps its user rules outside a file
is reported as unable to load one, with the step of pasting the text into its user rules. The report also names the
harness `doctor` runs under, so a skill can answer for that harness. The file is outside the repository and nothing
this package ships writes there, so every repair is the person's to make.

## Non-goals

- N1 **Writing.** No surface of this package, command or skill, writes a user-scope file or the global file.
- N3 **Judging what the global file says.** Whether it loads is decidable; whether it is good is not this spec's.
- N4 **Repository instruction bridges.** [instruction-bridges](../instruction-bridges/README.md).
- N5 **The shape of the report.** [diagnosis-report](../diagnosis-report/README.md).

## Key terms

- K1 **harness**: see [glossary](../glossary.md#harness).
- K2 **global instruction file**: `~/.agents/AGENTS.md`.
- K3 **user-scope instruction file**: the file a harness reads from its user-scope directory for every repository:
  `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex, `copilot-instructions.md` for Copilot CLI, `GEMINI.md` for
  Gemini CLI.
- K4 **installed for the user**: the harness's user-scope detection directory exists, under the home directory or
  where a relocating variable moves it.
- K5 **loads the global file**: the harness, reading its user-scope file, also reads the global instruction file.
  Claude Code loads it through an import line. Codex, Copilot CLI, and Gemini CLI cannot import a file outside their
  own directory, so for them the user-scope file must be a symlink to the global file.
- K6 **relocating variable**: an environment variable that, set and non-empty, replaces a harness's user-scope
  directory: `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `COPILOT_HOME`. Codex and Copilot CLI read an empty value as unset;
  Claude Code reads it as the directory it starts in.
- K7 **override file**: a file a harness reads in place of its user-scope file when it holds more than whitespace,
  such as Codex's `AGENTS.override.md`.
- K9 **step**: the change a finding hands to the person to make by hand: an import line to add, content to move into
  the global file, a symlink to create, an override to remove, a variable to unset or correct, or the global file's
  text to paste into a harness's user rules.
- K10 **harness without a user-scope file**: a harness that keeps its user rules outside a file, so no file of its can
  load the global one: Cursor, whose user rules live in a settings panel, and Devin Desktop, which documents no
  user-scope path.
- K11 **harness in use**: the harness `doctor` runs under, as the run detects it, or unknown when it cannot tell.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | person | know, for each harness they use, whether global text reaches it, and the step that makes it |
| A2.1 | `doctor-buddy-agent-harness` skill | present each harness's state and hand each step to the person unchanged |
| A3.1 | `enhance` skill | say, before handing a global placement over, whether the harness in use will load it |
| A4.1 | `repair` skill | recognise these findings as having no correction of its own, and pass the step on unchanged |
| A5.1 | program diagnosing a repository | read nothing outside the repository, or from its shell, unless asked |

## Use cases

### UC1 — Learn which installed harnesses load the global file (A1, A2)

- **Trigger**: a caller asks whether text placed in `~/.agents/AGENTS.md` reaches each harness.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`, with its option naming harnesses.
  - Skill: `doctor-buddy-agent-harness` presents the report.
- **Inputs**: the home directory, the environment, and any harnesses the caller names.
- **Success**: each installed or named harness has a row with its state, and each that does not load an existing
  global file has a finding carrying the step that makes it load, or that pastes the text in where no file can.
- **Extensions**:
  - UC1.1 The user-scope file is absent.
  - UC1.2 The user-scope file loads nothing of the global file, or cannot be read as a file.
  - UC1.3 An override file holding content is read first and does not land on the global file.
  - UC1.4 A relocating variable is set but empty where the harness reads that as its start directory.
  - UC1.5 There is no global file, so nothing goes unread.
  - UC1.6 The harness has no user-scope file: its row says it cannot load a file.

### UC2 — Tell whether a global placement will load (A3)

- **Trigger**: `enhance` is about to hand a placement over to the global file.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Skill (primary): `enhance` reads the rows `doctor` reports.
- **Inputs**: the home directory and the environment.
- **Success**: `enhance` reads which harness is in use, and a row for each installed harness, whether or not the
  global file exists yet.
- **Extensions**:
  - UC2.2 The harness in use has no user-scope file: its row says it cannot load a file.
  - UC2.3 The run cannot tell which harness it is under: the report says the harness in use is unknown.

### UC3 — Pass a global step on unchanged (A4)

- **Trigger**: `repair` runs `doctor` and meets a global instruction finding.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Skill (primary): `repair` reads the findings `doctor` reports.
- **Inputs**: the findings of one run.
- **Success**: `repair` tells from the finding alone that it owns no correction, and hands the step to the person.
- **Extensions**: extensions: none, every finding carries its cause and its step.

### UC4 — Diagnose a repository alone from a program (A5)

- **Trigger**: a program calls the library to diagnose a repository.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Library (primary): `diagnoseBridges` and `diagnoseGlobalInstructions`, as
    [entry-point](../entry-point/README.md) exposes them.
- **Inputs**: the repository root, and optionally a home directory and an environment.
- **Success**: the result depends on the home directory and the environment only when the program passes them.
- **Extensions**: extensions: none, an omitted input turns its check off rather than failing.

## Criteria

### Which harnesses get a row

- R1 No surface of this package writes a user-scope file, an override file, or the global file, and no global
  instruction finding carries a runnable command. (UC1, UC3)
- R2 A harness that is neither installed for the user nor named by the caller gets no row. (UC1, E1)
- R3 A harness the caller names gets a row even when it is not installed for the user. (UC1, E2)
- R24 A harness without a user-scope file, installed for the user or named by the caller, gets a row in a state of
  its own saying it cannot load a file, distinct from every other state; when the global file exists, it gets a
  finding whose step is to paste the global file's text into that harness's user rules. (UC1.6, UC2.2, E17)
- R30 The report names the harness in use, and says it is unknown when the run cannot tell, never naming a harness
  it did not detect. (UC2, UC2.3)
- R5 A library call given no home directory reports no global instruction row and reads nothing outside the
  repository. (UC4, E1)
- R6 A library call given no environment follows no relocating variable. (UC4, E6)
- R7 The command passes the user's home directory and its own environment, so a person at a shell gets rows.
  (UC1, E2)

### Whether the user-scope file loads the global file

- R8 An absent user-scope file gives a missing row and a missing finding naming that file. (UC1, E13)
- R9 A user-scope file that is a symlink to the global file gives an ok row, for every harness. (UC1, E14)
- R10 For a harness that imports, a user-scope file holding an import of the global file anywhere among its own
  content gives an ok row, whether the import names the home directory by its short form or its absolute path.
  (UC1, E15)
- R11 A user-scope file with its own content and no import, a symlink to any other file, an import line in a harness
  that cannot import, or a path that cannot be read as a file gives an unbridged row and an unbridged finding naming
  that file, and the run completes. (UC1, E16)
- R12 For Gemini CLI, a user settings file naming `AGENTS.md` does not count as loading the global file; the file
  judged is `~/.gemini/GEMINI.md`. (UC1, E13, E16)
- R27 The step on a missing or unbridged finding is, for a harness that imports, the import line to add to its
  user-scope file; for a harness that cannot import, the symlink from the user-scope file to the global file,
  preceded by moving the file's own content into the global file where it has any. (UC1, E13, E16)

### Relocated and overridden files

- R14 When a harness's relocating variable is set and non-empty, its detection directory, its user-scope file, and
  its override file are all looked up under the variable's directory. (UC1, E5)
- R15 A path under a relocated directory is written in rows and steps by the variable's name, and a path under the
  home directory by the home directory's short form, so no report holds the user's absolute home path. (UC1, E5, E6)
- R16 For Codex and Copilot CLI, a relocating variable set to an empty value is read as unset. (UC1, E6)
- R28 For Claude Code with its relocating variable set to an empty value, the row names `CLAUDE.md` in the directory
  Claude Code starts in (the repository root, for `doctor`); when the global file exists, one emptied finding names
  the variable, in place of the file's own missing or unbridged finding, even when that file loads the global file,
  and its step is to unset the variable or set it to the directory meant. (UC1, E7, E8)
- R29 An override file holding more than whitespace that does not land on the global file gives the user-scope file
  an overridden row and an overridden finding naming the override file, whose step moves its content into the global
  file and removes it; the user-scope file's own finding, if any, is reported beside it. (UC1, E10, E11)
- R19 An override file that is a symlink to the global file gives an ok row naming the override file, and no finding.
  (UC1, E9)
- R20 An override file holding only whitespace is ignored. (UC1, E12)

### Findings

- R21 When the global file does not exist, every row is still reported and no global instruction finding of any
  cause is raised. (UC2, E7, E10, E13, E16)
- R25 Every row carries its harness and its state (ok, missing, unbridged, overridden, or cannot load a file), and,
  for a harness with a user-scope file, the path of the file the harness reads and the form found (an import, a
  symlink, a file, or absent). (UC2, E9, E10, E13, E16, E17)
- R26 Each of the five global instruction causes in R8, R11, R24, R28, and R29 is reported under a fault name of its
  own, as [detect-and-repair](../detect-and-repair/README.md) K4 defines it. (UC3, E7, E10, E13, E16, E17)

## Open questions

None.

## References

- [diagnosis-report](../diagnosis-report/README.md): the output shape.
- [detect-and-repair](../detect-and-repair/README.md): every global step goes to the person.
- [enhance](../enhance/README.md): the consumer of the rows before a global placement.
- [instruction-bridges](../instruction-bridges/README.md): the repository-scope sibling.
- `.research/agentic-configuration-standards/evidence.md`: the vendor facts behind each harness's user-scope file,
  its import rules, and its relocating variable.
