# harness-init

The `init` command projects the canonical skills into every enabled harness.

## What

A repository keeps its skills once, in the canonical skills directory. Most harnesses read that directory
themselves. A few look only in a directory of their own, and without help they load none of the repository's
skills, so the agent in that harness works as if the repository had none.

The `init` command fixes that for one repository. It makes sure the canonical skills directory and the project
references layer exist at the repository root. It then gives each enabled harness that cannot read the canonical
skills directory a projection of it, a link where links work and a copy where they do not. It reports what it did, so
a person or a program can tell which harness got what. It never overwrites something already in a projection's place
unless the caller names it. A copy that has drifted from the canonical skills directory is synced with it file by file,
as [copy-sync](../copy-sync/README.md) states, so an edit made through the copy is kept, and a file both sides changed
waits for the user to pick a side.

## Non-goals

- N1 Consolidating instruction files, deciding which writes need a person's approval, and running the five-phase
  setup job. Those are the `init-buddy-agent-harness` skill's ([spec](../init-buddy-agent-harness/README.md)), which
  runs this command as one of its steps.
- N2 Writing instruction bridges, such as an `AGENTS.md` entry in a harness settings file, or writing or removing a
  `CLAUDE.md`. The skill does that work by hand.
- N3 Reporting what is wrong with an existing configuration. That is `doctor`'s
  ([diagnosis-report](../diagnosis-report/README.md)).
- N4 Converting tool settings, such as MCP server definitions, between harness formats
  ([mcp-projection](../mcp-projection/README.md)).
- N5 Writing or editing instructions. The command derives no `AGENTS.md` content and invents no policy.
- N6 Changing CI, repository settings, security scanning, branch rules, or any project file outside the agent
  configuration.
- N7 Resolving references or deciding their lookup order ([references](../references/README.md)). The command only
  creates the project layer and counts it.
- N8 Remembering which harnesses were enabled. The enabled set is worked out again on every run.

## Key terms

- **K1 canonical skills directory**: see [glossary](../glossary.md#canonical-skills-directory).
- **K2 canonical instructions**: see [glossary](../glossary.md#canonical-instructions).
- **K3 harness**: see [glossary](../glossary.md#harness).
- **K5 enabled harness**: see [glossary](../glossary.md#enabled-harness).
- **K6 consumer root**: the root of the Git repository the command runs in, also when it runs from a nested package
  of a monorepo.
- **K7 canonical skill**: a directory directly inside the canonical skills directory. A file there, or a directory
  further down, is not one.
- **K8 native harness**: an enabled harness that reads the canonical skills directory itself and needs no projection.
- **K9 projection**: the path where a non-native harness looks for skills, holding either a link that resolves to the
  canonical skills directory or a copy of it.
- **K11 tool setting**: a separately named configuration artifact that declares an external tool.
- **K12 project references layer**: `.agents/references/` at the consumer root. The project tier it belongs to also
  holds the legacy `.agents/governances/` layer. [references](../references/README.md) owns what the tier means.
- **K13 default harness**: see [glossary](../glossary.md#default-harness).
- **K14 conflicting target**: a projection path that already holds something other than a link resolving to the
  canonical skills directory or an existing copy.
- **K15 existing copy**: a directory, not a link, already at a projection path. It counts as a copy of the canonical
  skills directory, as [bridge-resolution](../bridge-resolution/README.md) counts it.
- **K16 drifted copy**: an existing copy whose files differ from the canonical skills directory in names, in number,
  or in content. [bridge-resolution](../bridge-resolution/README.md) calls it diverged.
- **K17 last agreement**: see [bridge-resolution](../bridge-resolution/README.md) K6.
- **K19 copy protection**: see [bridge-resolution](../bridge-resolution/README.md) K9.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | person or agent setting up the repository | every enabled harness can load the canonical skills |
| A1.2 | person or agent setting up the repository | a harness beyond the defaults is enabled because they asked for it |
| A1.3 | person or agent setting up the repository | the skills reach the harnesses even where links cannot be made |
| A2.1 | repository owner | nothing they wrote is replaced unless they named it |
| A2.2 | repository owner | a fresh repository has one obvious place for skills and for references, kept across a commit and clone |
| A2.3 | repository owner | an edit they made through a copy is kept, and no side wins a file both sides changed without their answer |
| A2.5 | repository owner | a copy the command writes or keeps never shows as uncommitted changes, and git adds none of its files |
| A3.1 | program caller (the `init-buddy-agent-harness` skill, a `doctor` repair, a script) | reads the result and tells each outcome apart without parsing prose |
| A4.1 | later agent session in an enabled harness, which never runs the command | loads the same skills as every other enabled harness |

## Use cases

### UC1 — Project the canonical skills (A1.1, A2.1, A4.1)

- **Trigger**: someone asks to set the repository's skills up for its harnesses, or the skill reaches its apply step.
- **Entry node**: `request`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init`.
  - Library: the program entry point of [entry-point](../entry-point/README.md).
  - Skill: the `init-buddy-agent-harness` skill runs the command bundled with it.
- **Inputs**: the working directory; optionally the harnesses to add, the targets to replace, and a copy request.
- **Success**: every non-native enabled harness has a projection that resolves to the canonical skills directory;
  canonical instructions and tool settings are unchanged; the result says what was done.
- **Extensions**:
  - UC1.1 A projection path holds something else: see UC3.
  - UC1.2 The projection already resolves to the canonical skills directory: it is kept and is not a conflict.
  - UC1.3 A tool setting has no supported mapping to an enabled harness: it stays canonical only.
  - UC1.4 The request is malformed: it is rejected before anything is written.
  - UC1.5 A projection path holds an existing copy: see UC7.

### UC2 — Enable more harnesses (A1.2)

- **Trigger**: the user wants a harness enabled that is neither a default harness nor already present in the repository.
- **Entry node**: `request`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init` naming the harnesses.
  - Library: the program entry point.
  - Skill: the harnesses the user names to the skill.
- **Inputs**: the names of the harnesses to add.
- **Success**: each named harness is enabled, projected if it is not native, and reported as enabled.
- **Extensions**:
  - UC2.1 A name is not a harness the command supports: the request is rejected.
  - UC2.2 A name is a superseded name of a supported harness: the harness is still enabled, and the result says it
    is superseded and by what.

### UC3 — Replace a conflicting target (A2.1, A3.1)

- **Trigger**: a run, or a `doctor` repair, reports a conflicting target that the owner wants replaced.
- **Entry node**: `conflicts`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init` with a request to replace targets, with or without naming
    them.
  - Library: the program entry point.
  - Skill: the skill's retry after it resolved the target with the owner.
- **Inputs**: the targets to replace, or a request to replace every conflicting target.
- **Success**: exactly the targets the caller chose hold a projection; every other conflicting target keeps its
  content.
- **Extensions**:
  - UC3.1 No replacement was requested: every conflict is reported and nothing is projected.
  - UC3.2 A named target is not a projection path of any enabled harness: nothing is projected.
  - UC3.3 Some conflicting targets were left unnamed: those harnesses are reported as skipped and the run succeeds.

### UC4 — Copy instead of link (A1.3)

- **Trigger**: links are unavailable where the repository lives, or the caller asks for copies.
- **Entry node**: `copy`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init` with a copy request.
  - Library: the program entry point.
  - Skill: the skill passes the copy request when the user says links are unavailable.
- **Inputs**: the copy request, or a platform that refuses links.
- **Success**: each non-native enabled harness's projection is a copy of the canonical skills directory.
- **Extensions**:
  - UC4.1 Something appears at the target between the failed link and the copy: the run fails and keeps it.
  - UC4.2 An existing copy is already at the target: see UC7.
  - UC4.3 The target is tracked by git: see UC9.

### UC5 — Scaffold a fresh repository (A2.2)

- **Trigger**: the command runs in a repository without the canonical directories.
- **Entry node**: `scaffold`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init`.
  - Library: the program entry point.
  - Skill: the skill's scaffold and apply steps.
- **Inputs**: the consumer root.
- **Success**: the canonical skills directory and the project references layer exist and survive a commit and
  clone, even while empty.
- **Extensions**:
  - UC5.1 No canonical skill exists yet: the run still succeeds and reports zero skills.

### UC6 — Read the result (A3.1)

- **Trigger**: a program or a person reads what a run did.
- **Entry node**: `request`
- **Entry points**:
  - Command line (primary): the command's output, in the default form or a machine-readable form on request.
  - Library: the value the program entry point returns.
  - Skill: the skill reads the output to verify and report.
- **Inputs**: the requested output form.
- **Success**: the result states what the run did for each enabled harness, in the requested form.
- **Extensions**:
  - UC6.1 The requested output form is not supported: the request is rejected before anything is written.
  - UC6.2 The run fails: the failure is reported in the result, told apart from every other outcome.

### UC7 — Sync a drifted copy (A2.3, A4.1)

- **Trigger**: a run finds an existing copy at a projection path.
- **Entry node**: `drift`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init`.
  - Library: the program entry point.
  - Skill: the skill's apply step, and the `repair` skill's correction of a drifted copy
    ([repair](../repair/README.md)).
- **Inputs**: the existing copy, the canonical skills directory, their last agreement where git has one, and any
  request to replace targets. The command takes no pick of a side for a file; those go to the `sync` command
  ([copy-sync](../copy-sync/README.md) UC2).
- **Success**: the copy is synced with the canonical skills directory, and it is not reported as a conflict.
- **Extensions**:
  - UC7.1 The copy holds the same files with the same content: it is kept as it is.
  - UC7.5 The copy differs from the canonical skills directory: it is synced file by file, and a file both sides
    changed is left for the user, as [copy-sync](../copy-sync/README.md) UC1 states.
  - UC7.6 A request to replace targets covers the copy's path: the copy is replaced with a projection instead of
    synced.

### UC9 — Keep a copy out of uncommitted changes (A2.5)

- **Trigger**: a run writes a copy, or keeps an in-sync one, at a projection path git tracks. Protection after a sync
  writes into a copy is [copy-sync](../copy-sync/README.md) UC3's.
- **Entry node**: `tracked`
- **Entry points**:
  - Command line (primary): `buddy-agent-harness init`.
  - Library: the program entry point.
  - Skill: the skill's apply step.
- **Inputs**: the copy's paths, and which of them git tracks.
- **Success**: git shows no uncommitted change for the copy and would add none of its files to a commit.
- **Extensions**:
  - UC9.1 The projection path is untracked, or the repository has no git: nothing is protected, and the run succeeds.
  - UC9.2 An in-sync copy the run writes nothing into lacks copy protection: the run puts it in place.

## Criteria

### Projecting (UC1)

- R1 (UC1, E2) Run from any directory of a Git repository, including a nested package of a monorepo, the command
  works on the repository root: the canonical skills directory and every projection it touches are at that root.
- R2 (UC1, E11) After a successful run, the projection of every non-native enabled harness resolves to the canonical
  skills directory, so every canonical skill is reachable through it.
- R3 (UC1, E3) A native enabled harness gets nothing written for it.
- R4 (UC1, E11) A link projection names its target relative to its own location, except on a platform whose only
  available link form takes an absolute target.
- R5 (UC1, E30) A projection that already resolves to the canonical skills directory, however its target is spelled,
  is kept as it is and is not reported as a conflict.
- R6 (UC1, E2) A run leaves both canonical instruction files byte-identical.
- R7 (UC1, E2) A tool setting with no supported mapping to an enabled harness is left as it is, and no file in that
  harness's format is written for it.
- R48 (UC1, E2) A run writes no file outside the canonical skills directory, the project references layer, and the
  projections of the enabled harnesses, except the bridge path it lists in the clone's own exclude file as part of
  copy protection.
- R9 (UC1, E2) A run writes no record of which harnesses it enabled; a later run works out the enabled set again.

### Enabled harnesses (UC1, UC2)

- R29 (UC1, E2) Every default harness, and every supported harness whose own directory is present in the
  repository, is enabled on every run, whether or not the user names any harness.
- R30 (UC2, E2) Each supported harness the user names is enabled in addition to the default and present ones, even
  when its directory is absent, projected if it is not native, and reported as enabled.
- R12 (UC2, E1) A harness name the command does not support makes the run fail before anything is written, and the
  report names the unsupported name.
- R13 (UC2, E2) A harness named by a superseded name is enabled and projected as under its current name, and the
  result names it as superseded together with the name that replaces it.

### Conflicts (UC3)

- R31 (UC3, E4) With no replacement requested, a run that finds any conflicting target reports every conflicting
  target of every enabled harness at once and changes no projection path.
- R32 (UC3, E7) A request to replace every conflicting target, naming none, leaves a projection at every conflicting
  target.
- R33 (UC3, E8) A request naming some conflicting targets, each by its repository-relative or its absolute path,
  replaces exactly those; every other conflicting target keeps its content, the result reports those harnesses as
  skipped, and the run succeeds.
- R34 (UC3, E5) A request naming a target that no enabled harness projects to makes the run fail, reports that no
  target matches, and changes no projection path.

### Copying (UC4)

- R18 (UC4, E10) When a copy is requested, each non-native enabled harness's projection is a non-link copy of the
  canonical skills directory, and the result states that copying was requested.
- R19 (UC4, E12) When a link cannot be created and the target is still empty, the projection is a copy of the
  canonical skills directory, without the caller having asked for one.
- R20 (UC4, E13) When something appears at a target after its link attempt failed, the run fails and leaves what
  appeared unchanged.

### Syncing an existing copy (UC7)

- R52 (UC7.1, E19, E20, E34) An existing copy that holds the same files with the same content as the canonical
  skills directory, at a projection path no request to replace targets covers, is kept as it is and is not reported
  as a conflict, whether or not a copy was requested.
- R49 (UC7.5, E21, E35) A drifted copy at a projection path no request to replace targets covers is synced with the
  canonical skills directory as [copy-sync](../copy-sync/README.md) R2 to R20 state, whether or not a copy was
  requested, and is not reported as a conflict.
- R51 (UC7.6, E36) A request to replace targets that names an existing copy's projection path, or that names no
  target, replaces that copy with a projection of the canonical skills directory, as R2 and R18 state, instead of
  syncing it, and leaves the canonical skills directory unchanged on the copy's account.

### Protecting a copy (UC9)

- R50 (UC9, E29, E31, E32) After a run writes a copy at a projection path git tracks, that copy has copy protection,
  so git shows no uncommitted change for the copy and would add none of its files to a commit.
- R44 (UC9.2, E34, E31, E32) After a run keeps an existing in-sync copy at a projection path git tracks, that copy has
  copy protection, though the run wrote no file into it.
- R45 (UC9.1, E33) A run puts copy protection on no copy other than one it wrote, synced, or kept at a tracked
  projection path, and on none at an untracked projection path or outside a git repository.

### Scaffolding (UC5)

- R21 (UC5, E2) After a run, the canonical skills directory and the project references layer exist at the consumer
  root.
- R22 (UC5, E2) Each of those two directories that is empty after the run holds one empty placeholder file that keeps
  it tracked by Git, and that file counts as neither a skill nor a reference; a directory that already had content
  gains no placeholder.
- R23 (UC5, E2) A run does not create the legacy `.agents/governances/` layer.
- R24 (UC5, E11) A run with no canonical skill succeeds and reports the enabled harnesses and a skill count of zero.

### The result (UC6)

- R25 (UC6, E14) A successful run's result states the consumer root, the enabled harnesses, which of them were
  projected, which read the canonical skills directory natively, which were skipped over a conflict, any superseded
  names with their replacements, the number of canonical skills (directories directly inside the canonical skills
  directory only), the number of references in the project tier (the legacy layer included), and whether copying was
  requested.
- R46 (UC6, E1) A request for an output form the command does not support is rejected before anything is written.
  The supported forms are [command-output](../command-output/README.md)'s.
- R47 (UC6, E14) With no output form named, the result is written in `toon`.
- R27 (UC6, E13) A run that fails reports the failure in the requested output form.

### Adapters

- R28 (UC6) Each outcome of a run (success, rejected request, conflicts reported, no matching target, failure) is told
  apart by a program caller without reading prose, is distinct per cause, and is stable across releases.

## Open questions

None.

## References

- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): the skill that runs this command and does the
  instruction work around it.
- [references](../references/README.md): owns the project tier this command creates a layer in.
- [command-output](../command-output/README.md): owns how a result becomes output, its forms, and the default.
- [entry-point](../entry-point/README.md): owns how a program reaches the command without a process.
- [bridge-resolution](../bridge-resolution/README.md): owns what a copy, its divergence, and its protection mean, as
  `doctor` reports them.
- [copy-sync](../copy-sync/README.md): the home of the file-by-file sync UC7 runs on an existing copy.
- [repair](../repair/README.md): offers that sync for a drifted-copy finding, after the owner approves, and restores
  copy protection.
- [glossary](../glossary.md): the shared terms.
- [AGENTS.md](https://agents.md/): the open instruction format the canonical instructions follow.
