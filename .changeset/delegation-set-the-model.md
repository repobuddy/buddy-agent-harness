---
"buddy-agent-harness": minor
---

Rewrite the Delegation section `enhance` offers so it tells the agent to pick a spawned subagent's model.

The previous wording bounded how cheap a subagent may be but never asked for the choice, so an
unset model kept inheriting the parent's. The section now names that inheritance, and makes the
cheapest model the pick unless the agent cannot say what a right answer looks like or could not
cheaply tell a wrong one.
