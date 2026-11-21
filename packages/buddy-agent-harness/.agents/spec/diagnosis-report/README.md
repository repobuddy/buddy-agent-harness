# Diagnosis report

Every finding family of the `doctor` command is reported through one output shape.

## What

The `doctor` command asks several independent questions about a repository's agent configuration: do the skills
bridges resolve, can each harness read `AGENTS.md`, is the configuration around them right, have the MCP server sets
drifted, and more. The families share no check, no vocabulary, and no repair owner. Their consumers are mostly
programs: the shipped skills read the report and branch on it, and a session-start hook runs the command unattended.
A person reads the same report over someone's shoulder.

Without one shape, each new family would arrive with its own way of saying what is wrong, and every consumer would
have to learn it. A section a consumer cannot find without parsing prose, an empty list that could mean "nothing
wrong" or "asked wrongly", a repair a program cannot tell is safe to run, or a failed tool that looks like a broken
repository each sends a consumer the wrong way.

This spec fixes that shape: one report per run holding every family, sections a consumer can branch on by presence,
findings kept to the diagnosis, repairs that say whether a program may run them, the healthy answer stated outright,
and a failure of the tool told apart from a report of faults.

## Non-goals

- **N1 Deciding what is wrong.** Each fault belongs to its detecting spec, such as
  [bridge-resolution](../bridge-resolution/README.md), [instruction-bridges](../instruction-bridges/README.md),
  [configuration-diagnosis](../configuration-diagnosis/README.md), and [mcp-diagnosis](../mcp-diagnosis/README.md).
- **N2 Where a reference comes from.** The tiers, their layers, their order, and each row's status are
  [references](../references/README.md)'s. This spec states only that the report carries them and that none is a
  finding.
- **N3 Who repairs a finding, and what a consumer routes on.** Those are
  [detect-and-repair](../detect-and-repair/README.md)'s, including that a finding's fault name is stable and distinct
  per fault and that the detector never writes.
- **N4 How the report becomes bytes.** The format set, the refusal of an unsupported format, and the pasteable form of
  a path are [command-output](../command-output/README.md)'s.
- **N5 The `init` command's report.** A different report with a different shape, owned by
  [harness-init](../harness-init/README.md).
- **N6 Reaching the report as a value.** That a program can get the report without a process is
  [entry-point](../entry-point/README.md)'s.

## Key terms

- **K1 report**: what one successful `doctor` run answers with: one value holding every family's result.
- **K2 section**: a named part of the report a consumer can find without reading any other part.
- **K3 finding**: one fault in the report: the path it is about, its fault name, and a prose detail.
- **K4 fault name**: see [detect-and-repair](../detect-and-repair/README.md) K4.
- **K5 repair**: one entry of the repairs section, stating what fixes a finding in two parts: an instruction, and a
  runnable command where one exists.
- **K6 runnable command**: an invocation that, run verbatim, completes the repair on its own.
- **K7 healthy answer**: what the findings section holds when nothing is wrong: a stated zero with its context, in
  place of findings.
- **K8 harness**: see [glossary](../glossary.md#harness).
- **K9 failure**: a `doctor` run called correctly that could not produce a report, as against one that produced a
  report holding findings.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | `doctor-buddy-agent-harness` skill | branch on the report without parsing prose |
| A1.2 | `doctor-buddy-agent-harness` skill | learn which references the repository, the user, and the machine owner have set |
| A2.1 | `repair-buddy-agent-harness` skill | read one report that covers every family |
| A3.1 | person at a shell | read the same report without parsing it |
| A3.2 | person at a shell | trace a report back to the executable that produced it |
| A4.1 | session-start hook | not be told the tool is broken when only the repository is |
| A5.1 | a program acting on repairs unattended | run every repair it may run without destroying work |

## Use cases

### UC1 — Read every family's findings in one report (A2.1)

- **Trigger**: a caller asks what is wrong with a repository's agent configuration.
- **Entry node**: S
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
  - Library: the exported report builder ([entry-point](../entry-point/README.md)).
  - Skill: the `doctor-buddy-agent-harness` and `repair-buddy-agent-harness` skills run the command.
- **Inputs**: the repository root, which defaults to the current directory; harnesses to check in addition to the
  defaults; the output format.
- **Success**: one report holding the result of every family, the findings of all of them in one findings section.
- **Extensions**:
  - **UC1.1** A requested harness is not one the package supports: the invocation is refused and nothing is
    diagnosed.
  - **UC1.2** A family's diagnosis cannot complete: the run is a failure and no report is written.
  - **UC1.3** The format is not supported: the invocation is refused, as
    [command-output](../command-output/README.md) states.

### UC2 — Branch on the report without parsing prose (A1.1)

- **Trigger**: a skill holds a report and must decide what to do next.
- **Entry node**: A
- **Entry points**:
  - Command line (primary): the report `buddy-agent-harness doctor` writes in its default format.
  - Library: the report builder's value.
- **Inputs**: one report.
- **Success**: the skill knows, from which sections are present and what they hold, whether anything is wrong,
  whether a bridge diverged, and which repair belongs to each finding.
- **Extensions**:
  - **UC2.1** Nothing is wrong: the findings section holds the healthy answer and no repairs section exists.
  - **UC2.2** No bridge diverged: no divergence section exists.

### UC3 — Run the repairs a program may run, without destroying work (A5.1, A2.1)

- **Trigger**: a program acts on the repairs of a report.
- **Entry node**: P
- **Entry points**:
  - Command line (primary): the repairs section of the report.
  - Library: the same section of the report builder's value.
- **Inputs**: the repairs section.
- **Success**: every repair a single invocation completes is run, and none that needs judgment is.
- **Extensions**:
  - **UC3.1** A repair needs judgment: it offers no command, and the program hands it to a person or a skill.
  - **UC3.2** Two findings report one fault at two paths: each has its own repair.

### UC4 — Read the report as a person (A3.1, A3.2)

- **Trigger**: a person runs `doctor` at a shell, or is handed a report produced elsewhere.
- **Entry node**: A
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor` with the text format.
- **Inputs**: the repository root and the text format.
- **Success**: the person reads every section and knows which executable produced the report.
- **Extensions**:
  - **UC4.1** The executable is not known: the report still names the package, as
    [command-output](../command-output/README.md) states.

### UC5 — Tell a broken tool from a broken repository (A4.1)

- **Trigger**: a hook runs `doctor` and reads only how the run ended.
- **Entry node**: S
- **Entry points**:
  - Command line (primary): how the `buddy-agent-harness doctor` process ends.
  - Library: the outcome the entry point returns ([entry-point](../entry-point/README.md)).
- **Inputs**: the repository root.
- **Success**: a run that produced a report ends as a success whether or not it found anything.
- **Extensions**:
  - **UC5.1** The run is a failure (UC1.2): it ends as a failure, distinct from success.
  - **UC5.2** The invocation is refused (UC1.1, UC1.3): it ends as a refusal, distinct from both.

### UC6 — Learn which references are set, without treating them as faults (A1.2)

- **Trigger**: a skill or a person reads a report.
- **Entry node**: F
- **Entry points**:
  - Command line (primary): the references section of the report.
  - Library: the same section of the report builder's value.
- **Inputs**: one report.
- **Success**: the reader learns each reference the managed, project, and user tiers hold, where it was read from, and
  its status.
- **Extensions**:
  - **UC6.1** No managed, project, or user layer holds a reference: the section states the zero.

## Criteria

### The run

- **R1** (UC1, E3) A `doctor` run that names no root diagnoses the current working directory, and one that names a root
  diagnoses that root.
- **R2** (UC1, E3) A `doctor` run that names harnesses checks each named harness in addition to the ones it checks by
  default.
- **R3** (UC1.1, E2) A `doctor` run that names a harness the package does not support is refused: it names the
  unsupported harness in its error, diagnoses nothing, and writes no report.
- **R4** (UC1.2, E4) A `doctor` run in which any family's diagnosis cannot complete is a failure: it states the reason
  and writes no report.
- **R5** (UC1, E5) A successful `doctor` run writes exactly one report, and that report holds the findings of every
  family that found a fault, all in one findings section.

### Sections

- **R6** (UC2, E5) Every report holds a section for each of: the executable that produced it, the skills bridges, the
  instruction bridges, the user-scope global instructions, the references, and the findings.
- **R7** (UC2, E5) The skills bridges and the instruction bridges are reported in two separate sections, so a
  consumer reads a row of either without knowing the other's vocabulary.
- **R8** (UC2, E5) The global-instructions section is present on every report, holds no row when no harness is
  installed for the user, and its rows are not counted in the healthy answer.
- **R9** (UC2.1, E9) When no family finds a fault, the findings section holds the healthy answer, which states that
  zero problems were found and how many bridges resolve, counting skills bridges and instruction bridges as one
  number, and is never an empty list.
- **R10** (UC2.1, E9) The healthy answer's count reads correctly for a single bridge as well as for many.
- **R28** (UC2, E10) When any family finds a fault, the findings section holds one finding per fault, each with its
  path, its fault name, a prose detail, and its own repair, the same instruction and command as that repair's entry
  in the repairs section, so a consumer pairs a finding with its repair from that finding alone; the repairs section
  stays, listing each distinct repair once (R20).
- **R12** (UC2, E9, E10) The findings section holds either findings or the healthy answer, never both and never
  neither.
- **R13** (UC2.1, E9, E10) The repairs section is present when at least one finding is reported, and absent, not
  empty, when none is.
- **R14** (UC2.2, E11, E12) The divergence section is present when at least one bridge has diverged, naming each
  diverged bridge and the direction it diverged in, and absent, not empty, when none has.
- **R15** (UC4, E5) The executable section names the executable that produced the report, in the pasteable form
  [command-output](../command-output/README.md) states.

### Repairs

- **R16** (UC3, E13) A repair that offers a command offers one that, run verbatim, completes the repair on its own.
  A repair no single invocation completes offers none, as [detect-and-repair](../detect-and-repair/README.md) R8
  states.
- **R17** (UC3, E13, E14) Every repair carries a non-empty instruction that reads as a self-contained imperative with
  nothing wrapped around it, whether or not it offers a command.
- **R29** (UC3, E13, E14) A program that runs every command a report offers, and nothing else, rebuilds no diverged
  bridge: the repair of a diverged bridge is a file-by-file merge with the canonical skills directory, which writes no
  file both sides changed since they last agreed.
- **R19** (UC3.2, E13, E14) Two findings of one fault at two different paths yield two repairs, each naming its own
  path.
- **R20** (UC3, E13, E14) Two repairs identical in both their command and their instruction are listed once.

### References

- **R21** (UC6, E7) The references section is present on every report and, when a managed, project, or user layer
  holds a reference, lists one row per name per layer holding it, each giving the name, its tier, the file it was read
  from in the pasteable form [command-output](../command-output/README.md) states, and the status
  [references](../references/README.md) gives that row.
- **R22** (UC6, E7) A reference that only the plugin tier holds is not listed in the references section.
- **R23** (UC6.1, E8) When no managed, project, or user layer holds a reference, the references section states that
  zero were found and that the plugin tier was left out, rather than being empty or absent.
- **R24** (UC6, E7) No reference becomes a finding or a repair, or changes how the run ends.

### Formats

- **R30** (UC1, E5) With no format named, the report is written in `toon`. With another supported format named, the
  same report is written in that format instead.

### Adapters

- **R26** (UC5, E1, E2, E4, E5) Each adapter tells apart three outcomes of a `doctor` run, stably and distinctly: a
  report was produced, the run was a failure (R4), and the invocation was refused (R3, and an unsupported
  format). A report holding findings is the same outcome as a healthy one.
- **R27** (UC5.1, UC5.2, E2, E4) A refused or failed `doctor` run answers with an error in the form
  [command-output](../command-output/README.md) states for every command, in place of the report.

## Open questions

None.

## References

- [graph.md](./graph.md): the decisions of one `doctor` run.
- [detect-and-repair](../detect-and-repair/README.md): what a consumer may route on, and who repairs each finding.
- [command-output](../command-output/README.md): the format set and the pasteable path form.
- [entry-point](../entry-point/README.md): the report reached as a value, and how a run's outcome is returned.
- [references](../references/README.md): the tiers and statuses the references section carries.
- [global-instructions](../global-instructions/README.md): the rows of the global-instructions section.
- AXI §5 backs the healthy answer: a zero stated with its context keeps an agent from re-running with other flags to
  confirm that an empty section meant nothing was wrong.
