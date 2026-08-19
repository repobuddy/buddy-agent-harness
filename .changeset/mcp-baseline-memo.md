---
'buddy-agent-harness': patch
---

`doctor` reads each file once per commit while deciding which side of a diverged MCP server moved.

Naming the side that moved walks git history for the newest commit where the golden set and the harness config agreed on a field. That walk ran once per diverged field and re-read and re-parsed both files at every commit each time: three targets, five servers, two diverged fields each and fifty commits of history is on the order of three thousand `git show` calls and as many parses. Drift is the case the walk exists for, and the shipped `doctor` skill says the command is cheap enough to run from a session-start hook.

The parse is now memoized per commit and file, and the commit walk per target, for the lifetime of the one diagnosis. The reported direction is unchanged.
