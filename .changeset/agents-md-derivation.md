---
'buddy-agent-harness': minor
---

Tell the `init` skill what belongs in `AGENTS.md`.

The skill created the file and said not to invent policy, which left a repository with no existing instruction content getting an empty heading. An empty `AGENTS.md` is worse than none: it looks authoritative and invites the next agent to fill it with guesses.

The new `references/agents-md.md` splits the two cases — consolidate existing instruction content preserving its wording, or derive candidates from the repository and confirm each one with the user before writing. Deriving a fact from `package.json` is not invention; asserting a rule nobody agreed to is.

It also carries the test for whether a line earns its place. `AGENTS.md` is read every session, so a fact the agent could get in one read costs more than it returns, and anything a linter or type checker already enforces is a second source of truth that goes stale. What survives is the constraint that fails a build in a non-obvious way, the workflow with an unguessable step, and the decision that resolves a real ambiguity. Everything else is pushed into a skill, where only its description stays resident and the body loads on match.
