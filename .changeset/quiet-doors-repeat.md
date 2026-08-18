---
'buddy-agent-harness': minor
---

`doctor` now verifies the instruction bridges as well as the skill bridges. It reports a new `instructions` section covering the root `CLAUDE.md` import, one stub per nested `AGENTS.md`, and the `context.fileName` entry in `.gemini/settings.json`, gated per harness the same way the skill bridges are. Every repair there is `/buddy-agent-harness:init`: those files carry prose someone wrote, so restoring a bridge without discarding what displaced it is the `init` skill's judgment.

The harness registry records an `instructionBridge` per harness scope, so the checked set cannot drift from what the `init` skill writes.
