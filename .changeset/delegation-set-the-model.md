---
"buddy-agent-harness": minor
---

`enhance`: rewrite the Delegation section around what a subagent inherits.

The previous wording stated three overlapping versions of "delegate or not", buried its one
mechanical fact in a subclause, and told the agent that the cheaper a subagent is the less should
break if it is wrong — a bound that never asked for an act, so an agent could satisfy it while
never choosing a model at all. That is the default which inherits the parent's model.

The section now leads the second half with the fact that explains both remaining rules: a subagent
inherits your model unless you choose one, and none of your context either way. The two tests for
moving up a rung are things the agent can check about its own position — whether it can state a
right answer, and whether it could tell a wrong one cheaply — rather than a prediction about a
model it has not run. 18 words shorter.
