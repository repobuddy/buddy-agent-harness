---
title: Instruction Target
description: 'Which of the agent''s outputs an instruction governs (a produced artifact, this session''s conversation, or another agent''s context), and why separating them lets contradictory instructions coexist.'
---

**Target** identifies which of the agent's outputs an instruction governs, and therefore who eventually reads it. A single request routinely involves more than one, each with its own value: the agent may reply to you in a terse, clipped register while writing your documentation in careful, full prose, or draft a formal document while sending a peer agent a one-line status.

Separating the targets is what lets those instructions contradict each other safely: no single house style could hold both a clipped register and careful written prose, but assigned to two targets they coexist. Two instructions on the same target genuinely conflict. There is no second target to separate them onto, so one of them has to win.

## Specifying a target

Three mechanisms specify the target, and they act at different moments:

| Mechanism                | Where the target lives     | Decided by                | What it settles        |
| ------------------------ | -------------------------- | ------------------------- | ---------------------- |
| **File type matching**   | a path glob in frontmatter | the harness, mechanically | whether the file loads |
| **Description matching** | the `description` field    | the agent, at load time   | whether the file loads |
| **Prose matching**       | the instruction body       | the agent, while working  | which value applies    |

Which one applies is settled by what can name the content:

- **File type matching** is reserved for the case where the harness offers a path glob **and** a path names the content the instruction governs.
- **Description matching** is reserved for the case where **no** path names the content the instruction governs.
- **Prose matching** is reserved for variants that splitting would duplicate.

File type matching is deterministic, because the harness evaluates the glob rather than the agent judging the situation. The instruction loads with the content it governs, and the same file always draws the same rules. Where the harness offers a glob and a path names the content the instruction governs, reach for it first.

Two harnesses document one, and both attach it to a harness-specific rules file rather than to `AGENTS.md`:

- **Cursor**: a rule in `.cursor/rules/` carries a `globs:` field, used with `alwaysApply: false`, so it auto-attaches only when matching files enter context. Set `description` instead and the agent judges relevance; set neither and the rule is reachable only by `@`-mention.
- **GitHub Copilot**: a `NAME.instructions.md` file in `.github/instructions/` carries an `applyTo:` glob, such as `applyTo: "app/models/**/*.rb"`, or comma-separated patterns like `applyTo: "**/*.ts,**/*.tsx"`.

This is the mechanism's practical limit for a repository standardizing on open formats: **neither `AGENTS.md` nor `SKILL.md` has a portable equivalent.** Claude Code's `paths` frontmatter and Cursor's `paths`/legacy `globs` scope skill activation, but each is read only by the harness that defines it. See [Writing Portable Skills](/agent-configuration/portable-skills/). So file type matching is a per-harness optimization, and anything that must hold everywhere falls to the two mechanisms below. Confidence for these claims is recorded in [Sources & Confidence](/sources/).

What a path cannot express is a file that mixes targets. A markdown file holds prose under one set of conventions and code blocks in several languages, each under its own, and one section of prose may answer to a different standard than the next. The glob binds at file granularity while the targets vary inside the file.

Description matching reaches what a path cannot. An agent configuration file (a `SKILL.md`, a subagent definition, a Cursor rule) carries a `description` in its frontmatter, and the agent judges from it whether the current situation calls for loading that file. It is a semantic judgment the agent makes rather than a rule the harness evaluates. That reservation, no path naming the content the instruction governs, arrives in four ways:

- the harness offers no path glob at all
- the kind of content is not evident from a path
- the instruction lives in a shared configuration file that cannot name the path
- the output is not a file at all, so there is no path to match on

This is what reaches inside a mixed-target file. What the agent matches is its own situation rather than the file's path, so a TypeScript convention loads while it writes a TypeScript block inside an MDX page whose prose answers to something else entirely.

File type matching and description matching both gate loading, and neither settles what an instruction covers once it is loaded. Prose matching does: the body names the target, so one loaded file carries a different value per target. A prose-conventions skill might state six rules that hold for all writing, then split: one branch for blog posts and newsletter issues, another for project documentation and READMEs. The file loads once; the agent matches its situation against the branch and takes that value.

Prose matching is also the only one of the three that is fully portable, because the body is the one part every harness reads.

Reach for prose matching when the variants are too minor to separate. The two registers above share all six rules and diverge only in delivery, so a file per target would duplicate more than it distinguishes. A mixed-target file does not by itself call for prose matching: where a target's rules can stand as their own unit, split them out and let description matching load each on its own situation. Prose matching is for the case where splitting would copy more than it separates.

Prose matching costs a **scope statement**: a line naming the target that its neighboring rules govern. Where a target needs only a scope statement rather than a substantial body of instruction, writing the target into the instruction body is the whole of specifying it, and you write that line yourself: no harness setting enforces that boundary. Once the boundary is explicit, an instruction can carry rules that hold for one kind of output and reach nothing else: a convention for your Python modules that never touches how the agent talks to you.

Specifying a target has a limit, though. Where one target needs a substantial body of instruction rather than a scope statement, isolating it in its own subagent or its own session beats scoping it in place. Its rules then arrive with nothing to compete against. Isolation removes the competing target from context altogether, while a scope statement instead asks the agent to honor a boundary on every turn. [Keeping targets apart](#keeping-targets-apart-within-one-session) weighs the two under the load of a long session.

## The three targets

There are three kinds of targets, and the forms within each kind are open-ended:

| Target       | Where the output goes                 | Forms it covers                                     | Example                                                                    |
| ------------ | ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| **Artifact** | Into a file that outlives the session | every kind of content the agent can write           | a prose-conventions skill shapes a draft's voice without changing how the agent replies |
| **User**     | Into this session's conversation      | a live reply, and a question carrying its reasoning | a reply-style skill shapes how the agent talks without touching anything it produces |
| **Agent**    | Into another agent's context          | a spawn-time brief, and mail to a peer session      | a status message sent to a peer session                                    |

## Artifact: the only target with a path

Here the target is a specific kind of content: a given programming language, tests, stories, documentation, or agent configuration itself.

Artifact is the only target that has a path, and having one is what makes file type matching possible. The glob needs something to match against, and only a file supplies it. Having a path is also why a single file can hold content governed by several targets at once: the path belongs to the file, while the content inside it can answer to whatever conventions it likes. That gap between the one path and the many conventions is the case description matching and prose matching exist to reach.

## User: the default target

The user receives whatever the agent neither writes to a file nor addresses to another agent. The User target is therefore always in force, and it is the one whose examples pile up fastest: the drift described in [Keeping targets apart](#keeping-targets-apart-within-one-session) runs toward it.

No file path corresponds to the User target. A reply is not a file, so file type matching has nothing to match on, and description matching or prose matching carries the target instead.

Every [purpose](/agent-configuration/instruction-purpose/) applies here, not only Tone. Tone comes to mind first, since a clipped reply register is a Tone instruction, because the user already holds the session's context. It looks as though nothing is left to convey and only the manner of conveying it is in play. Shared context is not shared reasoning: "when you need user input, state the reasoning that led to the question" targets the user and is pure Procedure, an instruction about what to do rather than how to say it, sparing the user from reconstructing the question's origin out of the session history.

The user can also respond, which no other target can. An instruction here may leave a detail to a later turn. A brief must instead anticipate what would have been asked, because the subagent has no way to ask it.

## Agent: briefs and mail are not interchangeable

A brief and a piece of mail both read like conversation, but they reach agents in different states. No file path corresponds to either form, so a description or the instruction body has to carry the target.

- A **brief** gives a subagent everything it needs in order to act without prior context: the task, the reason for it, and what a finished result looks like. You write it once, at spawn time, and the subagent cannot ask you to clarify it.
- **Agent mail** passes between two running sessions that do not share context by default. It carries a decision, a status, or a question, but never the sender's full reasoning trail.

The distinction that matters is the recipient's standing mission. A brief becomes the recipient's mission, because the subagent has none of its own. Mail arrives at an agent that already has a mission, so it competes for attention rather than setting the agenda. Mail must therefore stand on its own, carrying the context the recipient needs to act without access to the sender's session.

Every purpose applies within both forms. A brief carries Procedure (what to do) and Reference (context to load), while a piece of mail may be pure Reference (a status update) or a Menu (a closed set of options the recipient must choose from, such as an approve-or-reject verdict).

## Composing configuration

This pays off twice: once when you write configuration, and again when you install someone else's.

When you write it, cut along the target. Mixing targets in one unit is what forces it to be adopted whole: a skill that shapes both your replies and your written documents can only be taken entire, so a project that wants its prose conventions gets its reply style too, whether it wanted that or not. Separating instructions by target is what makes them reusable independently. Split the skill at the target and each half becomes something a project can adopt on its own.

When you install it, the rule from the opening answers in advance whether two units will fight. The test is to compare what each of the two governs. Ask of each unit where its output lands (into a file that outlives the session, into this conversation, or into another agent's context) and read off the answer:

| The two units govern | Result                   |
| -------------------- | ------------------------ |
| different targets    | never meet; enable both  |
| the same target      | one has to win           |

Two contradicting units whose targets differ never meet, so both may be in force at once. A prose-conventions skill and a reply-style skill are exactly that pair: one governs Artifact, the other User. Enable both and neither has to give way, because they never touch the same output. Your documentation comes out in careful, structured prose while your replies stay short and front-loaded.

Two contradicting units governing the same target are a genuine conflict rather than a coexistence. One of them has to win, because there is no second target to separate them onto.

Purpose does not enter this. It is the other axis, what a block of instruction is _for_, and a block's purpose is unchanged by which target receives it: a Procedure is a set of ordered steps whether they are meant for your own turn, a subagent's brief, or a Python module. So two units sharing a purpose sit in the first row as comfortably as any other pair. Only a shared target puts two units in conflict.

## Keeping targets apart within one session

A single session usually serves more than one target in turn: a reply, then a file, then a brief. Configuration bound to one target tends to **bleed** into the next, to keep shaping output it was never meant for. The drift runs in a predictable direction, toward whichever target the agent has been serving most.

The mechanism is accumulation rather than misunderstanding. Every reply the agent writes becomes an example of how it writes, and produced output accumulates as unlabeled examples, carrying no record of which target they were for. A scope statement made once, where the instruction is loaded, competes against the examples the session accumulates. The longer the session runs, the weaker that scope statement's position.

Instruction files are the sharpest case, because they load once at session start and are never re-read. On Claude Code this is explicit: the rendered content "enters the conversation as a single message and stays there for the rest of the session," with no re-read on later turns. A scope statement in `AGENTS.md` is therefore at its strongest on turn one and never restated afterward.

So a unit already bound to the target you intended can still shape output for another one late in the session. That is drift rather than a mis-scoped unit, and the remedy is one of the four arrangements below, chosen by the questions that follow them.

Four arrangements remedy drift in an instruction governing a produced artifact, usually the output a long session has produced least, so its instruction is the one the accumulated examples erode first. They are ordered by how strongly each separates the targets, from most separation to most convenience, and each carries the cost of adopting it.

1. **Produce the artifact in a separate session.** Reserved for an artifact that can be specified in a brief. A freshly spawned session has accumulated nothing that can bleed, which makes this the only arrangement that separates by construction rather than by instruction. Its cost is starting with no context, which fits poorly when the artifact is the residue of a long discussion, because the brief would have to reconstruct that discussion.
2. **Restate the target at the moment of production.** Reserved for an artifact that cannot be specified in a brief. Naming the intended register immediately before you write re-establishes the boundary where it matters, after the accumulation rather than ahead of it. Its cost is having to remember to do it.
3. **Produce the artifact early.** Reserved for a session that knows at the outset which artifact it will produce. Producing early works because less output for another target has accumulated by then, so there is less to bleed from. Its cost is nothing to apply, but it depends on that foreknowledge.
4. **Scope the instruction itself**, which is prose matching applied to the drift problem. Reserved for a session that does not know at the outset which artifact it will produce. It separates the targets least of the four, because a scope statement is exactly what accumulation erodes. It is nonetheless the only arrangement asking nothing at production time.

Three questions route a case across the four:

| Ask                                                                | If yes                    | If no                     |
| ------------------------------------------------------------------ | ------------------------- | ------------------------- |
| Can the artifact be specified in a brief?                          | separate session (1)      | ask the next question     |
| Can you rely on restating the target at the moment of production?  | restate at production (2) | ask the next question     |
| Do you know at the outset which artifact the session will produce? | produce it early (3)      | scope the instruction (4) |

## Related

- [Instruction Purpose](/agent-configuration/instruction-purpose/): the axis Target composes with
- [Writing Portable Skills](/agent-configuration/portable-skills/): why path-glob targeting does not survive between harnesses
- [Persona](/agent-configuration/skills/persona/): where Tone and Structure separate from expertise
- [Sources & Confidence](/sources/): how well-sourced the harness claims above are
