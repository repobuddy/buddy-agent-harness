---
'buddy-agent-harness': patch
---

The `init-buddy-agent-harness` skill now states three rules it relied on the reader to infer. Declining one step drops only that write, and the other approved steps go ahead without being asked again. Creating a `.gemini/settings.json` that does not exist yet needs no approval. The report gives the reason each canonical-only artifact was left alone.
