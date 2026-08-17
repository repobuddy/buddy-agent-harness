---
'buddy-agent-harness': patch
---

Use "agent harness" as the single term for a coding-agent runtime.

The published package description, the three plugin manifests, both READMEs, the project spec, and the `init` skill's `description` all said "coding-agent harness" while the rest of the project said "agent harness". One concept carried two names across exactly the metadata a user reads first, in a package whose own name is `buddy-agent-harness`.

Only the wording changes. The clause edited in the skill `description` sits after the harness names that do the trigger matching, so when the skill loads is unaffected.
