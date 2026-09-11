---
title: 'Skill: enhance'
description: What the enhance skill offers a repository, how it decides a section is already covered or carries an outdated version of a shipped one, and the runs behind the wording it ships.
---

The `enhance` skill proposes guidance a repository does not have, and offers a fresh copy of guidance it took from an earlier release. [`init`](/skills/init/) is the other half: it consolidates what you already wrote and bridges the harnesses that cannot read it, and it invents nothing. Initialization has to be safe to run anywhere, so it carries no opinions. An addition is opinionated by construction.

That is why `enhance` is opt-in. Every addition is offered and never written on sight, and `init` now ends by asking whether to run it.

This skill has no CLI command behind it. There is nothing mechanical to hand off: the work is reading your instructions and judging what they already cover.

## Run it

In Claude Code:

```text
/buddy-agent-harness:enhance
```

Any agent that reads `.agents/skills/` can be asked in prose instead, from the repository root:

```text
Add the guidance my AGENTS.md is missing.
```

The target is the root `AGENTS.md`. If there is none, the skill stops and points at [`init`](/skills/init/), because it adds to an existing file and creating one is `init`'s job. A nested `AGENTS.md` is never a target, since none of the additions are scoped to a subtree.

## How it decides

The skill reads the root `AGENTS.md` together with any harness instruction file whose content still belongs in it: a `CLAUDE.md` with a body of its own, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`. It judges against that merged view, because the combined text is what an agent effectively reads. Guidance living in a Cursor always-on rule counts as present.

It reads those files and never consolidates them. Consolidation is `init`'s alone. Where the skill finds content that should be merged, it says so and recommends `init`, then carries on with the coverage judgment.

Coverage is judged by meaning, not by heading or wording. A repository covering delegation under `## Working with subagents`, or in three sentences inside a longer section, is covered. One that mentions subagents only to name a tool is not. In doubt, the skill treats the addition as covered and says why: a missed offer costs you nothing, while a duplicate section teaches every future agent that this file repeats itself.

Detection decides every run. There is no first-run path and no memory of a previous decline, so a section you delete is offered again. Absence is the whole state. If the repeat offer annoys you, decline `init`'s offer to run the skill.

Every run reports, whichever way it went: what it read, the verdict for each addition and why, what it offered, and what was written. A run that offers nothing still reports. That is the only way to tell "already covered" from "did not look".

## When a section is out of date

Judging by meaning has one blind spot, and it took a while to notice. A wording that ships here can change. The `## Delegation` text was rewritten once already. A repository that took the earlier version keeps a section that covers the subject perfectly well, so every later run judged it covered and the new wording was never mentioned. The file quietly stayed a release behind, and nothing in the report said so.

So coverage is now two questions. The first is unchanged: does the merged view already tell the agent what this addition would tell it? Only text that answers yes reaches the second, and the second is not about meaning at all. It asks where the text **came from**: is this the addition itself, at a wording it used to ship?

### How provenance is decided

Each addition keeps every wording it has retired, exactly as it was offered — for delegation, in `references/delegation.history.md`. A section already in your file is compared against those.

It is compared against the current text first, though, and for a different purpose. If your section **carries** the current text — every sentence, in order, with your own paragraphs allowed around or between them — there is nothing better to give you, and the comparison stops. That is reported as *already current*, not as something you wrote, since this package wrote it. A section that carries the current text but still asserts a sentence from a retired wording is holding two versions at once, and is not current.

The skill is checked against the wordings that exist, not against every revision someone might one day make. How a sentence-level comparison behaves depends on how two wordings differ — whether a revision rewrote a sentence, dropped one, or added one — and that is only knowable when a revision is made. So the change that retires a wording also adds scenarios for its revision shape and passes the gate against the new pair. A revision is a single reviewable event, and it is the moment the question has an answer.

What is never done is weighing your section against the current text to decide whether it is *stale*. A section differing from the current wording tells you nothing, because differing is what a rewrite produces.

Two questions decide it, and neither is a proportion. **Do whole sentences of a retired wording survive verbatim?** Not a phrase — a whole sentence; nobody reproduces one by accident. **Does that wording's structure survive** — its sentences, in its order, each doing its job?

When the two answers agree, they decide. When they disagree, the skill cannot tell, and says so.

| whole sentences | structure | |
| --- | --- | --- |
| yes | yes | It is that wording, edited. The current text is offered as a replacement. |
| no | no | Written from scratch. It is yours, and it is left alone. |
| yes | no | Can't tell — a line of ours carried into prose you wrote, or a line you reached yourself. |
| no | yes | Can't tell — your words in our shape: a reword of ours, or just the order the subject naturally takes. |

The two disagreeing rows are not a gap in the test. They are the test reporting honestly that the evidence points both ways, and they are where the skill asks instead of guessing.

Two earlier drafts of this got it wrong in instructive ways. The first set the middle case at "roughly half of it tracks the retired wording" — which sounds precise and is not, because it makes the boundary a proportion nobody can measure. The second fixed that but enumerated only three of the four combinations, leaving *your words in our shape* with no rule at all; three independent blind runs met that case, had nothing to apply, and each invented the same answer. A rule stated over two conditions has to cover all four of them, and saying so in one line — *when they agree they decide, when they disagree you cannot tell* — is shorter than listing three cases and safer than listing three cases.

That third branch is the point. Leaving a genuinely outdated section unmentioned is the bug this feature exists to fix; replacing words you wrote is worse than the bug. When a case could honestly be either, neither default is safe, and one question costs you very little.

### When you don't remember either

You get three answers to that question, not two. The third is **settle it by measurement**, and it is offered every time the skill asks.

The reason is that you may not remember where the section came from, and more to the point, provenance was never the thing you cared about. "Where did this text come from" is a stand-in for "which of these serves me better". When the stand-in fails, the skill asks the real question instead of pressing a memory that isn't there.

Say yes and it scores your section and the current text against a fixed backlog of real tasks, using whatever harness your repository has for that, and reports both. In this package's own repository that harness is the `eval-delegation` skill — the instrument that settled the offered wording in the first place. Your repository will have its own or none, so the skill checks before offering: where there is none, it says the third answer would need a harness you do not have and puts the other two. Then:

- **The current text scores higher.** It is offered as a replacement, on the strength of those scores rather than on where the text came from.
- **Your section scores level or higher.** Nothing is offered, and the skill says so. A wording that serves your repository better than ours is not something to replace, whatever its history.

That second outcome is the only path in the whole feature that can conclude *keep yours*. Every other branch can offer or stay quiet; this is the one that can find your wording better and tell you.

It is never run unasked. It is many model runs, and you are the one paying for them.

### Why whole wordings rather than a rule

An earlier design tried to describe what an outdated copy looks like — match a distinctive phrase from the shipped text, then check a couple of properties separating old from new. It was attacked four times and defeated four times, each by a plausible section someone might really write.

The failures are worth recording, because each is a rule about writing criteria an agent applies:

- The conditions sat under a prose preamble, so they read as necessary-but-not-sufficient and the judgment fell back to comparing sentences. **A criterion must say whether its conditions are decisive.**
- The anchor phrase was one the *current* wording also opens with, paired with the absence of an uncommon detail. **A provenance test needs something nobody writes independently** — and an absence is not that.
- The phrase counted as matched when it appeared inside a quotation the section was arguing against. **A provenance test must ask whether text is asserted or shown.**
- Two anchors were accepted and the rule had been applied to only one. **A provenance test is only as strong as its weakest accepted match.**

Narrowing to the single most distinctive phrase did not save it either, and the reason generalizes: any phrase short enough to write into a rule is short enough for someone to arrive at on their own, having read these docs or worked in another repository this skill has enhanced. The phrase this design had settled on appears verbatim in at least one hand-maintained instruction file that this skill never touched.

Two more failures came from trying to shortcut the comparison rather than to describe it, and they are the reason the rule now starts by comparing against the text it would offer.

The first shortcut said: a section mentioning what model a subagent inherits is the current wording, so skip the comparison. That keys on the **subject a section talks about**, which is the same mistake one level over — anyone can write a sentence about choosing a model, including on top of a wording retired long ago. Appending one such sentence to a byte-identical retired wording silenced the refresh entirely.

Deleting that shortcut looked right, and was half right. What was left worked only because of an accident of today's corpus: the current wording happens to share no whole sentence with the one retired wording, so a file carrying the current text answers no to both questions and is left alone. That is a fact about two particular paragraphs, not about the mechanism — and it expires at the next revision, when the text that is current today becomes a retired wording and every up-to-date repository starts being compared against the text it was derived from. A revision that tightens one sentence leaves the rest verbatim in order, which reads as stale, and the skill would offer to replace the current wording with itself.

**When a special case is deleted because the general rule covers it, the subsumption has to be a property of the mechanism, not of the data currently in the corpus.** So the guard came back, keyed on the right thing: not resemblance at all, but **containment**. A section that carries every sentence of the text the skill would offer, in order — your own paragraphs allowed around or between them — and asserts no sentence found only in a retired wording is already current, and the comparison stops. Resemblance cannot do that job, because a revision preserves resemblance: one that tightens a single sentence leaves the old and new wordings matching sentence for sentence but one.

And a lesson one level up from that: three successive attempts to make the comparison correct in advance for *every* revision each held for the shapes considered and failed on the next one — a sentence rewritten, then one dropped, then one added. That is a sign the question is being asked at the wrong time. It is now asked when the revision is made, against the two texts that actually exist.

Storing the wording itself sidesteps the rest of it. Nobody reproduces a sixty-word passage by coincidence, so the comparison is sound without anyone having to describe what "outdated" looks like — and the maintenance duty collapses to one line: when the text is revised, keep the outgoing version.

### What a replacement does

You see the section as it stands and the text that would take its place, and nothing is written until you say so.

**If you have added your own paragraphs to that section, they are named before you answer.** A section that came from here is often not only what came from here — teams add their own rules under the same heading, and replacing the section would take those with it. So the offer lists every paragraph under that heading that appears in no retired wording, and says the replacement would remove it. An approval given for "refresh the wording" is not an approval to delete what you wrote. On approval only that section changes, from its heading to the next heading of the same or higher level; the rest of the file is left byte-for-byte as it was. On a decline the old section stays exactly where it is, and so does an unanswered question.

A retired wording found somewhere other than the root `AGENTS.md`, in a `CLAUDE.md` or a `.cursorrules`, is reported by name and not replaced. This skill writes one file. Replacing the root copy while an older copy stayed in a harness file would leave you holding two versions of the same guidance instead of one. Run [`init`](/skills/init/) to consolidate first.

## What it never does

These hold regardless of what you ask for mid-run:

- Never write without approval. The offer is the point.
- Never silently overwrite. A replacement is gated exactly as an addition is, word for word.
- Never guess whose words a section is. Where it cannot tell an edited copy from your own prose, it asks.
- Never edit an addition to fit a repository.
- Never touch the managed region, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Never consolidate harness instruction files. Reading them is the coverage judgment; merging them is [`init`](/skills/init/).
- Never reach past local agent configuration into workflows, repository settings, or unrelated project files.

## What it offers today

### Delegation

A `## Delegation` section, on the work an agent should hand to a subagent and the work it should keep:

```markdown wrap
## Delegation

If this harness can spawn subagents, delegate the mechanical work and the research whose answer is far smaller than the reading behind it. Keep the judgment calls and the decisions; anything you would finish in less time than briefing it takes, do yourself.

A subagent inherits your model if you do not pick one, and none of your context either way. Pick the cheapest, unless you cannot say what a right answer looks like or could not cheaply tell a wrong one. Give it the context, the why, and what done looks like.
```

The wording this replaced is kept in `references/delegation.history.md`, which is what an existing `## Delegation` section is compared against.

You see the text in full before you answer. On approval it is appended to the root `AGENTS.md`, outside the `buddy-agent-harness` managed region: the section asserts something about how the repository is worked in and holds true whether or not the tool ever ran, which makes it material content, and material content needs approval. The managed region is for the tool's own bookkeeping.

#### Why the Delegation wording

The wording is fixed: the skill offers it as written or not at all, and does not adapt it to a repository. It was settled by testing rather than by taste, over 54 blind A/B runs across six rounds. Every run got the same five-task backlog, scored against a key fixed before the runs, under two roster conditions: a current model roster, and a drifted one naming models the session could not spawn.

The runner sees the five tasks as an ordinary day's work, in this order, with no hint that delegation is the subject. Each discriminates differently, and the set is balanced so that a candidate cannot win by pushing the agent in one direction.

| | Task | Correct | What it catches |
| --- | --- | --- | --- |
| T1 | Rename an exported function across 61 call sites and update the tests | delegate | bulk mechanical work with a wide blast radius. The interesting part is which subagent, and how it is briefed |
| T2 | Add `coverage/` to the root `.gitignore` | do it yourself | the over-delegation trap. It costs less to do than to brief, so a candidate that only says "push work down" fails it every time |
| T3 | List every SKILL.md that references a `.claude/` path, with line numbers | delegate | scoped research whose answer is far smaller than the reading behind it |
| T4 | Decide whether the Delegation guidance belongs in `AGENTS.md` or in a separate skill | keep | a judgment call. Watch for runs that delegate it *upward*, which a tier ladder invites |
| T5 | Review 4 open dependency-update PRs and rule merge, hold, or needs-work on each | keep the verdict | mixed: the gathering is delegable, the verdict is not. The hardest case, and the one that separates candidates most |

One point per task. A run that names a subagent while its own note says the work is cheaper to do directly scores wrong, because the assignment is the answer and not the reasoning beside it.

The shipped wording scores 29 of 30 on that backlog, at six runs per cell:

| | T1 | T2 | T3 | T4 | T5 |
| --- | --- | --- | --- | --- | --- |
| shipped wording | 6/6 | 5/6 | 6/6 | 6/6 | 6/6 |

The candidates it beat were measured earlier, on a backlog whose T2 was a typo fix rather than a `.gitignore` line. Read that set against itself and never against the table above: a figure pooling runs from two backlogs measures nothing.

| Candidate | Score | What went wrong |
| --- | --- | --- |
| a table naming concrete models | 12/20 | assigned work to a model absent from the roster, on the *current* roster rather than the drifted one. Both drifted runs called the table inapplicable. One run read its `Delegate?` column backwards and routed bulk mechanical work up a tier |
| a model-free tier table | 12/20 | defining a ladder bought nothing on its own |
| prose with no lower bound | 13/20 | delegated the one-line edit in 4 of 4 runs |
| maximum-compression rewrite | 25/30 | came out longer than the draft it compressed, and worse in behavior |

The first row is why the shipped section names no model, vendor, or version, and the third is what the "do it yourself" clause is for. One more fix does not show up in either table: delegating the final verdict away failed 9 of 12 early runs, and across the twelve runs of the two drafts that first carried "keep the judgment calls and final decisions", it failed none.

Read the small differences with care. One judge scored every run, against one backlog, six runs per cell in the final rounds, so the top candidates were statistically indistinguishable. The categorical failures are the strong evidence. The gaps between close scores are not. T5's gather-versus-decide boundary remains a known thin spot: about half of all runs report it unclear under every wording tried, while still resolving it correctly.

The backlog, the key, and the baseline are recorded in `.agents/skills/eval-delegation/`, which is also the harness for re-running them.
