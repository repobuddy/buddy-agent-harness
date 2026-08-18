---
title: Gemini CLI
description: Gemini CLI reads .agents/skills at both scopes, and needs AGENTS.md added to context.fileName.
---

Gemini CLI reads `.agents/skills` at **both scopes** — `~/.agents/skills` for the user, and `.agents/skills/` inside a repository, where that alias takes precedence over `.gemini/skills/`. It does not read `AGENTS.md`. So it needs the instruction bridge and no skills projection.

## Skills: nothing to write

`init` writes no skills bridge for Gemini CLI. Enabling it is free — nothing is created in the repository.

A `.gemini/skills` symlink written before this was established still resolves, because that path is still scanned. It is redundant, not broken; nothing has to be torn out.

Until 2026-08-18 this page said Gemini CLI read only `.gemini/skills/` in a repository. That was wrong: the vendor's discovery code reads the `.agents/skills` alias at workspace scope as well, and has since at least 2026-04-30.

## Instructions: required

The CLI does **not** write this one, and it cannot be a link. Add `AGENTS.md` to `context.fileName` in `.gemini/settings.json`:

```json
{
  "context": {
    "fileName": ["AGENTS.md", "GEMINI.md"]
  }
}
```

`AGENTS.md` is not in the default list. **Without this edit, Gemini CLI gets no instructions at all** from a repository that consolidated into `AGENTS.md`.

When the settings file already exists:

- It is user-authored, so approval comes first.
- Add to the array; do not replace it. Preserve every surrounding setting.
- Comments are legal in this file, and a parse-and-rewrite deletes them. Edit the array in place, keeping key order and indentation. See [JSON configuration disagrees about comments](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments).
- Keep `GEMINI.md` in the list if the repository still has one.

## Not the same as Antigravity

Both are Google's, and both read the canonical directory in a repository, but they are still separate targets. Antigravity's user-scope skills live under `~/.gemini/config/skills/`, not `~/.agents/skills/`, and it is not selectable via `--harness` because it documents no project-scope directory to detect on. Enabling one says nothing about the other.

## Reference

- [Gemini CLI: skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/skills.md)
- [Gemini CLI: `storage.ts`](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/storage.ts) — the discovery paths in the vendor's own source
