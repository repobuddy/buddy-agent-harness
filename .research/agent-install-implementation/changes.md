# Changes — `agent-install` Implementation

## 2026-08-18 — Initial entry, and two defects fixed in our own bridge handling

**What changed**: E-AI-01 through E-AI-08 added. Entry created.

**Why**: The user asked whether this project could benefit from `agent-install`, then asked for the
implementation to be inspected for anything worth learning.

**Material conclusions**:

- **Do not depend on the package.** Its skill projection writes into four harnesses that read
  `.agents/skills` natively, and its provenance is thin — all `0.0.x`, single maintainer, no
  verifiable source. E-AI-06, E-AI-08.
- **Two defects found in our code and fixed.** `init` and `doctor` judged a bridge by its link text
  rather than by where it resolved, so a correctly-resolving link spelled differently reported as
  stale and demanded `--force`; and the link type was `junction` unconditionally with a relative
  target, which Windows resolves against the wrong directory. E-AI-07.
- **`init`'s "no safe cross-harness mapping exists" claim about MCP is refuted as written.** The
  mapping exists across fourteen hosts. What survives is that it is not lossless, which is a
  different statement and needs different handling. E-AI-02.
- **Fence-aware heading matching is a real requirement here**, not a general nicety: the text
  `enhance` offers is a fenced block containing a literal `## Delegation` heading. E-AI-01.
- **Terminal-escape stripping is not needed yet and was deliberately not added.** It becomes needed
  the moment anything here reads and prints a value out of a `SKILL.md`. E-AI-05.

**Triggering evidence**: E-AI-01, E-AI-02, E-AI-05, E-AI-06, E-AI-07, E-AI-08.
