# Detect and repair

Each finding the `doctor` command reports reaches the skill that owns its repair, or a person where no skill does.

## What

Finding wrong agent configuration and correcting it are done by different surfaces. The `doctor` command finds and
never writes. The `init-buddy-agent-harness`, `repair-buddy-agent-harness`, and `enhance-buddy-agent-harness` skills write. Neither half works alone. A
detector whose findings cannot be handed on is a report nobody acts on. A skill that detects for itself is a second
detector, free to drift from the first. A finding handed to the wrong skill is worse than none: rebuilding a bridge
whose two sides both hold edits discards one of them.

This spec owns the seam between the two halves and nothing else. It fixes what a consumer of a finding may rely on,
which surface owns each kind of finding's repair, and the properties that keep the split honest. Detection stays in
one place, so the set of findings can grow without editing a skill. The finder stays read-only, so it is safe to run
from a session-start hook. Every finding carries its own repair, so no consumer has to invent one.

What each finding means, and what its repair does, belong to the spec that detects it. What a repairing skill does
once it holds a finding belongs to that skill's spec.

## Non-goals

- **N1 Adding a check.** What counts as wrong is decided by the detecting specs, such as
  [bridge-resolution](../bridge-resolution/README.md) and [configuration-diagnosis](../configuration-diagnosis/README.md).
- **N2 How a correction is made.** The offer, the approval, the before and after, and the re-run that proves a
  correction held belong to the owning skill, such as [repair](../repair-buddy-agent-harness/README.md).
- **N3 The report's shape.** Which sections exist, what a row holds, and how it is formatted is
  [diagnosis-report](../diagnosis-report/README.md)'s. This spec states which parts of a finding a consumer may rely
  on and route by, which is a different claim.
- **N4 Choosing between corrections.** The detector states one repair per fault. Where several corrections are valid,
  the options are the owning skill's.
- **N5 Activation.** Which skill a user's request reaches is decided by the skills' descriptions, not here.
- **N6 What a repair does.** The correction each fault's repair states, and whether one invocation completes it, is
  the detecting spec's, such as [bridge-resolution](../bridge-resolution/README.md). This spec states only who owns
  it.

## Key terms

- **K1 finding**: one fault the detector reports, carrying its fault name, the path it is about, a prose description,
  and its repair.
- **K2 detector**: the `doctor` command. The one place a check of agent configuration lives.
- **K3 repairing skill**: the `init-buddy-agent-harness`, `repair-buddy-agent-harness`, or `enhance-buddy-agent-harness` skill. The only surfaces that write a
  correction.
- **K4 fault name**: the name a finding carries that identifies its fault. It is stable and distinct per fault, and it
  is the one part of a finding a consumer routes by. The path is an input to the repair, and the prose description is
  for a reader.
- **K5 repair**: the one correction the detector states for a fault, as an instruction a person can follow, plus an
  invocation that completes it where a single invocation does.
- **K6 rendering**: one of the two ways a repair is stated. The command rendering is what the detector reports to its
  caller. The skill rendering is what the shipped `doctor-buddy-agent-harness` skill states to an agent.
- **K7 family**: the group of faults one detecting spec owns: skills bridges, instruction bridges, global
  instructions, configuration, MCP drift, non-standard configuration, and agent worktrees.
- **K8 owner**: the repairing skill a finding's skill rendering sends it to, or no skill, when the repair is work for
  a person.
- **K9 bridge**: what a harness that cannot read the canonical configuration is given instead: a skills projection,
  or an instruction bridge that points the harness at `AGENTS.md`.
- **K10 canonical configuration**: see [glossary](../glossary.md#canonical-configuration).

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | `doctor-buddy-agent-harness` skill | send every finding to the skill that repairs it, or to a person where none does |
| A2.1 | `repair-buddy-agent-harness` skill | tell a finding it owns from one it must hand on, without inspecting the repository |
| A3.1 | `init-buddy-agent-harness` and `enhance-buddy-agent-harness` skills | receive the findings they repair, and no other |
| A4.1 | person at a shell | know what to do about each fault without running anything else |
| A5.1 | session-start hook | run the detector with no risk of a write |
| A6.1 | package maintainer | add a fault or a family and have it reach every consumer without editing one |

## Use cases

### UC1 — Route a finding to its owner (A1, A2, A3)

- **Trigger**: a consumer holds the detector's report and must decide who acts on each finding.
- **Entry node**: `Read`
- **Entry points**:
  - Skill (primary): the `doctor-buddy-agent-harness` skill and the `repair-buddy-agent-harness` skill reading the report.
  - Command line: `buddy-agent-harness doctor`, whose report the skills read.
- **Inputs**: the report the detector produced for one repository.
- **Success**: every finding is with its owner, or reported for a person and routed to no skill.
- **Extensions**:
  - UC1.1 The report holds no finding: the flow ends, and no repairing skill looks for anything itself.
  - UC1.2 A finding's repair names no skill: it is reported for a person and routed nowhere. No consumer invents an
    owner.
  - UC1.3 The command rendering of a fault a rebuild fixes names no skill, because its invocation is runnable: the
    consumer still finds the owner, by the fault name.
  - UC1.4 Two findings sit at one path: each is routed by its own fault name.

### UC2 — Act on a fault from its repair (A4)

- **Trigger**: a person reads the detector's report at a shell.
- **Entry node**: `Read`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
- **Inputs**: the report.
- **Success**: the person knows, for each finding, the one thing to do about it.
- **Extensions**:
  - UC2.1 The repair is a matter of judgment, not one invocation: it is still stated in full, and the report shows
    that it has no runnable invocation.
  - UC2.2 More than one correction is valid: the report still states one repair, and the options are the owning
    skill's.

### UC3 — Detect with no risk of a write (A5)

- **Trigger**: a session starts in a repository whose hook runs the detector.
- **Entry node**: `Detect`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`, run by the hook.
- **Inputs**: the repository root.
- **Success**: the hook learns what is wrong, and the repository is as it was.
- **Extensions**: extensions: none, the detector has no path that writes.

### UC4 — Add a fault (A6)

- **Trigger**: a maintainer adds a fault to a detecting spec, or adds a whole family.
- **Entry node**: `Owner`
- **Entry points**:
  - Library (primary): the package source, where a fault and its repair are stated once for both renderings.
- **Inputs**: the new fault and its repair.
- **Success**: the fault reaches both renderings, with its owner, and no consumer skill's instructions are edited.
- **Extensions**:
  - UC4.1 A whole family is added: the families still account for every fault exactly once, so no consumer that
    derives one family by excluding the others silently takes in the new faults under the wrong owner.
  - UC4.2 A fault is added without a repair: it is refused before it ships.

## Criteria

### Detection

- **R1** (UC3, E1) Running the detector against a repository holding faults of more than one family creates,
  modifies, or removes no file in it.
- **R2** (UC1, E2) When the detector reports no finding, no repairing skill acting on that report looks for a fault
  itself.

### The finding

- **R3** (UC1, E3) Every finding the detector reports carries a fault name, the path it is about, a non-empty prose
  description, and a repair, and these are the only parts a consumer needs to route it or act on it.
- **R4** (UC1, E4) A finding's fault name can be read without parsing its prose description, and the prose
  description does not contain the fault name.
- **R5** (UC1, E4) A consumer routes a finding by its fault name only, so rewording a fault's prose description
  changes no consumer's routing of it.
- **R6** (UC2, E3) Every fault the detector can report has exactly one repair, never a set of alternatives.
- **R7** (UC2, UC4, E3) No fault can be reported without a repair: a fault with no repair is refused before the
  package ships.
- **R8** (UC2, E12) A repair that no single invocation completes is stated in full as an instruction and carries no
  runnable invocation, and a consumer can tell it has none from the report's data alone.
- **R9** (UC2, E4) Where more than one correction is valid for a fault, the report states one repair, and the
  options are offered by the owning skill from its own reference, not by the report.

### The two renderings

- **R10** (UC1, E4) For every fault, the command rendering and the skill rendering of its repair address the same
  fault, because both come from one statement of it.
- **R12** (UC1, E5, E7, E15) No skill rendering tells the agent to run the `init` command; where `init` would satisfy
  the repair, it sends the agent to the `init-buddy-agent-harness` skill.
- **R13** (UC1, E4) A skill rendering that invokes the package's own command reaches it through a fallback pinned to
  the package version that generated the skill, never through a bare invocation of the binary.

### Who owns each repair

- **R14** (UC1, E5) The skill rendering of every instruction-bridge fault names the `init-buddy-agent-harness` skill.
- **R27** (UC1, E15) For every skills-bridge fault whose repair rebuilds the bridge, as
  [bridge-resolution](../bridge-resolution/README.md) states it, the command rendering names no skill and the skill
  rendering names the `init-buddy-agent-harness` skill.
- **R28** (UC1, E16) The skill rendering of every diverged-copy fault, in each of the four divergence directions, and
  of the unprotected-copy fault names the `repair-buddy-agent-harness` skill and no other skill.
- **R17** (UC1, E7) The skill rendering of every non-standard configuration fault that has a portable form to convert
  to names the `init-buddy-agent-harness` skill.
- **R18** (UC1, E13) The skill rendering of a non-standard configuration fault with no portable form to convert to
  names no skill.
- **R19** (UC1, E8) The skill rendering of every configuration fault names the `repair-buddy-agent-harness` skill.
- **R20** (UC1, E9) Both renderings of an MCP drift fault where one side is plainly the one to copy from name the
  `repair-buddy-agent-harness` skill: a harness lacks a server the golden set declares, a harness carries a server the golden set lacks,
  or only one side changed a field.
- **R29** (UC1, E12) Neither rendering of any other MCP fault names a skill: a field both sides changed, a change no
  baseline can place, a file that does not parse, or a credential written literally or committed.
- **R32** (UC1, E17) Both renderings of every agent-worktree fault other than a worktree inside the repository name the
  `init-buddy-agent-harness` skill, and neither names the `enhance-buddy-agent-harness` skill or the `repair-buddy-agent-harness` skill.
- **R33** (UC1, E18) Both renderings of the fault for an agent worktree inside the repository name the `enhance-buddy-agent-harness`
  skill, and neither names the `init-buddy-agent-harness` skill or the `repair-buddy-agent-harness` skill.
- **R31** (UC1, E14) No rendering of a global-instructions fault names a skill.
- **R24** (UC1, E12, E13, E14) A consumer reports a finding whose skill rendering names no skill for a
  person and hands it to no repairing skill.

### The partition

- **R25** (UC4, E4) Every fault the detector can report belongs to exactly one family, and the families together
  account for all of them.
- **R26** (UC4, E4) A fault added to the detector's table reaches both renderings with its owner, and no consumer
  skill's hand-written instructions change.

## Open questions

None.

## References

- [diagnosis-report](../diagnosis-report/README.md): the home of the report's shape and where each part of a finding
  is carried.
- [repair](../repair-buddy-agent-harness/README.md), [init-buddy-agent-harness](../init-buddy-agent-harness/README.md), and
  [enhance](../enhance-buddy-agent-harness/README.md): what each owner does once it holds a finding.
- The detecting specs, the home of what each fault means:
  [bridge-resolution](../bridge-resolution/README.md), [instruction-bridges](../instruction-bridges/README.md),
  [global-instructions](../global-instructions/README.md),
  [configuration-diagnosis](../configuration-diagnosis/README.md),
  [nonstandard-configuration](../nonstandard-configuration/README.md),
  [worktree-diagnosis](../worktree-diagnosis/README.md), and [mcp-diagnosis](../mcp-diagnosis/README.md).
- [mcp-projection](../mcp-projection/README.md) and [mcp-reconcile](../mcp-reconcile/README.md): the two directions an
  MCP repair copies in.
- [glossary](../glossary.md): the shared terms.
