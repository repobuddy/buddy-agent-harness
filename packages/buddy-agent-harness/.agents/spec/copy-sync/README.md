# copy-sync

Each skills copy bridge and the canonical skills directory end up holding the same files, with every edit made on
either side kept.

## What

On a machine that cannot make symlinks, a harness that cannot read `.agents/skills` gets a copy of it at its own path,
such as `.claude/skills`. The copy and the canonical skills directory then drift apart. An agent edits a skill through
the copy, or someone edits `.agents/skills` directly, and the other side never learns of it. Rebuilding the copy from
`.agents/skills` throws away the edits made through the copy, and copying it back throws away the edits made in
`.agents/skills`. Neither side is safe to treat as the truth.

This capability merges each copy bridge with the canonical skills directory file by file, against the last commit in
which the two agreed. A file only one side changed takes that side's version on both sides. A file both sides changed,
or any differing file when the two never agreed, is left as it is and reported, until the owner picks a side for it.
It keeps every copy it syncs that git tracks out of uncommitted changes and commits. When `.agents/skills` itself is
missing, it writes nothing, rather than reading the absence as a deletion to carry into the copy. The result
says what was written, which side each file took, and which files wait for the owner.

## Non-goals

- N1 **Creating, replacing, or rebuilding a bridge.** That is [harness-init](../harness-init/README.md)'s. A skills
  bridge that is a link, a regular file, or absent is not synced.
- N2 **Finding out whether a bridge resolves.** That is `doctor`'s
  ([bridge-resolution](../bridge-resolution/README.md)).
- N3 **Choosing a side for a file both sides changed.** Which edit should win cannot be decided from the files; the
  owner picks ([bridge-resolution](../bridge-resolution/README.md) N7).
- N4 **Asking the owner.** The sync asks no question. A skill that runs it asks, and passes the answers in:
  [repair](../repair-buddy-agent-harness/README.md) UC3.5, [init-buddy-agent-harness](../init-buddy-agent-harness/README.md) R64.
- N5 **Committing the result, or editing the committed `.gitignore`.** What lands in history is the owner's.
- N6 **Syncing anything other than skills.** MCP servers are [mcp-reconcile](../mcp-reconcile/README.md)'s, and
  instruction files have no copy to sync.

## Key terms

- K1 **canonical skills directory**: see [glossary](../glossary.md#canonical-skills-directory).
- K2 **skills bridge**: see [bridge-resolution](../bridge-resolution/README.md) K3.
- K3 **copy bridge**: a skills bridge that is a directory, not a link. [harness-init](../harness-init/README.md) calls
  one already at a projection path an existing copy.
- K4 **last agreement**: see [bridge-resolution](../bridge-resolution/README.md) K6.
- K5 **changed side**: for one file of a copy bridge, a side (the copy or the canonical skills directory) whose version
  of the file differs from its version at the last agreement; a file added or removed on that side counts.
- K6 **resolution**: the caller's pick, for one file of one copy bridge, named by a path that includes the bridge, of
  the side whose version both sides are to hold: that copy or the canonical skills directory.
- K7 **file left for the user**: a file that differs between a copy bridge and the canonical skills directory, that
  either changed on both sides since the last agreement or belongs to a copy bridge with no last agreement, and that
  no resolution names.
- K8 **copy protection**: see [bridge-resolution](../bridge-resolution/README.md) K9.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | repository owner on a machine without symlinks | an edit made on either side reaches the other side, and none is lost |
| A1.2 | repository owner | no side wins a file both sides changed without their pick |
| A1.3 | repository owner | a copy the sync syncs or keeps never shows as uncommitted changes, and git adds none of its files |
| A2.1 | program caller (the `repair-buddy-agent-harness` skill, the `init-buddy-agent-harness` skill, a script) | learns which files were written, which side each took, and which wait for the owner, without parsing prose |
| A3.1 | later agent session in a harness that reads a copy bridge, which never runs the sync | loads the same skills the canonical skills directory holds |

## Use cases

### UC1 — Sync each copy bridge (A1.1, A3.1)

- **Trigger**: the owner, or a skill acting for them, wants every copy bridge and the canonical skills directory to
  agree again; or an `init` run finds an existing copy at a projection path.
- **Entry node**: `request`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness sync`.
  - Command line: `buddy-agent-harness init`, which syncs an existing copy instead of reporting it as a conflict
    ([harness-init](../harness-init/README.md) UC7).
  - Library: the program entry point of [entry-point](../entry-point/README.md).
  - Skill: the `repair-buddy-agent-harness` skill's correction of a drifted copy ([repair](../repair-buddy-agent-harness/README.md) UC3.5).
- **Inputs**: the repository, its copy bridges, the canonical skills directory, each copy bridge's last agreement
  where git has one, and any resolutions.
- **Success**: every copy bridge and the canonical skills directory hold the same files with the same content, and
  every edit made on either side since the last agreement is kept.
- **Extensions**:
  - UC1.1 No skills bridge is a copy: nothing is written, and the run succeeds.
  - UC1.2 A copy bridge already holds the same files with the same content: it is kept as it is.
  - UC1.3 A file changed on both sides since the last agreement: it is left for the user unless a resolution names it
    (UC2).
  - UC1.4 No last agreement can be found for a copy bridge: every differing file of it is left for the user unless a
    resolution names it.
  - UC1.5 A resolution names no side the sync recognizes: the request is rejected before anything is written.
  - UC1.6 A write fails: the run fails, and the failure is reported.
  - UC1.7 The canonical skills directory is missing while a copy bridge exists: nothing is written, and the run fails
    saying so.
  - UC1.8 Two copy bridges changed the same file differently: it counts as changed on both sides and is left for the
    user unless a resolution names it.
  - UC1.9 The sync runs outside a Git repository: no last agreement exists, so every differing file is left for the
    user unless a resolution names it.
  - UC1.10 One copy bridge changed a file on its side only while another copy bridge has the same file left for the
    user: the file is left in both, and nothing is written for it.

### UC2 — Apply the owner's picks (A1.2)

- **Trigger**: a sync left files for the user, and the owner has picked a side for some of them.
- **Entry node**: `request`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness sync` with its resolution option.
  - Library: the program entry point.
  - Skill: the `repair-buddy-agent-harness` skill, after the owner picks each side.
- **Inputs**: the resolutions, one per file the owner picked a side for.
- **Success**: each resolved file holds the picked side's version on both sides, and every other file is synced as in
  UC1.
- **Extensions**:
  - UC2.1 A file left for the user has no resolution: it stays unchanged on both sides, and the rest are still synced.
  - UC2.2 A resolution names a file that is not left for the user (one the same on both sides, one only one side
    changed, or one in neither side): the request is rejected before anything is written.
  - UC2.3 The resolutions for a file would leave two copy bridges holding different versions of it, or would change
    the canonical skills directory under a copy bridge whose file is still left for the user: the request is
    rejected before anything is written.

### UC3 — Keep a synced copy out of commits (A1.3)

- **Trigger**: a sync syncs or keeps a copy bridge at a path git tracks, whether or not it writes into it.
- **Entry node**: `tracked`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness sync`.
  - Command line: `buddy-agent-harness init` on an existing copy.
  - Library: the program entry point.
- **Inputs**: the copy bridge's paths, and which of them git tracks.
- **Success**: git shows no uncommitted change for the copy and would add none of its files to a commit.
- **Extensions**:
  - UC3.1 The copy bridge's path is untracked, or there is no git repository: nothing is protected, and the run
    succeeds.
  - UC3.2 The sync wrote nothing into a tracked copy bridge: copy protection is still put in place.

### UC4 — Read the result (A2.1)

- **Trigger**: a program or a person reads what a sync did.
- **Entry node**: `request`
- **Entry points**:
  - Command line (primary): the `sync` command's output, in its default form or a form the caller names.
  - Library: the value the program entry point returns.
  - Skill: the `repair-buddy-agent-harness` skill reads it to offer the owner each file left for the user, and to report.
- **Inputs**: the requested output form.
- **Success**: the result states, for each copy bridge, what the sync wrote and what it left, in the requested form.
- **Extensions**:
  - UC4.1 The requested output form is not supported: the request is rejected before anything is written.
  - UC4.2 The run fails: the failure is reported in the result, told apart from every other outcome.

## Criteria

### Syncing (UC1, UC2)

These hold whichever entry point runs the sync: the `sync` command, an `init` run over an existing copy, or a skill
through either.

- R1 (UC1, UC1.9, E2) Run from any directory of a Git repository, including a nested package of a monorepo, the sync
  works on the copy bridges and the canonical skills directory at the repository root; outside a Git repository it
  works on the same root `init` uses there ([harness-init](../harness-init/README.md) K6).
- R2 (UC1, E6, E21) A skills bridge that is a link, a regular file, or absent gets nothing written, and the canonical
  skills directory gets nothing written on its account.
- R3 (UC1.1, E4, E6, E21) When no skills bridge is a copy, the `sync` command writes nothing and succeeds.
- R4 (UC1.2, E8, E17) A copy bridge that holds the same files with the same content as the canonical skills directory
  gets nothing written, and the canonical skills directory gets nothing written on its account.
- R5 (UC1, E10, E14) While the canonical skills directory exists, in a copy bridge that differs from it, a file
  added, changed, or removed since the last agreement on one side only, and changed by no other copy bridge in a
  different way, holds that side's version on both sides after the run, whichever side it was, so an edit made
  through the copy is in the canonical skills directory after the run.
- R6 (UC1.3, E11, E13) In a copy bridge that differs from the canonical skills directory, a file changed on both sides
  since the last agreement that no resolution names is unchanged on both sides after the run.
- R7 (UC1.4, UC1.9, E11, E13) When no last agreement can be found for a copy bridge (a repository with no commits,
  the two sides never committed together, only one side in history, or no git repository), every file that differs
  between it and the canonical skills directory and that no resolution names is unchanged on both sides after the
  run.
- R8 (UC2.1, E13, E16) A file left for the user stops no other file: every other differing file of every copy bridge
  is still synced as R5 and R9 state.
- R9 (UC2, E11, E12, E15) While the canonical skills directory exists, a file that changed on both sides since the
  last agreement, or that differs in a copy bridge with no last agreement, and that a resolution names, holds the
  picked side's version on both sides after the run, including its removal when the picked side lacks it.
- R10 (UC1.5, UC2.2, E1) A resolution that names no side the sync recognizes, or names a file that is not left for
  the user (one the same on both sides, one only one side changed, or one in neither side), makes the run fail
  before anything is written, and the report names that resolution.
- R19 (UC1.8, E11, E13) A file that two copy bridges each changed since their last agreement, to different
  content, counts as changed on both sides in each of them: with no resolution naming it, it is unchanged in every
  copy bridge and in the canonical skills directory after the run.
- R20 (UC1.7, E3) When the canonical skills directory is missing and at least one copy bridge exists, the sync
  writes nothing, removes no file of any copy bridge, and fails with a failure distinct from every other failure that
  says the canonical skills directory is missing.
- R21 (UC2.3, E1) A set of resolutions that would leave two copy bridges holding different versions of the same
  file, or that would change the canonical skills directory under a copy bridge whose file is still left for the
  user, makes the run fail before anything is written, and the report names the resolutions for that file.
- R22 (UC1.10, E11, E13) When one copy bridge changed a file on its side only and another copy bridge has the same
  file left for the user, the file is unchanged in both and in the canonical skills directory after the run, so R5
  never overrides R6, R7, or R19 for another copy bridge.
- R11 (UC1, E2) A sync writes no file outside the copy bridges and the canonical skills directory, except the bridge
  path it lists in the clone's own exclude file as part of copy protection.

### Protecting a copy (UC3)

- R12 (UC3, UC3.2, E17, E18, E20) After a sync, every copy bridge it synced or kept at a path git tracks has both
  parts of copy protection, whether or not the sync wrote into it, so git shows no uncommitted change for the copy
  and would add none of its files to a commit, including when the repository is a linked worktree.
- R13 (UC3.1, E19) A sync puts copy protection on no copy bridge at an untracked path and on none outside a git
  repository, and never writes the committed `.gitignore`.

### The result (UC4)

- R14 (UC4, E19, E20) The result names, for each copy bridge, each file the sync wrote and the side whose version
  it took, and each file left for the user.
- R15 (UC4.1, E1) A request to the `sync` command for an output form it does not support is rejected before anything
  is written. The supported forms are [command-output](../command-output/README.md)'s.
- R16 (UC4, E20) With no output form named, the `sync` command writes its result in `toon`.
- R17 (UC4.2, E3, E22, E23) A sync that fails reports the failure in the requested output form.

### Adapters

- R18 (UC4) Each outcome of a sync (everything synced, synced with files left for the user, rejected request,
  canonical skills directory missing, other failure) is told apart by a program caller without reading prose, is
  distinct per cause, and is stable across releases.

## Open questions

None.

## References

- [harness-init](../harness-init/README.md): runs this sync on an existing copy at a projection path (UC7), and owns
  creating, replacing, and protecting the copies it writes.
- [bridge-resolution](../bridge-resolution/README.md): what a skills bridge, its last agreement, its divergence, and
  copy protection mean, as `doctor` reports them; its diverged-copy repair is this sync.
- [repair](../repair-buddy-agent-harness/README.md): offers this sync for a drifted copy and asks the owner for each resolution.
- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): asks the owner which side wins for each file an
  `init` run leaves for the user, and passes the picks to the `sync` command.
- [command-output](../command-output/README.md): how a result becomes output, its forms, and their encoding.
- [entry-point](../entry-point/README.md): how a program reaches the command without a process.
- [glossary](../glossary.md): the shared terms.
