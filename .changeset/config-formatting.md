---
'buddy-agent-harness': patch
---

Stop reformatting `.agents/repobuddy/config.json` on every run.

The record was always written with two-space indentation, so in a repository whose formatter wants something else — tabs, four spaces — `init` failed that repository's own format check immediately, and again after every re-run.

Indentation is now taken from the file itself when it exists, then from the repository's `.editorconfig`, then two spaces. EditorConfig is the one indentation preference editors and formatters already agree to read, so there is no new setting to configure.

More importantly, a run that changes nothing now writes nothing. This package is not a formatter and cannot match every rule a formatter has — line width and array packing have no `JSON.stringify` equivalent — so the fix is not to guess at those rules but to leave a file alone when its content is already correct. A repository can format the record however it likes and re-run `init` without the formatting being undone.
