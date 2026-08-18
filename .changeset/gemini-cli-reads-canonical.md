---
'buddy-agent-harness': minor
---

Stop projecting `.agents/skills` into `.gemini/skills`. Gemini CLI reads the `.agents/skills` alias at project scope as well as user scope, and that alias takes precedence over `.gemini/skills` in each tier — confirmed against the vendor's own discovery code (`packages/core/src/config/storage.ts`, `packages/core/src/skills/skillManager.ts`) and its skills documentation, recorded as E-GEM-02.

`init` now writes nothing for `gemini-cli`, and `doctor` no longer reports a `.gemini/skills` bridge for it. Claude Code is the only harness left with a skills projection. Gemini CLI's instruction bridge is unaffected: it still does not read `AGENTS.md`, so `context.fileName` in `.gemini/settings.json` still has to name it.

An existing `.gemini/skills` symlink keeps working — that path is still scanned — so nothing has to be removed from a repository that already has one.
