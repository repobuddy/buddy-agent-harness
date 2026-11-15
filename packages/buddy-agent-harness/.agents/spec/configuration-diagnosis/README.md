# Configuration diagnosis

Agent configuration that is present and wrong is reported.

## What

A repository's agent configuration can resolve and still be wrong. A skills projection kept under a harness name
that has been retired, a bridge the repository's git ignore rules swallow, a local-override instruction file no
harness reads, and a skill whose frontmatter makes every harness skip it all look fine on disk. Each one silently
costs an agent something: a skill that never loads, guidance that never reaches it, a bridge a fresh clone lacks.
The person who wrote the configuration does not find out unless something checks.

This capability is the `doctor` command's check for these faults. It reports each one, with its path and its repair,
alongside the other families' findings. It decides only by reading files and the repository's ignore rules, never by
weighing what the configuration says, and it writes nothing. Every fault here is configuration a person authored, so
correcting one is judgment, made by the `repair` skill rather than by a command.

## Non-goals

- **N1 Repairing.** The detector never writes ([detect-and-repair](../detect-and-repair/README.md) R1). Each fault's
  correction is the [repair](../repair/README.md) skill's.
- **N2 Which skill owns a fault's repair.** That every fault here routes to the `repair` skill is
  [detect-and-repair](../detect-and-repair/README.md) R19.
- **N3 Bridge resolution.** Whether a bridge resolves is [bridge-resolution](../bridge-resolution/README.md)'s, and
  whether a harness can read `AGENTS.md` is [instruction-bridges](../instruction-bridges/README.md)'s.
- **N4 The report's shape.** Which sections exist and what a finding carries is
  [diagnosis-report](../diagnosis-report/README.md)'s.
- **N5 Judging content.** Whether an instruction or a skill is good is not checked. Every fault here is decidable by
  reading the file, never by weighing what it says.
- **N6 Reporting absence.** Configuration that does not exist is [harness-init](../harness-init/README.md)'s to
  create. Every fault here is something present.
- **N7 Frontmatter that still loads.** A skill name that does not match its directory, or an over-long name, is a
  warning a harness still loads past, so it is not a fault here.

## Key terms

- **K1 configuration fault**: one of four ways present configuration is wrong: a superseded-harness projection, an
  ignored bridge, an unread local override, and an unloadable skill.
- **K2 superseded harness**: a harness name the package records as replaced by another.
- **K3 skills projection**: a harness's skills directory written from the canonical skills directory so that harness
  can read it.
- **K4 bridge**: see [detect-and-repair](../detect-and-repair/README.md) K9.
- **K5 local-override file**: `AGENTS.local.md` at the repository root, a file no harness reads.
- **K6 unloadable frontmatter**: a `SKILL.md` frontmatter that a harness skips the skill for: no frontmatter block,
  a block that does not parse, or no `description` with a value.
- **K7 canonical skills directory**: see [glossary](../glossary.md#canonical-skills-directory).
- **K8 harness**: see [glossary](../glossary.md#harness).

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | `repair` skill | know every correctable fault without detecting anything itself |
| A2.1 | person at a shell | see what is wrong and what fixes it |
| A3.1 | session-start hook | learn of a fault on every session with no risk of a write |
| A4.1 | `doctor-buddy-agent-harness` skill | hand each fault to the skill that corrects it |
| A5.1 | downstream agent | load every skill and instruction the repository's authors meant it to |

## Use cases

### UC1 — Learn every present-and-wrong fault (A1.1, A2.1, A3.1, A5.1)

- **Trigger**: a caller asks what is wrong with a repository's agent configuration.
- **Entry node**: S
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
  - Library: the exported report builder ([entry-point](../entry-point/README.md)).
  - Skill: the `doctor-buddy-agent-harness` and `repair` skills run the command.
- **Inputs**: the repository root.
- **Success**: every configuration fault present is reported once, at its path, in the same report as the other
  families' findings.
- **Extensions**:
  - **UC1.1** The directory is not a git repository: no ignore rule can be read, so no ignored bridge is reported.
  - **UC1.2** A check cannot read what it needs to decide: it reports nothing rather than a guessed fault.
  - **UC1.4** A skill's description is missing rather than its frontmatter unparsable: it is still reported as
    unloadable, and the finding says which of the two causes it found.

### UC2 — Hand each fault to the skill that corrects it (A4.1, A1.1)

- **Trigger**: a consumer holds a configuration fault and must decide who acts on it.
- **Entry node**: S
- **Entry points**:
  - Command line (primary): the fault's repair in the `doctor` report.
  - Skill: the `doctor-buddy-agent-harness` skill reads it.
- **Inputs**: one configuration fault.
- **Success**: the consumer knows from the repair alone that the correction is judgment and which skill makes it.
- **Extensions**: none, every fault in this family has exactly one repair and it is always judgment.

## Criteria

### Detection

- **R1** (UC1, E2, E6, E8, E10) A repository whose configuration is current, with a root `AGENTS.md`, a canonical
  skill, a skills projection resolving into the canonical skills directory, and no ignore rule matching a bridge,
  yields no configuration fault.
- **R2** (UC1, E1) A skills projection on disk under a superseded harness's directory is reported as a
  superseded-harness fault naming that projection's path.
- **R3** (UC1, E2) A superseded harness's directory that holds no skills projection yields no superseded-harness
  fault.
- **R4** (UC1, E5) In a git repository, a bridge on disk that an ignore rule matches, including a rule on one of its
  parent directories, is reported as an ignored-bridge fault naming the bridge's path.
- **R5** (UC1, E6) In a git repository, a bridge no ignore rule matches yields no ignored-bridge fault.
- **R6** (UC1.1, E3) In a directory that is not a git repository, no ignored-bridge fault is reported, even when an
  ignore file there holds a rule matching a bridge.
- **R7** (UC1, E7) A local-override file at the repository root is reported as an unread-local-override fault naming
  that file.
- **R17** (UC1, E17) A canonical `SKILL.md` whose frontmatter block does not parse, such as a description holding an
  unquoted colon, is reported as an unloadable-skill fault naming that `SKILL.md`, and the finding carries the
  unparsable-frontmatter cause.
- **R18** (UC1.4, E18) A canonical `SKILL.md` with no frontmatter block, with no `description` key, or with a
  `description` key and no value is reported as an unloadable-skill fault naming that `SKILL.md`, and the finding
  carries the missing-description cause.
- **R19** (UC1, UC1.4, E17, E18) The two causes of an unloadable-skill fault share its fault name, are told apart by a
  program reading the finding without parsing its prose, and each has a prose detail and a repair of its own: for
  unparsable frontmatter, to make it parse; for a missing description, that the skill's author must write one.
- **R10** (UC1, E10) A canonical `SKILL.md` whose frontmatter parses and carries a `description` with a value yields
  no unloadable-skill fault, including one whose description quotes a colon and one whose name does not match its
  directory.
- **R11** (UC1, E10) A file under the canonical skills directory that is not a `SKILL.md` yields no unloadable-skill
  fault, whatever its frontmatter.
- **R12** (UC1.2, E11) A check that cannot read what it needs to decide reports nothing for that check, and the other
  checks still report.
- **R13** (UC1, E1, E5, E7, E9) One `doctor` run reports every configuration fault present, of all four kinds at once,
  in the same report as the other families' findings.
- **R14** (UC1, E1, E5, E7, E9) Naming additional harnesses on a `doctor` run changes no configuration fault it
  reports.

### Repairs

- **R15** (UC2, E1, E5, E7, E9) Every configuration fault's repair offers no runnable command.
- **R16** (UC2, E1, E5, E7, E9) Every configuration fault's repair instruction is a self-contained imperative that
  names the skill owning the correction, with nothing wrapped around it.

## Open questions

None.

## References

- [graph.md](./graph.md): the four checks.
- [detect-and-repair](../detect-and-repair/README.md): routing to the `repair` skill, and the read-only detector.
- [diagnosis-report](../diagnosis-report/README.md): the report the faults are carried in.
- [repair](../repair/README.md): what the correction of each fault does.
- [frontmatter.md](../../../skills/init-buddy-agent-harness/references/frontmatter.md): which frontmatter problems make
  a harness skip a skill, the basis of K6 and N7.
