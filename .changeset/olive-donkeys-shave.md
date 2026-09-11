---
'buddy-agent-harness': minor
---

`enhance` now spots a section carrying a wording it has since retired, and offers the current one in its place.

Coverage was judged by meaning alone, so a repository holding an earlier form of `## Delegation` read as covered and the current text was never surfaced. Coverage is now two questions: the first is unchanged, and only text that reads as covered is asked the second, which is about provenance rather than meaning — did this text come from the addition, at a wording it used to ship?

A present section is checked against the text the addition would offer before anything else: a section that already is that text is reported as already current, not as the owner's own, and nothing is offered. Otherwise each addition keeps every wording it has retired, verbatim, beside it; `references/delegation.history.md` is the first. To decide whether a section is stale, it is compared against those — never weighed against the text that would be offered, since differing from it is what a rewrite produces. A section reproducing one, edits and all, gets the replacement offered under the same approval gate as an addition, and on approval only that section changes. A section written from scratch on the same subject is left alone. Where it is honestly neither — part of a retired wording inside prose the owner clearly wrote — the skill says it cannot tell, shows all three texts, and asks rather than guessing.

That question carries three answers, and the third is to settle it by measurement: the repository's own evaluation harness, where it has one, scores the existing section against the current wording and reports both. This package's own repository uses its `eval-delegation` skill; a consumer repository has its own or none, and the skill checks before offering it. The replacement is offered only if the current wording wins; a section that scores level or better is kept, and said to be kept. It is never run unasked.
