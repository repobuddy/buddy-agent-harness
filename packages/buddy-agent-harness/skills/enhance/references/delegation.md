# Addition: Delegation

## Covered when

The merged view already tells the agent **when to hand work to a subagent**. Any of these counts:

- guidance on what to delegate and what to keep, under any heading
- a rule about briefing subagents, paired with any sense of when to spawn one
- an explicit statement that this repository does not use subagents

Naming a subagent tool, or listing available models, is not coverage. Neither is a delegation
rule that appears only in a skill body — this addition is for the always-loaded file.

## Stale when

**First: is the section already current?** It is when it carries every sentence of the text below, in
its order — the owner may have added paragraphs of their own around or between them, and those are
theirs to keep — **and** asserts no sentence found only in a retired wording. Offer nothing, compare it
against no retired wording, and report it as **already current**, not as the owner's own: this package
wrote that text, and saying otherwise credits them with it.

Containment, not resemblance. A section that carries the current text but also still asserts a
retired sentence is holding two versions at once, and is not current: go on to the two questions.

Otherwise, compare the `## Delegation` section already in the file against each wording in
`delegation.history.md`. Those are the exact texts this addition used to offer. Ask two questions
about the section, and only these two:

1. **Do whole sentences of that wording survive verbatim in it?** Not a phrase — a whole sentence.
2. **Does that wording's structure survive?** Its sentences, in its order, each doing its job.

**Both questions answer yes or no, never neither** — where you cannot tell whether a sentence
survives, or whether the structure does, the answer is **no**. That is what keeps the four cases
below exhaustive.

**When the two answers agree, they decide. When they disagree, you cannot tell.**

| whole sentences | structure | |
| --- | --- | --- |
| yes | yes | **Stale.** It is that wording, edited. Offer the replacement. |
| no | no | **The owner's.** Written from scratch. Offer nothing. |
| yes | no | **You cannot tell.** A line of ours carried into prose they wrote — or a line they reached themselves. |
| no | yes | **You cannot tell.** Their words in our shape — a reword of ours, or the order the subject naturally takes. |

The two disagreeing cases are not a gap in the test; they are the test reporting honestly that the
evidence points both ways. Say so, show the owner the three texts, and ask. **Do not decide them.**

Match a sentence literally. A shared idea is not a sentence surviving, and a paraphrase of one is not
that sentence — a whole passage does not turn up in prose someone wrote themselves, which is what
makes question 1 worth asking; a memorable phrase does, which is why no phrase answers it.

**A quoted sentence is not an asserted one, and does not count for question 1.** A sentence inside quotation marks, inside a fence, or in
a sentence that disputes it is being *shown*, not followed — the same rule that makes a heading inside
a fenced block not a heading. A section that quotes one in order to reject it is the owner arguing
with this package, which is the strongest sign the prose is theirs.

Once both answers are yes, offer the replacement. Do **not** then read the section's remaining
sentences against the current text and reconsider — that comparison always finds differences, because
differing sentences are what a rewrite is. That applies to the section's other prose only. It
licenses nothing about the two questions, which are answered exactly as written.

**Do not shortcut any of this on the subject a section talks about.** A section that mentions what
model a subagent inherits, or picking one, is not thereby the current wording — anyone can write a
sentence about choosing a model, including on top of a wording retired long ago. Only the two
questions decide, and they decide against the texts themselves.

## Offer this text verbatim

```markdown
## Delegation

If this harness can spawn subagents, delegate the mechanical work and the research whose answer is far smaller than the reading behind it. Keep the judgment calls and the decisions; anything you would finish in less time than briefing it takes, do yourself.

A subagent inherits your model if you do not pick one, and none of your context either way. Pick the cheapest, unless you cannot say what a right answer looks like or could not cheaply tell a wrong one. Give it the context, the why, and what done looks like.
```

## Do not edit it

The wording is fixed. In particular, do not add model names, tiers, or a table of models — the
section is written to stay correct as model lineups change, and naming one breaks that. Offer it
as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `delegation.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** — which sentences the new text rewrote, dropped or
  added against the outgoing one — and pass the gate against the new pair.

The comparison above is checked against the wordings that exist, not against every revision someone
might one day make. How a sentence-level comparison behaves depends on how the two texts differ, so a
revision is the moment its behaviour is known and the moment it is verified.

Place it at the end of the user's prose, outside the `buddy-agent-harness` managed region.
