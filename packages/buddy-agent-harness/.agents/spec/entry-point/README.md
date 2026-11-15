# Entry point

A program reaches any command without starting a process.

## What

The package's commands were reachable only as a process. The shipped skills each run a subcommand of the CLI they
ship beside, so each had to change the global process arguments and import the executable for its side effect, a
workaround copied into every skill. A test could reach a command only by stubbing one global and reading another
back. A program that wanted the `doctor` report had to run the CLI and parse the tool's own output again.

This capability makes every command callable in process. A caller hands over the arguments the process would have
supplied and gets back how the run went, with the command's output on its own streams. A program that wants the
`doctor` report as a value calls the report builder, and one that wants a family's raw diagnosis calls that
diagnosis. Only the executable and the skill launchers turn a process into a call and the returned outcome into the
process's exit status, so a call never reaches past its caller.

## Non-goals

- **N1 Exporting the CLI framework's application object.** It would make that framework's shape part of this
  package's public surface, so a breaking release of the framework would become one here.
- **N2 The MCP server inventory.** The package exports an inventory of configured MCP servers as a separate call for a
  separate question, outside `doctor`. What it reports is not stated here (Q1).
- **N3 What a command prints.** Each command owns its output, written through
  [command-output](../command-output/README.md).
- **N4 The report's shape.** The sections and rows of the `doctor` report are
  [diagnosis-report](../diagnosis-report/README.md)'s. This spec owns that the report is reachable as a value,
  unchanged.
- **N5 Learning the invoked path without the process.** `doctor` names the path it was invoked as, and the only way a
  command learns it is from the process. That read stays.
- **N6 Replacing the process boundary.** The executable still reads the process's arguments and sets its exit status.

## Key terms

- **K1 entry point**: the call that takes a full argument vector, as the process would supply it with the executable
  and script first, runs the command it names, and returns the run's outcome.
- **K2 outcome**: how a run went, one of three: done as asked; called correctly but could not complete (failure); called
  wrongly, so the same invocation cannot succeed (refused).
- **K3 process boundary**: the executable and the skill launchers, the only code that reads the process's arguments
  or sets its exit status.
- **K4 launcher**: the script a shipped skill runs in preference to a download, built from the package and shipped in
  the skill's folder through the npm package.
- **K5 report builder**: the exported call that returns the `doctor` report as a value, given a diagnosis and the
  invoked path to report.
- **K6 failure channel**: the stream a run's failure message is written to, separate from the one its answer is
  written to.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | skill launcher | run one subcommand without changing global state or importing the executable |
| A2.1 | the executable | turn the process's arguments into a call, and the call's outcome into the exit status |
| A3.1 | package consumer | get the `doctor` report as a value, without parsing the tool's own output |
| A3.2 | package consumer | get exactly what a command prints, and learn how it went |
| A3.3 | package consumer | get one family's raw diagnosis |
| A4.1 | agent parsing `doctor` | read a stream that carries the report and nothing else |
| A5.1 | test | drive a command and read its outcome without stubbing the process |
| A6.1 | user of a skill installed without its launcher | still run the subcommand the skill needs |
| A7.1 | person or agent invoking the package with no command | see live data about the repository, not a manual |

## Use cases

### UC1 — Run a command in process and learn how it went (A3.2, A4.1, A5.1)

- **Trigger**: a caller wants a command run and its outcome reported back to it.
- **Entry node**: B
- **Entry points**:
  - Library (primary): the entry point, exported from the package.
- **Inputs**: a full argument vector, executable and script included.
- **Success**: the command runs, its output appears on its own streams, and the outcome is returned to the caller.
- **Extensions**:
  - **UC1.1** The command reports a failure: the failure is returned.
  - **UC1.2** The framework rejects the invocation, such as an unknown option or command: refused is returned.
  - **UC1.3** Parsing the arguments throws: the message goes to the failure channel and refused is returned.
  - **UC1.4** What was thrown carries no message: a generic invalid-command message goes to the failure channel.

### UC2 — Turn a process into a call and back (A2.1)

- **Trigger**: the package's executable is started.
- **Entry node**: A
- **Entry points**:
  - Command line (primary): `buddy-agent-harness`.
- **Inputs**: the process's arguments.
- **Success**: the command runs and the process ends with the exit status for the returned outcome.
- **Extensions**:
  - **UC2.1** The outcome is a failure or refused: the process ends with that outcome's exit status.

### UC3 — Run a subcommand from a shipped skill (A1.1, A6.1)

- **Trigger**: a shipped skill needs one subcommand run against the working directory.
- **Entry node**: A
- **Entry points**:
  - Skill (primary): the launcher in the skill's folder.
  - Command line: a pinned invocation of the package, the fallback the skill names.
- **Inputs**: the process's arguments, with the subcommand inserted.
- **Success**: the subcommand runs against the working directory and the process ends with its outcome.
- **Extensions**:
  - **UC3.1** The skill was installed without its launcher, such as from git: the skill names an invocation of the
    package pinned to the version that generated it.
  - **UC3.2** The subcommand fails or is refused: the process ends with that outcome's exit status.

### UC4 — Get the report or a diagnosis as a value (A3.1, A3.3)

- **Trigger**: a program wants the assembled `doctor` report, or one family's diagnosis, rather than bytes.
- **Entry node**: RB
- **Entry points**:
  - Library (primary): the report builder, and each family's exported diagnosis.
- **Inputs**: for the report builder, a diagnosis and the invoked path to report; for a diagnosis, its options.
- **Success**: the value, in the shape its owning spec states.
- **Extensions**: none, the report builder assembles a diagnosis already made and has no path that misses its goal; a
  diagnosis's own extensions are its detecting spec's.

### UC5 — Invoke the package with no command (A7.1)

- **Trigger**: the executable is started with no command named.
- **Entry node**: BI
- **Entry points**:
  - Command line (primary): `buddy-agent-harness` alone, or with `doctor`'s options.
  - Library: the entry point called with only the executable and the script.
- **Inputs**: `doctor`'s options, or none.
- **Success**: the `doctor` report for the repository, under a header naming the package.
- **Extensions**: none of its own; a failing or refused run takes the same paths as `doctor` does
  ([diagnosis-report](../diagnosis-report/README.md)).

## Criteria

### The entry point

- **R1** (UC1, E1) Called with a full argument vector whose first two entries are the executable and the script,
  followed by a subcommand and its arguments, the entry point runs that subcommand with those arguments and leaves the
  process's own argument vector unchanged.
- **R2** (UC1, E1) Two calls of the entry point in one process share no state: the outcome and output of the second do
  not depend on the first.
- **R3** (UC1, E3) The entry point returns done when the command did what was asked, including a `doctor` run that
  found faults and a request for the version or for help.
- **R4** (UC1.1, E2) When the command reports a failure, the entry point returns that failure.
- **R5** (UC1.2, E4) When the framework rejects the invocation, such as an option no command declares, the entry point
  returns refused.
- **R6** (UC1.3, E5) When parsing the arguments throws, the entry point writes the message to the failure channel,
  writes nothing to stdout, and returns refused.
- **R7** (UC1.4, E5) When parsing throws something that carries no message, the entry point still writes a failure
  naming an invalid command to the failure channel.
- **R8** (UC1, E8) No call of the entry point sets the process's exit status.
- **R9** (UC1, E3) The version the entry point reports is the published package's own version.

### The process boundary

- **R10** (UC2, UC2.1, E6) The executable ends the process with the exit status for the outcome the entry point
  returned, failure and refused included.
- **R11** (UC3, UC3.2, E6) A launcher runs its subcommand against the working directory and ends the process with the
  exit status for the returned outcome, failure and refused included.
- **R12** (UC3, E6) The published package holds every launcher a shipped skill runs, at the path that skill names, and
  a skill's folder copied alone, with no installed dependencies around it, runs its launcher successfully.
- **R13** (UC3.1, E9) A shipped skill that runs a launcher names, for when the launcher is missing or cannot run, an
  invocation of the package pinned to the version that generated the skill.

### The reachable surface

- **R14** (UC1, UC4, E7) The package's public entry exports the entry point, the report builder, and each family's
  diagnosis, and does not export the CLI framework's application object.
- **R15** (UC4, E7) Given a diagnosis and an invoked path, the report builder returns the report
  [diagnosis-report](../diagnosis-report/README.md) states, unchanged: a healthy diagnosis still yields the stated
  healthy answer, not an empty list, and a section that does not apply is absent, not empty.

### The bare invocation

- **R17** (UC5, E15) A run that names no command answers with the report a `doctor` run with the same options would
  give, preceded by a header that names the executable and describes the package, with the executable named once.
- **R18** (UC5, E15) A run that names no command accepts `doctor`'s options with their `doctor` meaning, and ends as
  done when the report is produced, not as refused.

### Adapters

- **R16** (UC1, UC2, E2, E3, E4, E5, E6) The entry point returns each of the three outcomes distinctly, and the
  process boundary maps each to its own exit status, the same for every command and stable across releases.

## Open questions

- **Q1** The MCP server inventory has no spec. The package exports it as a separate call that reads user-scope
  configuration `doctor` does not, and that a consumer can bundle without the CLI framework. The v1 node named it only
  as a layer of the reachable surface.
  - Options: (a) give it a spec of its own; (b) fold it into [mcp-diagnosis](../mcp-diagnosis/README.md) as a use
    case; (c) add a use case here.
  - Recommendation: (a). It answers a different question from any diagnosis, and what it reads and redacts needs
    criteria of its own.
- **Q3** A throw that escapes the framework still goes to the human-only stream. R6 and R7 state what the code does:
  when parsing the arguments throws outside the framework's own error handling, the message goes to the failure
  channel and nothing to stdout. [command-output](../command-output/README.md) R17 says no command's failure writes
  to that stream, and every other failure is now a coded error on stdout.
  - Options: (a) make this last-resort path a coded error on stdout too, with the unexpected-failure code; (b) keep
    it as an exception, since no command ran and the framework could not encode anything.
  - Recommendation: (a), so a program parsing stdout never meets a failure it cannot read. Until it is decided, R6
    and R7 hold.

## References

- [graph.md](./graph.md): how a call's outcome is decided and applied.
- [diagnosis-report](../diagnosis-report/README.md): the report the builder returns.
- [command-output](../command-output/README.md): how a command's answer becomes bytes, the same in process and out.
- [detect-and-repair](../detect-and-repair/README.md): the pinned fallback a skill rendering uses.
