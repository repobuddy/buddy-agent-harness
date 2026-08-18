---
'buddy-agent-harness': patch
---

`init` now says how to edit a user-authored settings file: amend it in place rather than round-tripping it through `JSON.parse`, keeping key order, indentation, and comments. `.gemini/settings.json` legally carries comments that a whole-file rewrite would silently delete; `.claude/settings.json` rejects them outright, so nothing may add one.
