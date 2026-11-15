# Command output

Every command's result becomes the bytes on stdout the same way.

## What

Every command the package publishes ends by handing over an answer, and most of its readers are programs: the
shipped skills parse what `doctor` writes, and other tools read the machine format. A reader that asks for one
format and gets another parses the wrong thing and never learns why. A stream that carries a stray line beside the
answer breaks the parse. A path that embeds someone's home directory is one a person on another machine cannot
paste back. If each command decided these for itself, one command's spec would end up specifying the others' output,
and the commands would drift apart.

This capability is the one output every command writes through. A command hands it one answer and the requested
format. The answer is either a result, which is encoded in that format, or a document that already is the answer,
which is written exactly as it stands. Every command offers the same formats, refuses any other, and writes nothing
to stdout except that one answer. Paths a report names are written in a form a person can paste. A
command that fails answers the same way: an error in the format the caller asked for, with a code a program can
branch on and a next step, and nothing on the stream only a person reads. A warning, such as a deprecation notice,
never lands inside the answer.

## Non-goals

- **N1 What a result holds.** That is each command's, such as [diagnosis-report](../diagnosis-report/README.md) for
  `doctor` and [harness-init](../harness-init/README.md) for `init`. Nothing here depends on what a result holds.
- **N2 A command's default format.** Each command chooses its own default from the shared set.
- **N3 The grammar of each format.** How a result is spelled in each format, and how the text rendering lays out
  tables, belongs to the lower rung.
- **N4 Turning an outcome into a process exit status.** That is [entry-point](../entry-point/README.md)'s.
- **N5 Reaching a result as a value.** A program that wants the report rather than the bytes uses the report builder
  [entry-point](../entry-point/README.md) exports. This output is not itself on the package's public surface.
- **N6 Why a governance is written as a document.** That is [governance-overrides](../governance-overrides/README.md)'s.
- **N7 The `reference` command's answers.** The package offers that command from `cyber-agentkit`, and how it answers
  is [references](../references/README.md)'s.

## Key terms

- **K1 result**: the plain value a command built, to be encoded in the requested format.
- **K2 document**: text that already is the command's answer, to be written as it stands rather than encoded.
- **K3 format**: one of three ways an answer is written: a format meant for agents to parse, a general machine
  format, and a text rendering for a person. Nothing else is a format.
- **K4 pasteable path**: a path with the user's home directory, where it is a prefix, replaced by `~`.
- **K5 executable path**: the path of the binary that ran, as a report names it.
- **K6 error**: the answer of a command that could not do what was asked: a message, a code, and a next step.
- **K7 error code**: the part of an error a program branches on, stable across releases and distinct per cause.
- **K8 next step**: the part of an error that says what the caller can do about it.
- **K9 warning**: a notice to a person about a run that otherwise succeeds, such as that a command is deprecated.
- **K10 human-only stream**: the stream a person watching a terminal reads and a program parsing the answer does not.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | every command the package defines (`doctor`, `init`, `mcp`, `dep-plugins`, `governance`) | write its answer without knowing how any format is spelled |
| A2.1 | `doctor-buddy-agent-harness` skill | parse one answer per run, in the format it asked for |
| A3.1 | another program | never be handed a format it did not ask for |
| A4.1 | a command whose answer is a document | hand over the document unchanged |
| A5.1 | person at a shell | rerun what produced a report they were handed, without editing someone's home directory out of a path |
| A5.2 | person at a shell | read an answer as text |
| A6.1 | a program calling any command | learn that a command failed, why, and what to do next, from the answer it parses |
| A7.1 | a person running a deprecated command | be told it is deprecated without the notice changing the answer |

## Use cases

### UC1 — Write a result in the requested format (A1.1, A2.1, A3.1, A5.2)

- **Trigger**: a command has finished its work and holds a result.
- **Entry node**: S
- **Entry points**:
  - Command line (primary): every command's `--format` option and its stdout.
  - Library: the same bytes, through the entry point ([entry-point](../entry-point/README.md)).
- **Inputs**: the result, and the requested format or none.
- **Success**: exactly one answer on stdout, the result encoded in the requested format, or in the command's default
  when none was requested.
- **Extensions**:
  - **UC1.1** The format is not one of the three: the invocation is refused before the command runs, and nothing is
    written to stdout.

### UC2 — Write a document unchanged (A4.1)

- **Trigger**: a command's answer is a document, such as the governance `governance show` reads.
- **Entry node**: D
- **Entry points**:
  - Command line (primary): `buddy-agent-harness governance show` in the text format.
- **Inputs**: the document.
- **Success**: the document on stdout exactly as it was read.
- **Extensions**: none, once the format is accepted (UC1.1 covers a refused one) the document is written whatever it
  holds.

### UC3 — Name a path a person can paste (A5.1)

- **Trigger**: a report is to name a path, such as the executable that produced it or a layer directory.
- **Entry node**: Q
- **Entry points**:
  - Command line (primary): the paths in `doctor` and `governance` reports.
- **Inputs**: the path, and the user's home directory if there is one.
- **Success**: the path in pasteable form.
- **Extensions**:
  - **UC3.1** The executable path is not known: the package name stands in.
  - **UC3.2** The path is outside the home directory, or there is no home directory: the path is written as it is.

### UC4 — Learn why a command failed, from the answer (A6.1, A5.2)

- **Trigger**: a command, or the framework on its behalf, cannot do what was asked.
- **Entry node**: X
- **Entry points**:
  - Command line (primary): every command's stdout and how its process ends.
  - Library: the same bytes and the returned outcome, through the entry point
    ([entry-point](../entry-point/README.md)).
- **Inputs**: the cause of the failure, and the requested format or none.
- **Success**: the caller reads an error, in the format it asked for, whose code names the cause and whose next step
  says what to do, and the run ends without success.
- **Extensions**:
  - **UC4.1** What was thrown carries no readable message: the error still states a reason.

### UC5 — Warn a person without changing the answer (A7.1)

- **Trigger**: a command that succeeds has something a person should be told, such as its own deprecation.
- **Entry node**: W
- **Entry points**:
  - Command line (primary): the human-only stream of `buddy-agent-harness governance`.
- **Inputs**: the warning, and the command's answer.
- **Success**: the person sees the warning, and the answer is the same as it would be without it.
- **Extensions**: none, a warning never fails a run, so there is no path that misses the goal.

## Criteria

### Formats

- **R1** (UC1.1, E1) A command invoked with a format outside the three is refused before it does any work, writes
  nothing to stdout, and is never answered in another format instead.
- **R2** (UC1, E2) Every command offers the same three formats.
- **R3** (UC1, E3) A command invoked with no format writes its answer in that command's default format.
- **R4** (UC1, E4) A command invoked with one of the three formats writes its result encoded in that format, and in no
  other.

### The answer

- **R5** (UC2, E5) A command whose answer is a document writes it, in the text format, exactly as read: nothing added
  before or after it and nothing escaped inside it, except a final line end when the document lacks one.
- **R6** (UC1, UC2, E4, E5) A successful run of any command writes exactly one answer to stdout, a result or a
  document, and nothing else.
- **R7** (UC1, UC2, E4, E5) Every answer written to stdout ends with a line end.

### Paths

- **R8** (UC3, E8) A path under the user's home directory is written with the home directory replaced by `~` and the
  rest of the path unchanged.
- **R9** (UC3.2, E9) A path outside the user's home directory, or any path in a run with no home directory, is written
  as it stands.
- **R10** (UC3.1, E6) When the executable path is not known, the package name stands in for it, so a report never
  names an empty executable.
- **R11** (UC3, E7, E8, E9) R8 and R9 apply to every path a report names, not only to the executable path.

### Adapters

- **R12** (UC1.1, E1) On the command line, a refused format is an outcome distinct from a successful run and from a
  command that ran and failed, and it is the same outcome for every command.
- **R13** (UC1, E4, E5) The bytes a command writes to stdout are the same whether it runs as a process or through the
  entry point.

### Errors

- **R14** (UC4, E14) When any command fails, it answers with an error, in the format the caller asked for or the
  command's default, written where its answer would have been written, and the run ends without success.
- **R15** (UC4, E14) Every error carries a code that is stable across releases and distinct per cause, so two causes
  never share a code and one cause never changes its code.
- **R16** (UC4, E14) Every error carries a non-empty next step.
- **R17** (UC4, E14) A failing command writes nothing about its failure to the human-only stream.
- **R18** (UC4.1, E14) A failure whose cause carries no readable message still answers with an error stating a
  reason and carrying a code.
- **R19** (UC4, E14) A failure the command did not foresee answers with one shared code for unexpected failures,
  distinct from every code a command gives a foreseen cause.

### Warnings

- **R20** (UC5, E15) A warning is written to the human-only stream and is never part of the answer: the answer on
  stdout is the same as the run would give with no warning.

### Adapters, errors

- **R21** (UC4, E14) On the command line, a run that ends in an error ends as the failure or the refused outcome,
  never as success, and every error code always ends as the same one of the two.

## Open questions

None.

## References

- [graph.md](./graph.md): the two decisions, writing an answer and preparing a path.
- [entry-point](../entry-point/README.md): applying a refused invocation's outcome to the process, and the bytes
  reached in process.
- [diagnosis-report](../diagnosis-report/README.md): what `doctor`'s result holds and why its healthy answer is
  stated outright.
- [governance-overrides](../governance-overrides/README.md): the document caller, and why a governance is written
  rather than encoded.
- AXI §10 backs the pasteable path: a path that embeds a username is one a reader cannot paste back.
