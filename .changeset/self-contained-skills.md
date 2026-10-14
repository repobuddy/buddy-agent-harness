---
'buddy-agent-harness': patch
---

Makes the shipped skills self-contained, for channels that link or copy one skill alone (pnpm 12.11 links each as `pnpm-buddy-agent-harness-<skill>`). The `npx` fallback is pinned to the exact release rather than a `^` range. A page one skill read from a sibling (`agents-md.md`, `detection.md`, `global-instructions.md`, the per-harness judgment pages) is now copied into the skill that reads it, and checked against its source. Every `/buddy-agent-harness:<skill>` reference, in the skills and in `doctor` output, carries the pnpm name beside it.
