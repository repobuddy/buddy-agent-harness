# retro

The `retro` skill turns what happened in a repository's agent sessions into owner-approved changes to its agent setup.

## What

A repository owner corrects their agents in use: the same wrong command, the same missed file, the same rule restated
by hand. Nothing carries the correction into the next session, so the friction repeats. Where something does carry
it, it is usually an agent writing each lesson straight into `AGENTS.md`, which then grows with every episode, costs
every turn, and keeps lessons the code has since outgrown.

The `retro` skill runs a retrospective: after the fact, it reads what the repository's sessions already recorded and
what agents left for it, draws candidate lessons from that, and challenges each against the repository as it stands,
dropping what is resolved, covered, or not needed. It proposes each survivor on its own, in the cheapest form that
would stop the friction recurring, with the evidence and the reason, and writes only what the owner approves. It keeps
a local record of every decision, so a later run can tell whether an accepted change worked and does not raise a
rejected one again. It also proposes removing guidance a check now enforces or the code no longer supports.

It decides when a retrospective is due, from the owner's setting and its record of the last run, so an agent finishing
a task can say so or offer to start one, at the pace the owner set and not more.

## Non-goals

- **N1 Capturing sessions as they happen.** The skill installs no hook and reads only what a harness or the project
  already records, after the fact.
- **N2 Applying a change without the owner's word on that change.** No run, attended or not, writes a change to the
  agent setup that the owner has not approved on its own.
- **N3 Telling an agent when to check whether a retrospective is due.** That instruction is the Retrospectives
  addition of [`enhance`](../enhance/README.md) (its N14, R91); this skill answers the check.
- **N4 Committing the decision record.** It stays local and untracked, because it holds paraphrase of private
  sessions.
- **N5 Fixing the work a session got wrong.** A defect in the product is not a lesson about the agent setup; the run
  changes only what guides later sessions.
- **N6 A session reader for other tools.** Reading each harness's record is this skill's own; a shared reader is out
  of scope.
- **N7 Scheduling through a harness's built-in scheduler**, such as an in-session loop or a cloud task. Those see no
  local session record or expire with the session.

## Key terms

- **K1 harness**: see [glossary](../glossary.md#harness).
- **K2 agent setup**: what guides the repository's agents: its instruction files, skills, deterministic checks (lint
  rules, tests, CI jobs), standards a reviewer reads, and docs the agent reads.
- **K3 session record**: what is already recorded of past agent work in the repository without a hook: a harness's
  transcripts and built-in memories of sessions run in it, and the project's own work log where it keeps one, such as
  merged pull requests with their review threads.
- **K4 learnings inbox**: where an agent leaves a lesson it notices during a session, with its evidence, for the next
  retrospective. It is read as input and never loaded as instructions.
- **K5 candidate**: a lesson drawn from the session record or the learnings inbox, with the evidence it rests on.
- **K6 challenge**: checking a candidate against the repository as it stands and dropping it when the friction is
  already resolved, the agent setup already covers it, or nothing would change if it were left out.
- **K7 durable form**: where a lesson is kept, in this order from cheapest: a deterministic check; a standard only the
  reviewer reads; a pointer in a file the agent already reads; a skill or script for a workflow repeated by hand; an
  always-loaded instruction line with its reason. Deletion is the form for guidance a check now covers or the code no
  longer supports.
- **K8 cheapest durable form**: the earliest durable form in K7's order that would stop the candidate's friction
  recurring.
- **K9 proposal**: a candidate put to the owner with its durable form, the change it would make, its evidence, and its
  reason.
- **K10 signal**: what a later run should see in the session record or the repository if an accepted change worked.
- **K11 decision record**: the skill's local, untracked record for one repository, shared by all its worktrees: each
  proposal's decision (accepted with its signal, rejected with its reason), the proposals an unattended run left, and
  when the last retrospective ran.
- **K12 waiting proposal**: a proposal an unattended run left in the decision record that has not yet been put to the
  owner.
- **K13 retro setting**: the owner's choice of mode and frequency. Mode is one of off (never say a retrospective is
  due), remind (say so), or offer (offer to start one); frequency is a number of days.
- **K14 due**: the retro setting's mode is not off, no opt-out is set in the environment, and either no retrospective
  has run in the repository or the frequency has passed since the last one.
- **K15 unattended run**: a run with no user to answer, such as a headless or scheduled invocation.
- **K16 recurrence**: the number of separate sessions or inbox entries that show the same friction.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | repository owner | friction my agents keep hitting stops recurring, through changes I approve one at a time |
| A1.2 | repository owner | nothing in my agent setup changes without my word on that change |
| A1.3 | repository owner | I hear that a retrospective is due at the pace I set, and not otherwise |
| A1.4 | repository owner | my always-loaded instructions stay lean: lessons go to cheaper forms first, and outgrown guidance goes |
| A1.5 | repository owner | a retrospective that has nothing to teach costs me no decisions |
| A2.1 | invoking agent | propose only what the record and the current repository support, never a guess |
| A3.1 | agent finishing a task | learn whether a retrospective is due and what to do about it |
| A3.2 | agent in a session | leave a lesson I notice for the next retrospective instead of writing it into the setup myself |
| A4.1 | downstream agent | the setup I load is correct, and grows only by changes that worked |
| A5.1 | team member | the shared setup changes only by reviewable edits, and no paraphrase of anyone's session is committed |
| A6.1 | scheduler | run a retrospective with no user and leave its proposals for the owner |

## Use cases

The decision graph is in [graph.md](./graph.md).

### UC1 — Run a retrospective (A1.1, A1.2, A1.4, A1.5, A2.1, A4.1, A5.1)

- **Trigger**: the owner asks for a retrospective, such as "run a retro", "what should my agents have learned this
  week?", or "turn these corrections into rules", or accepts an offer from UC3.
- **Entry node**: `start`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:retro`.
  - Skill: the offer a due check makes (UC3).
- **Inputs**: the session record since the last retrospective, the learnings inbox, the decision record, and the
  repository as it stands.
- **Success**: every candidate that survives challenge is proposed on its own in its cheapest durable form; each
  approved proposal is written; every decision is in the decision record with its signal or reason; the last run is
  recorded; the report says what was read, dropped, proposed, and written.
- **Extensions**:
  - UC1.1 A harness's session record cannot be read, or its format is not recognized: named as not read; the run goes
    on with the other sources.
  - UC1.2 No source holds anything since the last retrospective: a complete run with no proposals.
  - UC1.3 Every candidate is dropped by challenge: a complete run with no proposals.
  - UC1.4 A candidate matches an earlier rejection and no evidence is newer than that rejection: not proposed.
  - UC1.5 A candidate's friction appears once: not proposed as an always-loaded line.
  - UC1.6 An earlier accepted change's signal shows it did not work: proposed for revert or replacement.
  - UC1.7 Waiting proposals exist: put to the owner before new candidates.
  - UC1.8 The owner declines a proposal: nothing written, the rejection recorded with its reason.
  - UC1.9 The owner does not answer a proposal: nothing written, nothing recorded as a decision.
  - UC1.10 The run is not inside a git repository: stops and reports.

### UC2 — Prune outgrown guidance (A1.4, A4.1)

- **Trigger**: a retrospective runs (UC1).
- **Entry node**: `prune`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:retro`, as part of each run.
- **Inputs**: the repository's instruction files and the standards a reviewer reads, its checks, and its code.
- **Success**: each instruction that a check now enforces, or that the code contradicts, is proposed for deletion on
  its own, with the check or the code that shows it.
- **Extensions**:
  - UC2.1 Nothing is outgrown: no deletion proposed.
  - UC2.2 The owner declines a deletion: the instruction is kept and the rejection recorded with its reason.

### UC3 — Decide whether a retrospective is due (A1.3, A3.1)

- **Trigger**: an agent finishing a task for the user checks, as the Retrospectives addition directs, whether a
  retrospective is due.
- **Entry node**: `due`.
- **Entry points**:
  - Skill (primary): the due check of `/buddy-agent-harness:retro`.
- **Inputs**: the retro setting, the environment's opt-out, the decision record's last run and waiting proposals, and
  whether this session already heard that one is due.
- **Success**: the agent learns one of: nothing to say, say that a retrospective is due, or offer to start one; and
  does that.
- **Extensions**:
  - UC3.1 Mode off, or the opt-out set: nothing said.
  - UC3.2 Not due: nothing said.
  - UC3.3 Waiting proposals exist: the agent names them instead of a new retrospective.
  - UC3.4 This session already heard it is due: nothing said again.
  - UC3.5 No user in the run: nothing said.
  - UC3.6 The retro setting cannot be read or holds an invalid value: the default applies and the agent says so.

### UC4 — Change the retro setting (A1.3)

- **Trigger**: the owner asks to change how often, or whether, a retrospective is raised, such as "stop reminding me
  about retros" or "offer a retro every two weeks".
- **Entry node**: `set`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:retro`.
- **Inputs**: the requested mode or frequency.
- **Success**: the setting is stored and the next due check uses it.
- **Extensions**:
  - UC4.1 The value is not a mode or not a positive number of days: refused, the setting unchanged.

### UC5 — Leave a lesson for the next retrospective (A3.2)

- **Trigger**: an agent notices, during a session, a lesson about the agent setup, as the Retrospectives addition
  directs it to leave one rather than write it into the setup.
- **Entry node**: `inbox`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:retro`, asked to note a lesson.
- **Inputs**: the lesson and its evidence.
- **Success**: the lesson is in the learnings inbox, and the next retrospective reads it as a candidate.
- **Extensions**: none, because leaving a lesson changes no setup and needs no decision.

### UC6 — Run a retrospective with no user (A6.1, A1.2)

- **Trigger**: the skill is invoked in an unattended run.
- **Entry node**: `start`.
- **Entry points**:
  - Headless (primary): a harness's non-interactive mode invoking `/buddy-agent-harness:retro`.
- **Inputs**: as UC1.
- **Success**: every candidate that survives challenge is left as a waiting proposal; nothing in the agent setup is
  written and no decision is recorded.
- **Extensions**:
  - UC6.1 Waiting proposals from an earlier run are still unreviewed: the run is skipped.

## Criteria

**How these criteria are verified.** Every criterion is checked by an eval run of the skill against a fixture
repository with a prepared session record, learnings inbox, and decision record.

### Reading (UC1)

- **R1** A run outside a git repository writes nothing, proposes nothing, and says why it stopped. (UC1.10, E1)
- **R2** A run reads the session record of each harness it can read, limited to sessions in this repository since the
  last retrospective in the decision record, or to every recorded session where no retrospective has run. (UC1, E2)
- **R3** A run reads every entry of the learnings inbox as a candidate, and an entry the run proposed, or dropped, is
  not read as a candidate by a later run. (UC1, E2)
- **R4** A run whose harness's session record cannot be read, or is in a format it does not recognize, names that
  harness as not read in its report and still reads every other source. (UC1.1, E2)
- **R5** A run that finds nothing in any source since the last retrospective proposes nothing, records the run, and
  reports that it found nothing to learn from. (UC1.2, E3)

### Grading earlier changes (UC1)

- **R6** A run checks each change accepted in an earlier run against its signal, and reports for each whether the
  signal was seen, was contradicted, or cannot be told yet. (UC1, E4)
- **R7** An accepted change whose signal is contradicted by sessions after it was written is proposed for revert or
  replacement, with those sessions as evidence. (UC1.6, E5)

### Challenge (UC1)

- **R8** A candidate whose friction the repository no longer shows, which the agent setup already covers, or whose
  change would alter nothing a later session does, is not proposed, and the report counts it among the dropped with
  the reason. (UC1.3, E7)
- **R9** A candidate that matches a rejection in the decision record is not proposed unless the session record holds
  evidence of that friction dated after the rejection. (UC1.4, E8)
- **R10** A candidate whose recurrence is one is never proposed as an always-loaded instruction line. (UC1.5, E10)
- **R11** A run in which every candidate is dropped puts no proposal to the owner, records the run, and reports it as
  complete. (UC1.3, E7)

### Proposing (UC1, UC2)

- **R12** Each proposal is put on its own, and the owner's answer to one writes or withholds that one only. (UC1, E6)
- **R13** Each proposal names its durable form, the change it would make, the sessions or inbox entries it rests on,
  its recurrence, and why no cheaper durable form would stop the friction. (UC1, E10)
- **R14** A proposal in the always-loaded form carries the line's reason beside the line in the change it would make.
  (UC1, E10)
- **R15** A proposal changes the agent setup by an itemized edit of named lines, never a rewrite of a whole file.
  (UC1, E10)
- **R16** Waiting proposals are put to the owner before any candidate the current run drew. (UC1.7, E6)
- **R17** No proposal changes a file outside the agent setup. (UC1, E10)

### Writing and recording (UC1, UC2)

- **R18** An approved proposal is written as proposed and recorded in the decision record as accepted, with its
  signal. (UC1, E12)
- **R19** A declined proposal writes nothing and is recorded as rejected, with the reason the owner gave or, where
  they gave none, that they gave none. (UC1.8, UC2.2, E13)
- **R20** An unanswered proposal writes nothing and is recorded as no decision, so a later run may propose it again.
  (UC1.9, E14)
- **R21** The decision record lives outside every tracked file of the repository, is never staged or committed by a
  run, and is the same record from every worktree of the repository. (UC1, E12)
- **R22** Every run that reaches its report records when it ran, whether or not it proposed anything. (UC1, E3, E12,
  E13, E14)
- **R23** A run's report names the sources read and not read, the earlier changes graded, the candidates dropped and
  why, each proposal and its decision, and each file written, or says nothing was written. (UC1, E3, E12, E13, E14)

### Pruning (UC2)

- **R24** An instruction line, in an instruction file or a standard a reviewer reads, whose rule a check in the
  repository now enforces is proposed for deletion, with that check named. (UC2, E16)
- **R25** An instruction line that the repository's code contradicts, such as one naming a file or command that no
  longer exists, is proposed for deletion, with what contradicts it named. (UC2, E16)
- **R26** A run that finds no outgrown guidance proposes no deletion. (UC2.1, E17)

### Due check (UC3)

- **R27** A due check in a run with no user says nothing. (UC3.5, E20)
- **R28** A due check where the mode is off, or the environment's opt-out is set, says nothing. (UC3.1, E21)
- **R29** A due check where the frequency has not passed since the last retrospective says nothing. (UC3.2, E24)
- **R30** A due check where no retrospective has ever run in the repository, and the mode is not off, treats one as
  due. (UC3, E25)
- **R31** A due check where waiting proposals exist and the mode is not off names how many wait, instead of saying a
  new retrospective is due; in offer mode it also offers to put them. (UC3.3, E23)
- **R32** A due check, with a retrospective due, in remind mode tells the user one is due and how to start it, and
  starts nothing. (UC3, E27)
- **R33** A due check, with a retrospective due, in offer mode offers to start one, and starts it only on a yes.
  (UC3, E28)
- **R34** A session in which the user has already been told a retrospective is due, or offered one, hears nothing
  further about it from a later due check in that session. (UC3.4, E26)
- **R35** A due check whose retro setting cannot be read, or holds an invalid value, applies the default mode and
  frequency and says that it did. (UC3.6, E22)
- **R36** A due check writes nothing. (UC3, E20)

### Retro setting (UC4)

- **R37** A retro setting the owner sets is the one the next due check uses. (UC4, E30)
- **R38** A requested mode other than the three of the retro setting, or a frequency that is not a positive whole
  number of days, is refused and leaves the setting unchanged. (UC4.1, E31)
- **R39** Where the owner has set no retro setting, the mode is remind and the frequency is 7 days. (UC4, E32)

### Learnings inbox (UC5)

- **R40** A lesson left for the next retrospective is added to the learnings inbox with its evidence, and nothing in
  the agent setup is written. (UC5, E33)
- **R41** The learnings inbox is never loaded into a session as instructions. (UC5, E33)

### Unattended (UC6)

- **R42** An unattended run leaves each candidate that survives challenge as a waiting proposal, writes nothing in the
  agent setup, and records no decision. (UC6, E18)
- **R43** An unattended run that finds waiting proposals from an earlier run still unreviewed reads nothing, proposes
  nothing, and records that it skipped. (UC6.1, E19)

## Open questions

Each question lists its options and a recommendation. The criteria above follow the recommendation, except under Q6
and Q7, where they follow O1; any other answer rewrites the criteria named.

- **Q1 Where the retro setting lives.** O1: user-local only. O2: a checked-in repository default, overridden by a
  user-local value. O3: checked-in only. Recommend O2, as the research table suggests: a team shares a pace, a person
  can mute it. Affects K13, R37, R39, and adds a criterion for the precedence.
- **Q2 Where the decision record and the learnings inbox live.** The record is settled local and untracked (N4). O1:
  under the main checkout's git directory, which is local, untracked, and shared by every worktree with no ignore
  entry. O2: a gitignored folder in the main checkout, as `/ce-retro` does. O3: a per-user folder outside the
  repository, keyed by repository. Recommend O1; the location itself is a lower-rung encoding, so the spec keeps only
  R21's properties. Separately, whether the inbox is local with the record (recommended: it holds session paraphrase)
  or tracked so it survives other machines. Affects K4, K11, R21, R41.
- **Q3 Which harnesses' session records are read.** O1: Claude Code, Codex, and Gemini CLI transcripts, whose paths
  are documented, plus merged pull requests and review threads through the forge CLI where one is set up; Cursor and
  Copilot CLI through the learnings inbox until their paths are verified. O2: every harness of
  [`global-instructions`](../global-instructions/README.md), with an unrecognized format reported (R4). O3: the
  harness in use only. Recommend O1. The list is a design choice, so it would become a criterion (or a table under
  Key terms).
- **Q4 Whether an installer for an operating-system scheduler is in scope.** O1: out of scope: a non-goal, and UC6
  stays for a scheduler the owner sets up. O2: a use case that installs and removes a cron, systemd, launchd, or
  Task Scheduler entry running a headless retro with a cost cap. Recommend O1 for the first version: no harness's
  headless mode reads cost caps and approvals the same way, and the research marks scheduling opt-in.
- **Q5 When the prune pass runs.** O1: in every retrospective (as drafted, UC2). O2: only when asked. O3: every Nth
  retrospective. Recommend O1, limited to instruction lines and standards (R24, R25), since a stale line costs every
  turn.
- **Q6 The first due check.** R30 treats a repository with no recorded retrospective as due, so the first task after
  installing raises one. O1: keep it. O2: start the clock at the first due check, so the first is raised one
  frequency later. Recommend O2, so installing the addition does not raise a retrospective with little to read.
- **Q7 Declining an offer or a reminder.** R34 silences only the rest of the session; the next session raises it
  again until a retrospective runs. O1: keep it. O2: a decline defers the next raise by the frequency, which needs the
  decision record to hold the last raise. Recommend O2, as update-notifier waits an interval after notifying.
- **Q8 A candidate that changes a skill.** O1: proposed like any other. O2: proposed with the skill's eval named as
  its gate, and accepted only after that eval shows no criterion worse, as the research's verdict 11 does for
  `/skill enhance`. Recommend O2 where the repository has an eval for that skill, O1 where it has none.
- **Q9 A lesson about how the agent works in every repository**, such as one that belongs in the owner's global
  instruction file. O1: proposed into the repository like any other. O2: handed over with the global instruction file
  named, never written. O3: proposed for the global instruction file and written there on approval, as
  [`enhance`](../enhance/README.md) does. Recommend O2: this skill's write scope stays the repository (R17).
- **Q10 Whether this is one spec or a parent with children.** The due check (UC3, UC4) and the retrospective (UC1,
  UC2, UC5, UC6) change for different reasons and are read by different tasks. Recommend keeping one spec until the
  questions above settle, then splitting into `due` and `retrospective` children if most tasks need less than half.
- **Q11 Enhance's R91 and this spec's UC3.** R91 has the agent skip the due check in a run with no user; R27 also
  says nothing there. Both are kept, so a check reached by another path stays silent. No change to `enhance` is
  needed unless the Council wants one home for that rule.

## References

- [`enhance`](../enhance/README.md): the sibling spec whose Retrospectives addition sends an agent here (its N14, K19,
  R88 to R92).
- Rationale and sources: the research topic
  [agent-self-improvement](../../../../../.research/agent-self-improvement/conclusion.md), verdict items 1 to 12 and
  its reference tables.
- [`global-instructions`](../global-instructions/README.md): the harnesses this package knows by their user-scope
  files.
