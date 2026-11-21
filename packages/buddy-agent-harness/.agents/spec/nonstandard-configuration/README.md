# Nonstandard configuration

Agent configuration only one harness can read is reported, with the canonical form it belongs in.

## What

A repository can carry guidance that works, in exactly one harness. A Cursor rule file does what it says in Cursor
and nowhere else. A command or a skill kept under one harness's directory reaches only that harness. Nothing is
broken, so no other check reports it, yet every session on another harness runs without that guidance. Nobody finds
out except by noticing an agent behave differently somewhere else.

This capability is the `doctor` command's check for that reach. It reports each piece of configuration only one
harness reads, and names the canonical form its content converts to, so the finding says where the content should
end up and not only that it exists. The direction is always the same: the content moves to a canonical source, and
the harness file, where one is still needed, is generated from it. Fewer of these findings is the aim, but none of
them is a failure.

## Non-goals

- **N1 Converting.** The detector never writes ([detect-and-repair](../detect-and-repair/README.md) R1). Every
  conversion moves content a person authored, so the owning skill offers it and the owner approves it, as
  [init-buddy-agent-harness](../init-buddy-agent-harness/README.md) states.
- **N2 Which skill owns a conversion.** That is [detect-and-repair](../detect-and-repair/README.md) R17 and R18.
- **N3 Deciding that a conversion is right.** The finding states the candidate form. Whether it applies is the
  owner's call.
- **N4 Correctness of content.** Whether the content is good, or true, is not checked. This family is decided by
  where a file lives and what reads it.
- **N5 Absence.** Guidance a repository lacks is [enhance](../enhance-buddy-agent-harness/README.md)'s.
- **N6 Wrongness.** Configuration that is present and wrong is
  [configuration-diagnosis](../configuration-diagnosis/README.md)'s.
- **N7 Hooks, LSP settings, and output styles.** Their names and shapes differ per harness with no safe common form,
  so no canonical form can be named. They are left out on purpose.
- **N8 Gating on the count.** No count of these findings fails a run or blocks anything.

## Key terms

- **K1 non-standard artifact**: configuration at a path only one harness reads, declared for that harness in the
  package beside its other paths.
- **K2 kind**: what an artifact is, and so what it converts to: instructions, a rule, a command, a skill, or a
  subagent.
- **K3 reach**: how many harnesses can read a piece of configuration.
- **K4 canonical form**: where content belongs so every harness reads it: the canonical instructions for prose, the
  canonical skills directory for a capability.
- **K5 generated bridge**: a harness file produced from the canonical form after conversion. It may still exist; it
  stops being the source.
- **K6 path-scoped rule**: a Cursor rule file whose frontmatter binds it to file globs with a non-empty value.
- **K7 harness**: see [glossary](../glossary.md#harness).
- **K8 enabled harness**: see [glossary](../glossary.md#enabled-harness).
- **K9 canonical instructions**: see [glossary](../glossary.md#canonical-instructions).
- **K10 canonical skills directory**: see [glossary](../glossary.md#canonical-skills-directory).

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | invoking agent | hand each finding to the skill that offers its conversion |
| A2.1 | repository owner | learn which configuration reaches only one harness, and where it belongs |
| A2.2 | repository owner | approve each conversion before authored content moves |
| A3.1 | downstream agent | receive the same guidance whichever harness it runs in |

## Use cases

### UC1 — Learn which configuration reaches only one harness (A2.1, A3.1)

- **Trigger**: an agent or a person asks what this repository's agent configuration looks like.
- **Entry node**: S
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
  - Library: the exported report builder ([entry-point](../entry-point/README.md)).
  - Skill: the `doctor-buddy-agent-harness` skill runs the command.
- **Inputs**: the repository root.
- **Success**: each non-standard artifact is reported once, at its path, with its kind and the canonical form it
  converts to.
- **Extensions**:
  - **UC1.1** A path-scoped rule's scoping may be the point: neither canonical form reproduces "these globs and no
    others", so the conversion is conditional and the artifact may stay.
  - **UC1.2** A subagent has no cross-harness form: the finding names no canonical form and reports the gap.
  - **UC1.3** A declared path is a symlink: it is already a projection, so it is not reported.

### UC2 — Hand each finding to the conversion's owner (A1.1, A2.2)

- **Trigger**: an agent holds a non-standard finding and must decide who acts on it.
- **Entry node**: C
- **Entry points**:
  - Command line (primary): the finding's repair in the `doctor` report.
  - Skill: the `doctor-buddy-agent-harness` skill reads it.
- **Inputs**: one non-standard finding.
- **Success**: the agent knows from the repair which path to convert, where it goes, and that the conversion needs
  the owner's approval.
- **Extensions**:
  - **UC2.1** The artifact is a subagent: the repair names no skill, and the agent hands it to a person.

## Criteria

### Detection

- **R1** (UC1, E1) A repository whose agent configuration is all canonical yields no non-standard finding.
- **R2** (UC1, E3, E6, E10) A harness-only instruction file that is present, such as `.cursorrules`, is reported as
  instruction content whose canonical form is the canonical instructions.
- **R3** (UC1, E7, E9, E10) A Cursor rule file with no frontmatter, or whose frontmatter binds it to no globs or has
  an empty globs entry, is reported as instruction content whose canonical form is the canonical instructions.
- **R4** (UC1.1, E7, E8, E11) A path-scoped rule is reported as a rule whose candidate canonical form is a skill in
  the canonical skills directory.
- **R5** (UC1, E5, E6, E11) A command file under a harness directory is reported as a command whose canonical form is
  the canonical skills directory.
- **R6** (UC1, E4, E11) A skill kept under a harness directory is reported once, at the path of its `SKILL.md`,
  however many other files it holds.
- **R7** (UC1.2, E5, E6, E12) A subagent definition under a harness directory is reported as a subagent with no
  canonical form named.
- **R8** (UC1.3, E2) A declared path that is a symlink yields no finding, including a harness skills directory linked
  into the canonical skills directory and every skills projection target the `init` command writes.
- **R9** (UC1, E3, E4, E5) An artifact is reported whether or not its harness is an enabled harness of the
  repository.
- **R10** (UC1, E3, E4, E5) A path that two harnesses both declare yields one finding.

### Repairs

- **R11** (UC2, E10, E11, E12) Every non-standard finding's repair names the reported path itself, with no
  placeholder left in its place.
- **R12** (UC2, E10, E11, E12) Every non-standard finding's repair offers no runnable command.
- **R13** (UC1.1, E11) The repair of a path-scoped rule states that the rule stays where its path scoping is the
  point.
- **R14** (UC2.1, E12) The repair of a subagent names no skill and states that no portable form exists.

## Open questions

None.

## References

- [graph.md](./graph.md): how each declared path becomes a finding and its canonical form.
- [detect-and-repair](../detect-and-repair/README.md): which skill each finding routes to.
- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): the skill that offers each conversion.
- [diagnosis-report](../diagnosis-report/README.md): the report the findings are carried in.
- [detection.md](../../../skills/init-buddy-agent-harness/references/detection.md): where these dispositions were
  first written down, as the survey `init-buddy-agent-harness` runs.
