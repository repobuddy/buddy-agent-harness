# Addition: Delegation

## Covered when

The merged view already tells the agent **when to hand work to a subagent**. Any of these counts:

- guidance on what to delegate and what to keep, under any heading
- a rule about briefing subagents, paired with any sense of when to spawn one
- an explicit statement that this repository does not use subagents

Naming a subagent tool, or listing available models, is not coverage. Neither is a delegation
rule that appears only in a skill body — this addition is for the always-loaded file.

## Stale when

All three hold of a `## Delegation` section already in the file:

- it carries this span **character for character**, as its own instruction:

  > whose answer is far smaller than the reading behind it

- it says a spawned subagent inherits **no context**
- it says nothing about what **model** a subagent inherits, and nothing about picking one

The first condition establishes that the section came from **this file**; the other two establish
that it came from an **earlier version** of it.

The span is one nobody arrives at independently, and that is the only reason it can stand for
provenance. So match it literally: a shared idea is not the span, and a paraphrase of it is not the
span either — a paraphrase is evidence somebody wrote their own. Ordinary phrasing that happens to
appear in both wordings is not a substitute for it, however much of it a section carries.

**A quoted span is not an asserted one.** A span inside quotation marks, inside a fence, or in a
sentence that disputes it is being *shown*, not followed — the same rule that makes a heading inside
a fenced block not a heading. A section that quotes the span in order to reject it is the owner
arguing with this package, which is the strongest sign the prose is theirs. Reading which of the two
it is, is part of matching the condition.

Once all three hold, offer the replacement. Do **not** then read the section's remaining sentences
against the current text and reconsider — that comparison always finds differences, because
differing sentences are what a rewrite is. That applies to the section's other prose only. It
licenses nothing about the three conditions, which are matched exactly as written.

Not stale:

- a section that states what model a subagent inherits, or tells the agent to pick one — that is
  the current text
- a section not carrying the span as its own instruction, however close its meaning, and whatever
  heading it sits under. Coverage is judged by meaning. Staleness is judged by these three
  conditions and nothing else.

Where you cannot tell whether a condition holds, it does not hold.

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

If the text is ever revised again, update `## Stale when` in the same change. Its span has to survive
in both the outgoing and the incoming wording, and its last two conditions have to name something
the outgoing text lacks. Pick a span nobody would write independently — a distinctive turn of
phrase, never an ordinary one that merely happens to appear in both.

Place it at the end of the user's prose, outside the `buddy-agent-harness` managed region.
