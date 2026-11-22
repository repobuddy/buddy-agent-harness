# Bridge resolution

Every skills bridge that no longer resolves into the canonical skills directory is reported.

## What

A harness that cannot read `.agents/skills` by itself is given a skills bridge at its own path, such as
`.claude/skills`. When that bridge stops resolving, nothing says so. The harness finds no directory, or one holding
something other than the canonical skills, and loads no project skills without a warning. The failure is invisible
where it happens: after a clone on Windows, `.claude/skills` can be a regular file holding a path, and it looks
fine in a file listing.

The `doctor` command looks at every bridge the checked harnesses need and reports each one that does not resolve,
or resolves and is still unsafe, in a form its caller can act on without opening the bridge. Resolution is a question
about the path, not about what the skills say: a bridge can resolve into skills no harness will load, and that is
another family's finding. Each finding carries the repair this spec states for its cause.

## Non-goals

- N1 **Repairing.** The command never writes. Which surface owns each repair is
  [detect-and-repair](../detect-and-repair/README.md).
- N2 **Judging what a bridge holds.** A resolving bridge full of skills no harness will load is
  [configuration-diagnosis](../configuration-diagnosis/README.md). Nothing here reads a skill.
- N3 **Instruction bridges.** Whether a harness can read `AGENTS.md` is
  [instruction-bridges](../instruction-bridges/README.md).
- N4 **The shape of the report.** Which sections exist and what a finding carries is
  [diagnosis-report](../diagnosis-report/README.md).
- N5 **User-scope skills bridges.** `doctor` diagnoses a repository and never looks for skills bridges outside it.
- N7 **Choosing a side for a file both sides of a copy changed.** Where the newer edit lives cannot be decided from
  the filesystem, so the repair puts each such file to the user (R28).

## Key terms

- K1 **canonical skills directory**: see [glossary](../glossary.md#canonical-skills-directory).
- K2 **harness**: see [glossary](../glossary.md#harness).
- K3 **skills bridge**: the entry a harness needs at its own repository-relative path to see the canonical skills
  directory. It is a symlink or a copy. A harness that reads `.agents/skills` natively needs none.
- K4 **resolves**: a harness reading through the bridge path reaches the canonical skills directory and sees what it
  holds. A symlink resolves when the path it lands on is the canonical skills directory, however its target is
  written. A copy resolves when it holds the same files with the same content.
- K5 **checked harness**: a harness `doctor` inspects in a repository: Claude Code and Cursor always, every harness
  the caller names, and every harness whose detection directory is present in the repository.
- K6 **last agreement**: the newest commit in which a copied bridge and the canonical skills directory held identical
  content.
- K7 **divergence direction**: which side of a diverged copy changed since the last agreement: the bridge, the
  canonical skills directory, both, or unknown when no last agreement can be found.
- K9 **copy protection**: what keeps a copy over a tracked bridge path out of uncommitted changes and out of commits,
  in two parts: skip-worktree set on the copy's tracked entries in the git index, and the bridge path listed in the
  clone's own exclude file (`.git/info/exclude`, never the committed `.gitignore`). A copy with only one part is not
  protected.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.2 | `doctor-buddy-agent-harness` skill | learn which bridges do not resolve, and hand each to the skill that repairs it |
| A2.1 | person at a shell | find out why a freshly cloned repository loads no skills |
| A3.1 | session-start hook | learn of a broken bridge at every session start with no risk of a write |
| A4.2 | `repair` skill | tell a bridge finding it repairs from one it hands on, without inspecting the bridge |
| A5.1 | `init-buddy-agent-harness` skill | receive every bridge repair that rebuilding the bridge fixes |
| A6.1 | downstream agent session (never runs the command) | load the repository's project skills |

## Use cases

### UC1 — Learn which skills bridges do not resolve (A1, A2, A6)

- **Trigger**: a caller asks whether this repository's skills bridges still resolve.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`, with its option naming extra harnesses. The root and
    format options are [diagnosis-report](../diagnosis-report/README.md)'s.
  - Library: `diagnoseBridges`, as [entry-point](../entry-point/README.md) exposes it.
  - Skill: `doctor-buddy-agent-harness` presents the report.
- **Inputs**: the repository root, and any harnesses the caller names.
- **Success**: every checked harness that needs a bridge is listed with the form found and whether it resolves, and
  each bridge that does not resolve, or resolves unsafely, has a finding.
- **Extensions**:
  - UC1.1 The canonical skills directory does not exist: reported once, before the bridges, and the bridges are
    still inspected.
  - UC1.2 Nothing is at the bridge path.
  - UC1.3 A regular file sits at the bridge path.
  - UC1.4 A symlink lands somewhere other than the canonical skills directory, or on a target that no longer exists.
  - UC1.5 A copy differs from the canonical skills directory, and the side that moved is known, or both moved.
  - UC1.6 A copy differs and no last agreement can be found, including outside a git repository.
  - UC1.8 An in-sync copy is tracked in git and lacks copy protection, so git can still add its files.

### UC2 — Check at every session start without writing (A3)

- **Trigger**: a session-start hook runs the command unattended.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
- **Inputs**: the repository root.
- **Success**: the hook learns of every broken bridge and the repository is unchanged.
- **Extensions**: extensions: none, every path of UC1 is a read and ends in a report.

### UC3 — Route a bridge finding without inspecting the bridge (A4, A5)

- **Trigger**: a skill reads the findings to decide which ones it owns.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Skill (primary): `repair` and `init-buddy-agent-harness` read the findings `doctor` reports.
  - Library: the findings `diagnoseBridges` returns.
- **Inputs**: the findings of one run.
- **Success**: each skill knows from the finding alone that it is a bridge finding, and which fault it has.
- **Extensions**: extensions: none, every finding carries its cause, so no path needs the bridge opened.

## Criteria

### Diagnosis

- R1 In every run, `doctor` leaves the repository's files and git index unchanged, whatever bridges it finds. (UC2)
- R2 When `.agents/skills` is not a directory, the run reports exactly one finding that the canonical skills
  directory is missing, ordered before every bridge finding. (UC1, E1)
- R3 When `.agents/skills` is not a directory, every checked harness's bridge is still inspected and listed. (UC1, E2)
- R4 The checked harnesses are Claude Code, Cursor, every harness the caller names, and every harness whose
  detection directory is present in the repository. (UC1, E2, E3)
- R5 A harness the caller names is checked even when the repository holds no directory for it, so its absent bridge
  is reported missing. (UC1, E5, E6)
- R6 A checked harness that reads `.agents/skills` natively is not listed and raises no bridge finding. (UC1, E4)
- R7 When nothing is at a checked harness's bridge path, the bridge is listed as absent and a missing-bridge finding
  names that path. (UC1, E6)
- R8 When a regular file sits at a bridge path, the bridge is listed as a file that does not resolve, and a
  degraded-bridge finding names that path, with a repair that rebuilds the bridge as a copy of `.agents/skills`.
  (UC1, E7)
- R9 A symlink bridge that lands on `.agents/skills` is listed as resolving and raises no finding, whether its target
  is written as a relative or an absolute path. (UC1, E8, E9)
- R10 A symlink bridge that lands anywhere other than `.agents/skills`, or on a target that no longer exists, is
  listed as not resolving with a stale-bridge finding naming its path, the same finding in both cases. (UC1, E10)
- R11 A copied bridge whose files differ from `.agents/skills` in names, in number, or in content is listed as
  diverged. (UC1, E12)
- R12 A diverged copy raises one finding naming its divergence direction, and the bridge-moved, canonical-moved, and
  both-moved findings are distinct from each other. (UC1, E13, E14, E15)
- R13 A file added under a copied bridge since the last agreement counts as movement on the bridge side. (UC1, E13)
- R14 When no last agreement exists for a diverged copy (a repository with no commits, sides never committed together,
  only one side in history, or no git repository), the run reports an unknown-direction finding, distinct from the
  three directions, and completes. (UC1, E16)
- R16 The report names, for every diverged bridge, its path and its divergence direction, and names no direction for
  a bridge that resolves. (UC1, E12)
- R25 An in-sync copy that is tracked in git and lacks either part of copy protection is listed as resolving and
  raises an unprotected-copy finding naming its path; once both parts are in place, the finding is gone. (UC1.8,
  E18)
- R18 An in-sync copy that is untracked, or in a directory that is not a git repository, is listed as resolving and
  raises no unprotected-copy finding. (UC1, E17, E19)
- R19 Every listed bridge carries its harness, its path, the form found (absent, file, symlink, or copy), and whether
  it resolves. (UC1, E5)
- R20 Each bridge is judged on its own, so one run reports every fault it finds across all bridges. (UC1, E5)

### Routing

- R27 Each of the nine bridge causes in R2, R7, R8, R10, R12, R14, and R25 is reported under a fault name of its own,
  as [detect-and-repair](../detect-and-repair/README.md) K4 defines it. (UC3, E1, E6, E7, E10, E13, E14, E15, E16,
  E18)

### Repairs

Which surface each repair goes to is [detect-and-repair](../detect-and-repair/README.md)'s; what it does is stated
here.

- R22 The repair of a missing-bridge or a stale-bridge finding rebuilds the bridge, and for each of the
  missing-bridge, degraded-bridge, and stale-bridge findings one invocation completes the repair. (UC3, E6, E7, E10)
- R28 The repair of a diverged-copy finding, in each of the four divergence directions, is the file-by-file sync
  [copy-sync](../copy-sync/README.md) states, and it names no side to keep for a file both sides changed. (UC3, E13,
  E14, E15, E16)
- R26 The repair of an unprotected-copy finding puts both parts of copy protection in place for that copy, and
  changes no file's content and no committed file. (UC3, E18)

## Open questions

None.

## References

- [diagnosis-report](../diagnosis-report/README.md): the output shape and the root and format options.
- [detect-and-repair](../detect-and-repair/README.md): which surface owns each finding's repair.
- [instruction-bridges](../instruction-bridges/README.md) and
  [configuration-diagnosis](../configuration-diagnosis/README.md): the sibling families.
- [harness-init](../harness-init/README.md): `init` uses the same resolution test, so a bridge `init` leaves alone is
  never one `doctor` reports.
- [copy-sync](../copy-sync/README.md): the sync a diverged-copy repair performs.
- `.research/agentic-configuration-standards/`: the per-harness sources for which harnesses need a bridge.
