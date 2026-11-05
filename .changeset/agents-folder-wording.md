---
'buddy-agent-harness': patch
---

The `init-buddy-agent-harness` skill now says what it scaffolds, `AGENTS.md` and `.agents/skills/`, and treats other `.agents/` folders such as `.agents/agents/` as the project's choice, instead of forbidding them. `init` still creates none of them and still does not call them standard.
