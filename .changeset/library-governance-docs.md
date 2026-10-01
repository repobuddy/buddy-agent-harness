---
"buddy-agent-harness": patch
---

Mark the governance library exports deprecated with a `@deprecated` tag naming each one's `reference` replacement, such as `resolveGovernance` to `resolveReference`. They keep their behavior until the next major version. The shipped `llms.txt` now links them to their new documentation page instead of their source.
