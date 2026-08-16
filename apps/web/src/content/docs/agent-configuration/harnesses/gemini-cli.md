---
title: Gemini CLI
description: Gemini CLI reads .agents/skills at user scope only, and needs AGENTS.md added to context.fileName.
---

Gemini CLI reads `.agents/skills` at **user scope only** (`~/.agents/skills`). At project scope it reads `.gemini/skills/` and nothing else. Both bridges are required.

Do not enable Gemini CLI speculatively. Unlike Cursor, enabling it writes a real directory and symlink, so it is enabled only via `--harness gemini-cli` or a pre-existing `.gemini/` directory.

```sh
buddy-agent-harness init --harness gemini-cli
```

## Bridge 1: skills

`buddy-agent-harness init` creates this when `gemini-cli` is enabled:

```text
.gemini/skills → ../.agents/skills
```

## Bridge 2: instructions

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
- Keep `GEMINI.md` in the list if the repository still has one.

## Not the same as Antigravity

Gemini CLI and Antigravity are both Google's and sit on opposite sides of the line. Antigravity reads `<workspace-root>/.agents/skills/` and needs nothing written for it. Enabling one says nothing about the other.

## Reference

- [Gemini CLI: skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/skills.md)
