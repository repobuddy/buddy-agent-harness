# repair

The `repair` skill corrects agent configuration a repository has that is present but wrong, writing only what the
owner approves.

## What

A repository's agent configuration can be present and still wrong: a harness name the registry retired, a
`.gitignore` rule that swallows a bridge, an `AGENTS.local.md` no harness reads, a skill a harness refuses to load,
a skills copy that drifted from `.agents/skills` or lacks the protection that keeps it out of commits, or an MCP server
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
- **K13 outcome**: what became of one finding in a run: corrected, declined, still open, reported as material, handed
  to `init-buddy-agent-harness`, needs your decision (no skill owns it, and someone must judge it), or for you to do
  outside the repo (a step in the user's home directory). Each is told apart from the others.
- **K11 sync**: the file-by-file merge of a drifted skills copy with the canonical skills directory, as
  [harness-init](../harness-init/README.md) R36 to R40 state it.
- **K14 copy protection**: see [bridge-resolution](../bridge-resolution/README.md) K9.

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
  "Cursor won't load one of my skills, can you fix it", or "sync the `.claude/skills` copy that drifted from
  `.agents/skills`".
- **Entry node**: `Start`
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:repair`, or the skill's description matched by the harness.
- **Inputs**: the request.
- **Success**: the agent loads this skill.
- **Extensions**:
  - UC1.2 The request is to set the repository up, add missing guidance, only report what is wrong, or rebuild or
    replace a bridge: it belongs to another skill (N12, N4, N6), and this skill does not load.

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
  - UC2.3 The repair handed on names no skill: it needs the owner's decision, and no owner skill is inferred.
  - UC2.4 The repair handed on is a step in the user's home directory: it is given to the user to do outside the repo,
    and nothing outside the repository is written.
  - UC2.5 The correction would write material content: it is reported, and no write is offered.
  - UC2.6 Two findings sit at one path: each is acted on with the repair of its own fault.
  - UC2.7 The correction does not hold on the re-run: the finding is reported still open.
  - UC2.8 Projection refuses a golden MCP server for a target: the refusal is reported with its reason, and no write
    of that server is offered.

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
  - UC3.7 A tracked skills copy lacks copy protection: putting it in place is offered.
  - UC3.8 The MCP commands return a hand edit for a server: it is offered, and on approval applied by hand.

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

R28 is checked by trigger evals whose near misses include each request UC1.2 names.

- **R28** (UC1, UC1.2, E1) A request to correct agent configuration that is present but wrong or outdated, including a
  request to sync a skills copy bridge that drifted from `.agents/skills`, loads the `repair` skill; a request to set
  a repository up, add missing guidance, only report what is wrong, or rebuild or replace a bridge does not.

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
- **R31** (UC2.3, E6) For an out-of-remit finding whose repair names no skill, the report gives it the outcome needs
  your decision and names no skill as its owner.
- **R32** (UC2.4, E7) For a global-instructions finding, the report gives it the outcome for you to do outside the
  repo, with the step `doctor` stated, unchanged, and the user-scope file it names is unchanged, whatever the owner
  answers.

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
- **R35** (UC3.7, E12, E14) For a tracked, in-sync skills copy that lacks copy protection, the offer names the
  copy's tracked paths and its bridge path, and the approved correction puts both parts of copy protection in place
  for exactly that copy and changes no file's content.
- **R29** (UC2, UC3, E3, E12) No offer, report, or other output of the run reads out or repeats a literal MCP
  credential's value, or any part of it.
- **R30** (UC2.8, E12) For a golden MCP server that projection refuses for a target, the report names the server, the
  target, and the reason the projection gave, and offers no write of that server to that target.

### Applying

- **R17** (UC3, E13, E14) No file changes for a correction the owner has not approved, and the run offers no way to apply
  a correction without approval.
- **R18** (UC3, E13) When the owner declines a correction, its files are unchanged, the report records the finding as
  declined, and the other findings are still offered.
- **R19** (UC3, E14) An approved correction changes only what it showed; every other line of the file is unchanged,
  and of several offered corrections only the approved ones are written.
- **R20** (UC3, E14) The approved correction for a description that breaks its own frontmatter quotes the value and
  leaves the description's text unchanged.
- **R34** (UC3.8, E14) An approved hand edit the MCP commands returned is applied with only that server's entry
  changed, and every other byte of the file, comments included, unchanged.
- **R21** (UC2, E15) After applying an approved correction, the run runs `doctor` a second time.
- **R22** (UC2, E16) When the second run still reports the finding, the report states it is still open.
- **R23** (UC2, E17) When the second run no longer reports the finding, the report records it as corrected.

### Scope

- **R24** (UC2, E14) A run changes no file outside the repository's agent configuration: a workflow file naming a
  retired harness is unchanged after its projection is corrected.

### Report

- **R33** (UC4, E2, E5, E6, E7, E9, E13, E16, E17) The report has one row per finding `doctor` reported, each naming
  its path, what was wrong, and its outcome, with each kind of outcome told apart from the others, needs your
  decision and for you to do outside the repo included.

## Open questions

None.

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
