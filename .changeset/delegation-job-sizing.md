---
'buddy-agent-harness': patch
---

The `enhance` skill's `## Delegation` section now sizes the job rather than the step: a job made of many routine steps, or of waiting on something outside the agent, goes to a subagent as one job. It also splits a job by what each part needs, sending a hard part to whichever model does it best, and has the brief name what the user authorized and what the subagent must not do.

A repository holding the previous wording is offered the new one as a replacement.
