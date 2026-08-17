# Addition: Delegation

## Covered when

The merged view already tells the agent **when to hand work to a subagent**. Any of these counts:

- guidance on what to delegate and what to keep, under any heading
- a rule about briefing subagents, paired with any sense of when to spawn one
- an explicit statement that this repository does not use subagents

Naming a subagent tool, or listing available models, is not coverage. Neither is a delegation
rule that appears only in a skill body — this addition is for the always-loaded file.

## Offer this text verbatim

```markdown
## Delegation

If this harness can spawn subagents, delegate bulk-mechanical work and research whose answer is far smaller than the reading behind it. Do it yourself when the brief would cost more than the task — a one-line edit is not worth a subagent. Keep the judgment calls and final decisions; delegate the fact-gathering that feeds them. The cheaper the subagent, the less should break if it gets the answer wrong. Brief every one you spawn: it inherits no context, so give it the context, the why, and what done looks like.
```

## Do not edit it

The wording is fixed. In particular, do not add model names, tiers, or a table of models — the
section is written to stay correct as model lineups change, and naming one breaks that. Offer it
as written or not at all.

Place it at the end of the user's prose, outside the `buddy-agent-harness` managed region.
