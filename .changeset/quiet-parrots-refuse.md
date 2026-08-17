---
'buddy-agent-harness': patch
---

Name the launcher relative to the skill, without a placeholder.

Both skills said `node "<skill>/scripts/<name>.mjs"`, which asked the reader to substitute something the agent already knows. An agent reads the `SKILL.md` from a directory, so `node scripts/<name>.mjs` resolves against that directory on its own.

`node` stays in front. The launcher ships as mode `100644`, so its shebang never runs it, and on Windows a shebang does nothing regardless of mode. Naming the file alone would fail on both counts.
