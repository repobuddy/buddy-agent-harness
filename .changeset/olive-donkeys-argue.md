---
'buddy-agent-harness': minor
---

Add an `enhance` skill that offers guidance a repository's `AGENTS.md` is missing.

`init` consolidates what a repository already has and bridges the harnesses that cannot read it. It carries no opinions, which is what makes it safe to run anywhere. `enhance` is the other half: it proposes content the repository does not have, one vetted section at a time, and writes only what you approve. `init` now ends by asking whether to run it.

Detection decides every run. `enhance` reads the root `AGENTS.md` together with any harness instruction file whose content still belongs in it, because that combined text is what an agent effectively reads — guidance living in a Cursor always-on rule counts as already present. It reads those files and never consolidates them; that stays `init`'s work. Coverage is judged by meaning rather than by heading, so a repository covering the subject under its own wording is left alone.

One addition ships: a `## Delegation` section telling an agent when to hand work to a subagent, when to do the work itself, which decisions to keep, and what every brief must carry. It names no model, vendor, or version, so it does not go stale as model lineups change.
