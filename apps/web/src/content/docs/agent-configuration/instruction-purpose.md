---
title: Instruction Purpose
description: What a block of instruction is for — procedure, criteria, policy, reference, menu, tone, or structure — and why separating them makes instructions composable.
---

**Purpose** answers what a block of instruction is _for_: steps to execute, conditions to be measured against, rules to conform to, material to consult, options to choose among, a way to sound, or a shape to respond in.

This is a property of the prose, not of the file it sits in. The same seven purposes appear in `AGENTS.md`, in a `SKILL.md` body, and in a harness-specific rules file — which is why naming them is what lets one body of instruction be split, reused, and moved between those homes without losing its meaning.

By identifying them, we can separate them cleanly to create composable and reusable instructions. Each purpose licenses a different verb — if a candidate section doesn't need a new verb, it isn't a new purpose:

| Purpose       | Gives the reader                       | Typical section headings                                    | Verb       |
| ------------- | -------------------------------------- | ------------------------------------------------------------ | ---------- |
| **Procedure** | ordered steps to execute               | Steps, Workflow, Usage, Instructions                        | act        |
| **Criteria**  | conditions to be measured against      | The Bar, What It Requires, Verification                     | evaluate   |
| **Policy**    | rules that must / must not be followed | Boundaries, What Not To Do, Anti-patterns, Non-goals        | comply     |
| **Reference** | facts about the world being worked in  | Architecture, Key Directories, Tech Stack, Domain, Glossary | know       |
| **Menu**      | a closed option set, and help choosing | Operations, Route The Request First                         | choose     |
| **Tone**      | a way of sounding                      | Tone, Persona Voice                                          | sound      |
| **Structure** | a shape the response must take         | Output Shape, Response Format, Length Limits                | format     |

## Reference is material, not citations

**Reference** is the ground truth an agent needs to work here at all: what the project contains, how directories are laid out, which stack it runs on, what the domain terms mean. `AGENTS.md`'s Architecture and Key Directories sections are the clearest case — they assert nothing normative, they just tell you where you are.

Reference is also the purpose most often kept when it should be cut. [What Belongs in AGENTS.md](/agent-configuration/instruction-files/) is the counterweight: a fact one file-read away is Reference the agent can get for itself, and paying for it on every session is the most common way an instruction file goes wrong.

A list of links is not a purpose of its own. A pointer inherits the purpose of whatever it points at: a link to a policy document is delivering policy, a link to a rubric is delivering criteria. Classify the destination, not the hyperlink.

## Criteria and Policy are not the same

Both are normative, and they get conflated constantly.

- A **policy** is something you _comply with_. Violating it means you did the job wrong.
- **Criteria** are something you are _measured against_. Failing them means you scored low.

An agent conforms to a review standard (policy) while grading a submission against a rubric (criteria) — both at once, in the same run. If a section tells the reader how to behave, it is a policy. If it tells them how someone else's output will be scored, it is criteria.

## Menu is routing, not scoring

**Menu** and **Criteria** can look alike — both match a situation against a set of conditions — but they run at different times toward different ends.

- **Menu** picks a path forward, before any work happens: a closed set of options, plus what disambiguates one from another. Nothing gets scored; a choice just gets made.
- **Criteria** validates a finished output, after the work is done: a list of acceptance conditions the result either satisfies or doesn't.

A [gateway skill](/agent-configuration/skills/gateway-skill/)'s operation menu ("create, validate, implement, or manage?") is Menu. A rubric a reviewer grades a submission against is Criteria. Same shape — conditions matched against a situation — but one routes and the other verifies.

## Tone and Structure are the swappable pair

A section is **Tone** or **Structure** if you could replace it with a different one and change only how the agent sounds or how its response is laid out — never what it does or concludes.

A terse-register skill and a verbose-register one pass this test for both at once: swap one for the other and every decision the agent makes is identical, but the wording changes (Tone) and often the layout does too — numbered steps, capped list length, no preamble (Structure). They're two different questions that happen to share one test, not one purpose:

- **Tone** answers *how does it sound* — register, word choice, degree of formality.
- **Structure** answers *how is the response shaped* — length limits, ordering, prose vs. list, headers.

That separability is the point — it is what lets a tone or a response format ship as a standalone, user-chosen skill rather than being welded into the workflow that uses it.

A section titled _Voice_ is the usual place these two get conflated. "Voice" names the pair, not one half of it: register and word choice are Tone, while "tables over paragraphs" and "bold the key term, then define it" are Structure. Classify each rule by what it governs, not by the heading it sits under.

Note that Tone and Structure sections often _read_ like policy ("cap lists at five items", "no preamble"). Genre is set by what the rules govern, not their grammar. Rules governing manner or shape are Tone/Structure; rules governing what counts as correct work are Policy.

A [persona](/agent-configuration/skills/persona/) is usually **not** pure Tone or Structure. Its domain knowledge, decisions, and boundaries change what the agent concludes, not just how it sounds — those are Reference and Policy. Only the delivery layer is what a caller can delegate.

Any purpose here can also carry a different value depending on who consumes it — the axis is called Target, and it's independent of Purpose. See [Instruction Target](/agent-configuration/instruction-target/) for the full set of consumers and a worked example of combining purposes.

## Example is a delivery mode, not a purpose

An example — a worked instance, a few-shot demonstration, a sample passing or failing case — is tempting to add as its own purpose. It isn't one: an example always illustrates one of the purposes above, and inherits that purpose rather than having its own. An example of the steps to follow is Procedure; an example of a passing and a failing case is Criteria; an example of forbidden output is Policy. Classify what the example is an instance *of*, the same way a pointer inherits the purpose of whatever it links to.

## Always-on rules are Policy with a loading story

A rule that is always in force — commit after each unit of work, never batch unrelated changes — reads as **policy**. What makes it feel like its own category is _when it loads_, which is a question about selection rather than about purpose. See [Kinds of Skill](/agent-configuration/skills/overview/#kinds-of-skill) for the selection axis.

Strip the loading behavior from a commit rule and its body reads like any other policy: one complete, independently revertable change per commit. Same genre, different scope.

## Related

- [Instruction Target](/agent-configuration/instruction-target/) — who consumes any purpose's output: the user, a subagent, a peer agent, or an artifact
- [What Belongs in AGENTS.md](/agent-configuration/instruction-files/) — which purposes are worth paying for on every session
- [Kinds of Skill](/agent-configuration/skills/overview/) — the per-artifact Selection / Visibility / Effect axes
- [Persona](/agent-configuration/skills/persona/) — where Tone and Structure separate from expertise
- [Gateway Skill](/agent-configuration/skills/gateway-skill/) — the clearest Menu example
