---
'buddy-agent-harness': patch
---

Teach the `enhance` skill that a heading inside a fenced code block is not a heading.

Every addition `enhance` offers is a fenced block containing its own heading, so a repository that
documents this tool — or an `AGENTS.md` that quotes an addition — carries the exact heading the
addition would write while remaining entirely uncovered. Coverage is now judged only against the
prose an agent reads as instruction, and the fence is stripped when the approved section is written,
so an addition lands as prose rather than as a code block.
