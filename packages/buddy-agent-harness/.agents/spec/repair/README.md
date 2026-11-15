# repair

The `repair` skill corrects agent configuration a repository has that is present but wrong, writing only what the
owner approves.

## What

A repository's agent configuration can be present and still wrong: a harness name the registry retired, a
`.gitignore` rule that swallows a bridge, an `AGENTS.local.md` no harness reads, a skill a harness refuses to load,
a skills copy that drifted from `.agents/skills` or lost the protection that keeps it out of commits, or an MCP server
that differs between the golden set and a harness copy. The other shipped skills refuse this work on
purpose. `init-buddy-agent-harness` consolidates what is there and invents nothing, so it never rewrites a file the
user wrote. `enhance` offers only what is missing. `doctor` never writes. Without `repair`, such a fault is reported
and stays. The session that suffers it is often a later one: a git-ignored bridge loses edits silently.

`repair` takes what `doctor` reports, and for each fault it holds a correction for, offers that correction with the
file as it stands and as it would read, and writes it only on approval. It then runs `doctor` again to prove the
correction held, and reports every finding with its outcome. It corrects only what the tooling decides is wrong,
never what the repository means. Every other finding it hands on, to the owner [detect-and-repair](../detect-and-repair/README.md)
names, or to a person.

## Non-goals

- **N1 Detecting.** Every check lives in the `doctor` command. A check written here would be a second home for it.
- **N11 Findings it holds no correction for.** Skills bridges other than a drifted or an unprotected copy,
  instruction bridges, global instructions, agent worktrees, non-standard configuration, and MCP drift that needs the
  user's judgment are handed on. Which surface owns each is [detect-and-repair](../detect-and-repair/README.md)'s.
- **N12 Rebuilding a bridge or consolidating instructions into `AGENTS.md`.** Both are the
  [init-buddy-agent-harness](../init-buddy-agent-harness/README.md) skill's, even when a request says "repair the
  bridge". Syncing a drifted skills copy and restoring a copy's protection rebuild nothing, and are this skill's.
- **N4 Adding what is absent.** A repository with no canonical configuration is `init-buddy-agent-harness`'s; guidance
  the repository lacks is [enhance](../enhance/README.md)'s.
- **N5 Correcting project policy.** A statement about how the repository is worked in is the owner's, even when it is
  false.
- **N6 Reporting what is wrong without fixing it.** That is the `doctor` command, or the `doctor-buddy-agent-harness`
  skill.
- **N7 Settling MCP drift both sides changed.** That is the user's call; see [mcp-reconcile](../mcp-reconcile/README.md).
- **N8 Files outside the repository's agent configuration.** Workflows, CI, repository settings, and other project
  files are not corrected, even when they name a retired harness.
- **N9 Writing without approval.** No option skips approval, and none is offered.
- **N10 A justification a diff reviewer can read.** The run's durable output is the corrected files. A one-line
  `.gitignore` edit has no room for its reason, and commit hygiene is not this skill's.

## Key terms

- **K1 canonical configuration**: see [glossary](../glossary.md#canonical-configuration).
- **K2 harness**: see [glossary](../glossary.md#harness).
- **K3 finding**: see [detect-and-repair](../detect-and-repair/README.md) K1.
- **K4 fault name**: see [detect-and-repair](../detect-and-repair/README.md) K4.
- **K5 bridge**: see [detect-and-repair](../detect-and-repair/README.md) K9.
- **K6 correction reference**: the reference the skill ships that holds one correction, with where it stops, per fault
  the skill corrects. A fault with an entry there is in remit; a fault without one is not. The remit is exactly that
  set, and it matches the faults [detect-and-repair](../detect-and-repair/README.md) R19, R20, and R28 send to
  `repair`.
- **K7 material**: content that stays true whether or not this tool ever ran. Material content is the owner's. Content
  that would stop being true if the tool's output were removed is non-material, and only non-material content is
  corrected.
- **K8 offer**: one correction shown to the owner as the actual file, or path, as it stands and as it would read.
- **K9 golden MCP set**: the repository's one declared set of MCP servers that each harness's MCP file is projected
  from; see [mcp-projection](../mcp-projection/README.md).
- **K10 outcome**: what became of one finding in a run: corrected, declined, still open, reported as material, handed
  to `init-buddy-agent-harness`, work for a person, or a step for the user. Each is told apart from the others.
- **K11 sync**: the file-by-file merge of a drifted skills copy with the canonical skills directory, as
  [harness-init](../harness-init/README.md) R36 to R40 state it.
- **K12 skip-worktree protection**: see [bridge-resolution](../bridge-resolution/README.md) K8.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | user | have a request to fix wrong agent configuration reach this skill |
| A2.1 | invoking agent | leave the repository's configuration doing what it was written to do |
| A3.1 | repository owner | nothing lands that they did not see and approve |
| A3.2 | repository owner | know what became of every finding |
| A4.1 | downstream agent | load the configuration the repository meant, in every later session |

## Use cases

### UC1 — Reach the skill for wrong configuration (A1)

- **Trigger**: the user asks an agent to correct agent configuration that is present but wrong or outdated, for
  example "doctor says my agent config is wrong, fix it", "the `.claude/skills` bridge is git-ignored, repair that",
  or "Cursor won't load one of my skills, can you fix it".
- **Entry node**: `Start`
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:repair`, or the skill's description matched by the harness.
- **Inputs**: the request.
- **Success**: the agent loads this skill.
- **Extensions**:
  - UC1.1 The request is to set the repository up, add missing guidance, only report what is wrong, or rebuild a
    bridge: it belongs to another skill (N12, N4, N6), and this skill does not load.

### UC2 — Correct what `doctor` reports (A2, A4)

- **Trigger**: the skill runs in a repository.
- **Entry node**: `Start`
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:repair`.
  - Command line: the `doctor` command the skill runs, and the `mcp project` and `mcp reconcile` commands it runs to
    work out an MCP correction.
- **Inputs**: the repository root, and the `doctor` report read from it.
- **Success**: every in-remit fault the owner approved is corrected and proven by a re-run; every other finding is
  handed on.
- **Extensions**:
  - UC2.1 `doctor` reports nothing: the skill says so and stops.
  - UC2.2 A finding's fault has no entry in the correction reference: it is out of remit, and is handed on with the
    repair `doctor` states.
  - UC2.3 The repair handed on names no skill: it is work for a person, and no owner is inferred.
  - UC2.4 The repair handed on is a step in the user's home directory: it is given to the user, and nothing outside
    the repository is written.
  - UC2.5 The correction would write material content: it is reported, and no write is offered.
  - UC2.6 Two findings sit at one path: each is acted on with the repair of its own fault.
  - UC2.7 The correction does not hold on the re-run: the finding is reported still open.

### UC3 — Approve each correction (A3)

- **Trigger**: the skill has an in-remit, non-material correction to offer.
- **Entry node**: `Options`
- **Entry points**:
  - Skill (primary): the offer and the owner's answer, in the session.
- **Inputs**: the offer, and the owner's answer to it.
- **Success**: exactly the corrections the owner approved are written.
- **Extensions**:
  - UC3.1 More than one correction is valid: every option is offered, and the owner picks.
  - UC3.2 The owner declines: nothing is written for that finding, and the run goes on with the rest.
  - UC3.3 Several corrections are offered and only some approved: only those are written.
  - UC3.4 A harness-side MCP change touches several fields: each field is offered and approved on its own.
  - UC3.5 A skills copy drifted from the canonical skills directory: the sync is offered, and each file it puts to
    the user is the owner's to pick a side for.
  - UC3.6 A tracked skills copy lost its skip-worktree protection: setting it again is offered.

### UC4 — Learn what became of every finding (A3)

- **Trigger**: the run ends, whichever way it went.
- **Entry node**: `Start`
- **Entry points**:
  - Skill (primary): the skill's report to the user.
- **Inputs**: the run's findings and their outcomes.
- **Success**: the owner sees every finding with its path, what was wrong, and its outcome.
- **Extensions**: extensions: none, every path of the run ends in an outcome the report carries.

## Criteria

Every criterion here belongs to a skill-instruction use case and is checked by an eval run of the skill.

### Activation

- **R1** (UC1, E1) A request to correct agent configuration that is present but wrong or outdated loads the `repair`
  skill, and a request to set a repository up, add missing guidance, only report what is wrong, or rebuild a bridge
  does not.

### Diagnosing

- **R2** (UC2, E1) The run runs the `doctor` command against the repository, and every finding it acts on comes from
  that command's output; it checks no file for a fault the command did not report.
- **R3** (UC2, E2) When `doctor` reports no finding, the report states that `doctor` ran and found nothing to repair,
  and no file in the repository changes.
- **R4** (UC2, E3) When `doctor` reports two findings at one path under different fault names, each is acted on with
  the correction for its own fault, and neither with the other's.

### Handing on

- **R5** (UC2, E4) For a finding whose fault has no entry in the correction reference, the report passes on the repair
  `doctor` stated for it unchanged, offers no correction, and no file changes for it.
- **R6** (UC2, E5) For an out-of-remit finding whose repair names `init-buddy-agent-harness` or the `init` command,
  the report hands it to the `init-buddy-agent-harness` skill, the run does not run `init`, and the bridge or
  instruction file it names is unchanged.
- **R7** (UC2, E6) For an out-of-remit finding whose repair names no skill, the report states it as work for a person
  and names no skill as its owner.
- **R9** (UC2, E7) For a global-instructions finding, the report gives the user the step `doctor` stated, unchanged,
  and the user-scope file it names is unchanged, whatever the owner answers.

### Material content

- **R10** (UC2, E9) For a skill whose frontmatter has no description, the report states that the skill's author must
  write one, and no description is added to the file.

### Offering

- **R11** (UC3, E12) An offer shows the actual file as it stands and as it would read, not a summary of the change.
- **R12** (UC3, E11) For an `AGENTS.local.md` that no harness reads, the offer lists every correction the correction
  reference gives for that fault, and the file is unchanged until the owner names one.
- **R13** (UC3, E12) For a retired harness's skills projection, the offer shows what will be deleted and what will
  remain, and the approved correction deletes the projection and creates none under the replacing harness's name.
- **R14** (UC3, E12) For a `.gitignore` rule that ignores a bridge, the offer shows the rule as it stands and as it
  would read.
- **R15** (UC3, E12) For a harness missing a server the golden MCP set declares, or a field only the golden side
  changed, the offer shows the harness file as it stands beside what projection would write; the harness file is
  unchanged until approved, and the golden MCP set is unchanged.
- **R16** (UC3, E11) For a harness-side MCP change across several fields, each field is offered on its own; approving
  one imports that field alone into the golden MCP set, leaves the other fields there unchanged, and leaves the harness
  file unchanged.

- **R26** (UC3, E10, E11, E12) For a skills copy drifted from the canonical skills directory, in any divergence
  direction, the correction is offered, not reported as material or handed to `init-buddy-agent-harness`; the offer
  shows each file the sync would write and the side it takes, and the approved correction performs the sync.
- **R27** (UC3, E12, E14) For a tracked, in-sync skills copy that lost its skip-worktree protection, the offer names
  the paths the protection would be set on, and the approved correction sets it on exactly those paths and changes no
  file's content.

### Applying

- **R17** (UC3, E13, E14) No file changes for a correction the owner has not approved, and the run offers no way to apply
  a correction without approval.
- **R18** (UC3, E13) When the owner declines a correction, its files are unchanged, the report records the finding as
  declined, and the other findings are still offered.
- **R19** (UC3, E14) An approved correction changes only what it showed; every other line of the file is unchanged,
  and of several offered corrections only the approved ones are written.
- **R20** (UC3, E14) The approved correction for a description that breaks its own frontmatter quotes the value and
  leaves the description's text unchanged.
- **R21** (UC2, E15) After applying an approved correction, the run runs `doctor` a second time.
- **R22** (UC2, E16) When the second run still reports the finding, the report states it is still open.
- **R23** (UC2, E17) When the second run no longer reports the finding, the report records it as corrected.

### Scope

- **R24** (UC2, E14) A run changes no file outside the repository's agent configuration: a workflow file naming a
  retired harness is unchanged after its projection is corrected.

### Report

- **R25** (UC4, E2, E5, E6, E7, E9, E13, E16, E17) The report has one row per finding `doctor` reported, each naming its
  path, what was wrong, and its outcome, with each kind of outcome told apart from the others.

## Open questions

- **Q1** The shipped `SKILL.md` has no `## Done when` list, so R1 to R27 have no counterpart in the skill for an eval
  run to agree with.
  - Options: (a) add a Done when list to the shipped skill drawn from these criteria; (b) leave the skill as is and
    run evals from this spec alone.
  - Recommendation: (a).
- **Q2** Activation. The v1 spec left firing unasserted, because which of four skills a request reaches is co-owned
  by their descriptions. This spec states it as R1, per the skill-spec format.
  - Options: (a) keep R1 and check it with trigger evals that include the near misses of UC1.1; (b) drop R1 and
    keep activation out of scope as v1 did.
  - Recommendation: (a). The near misses are each a sibling skill's own job, so the check is cheap to write.
- **Q3** The shipped skill's list of outcomes names corrected, declined, handed to `init`, reported as material, and
  still open. It has no word for work for a person or a step for the user, which the v1 spec decided (K10).
  - Options: (a) add both outcomes to the shipped skill's report step; (b) fold them into one outcome, handed on.
  - Recommendation: (a). The two need different actors to act.
- **Q4** The shipped correction reference states conduct the v1 spec does not: never read out or repeat a literal
  MCP credential, report a server projection refuses with its reason, and write by hand the entries the MCP commands
  will not edit.
  - Options: (a) add a criterion for each; (b) add only the credential rule, the one whose failure leaks a secret;
    (c) leave them to the reference.
  - Recommendation: (b).

## References

- [detect-and-repair](../detect-and-repair/README.md): the home of which surface owns each finding's repair, and why
  routing reads the fault name only.
- [configuration-diagnosis](../configuration-diagnosis/README.md) and [mcp-diagnosis](../mcp-diagnosis/README.md):
  what each fault in remit means.
- [mcp-projection](../mcp-projection/README.md) and [mcp-reconcile](../mcp-reconcile/README.md): the commands that work
  out an MCP correction.
- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): the material discriminator this skill shares, and
  the owner of bridges and instructions.
- [harness-init](../harness-init/README.md): the home of the sync this skill performs for a drifted skills copy.
- [bridge-resolution](../bridge-resolution/README.md): what each skills-bridge fault in remit means, and its repair.
- [enhance](../enhance/README.md): the same offer-and-approve shape, for guidance that is missing.
