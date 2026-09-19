---
'buddy-agent-harness': patch
---

The `init` skill now weighs a derived `AGENTS.md` line against the work a repository actually does, not only against whether the fact is worth knowing.

A line that passes the value test can still serve a minority of sessions, and every session pays for it. So a surviving line is now checked for the share of the repository's work it serves — read off the repository's own commit history — and one serving a minority is folded into a line that already earns its place, or cut with a note saying where the repository already catches it. Before cutting, the line is restated in its universal form: a narrow-sounding line is often a narrow phrasing of a fact that covers everything.

Two smaller rules come with it. Where the repository already keeps an index of where facts live, `init` reads it first and then names it in one line, instead of copying its rows into the file that points at it. And a command goes into `AGENTS.md` only after it has been run in the repository and done what the line claims, so a task list read out of a build config — or a second command the first already covers — is caught before it ships.
