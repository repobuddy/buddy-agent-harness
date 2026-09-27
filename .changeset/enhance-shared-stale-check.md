---
'buddy-agent-harness': patch
---

The `enhance` skill now states its stale check once, in the skill itself, instead of inside the `## Delegation` reference. Each addition's reference names only its own history file and what is specific to it, so revising one addition's reference no longer changes how the other is judged. The already-current and already-global checks now share one stated containment test. How a section is classified is unchanged.
