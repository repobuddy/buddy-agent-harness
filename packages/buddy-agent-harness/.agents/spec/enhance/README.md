# enhance

The `enhance` skill puts to the owner each vetted section a repository's agent configuration lacks, or carries in a
retired form.

## What

A repository owner who has run `init` has an `AGENTS.md` that holds only what the repository already had. `init`
invents nothing, so it never adds guidance the repository lacks. And when this package revises the wording of a
section the owner took earlier, nothing tells the owner: every later agent session keeps reading the superseded
instruction until someone notices.

The `enhance` skill is the opinionated half that `init` leaves out. For each vetted section this package ships, it
decides whether the repository lacks it, already carries it, covers it in the owner's own words, or carries a wording
this package has retired. It offers the missing section, offers the current wording in place of a retired one, and
asks the owner where it cannot tell whose words a section is. It writes only what the owner approves, and every run
ends in a report of what it read, judged, offered, and wrote.

Where a section goes is part of what is offered. A section about how the agent works belongs in the owner's own
global instruction file, written once for every repository, not copied into each one. And text the owner's agent
already loads from outside the repository is not offered again, because loading the same text twice is a cost.

## Non-goals

- **N1 Consolidating harness instruction files.** The skill reads them and moves none. Consolidation is
  [`init-buddy-agent-harness`](../init-buddy-agent-harness/README.md)'s.
- **N2 Creating an `AGENTS.md`.** A repository without one is reported and left alone; creating it is
  [`init-buddy-agent-harness`](../init-buddy-agent-harness/README.md)'s.
- **N3 Correcting agent configuration that is present and wrong.** That is [`repair`](../repair/README.md)'s. A
  section in a retired wording is not a fault in the repository; this package's wording moved.
- **N4 Diagnosing the repository.** Reporting what is wrong, including whether a harness loads the global
  instruction file and whether agent worktrees are accounted for, is `doctor`'s
  ([`global-instructions`](../global-instructions/README.md), [`worktree-diagnosis`](../worktree-diagnosis/README.md)).
  This skill reads that report and does not repeat the check.
- **N5 The wording of the Delegation section.** It was settled by blind A/B evaluation and is owned by the
  repository's `eval-delegation` skill. This spec says when that text is offered, never what it says.
- **N6 The exact wording of the List identifiers section.** It is scored by the repository's `eval-list-identifiers`
  skill. This spec owns only what that text must direct (R71).
- **N7 Adapting an addition's text to a repository.** The text is offered as written or not at all.
- **N12 Anything outside local agent configuration.** Workflows, repository settings, and project source are out of
  reach whatever a run finds in them.
- **N13 Claude Code's agent-worktree settings.** Offering and writing them is
  [`agent-worktree-settings`](../agent-worktree-settings/README.md)'s, delivered by `init-buddy-agent-harness`
  alone. Where agents create worktrees is guidance, not a setting, and is this skill's Agent worktrees addition.
- **N11 Writing a harness's own user-scope instruction file**, such as `~/.claude/CLAUDE.md`. A step that changes one
  is handed over. Of the files outside the repository, only the global instruction file is ever written.
- **N9 Deciding activation.** Which shipped skill a request reaches is co-owned by the four skill descriptions and the
  harness that matches them.
- **N10 Remembering earlier runs.** The skill keeps no record of what it offered or what was declined; the
  repository's current state is the whole input.
- **N14 Running a retrospective.** Reading what happened in use, keeping a learnings inbox, challenging each
  candidate lesson, proposing it in its cheapest durable form, keeping the decision record, and deciding when a
  retrospective is due are the [`retro`](../retro/README.md) skill's, and so is scheduling a run outside a session.
  The Retrospectives addition only tells the agent when to check and where to turn.

## Key terms

- **K1 canonical instructions**: see [glossary](../glossary.md#canonical-instructions).
- **K2 harness**: see [glossary](../glossary.md#harness).
- **K3 harness in use**: the harness the skill is running in.
- **K4 addition**: a named section of instruction text this skill can offer. Each addition ships with its current
  text, what counts as its subject already being covered, where it belongs, and every wording it has retired. Six
  ship today: Delegation, List identifiers, Session scope, References as links, Agent worktrees, and Retrospectives. Each is judged, offered, and
  reported on its own.
- **K5 current text**: the text an addition offers now.
- **K6 retired wording**: a text an addition used to offer, kept byte-identical after a revision replaced it.
- **K7 destination**: the instruction file an addition's text belongs in, declared by the addition: the root
  `AGENTS.md` for a section about the repository, the global instruction file for one about how the agent works. All
  six shipped additions are the second kind.
- **K8 global instruction file**: `~/.agents/AGENTS.md`, the user-scope counterpart of the root `AGENTS.md`. A harness
  reads it only where a user-scope instruction file of its own loads it.
- **K9 global instructions**: the instructions the agent loads from outside the repository, other than the
  repository's own files and another repository's instructions loaded from the working directory.
- **K10 merged view**: the root `AGENTS.md` together with every harness instruction file in the repository whose
  content still belongs in it. It never includes the global instructions.
- **K11 covered**: the merged view already tells the agent what an addition would, judged by meaning, under any
  heading. Text inside a fenced code block is an example, not instruction, and covers nothing.
- **K12 carries the current text**: a text holds every sentence of the current text, in order, with the owner's own
  paragraphs allowed around and between them, and asserts no sentence found only in a retired wording.
- **K13 the two provenance questions**: asked of a section against a retired wording, or against the current text
  where the addition has no retired wording: (a) does a whole sentence of that wording survive verbatim, and (b) does
  that wording's structure survive, its sentences in its order, each doing its job. A sentence inside quotation
  marks, inside a fence, or inside a sentence disputing it does not survive. An answer that cannot be told is no.
- **K14 verdicts**: each addition gets exactly one. **already global**: not covered, and the global instructions
  carry the current text. **absent**: not covered, and the global instructions do not cover the subject.
  **already current**: covered by a section that carries the current text. **from a retired wording**: both
  provenance questions answer yes. **the owner's own**: both answer no. **cannot place**: the two answers disagree.
  **not judged**: the run stopped before judging.
- **K15 global copy**: a section on an addition's subject in the global instructions. It is given a verdict the way a
  repository section is.
- **K16 managed region**: the marked block [`init-buddy-agent-harness`](../init-buddy-agent-harness/README.md)
  maintains for its own bookkeeping.
- **K17 scoring harness**: an evaluation the repository has for one addition's wording, which scores two wordings
  against a fixed set of tasks. A harness for one addition does not score another.
- **K18 hand over**: give the owner a text or a step and the file it belongs in, without writing that file. A hand-over
  is an outcome, not a decline.
- **K19 retrospective**: a run of the [`retro`](../retro/README.md) skill (N14). That skill decides whether a
  retrospective is due, and what the agent does when one is: say so, offer to start it, or nothing. It decides from the
  owner's setting and its own record of the last run.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | repository owner | the vetted guidance my agents lack, or carry in a retired wording, is put to me |
| A1.2 | repository owner | nothing is added to my files, and nothing of mine is replaced or removed, without my word |
| A1.3 | repository owner | where it cannot be told whose a section is, I am asked, and can settle it by which wording serves better |
| A1.4 | repository owner | I am not asked to load text my agent already loads, and a retired copy outside the repository is refreshed too |
| A2.1 | invoking agent | give every addition one verdict from the texts themselves, never a guess |
| A3.1 | addition author | add or revise an addition and have repositories on an old wording told, not silently kept there |
| A4.1 | downstream agent | the guidance I load is the wording that serves me better, loaded once |
| A5.1 | team member | the repository's `AGENTS.md` keeps what the team's agents need, and loses it only on the owner's word |
| A6.1 | `init-buddy-agent-harness` skill | hand a freshly consolidated repository over so the sections it does not own are considered |

## Use cases

The decision graph is in [graph.md](./graph.md).

### UC1 — Offer the guidance a repository lacks (A1.1, A1.2, A2.1, A4.1, A6.1)

- **Trigger**: the owner asks to improve the repository's agent instructions, such as "what is my `AGENTS.md`
  missing?", "add the recommended guidance to AGENTS.md", or "enhance my agent setup", or accepts `init`'s offer to
  continue.
- **Entry node**: `start`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:enhance`, optionally naming a repository other than the working directory.
  - Skill: the offer at the end of `init-buddy-agent-harness`'s report.
- **Inputs**: the repository root, its merged view, the global instructions, the shipped additions, and `doctor`'s
  report on whether the harness in use loads the global instruction file.
- **Success**: every absent addition is offered verbatim with its recommended destination; the one the owner picks is
  written; the report gives every addition a verdict.
- **Extensions**:
  - UC1.1 No root `AGENTS.md`: the run stops and reports.
  - UC1.2 Harness instruction files still hold content bound for `AGENTS.md`: read into the merged view, left alone.
  - UC1.3 The subject is covered, by the owner's words, a thin line, or text the addition shipped: nothing offered.
  - UC1.4 The addition's heading appears only inside a fenced block: not covered.
  - UC1.5 The harness in use does not load the global instruction file, or cannot be checked.
  - UC1.6 The owner declines, or does not answer: nothing written.
  - UC1.7 The owner picks the global destination: written there, not in the repository.
  - UC1.8 A section approved on an earlier run was deleted: offered again.

### UC2 — Refresh a section carried in a retired wording (A1.1, A1.2, A3.1, A4.1, A5.1)

- **Trigger**: a run finds a covered addition whose section does not carry the current text.
- **Entry node**: `cur`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:enhance`.
- **Inputs**: the section as found, the current text, and the addition's retired wordings.
- **Success**: a section from a retired wording in the root `AGENTS.md` is offered the current text, and on approval
  that section alone is replaced.
- **Extensions**:
  - UC2.1 The section already carries the current text: nothing offered.
  - UC2.2 The section is the owner's own: nothing offered.
  - UC2.3 The section sits in a harness instruction file other than the root `AGENTS.md`: reported, not offered.
  - UC2.4 The section carries paragraphs the owner added: named before the owner answers.
  - UC2.5 The addition has no retired wording yet: its current text stands in.
  - UC2.6 The owner declines, or does not answer: nothing written.

### UC3 — Settle a section whose origin cannot be placed (A1.3, A2.1, A4.1)

- **Trigger**: the two provenance questions disagree about a section.
- **Entry node**: `harn`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:enhance`.
- **Inputs**: the section, the wording it partly tracks, the current text, and any scoring harness for that addition.
- **Success**: the owner answers, and the run acts on the answer: leaves the section, offers the replacement, or
  measures and acts on the scores.
- **Extensions**:
  - UC3.1 The repository has no scoring harness for that addition: measurement is not offered.
  - UC3.2 The owner does not answer: nothing written, no measurement run.
  - UC3.3 Measurement does not put the current text ahead: the section is kept.

### UC4 — Account for the guidance the owner already loads globally (A1.4, A4.1, A5.1)

- **Trigger**: the global instructions hold a section on an addition's subject.
- **Entry node**: `g0`.
- **Entry points**:
  - Skill (primary): `/buddy-agent-harness:enhance`.
- **Inputs**: the global instructions as the agent loads them, and the repository's verdict for the same addition.
- **Success**: no text is offered that the owner already loads; a retired global copy is refreshed; every global
  copy is named in the report.
- **Extensions**:
  - UC4.1 The owner asks for a team copy of an already-global addition: written.
  - UC4.2 The global copy cannot be placed: put to the owner.
  - UC4.3 The repository holds a retired wording and the global copy is current: removal is the other answer.
  - UC4.4 The repository holds the owner's own words and the global copy is current: nothing offered.
  - UC4.5 The global copy sits in a file this skill does not write: handed over.
  - UC4.6 The owner declines the replacement of a global copy, or does not answer: nothing written.

### UC6 — Ship or revise an addition (A3.1)

- **Trigger**: a maintainer of this package adds an addition or revises one's text.
- **Entry node**: `author`.
- **Entry points**:
  - Package source (primary): the addition's reference file and its store of retired wordings in the shipped skill.
- **Inputs**: the text to offer, what covers its subject, its destination, and the outgoing wording on a revision.
- **Success**: the addition can be judged and offered by a run, and a repository on the outgoing wording is offered
  the new one.
- **Extensions**:
  - UC6.1 The text names a model, vendor, or version: rejected.
  - UC6.2 A revision skips storing the outgoing wording: rejected, because repositories on it become unreachable.

## Criteria

**How the eval-checked criteria are verified.** Every criterion of UC1 to UC4 is checked by an eval run of the skill.
Such a run starts its simulated agent without the host's user-scope instructions; otherwise an absent addition reads
as already global on a host whose global file carries the text, and the verdict depends on the machine. A case that
says nothing of the global instructions runs with none covering the subject. Launch the agent with the repository's
blind launcher (References) from a directory outside any repository; it refuses a directory that would still inherit
instructions. A subagent does not qualify, since it inherits the host's user-scope instructions. On a host whose
user-scope instructions carry an addition's current text, a verdict from a subagent-dispatched simulation on a case
expecting that addition's offer does not count. UC6 criteria are checked by reading the shipped skill and the change
that revises an addition.

### Locating and reading (UC1)

- **R82** A run in a repository with no root `AGENTS.md` writes no file, offers no addition, says there is nothing
  to add to, points to `init-buddy-agent-harness`, and gives every addition the verdict not judged. (UC1, E1)
- **R2** A run told to work on a repository other than the working directory reads its merged view only from that
  repository, and every repository file it offers to write or writes is inside it. (UC1, E2)
- **R3** Guidance on an addition's subject held only in a harness instruction file still bound for `AGENTS.md`, such
  as a `.cursorrules`, makes that addition covered. (UC1.2, E4)
- **R4** A run that finds harness instruction files still holding content bound for `AGENTS.md` leaves them
  unchanged, says they should be consolidated, recommends `init-buddy-agent-harness`, and still gives every addition
  a verdict. (UC1.2, E2)

### Coverage (UC1)

- **R5** An `AGENTS.md` whose only occurrence of an addition's heading or text is inside a fenced code block gets that
  addition offered. (UC1.4, E3)
- **R6** A merged view that gives an addition's guidance in the owner's own words, under an unrelated heading or
  within a longer section, gets no section for it offered, and the report names what covers it. (UC1.3, E4, E7)
- **R7** A merged view whose only guidance on an addition's subject is a single line gets no section for it offered,
  and the report names the line and says why it counted. (UC1.3, E4)
- **R8** An `AGENTS.md` whose only list guidance numbers the lists in documents the agent writes gets List identifiers
  offered. (UC1, E3)
- **R9** An `AGENTS.md` whose only reference guidance is a commit-message convention, such as closing an issue from a
  pull request body, gets References as links offered. (UC1, E3)
- **R86** An `AGENTS.md` whose only worktree guidance ignores `.claude/worktrees/`, in `.gitignore` or in a tool's
  config, gets Agent worktrees offered. (UC1, E3)
- **R88** An `AGENTS.md` whose only guidance on retrospectives is a rule to write each lesson or correction straight
  into an instruction file, or into a learnings file, gets Retrospectives offered. (UC1, E3)

### Offering an absent addition (UC1)

- **R10** An addition the merged view does not cover, whose subject the global instructions do not cover either, is
  offered. (UC1, X1)
- **R11** An offered addition's text is byte-identical to its current text, whole, never a summary or a variant
  reworded for the repository. (UC1, X1)
- **R73** An offer leads with the destination the addition recommends and the reason, names the other destination as
  the alternative, says what each reaches (the global instruction file every repository the owner opens and nobody
  else, the root `AGENTS.md` everyone who clones the repository), and asks the owner to pick one or neither. (UC1, X1)
- **R13** An offer's global destination is `~/.agents/AGENTS.md`, also where the harness in use documents another
  user-scope file or none; there the offer says that harness reads it only where a user-scope file of its own loads
  it. (UC1.5, X1)
- **R14** An offer with the global destination, where `doctor` reports that the harness in use loads the global
  instruction file, says so and hands over no bridging step. (UC1.5, D1)
- **R74** An offer with the global destination, where `doctor` reports that the harness in use does not load the
  global instruction file, says the text would reach no session of that harness until it does, hands over the step
  that bridges it beside the text, and never writes that step, whatever the owner answers. (UC1.5, D2)
- **R16** An offer with the global destination, where `doctor` reports that the harness in use reads another file in
  place of its user-scope file, says so and hands over moving that file's content into `~/.agents/AGENTS.md` and
  removing it. (UC1.5, D3)
- **R17** An offer with the global destination, where `doctor` reports that the harness in use takes its user-scope
  location from an empty variable, says the location changes with each directory and hands over unsetting the
  variable, whatever else `doctor` reports for that harness. (UC1.5, D4)
- **R18** An offer with the global destination, where `doctor` reports nothing for the harness in use, says that
  whether it loads the global instruction file cannot be confirmed. (UC1.5, D5)
- **R85** An offer with the global destination, where `doctor` reports that the harness in use cannot load a file,
  says the text reaches that harness only when pasted into its user rules, and hands over that step. (UC1.5, D6)
- **R19** An addition approved for the repository is written into the root `AGENTS.md` after the owner's prose,
  outside the managed region, as prose without the fence, with every other byte of the file unchanged. (UC1, E29)
- **R75** An addition the owner approves for the global destination is written at the end of `~/.agents/AGENTS.md`,
  as prose without the fence, creating the file where it does not exist, with every other byte of it unchanged and
  the root `AGENTS.md` left as it stands. (UC1.7, E56)
- **R21** A declined or unanswered offer writes nothing. (UC1.6, E31)
- **R22** With several additions offered, each is offered on its own, and the owner's answer to one writes or
  withholds that one only. (UC1, X1)
- **R23** A run in a repository from which a section approved on an earlier run has been deleted offers that addition
  again, exactly as a run that never offered it would. (UC1.8, X1)

### Already current (UC2)

- **R24** A section that carries the current text, including with the owner's paragraphs added around or between its
  paragraphs, is offered nothing, and the report says it is already the addition's text, not the owner's own. (UC2.1,
  E5)
- **R25** A section that holds every sentence of the current text but also asserts a sentence found only in a retired
  wording, such as one a revision dropped, is not reported already current. (UC2, E6)
- **R26** A section that lacks a sentence of the current text is not reported already current, even when every
  sentence it has is in the current text, as when a revision only added a sentence. (UC2, E6)

### Provenance (UC2)

- **R27** A section in the root `AGENTS.md` for which both provenance questions answer yes, whether it is a retired
  wording verbatim, edited in place, or with an owner's sentence where a revision added one, is offered the current
  text as a replacement, shown beside the section as it stands, and said to replace that section and nothing else.
  (UC2, E8, E20)
- **R28** A replacement offer names every paragraph of the section that no retired wording contains (the current text,
  for an addition with none) and says the replacement would remove it, before the owner answers. (UC2.4, E20)
- **R29** For an addition with no retired wording, a section that is its current text edited in place is offered the
  replacement and is not reported as the owner's own. (UC2.5, E8)
- **R30** A section for which both provenance questions answer no is offered nothing, and the report names it as the
  owner's own. (UC2.2, E7)
- **R31** A section that carries a sentence of a retired wording only inside quotation marks, a fence, or a sentence
  disputing it, in prose otherwise its own, is reported as the owner's own. (UC2.2, E7)
- **R32** A section from a retired wording in a harness instruction file other than the root `AGENTS.md` is reported
  by file, offered nothing, and `init-buddy-agent-harness` is recommended. (UC2.3, E19)
- **R33** A nested `AGENTS.md` is never named as a target of an offer and is byte-identical after the run, whatever
  wording it carries. (UC2, E19)
- **R34** An approved replacement replaces that section, from its heading to the next heading of the same or higher
  level, in place, and leaves every other byte of the file, the managed region included, unchanged. (UC2, E32)
- **R35** A declined or unanswered replacement leaves the section as it stands. (UC2.6, E33)
- **R81** A replacement offer for a section from a retired wording that carries sentences the owner added also puts a
  merged text, the current text with those sentences kept, as another answer; on its approval the section is
  replaced in place by that merged text, with every other byte of the file unchanged. (UC2.4, E61)

### Cannot place (UC3)

- **R36** A section for which the two provenance questions disagree, either way, is said to be one the run cannot
  place, is shown with the wording it partly tracks and the current text (one text where the addition has no retired
  wording), and is decided neither way. (UC3, E9)
- **R37** Where the repository has a scoring harness for that addition, the unplaceable section is put with three
  answers: it is the owner's, it came from this package, or settle it by measurement. (UC3, E10)
- **R38** Where the repository has no scoring harness for that addition, including one that has a harness for another
  addition only, the unplaceable section is put with the first two answers, and the run says measurement would need a
  harness the repository lacks. (UC3.1, E11)
- **R39** An answer that the section is the owner's, or no answer, writes nothing. (UC3.2, E14)
- **R40** An answer that the section came from this package gets the replacement offered as for a section from a
  retired wording, or with removal beside it where X6 holds. (UC3, E15)
- **R41** No measurement is run unless the owner picked the measurement answer. (UC3.2, E16)
- **R42** Where the owner picks measurement and the current text scores higher, both scores are reported and the
  replacement is offered on that basis, still waiting for a yes. (UC3, E17)
- **R43** Where the owner picks measurement and the section scores level or higher, both scores are reported, nothing
  is offered, and the report says the section is kept. (UC3.3, E18)

### Global instructions (UC4)

- **R44** An addition the merged view does not cover, whose current text the global instructions carry, is not
  offered; the report gives it the verdict already global and says a copy in the root `AGENTS.md` would add the team
  and nothing else, that the owner would then load the text twice, and that the owner may ask for it.
  (UC4, X2, E22, E36)
- **R45** A team copy the owner asks for, after an already-global verdict or a global copy that covers the subject, is
  written as R19 writes an approved addition. (UC4.1, X2, X3, E35)
- **R46** An addition the merged view does not cover, whose subject the global instructions cover in another form,
  gets no repository offer, and the report names the global copy and its verdict. (UC4, X3)
- **R76** A global copy in `~/.agents/AGENTS.md` for which both provenance questions answer yes, whatever the
  repository holds (an already-current section included), is offered the current text as a replacement, shown beside
  the copy as it stands and naming the file and the owner's paragraphs it would take; on approval that section alone
  is replaced in place with every other byte of the file unchanged, and on a decline or no answer nothing is written.
  (UC4, UC4.6, E25, E57, E59, E60, X8)
- **R77** A global copy for which both provenance questions answer yes, held in a harness's own user-scope file or in
  a file the run cannot see, has the current text handed over for that file, naming it where it can, and that file is
  not written. (UC4.5, E25, E58)
- **R48** A global copy for which both provenance questions answer no is named as the owner's own and left alone.
  (UC4, E24)
- **R78** A global copy the run cannot place is put to the owner with the answers R37 and R38 allow; an answer that it
  came from this package, or a measurement that puts the current text ahead, gets the current text offered or handed
  over as for a global copy from a retired wording in the same file (R76, R77), and any other answer writes nothing.
  (UC4.2, E26, E27, E28)
- **R50** A section in the repository that carries the current text, beside a global copy that also carries it, is
  offered nothing, and the report names the global copy and says the owner loads the text twice. (UC4, X4, E22)
- **R51** A section from a retired wording in the root `AGENTS.md`, beside global instructions that carry the current
  text, is offered the replacement with a note that the owner would then load the text twice, and removal as the other
  answer, naming the owner's paragraphs removal takes and that the team's agents would lose the section. This holds
  however the section was placed: by the comparison, by the owner's answer, or by measurement. (UC4.3, X6)
- **R52** A removal the owner picks removes that section, from its heading to the next heading of the same or higher
  level, and leaves every other byte of the file unchanged. (UC4.3, E34)
- **R53** A section in the owner's own words in the root `AGENTS.md`, beside global instructions that carry the
  current text, is offered nothing; the report names both, says the owner loads the subject twice, and changes
  neither. (UC4.4, X7)
- **R54** The global instructions a run judges exclude the repository's own files and another repository's
  instructions loaded from the working directory. (UC4, E21)

### Write scope (UC1 to UC4)

- **R83** Every file a run writes is one the owner approved in that run (or, for a team copy, asked for), and is the
  root `AGENTS.md` or `~/.agents/AGENTS.md`. (UC1, UC2, UC4, E29, E32, E34, E35, E56, E59, E61)
- **R80** A run writes no workflow, repository setting, project source file, or harness's own user-scope file (such as
  `~/.claude/CLAUDE.md`), and no offer names one as a target to write, whatever it finds in them. (UC1, UC4.5, E2,
  E58)

### Report (UC1 to UC4)

- **R90** Every run, whichever way it went, ends in a report that names the files read, gives each shipped addition
  one verdict, distinct per verdict, with the reason, names what was offered and the destination recommended, and
  names each file written or says nothing was. (UC1, E1, E2)
- **R84** The report gives each hand-over as an outcome, not a decline. (UC1, E58)

### Shipping an addition (UC6)

- **R66** No addition's current text names a model, vendor, or version, and a candidate whose text does is rejected
  with the model, vendor, or version named as the cause. (UC6.1, E40)
- **R89** Each shipped addition states at least one shape of existing prose that counts as its subject covered; List
  identifiers also states a shape of list guidance that does not count, References as links names a
  commit-message convention as a shape that does not count, Agent worktrees names an ignore of
  `.claude/worktrees/` as a shape that does not count, and Retrospectives names a rule to write lessons straight
  into an instruction file as a shape that does not count. (UC6, E41)
- **R87** The Agent worktrees current text directs the agent to create a git worktree outside the repository, in a
  sibling `<repo>.worktrees/` directory, branching from `HEAD` unless told otherwise; not to use a built-in worktree
  isolation that creates the worktree inside the repository; and to create a subagent's worktree that way before
  handing it the path. (UC6, E41)
- **R91** The Retrospectives current text directs the agent, when it finishes a task for the user, to check through
  the `retro` skill whether a retrospective is due and, when one is, to do what that skill's setting says: say so,
  offer to start it, or nothing; to skip that check in a run with no user; to leave a lesson it notices for a
  retrospective rather than write it into an instruction file or skill itself, unless the user asks for that change;
  and, where the `retro` skill is not available, to say so rather than run a retrospective of its own. (UC6, E41)
- **R92** No version of this package ships the Retrospectives addition without also shipping the `retro` skill its
  current text names. (UC6, E41)
- **R68** Each shipped addition's stale check reads that addition's own store of retired wordings. (UC6, E41)
- **R69** A revision that replaces an addition's current text adds the outgoing wording to that addition's store,
  byte-identical to what it offered, in the same change. (UC6.2, E42, E44)
- **R70** An addition that has never been revised has a store holding no retired wording; Delegation's store holds
  the wording it offered before its current one. (UC6, E43)
- **R71** The List identifiers current text directs the agent to label each option, question, finding, and proposal
  it puts to the user with a letter naming the item's kind and a number, says the points of a plain explanation need
  no label, and directs that a revised list keeps each label, reuses no removed label, and gives a new item the next
  label. (UC6, E41)
- **R72** A change that retires a wording also adds eval cases for the shape of its revision (a rewritten, dropped, or
  added sentence) and passes them against the new pair of wordings. (UC6, E42)

## Open questions

None.

## References

- [graph.md](./graph.md): the decision graph and tables the criteria cite.
- The shipped skill: [SKILL.md](../../../skills/enhance/SKILL.md) and its
  [references](../../../skills/enhance/references/), one file per addition with a sibling store of retired wordings.
- The blind launcher the run policy names:
  [blind-claude.mjs](../../../../../.agents/skills/eval-delegation/scripts/blind-claude.mjs).
- Sibling specs: [`init-buddy-agent-harness`](../init-buddy-agent-harness/README.md) owns consolidation and the rule
  that material content needs approval; [`global-instructions`](../global-instructions/README.md) owns whether a
  harness loads the global instruction file; [`worktree-diagnosis`](../worktree-diagnosis/README.md) owns reporting
  unaccounted agent worktrees, and sends a worktree it finds inside the repository here; [`agent-worktree-settings`](../agent-worktree-settings/README.md) owns offering the
  settings that account for them; [`repair`](../repair/README.md) owns correcting what is present and wrong.
- [`retro`](../retro/README.md): the sibling spec that owns running a retrospective (N14, K19).
- Rationale for the Retrospectives addition: the research topic
  [agent-self-improvement](../../../../../.research/agent-self-improvement/conclusion.md), verdict items 8 to 11.
- [AGENTS.md](https://agents.md/): the open instruction format every addition is written into.
