---
'buddy-agent-harness': minor
---

The `enhance` skill now offers a third addition, `## Session scope`. It tells the agent to keep one session to one subject: finish deciding how something should work before building it, start the build in a new session from what the first one wrote down, and when the user turns to unrelated work, say what the old subject was rather than carrying it into the new one.

It is gated like the other two. The skill offers it only where the merged instructions do not already cover the subject, recommends the owner's global instruction file over the repository's `AGENTS.md`, and writes nothing without approval. No harness scores this wording yet, so where the skill cannot tell whether a section already in a file came from here, it offers two answers rather than three.
