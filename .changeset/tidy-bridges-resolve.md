---
'buddy-agent-harness': patch
---

Judge a skill bridge by where it resolves, not by how it is spelled.

`init` and `doctor` both decided a symbolic link was correct by comparing its text against the one
relative path `init` writes. A link that resolves to `.agents/skills` but is spelled differently —
one a user wrote as an absolute path, or any repository reached through a symbolic link in a parent
directory — was read as a foreign target: `doctor` reported it `stale` and `init` refused to run
without `--force`. Both now compare resolved paths, so a bridge that works reports as working.

Write the link target the way the platform resolves it. Windows resolves a relative junction target
against the process directory rather than the link's own, so the target is now absolute there and
stays relative everywhere else, where a relative link survives the repository moving.
