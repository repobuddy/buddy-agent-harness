---
'buddy-agent-harness': minor
---

The `enhance` skill now offers a fourth addition, `## References as links`. It tells the agent to write each issue, pull request, or commit it mentions as a Markdown link to its page rather than a bare `#222`, which is a link only on GitHub itself and names the wrong repository when the agent works across several.

It is gated like the other three. The skill offers it only where the merged instructions do not already cover the subject, recommends the owner's global instruction file over the repository's `AGENTS.md`, and writes nothing without approval. Its history file starts empty, so a section already in a file is compared against the current text, and no harness scores this wording yet, so where the skill cannot tell whose a section is, it offers two answers rather than three.
