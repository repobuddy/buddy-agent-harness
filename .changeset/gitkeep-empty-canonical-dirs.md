---
"buddy-agent-harness": minor
---

`init` writes an empty `.gitkeep` into `.agents/skills/` and `.agents/references/` when it leaves them empty, so a commit and clone keep the directories and `.claude/skills` does not dangle.
