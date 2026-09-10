---
'buddy-agent-harness': minor
---

`enhance` now detects a section carrying an outdated version of an addition it ships, and offers the current wording as a replacement.

Coverage was judged by meaning alone, so a repository holding an earlier form of `## Delegation` read as covered and the current text was never surfaced. Coverage is now two questions: the first is unchanged, and only text that reads as covered is asked the second — is it a recognizable earlier form of the addition's own wording? Each addition's reference file states that criterion under `## Stale when`, beside `## Covered when`.

Guidance you wrote yourself clears the first question and never reaches the second, so nothing weighs your words against this package's. A replacement is offered under the same approval gate as an addition, shows the section it would replace, and on approval changes that section and nothing else in the file.
