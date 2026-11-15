# Worktree diagnosis

Agent worktrees a repository leaves unaccounted for are reported.

## What

Claude Code runs a session started in a worktree, and a subagent isolated in one, in a git worktree under
`.claude/worktrees/<name>/` at the repository root. Each is a whole checkout inside the repository, config files
included. A repository that does not account for that pays in three ways: `git status` lists the directory as
untracked, a tool that walks the tree finds every worktree's own config, and agent worktrees branch from the default
branch rather than from the commit the session started on.

The `doctor` command reports each of the three that a repository leaves open, so the skills that offer the fix never
detect anything themselves. Each fix is a line in a file the owner wrote, so it is offered, never run.

## Non-goals

- N1 **Repairing.** The command never writes. The offers, the explanation of the base trade-off, and the approved
  writes are [init-buddy-agent-harness](../init-buddy-agent-harness/README.md) and [enhance](../enhance/README.md).
- N2 **A runnable fix.** Every fault is a line in a file the owner wrote or may want to keep, so correcting one is
  judgment and no finding carries a command.
- N3 **Moving the worktrees.** The place is Claude Code's and no setting moves it. Nothing here suggests otherwise.
- N4 **Harnesses other than Claude Code.** A repository that does not use Claude Code is never reported.
- N5 **Other tree-walking tools.** Only a Biome config is checked; other tools are offered by the skills, not
  detected.
- N6 **Reporting an explicit base.** An owner who set the base, either way, has answered; it is not a fault.
- N7 **The shape of the report.** [diagnosis-report](../diagnosis-report/README.md).

## Key terms

- K1 **harness**: see [glossary](../glossary.md#harness).
- K2 **agent worktree**: a git worktree Claude Code creates under `.claude/worktrees/<name>/` for a worktree session
  or an isolated subagent.
- K3 **base**: the commit an agent worktree branches from. Unless the Claude Code settings in `.claude/settings.json`
  set it, Claude Code branches from the repository's default branch.
- K4 **Biome config**: a `biome.json` or `biome.jsonc` at the repository root.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | `init-buddy-agent-harness` skill | know which worktree lines a repository lacks, without detecting them |
| A2.1 | `enhance` skill | know the same, for a repository that already has an `AGENTS.md` |
| A3.1 | person at a shell | see what is missing and which skill offers it |
| A4.1 | session-start hook | learn of a fault at every session start with no risk of a write |
| A5.1 | `doctor-buddy-agent-harness` skill | route each worktree finding to the skill that offers its fix |

## Use cases

### UC1 — Learn which worktree lines a repository lacks (A1, A2, A3, A5)

- **Trigger**: a caller asks what is wrong with this repository's agent configuration.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`. It adds no option; the root and format options are
    [diagnosis-report](../diagnosis-report/README.md)'s.
  - Library: the findings of the `doctor` report, as [entry-point](../entry-point/README.md) exposes it.
  - Skill: `doctor-buddy-agent-harness` presents the report and routes each finding.
- **Inputs**: the repository root.
- **Success**: each of the three faults the repository has is a finding naming the file to change and the line to
  add, with a repair that names the skills that offer it.
- **Extensions**:
  - UC1.1 No `.claude` directory: nothing to account for.
  - UC1.2 The root is not a git repository, so no ignore rule can be read.
  - UC1.3 No Biome config exists.
  - UC1.4 The settings file is missing or does not parse.

### UC2 — Check at every session start without writing (A4)

- **Trigger**: a session-start hook runs the command unattended.
- **Entry node**: `D1` in [graph.md](./graph.md).
- **Entry points**:
  - Command line (primary): `buddy-agent-harness doctor`.
- **Inputs**: the repository root.
- **Success**: the hook learns of every worktree fault and the repository is unchanged.
- **Extensions**: extensions: none, every path of UC1 is a read and ends in a report.

## Criteria

### Diagnosis

- R1 In every run, `doctor` leaves the repository's files unchanged, whatever worktree faults it finds. (UC2)
- R2 A repository with no `.claude` directory gets no worktree finding, whatever its other files hold. (UC1, E1)
- R3 In a git repository with a `.claude` directory where `.claude/worktrees/` is not git-ignored, the run reports an
  untracked-worktrees finding naming `.gitignore`. (UC1, E5)
- R4 An ignore rule on a parent directory, such as `.claude/`, counts as ignoring `.claude/worktrees/`, and no
  untracked-worktrees finding is reported. (UC1, E6)
- R5 Where the root is not a git repository, no untracked-worktrees finding is reported, and the other two checks
  still run. (UC1, E3)
- R6 With a `.claude` directory and a Biome config that does not mention `.claude/worktrees`, the run reports a
  scanned-worktrees finding naming that config file, `biome.json` or `biome.jsonc`. (UC1, E10)
- R7 A Biome config that excludes `.claude/worktrees` raises no scanned-worktrees finding. (UC1, E11)
- R8 A repository with no Biome config gets no scanned-worktrees finding. (UC1, E8)
- R9 With a `.claude` directory whose `.claude/settings.json` is missing, does not parse, has no worktree key, or has
  one that leaves the base unset, the run reports a base-unset finding naming `.claude/settings.json`. (UC1, E13)
- R10 A `.claude/settings.json` that sets the worktree base, to either the current commit or a fresh branch, raises
  no base-unset finding. (UC1, E14)
- R11 The three checks are independent, so a repository with all three faults gets all three findings in one run.
  (UC1, E5, E10, E13)

### Routing

- R12 Each worktree finding's repair names the line to add: the ignore rule for `.claude/worktrees/`, the Biome
  exclusion of the worktrees, or the base setting. (UC1, E5, E10, E13)
- R14 Each of the three worktree causes in R3, R6, and R9 is reported under a fault name of its own, as
  [detect-and-repair](../detect-and-repair/README.md) K4 defines it. Which skills each repair names, and that none
  carries a runnable command, is detect-and-repair R22. (UC1, E5, E10, E13)

## Open questions

None.

## References

- [diagnosis-report](../diagnosis-report/README.md): the output shape.
- [detect-and-repair](../detect-and-repair/README.md): how a finding reaches the skill that owns its repair.
- [configuration-diagnosis](../configuration-diagnosis/README.md): why a repair keeps the command and the
  instruction apart.
- `skills/init-buddy-agent-harness/references/agent-worktrees.md`: where Claude Code puts agent worktrees, what each
  fault costs, and how each line is judged covered.
