# Gemini CLI

Reads `.agents/skills` at **user scope only**. At project scope it reads `.gemini/skills/` and nothing else, so **both bridges are required**.

Do not enable Gemini CLI speculatively — unlike Cursor, enabling it writes a real directory and symlink. Enable it only via `--harness gemini-cli` or a pre-existing `.gemini/` directory.

## Bridge 1 — skills

`buddy-agent-harness init` creates this when `gemini-cli` is enabled:

```
.gemini/skills → ../.agents/skills
```

## Bridge 2 — instructions

`init` does **not** do this, and it cannot be a link. Add `AGENTS.md` to `context.fileName` in `.gemini/settings.json`:

```json
{
  "context": {
    "fileName": ["AGENTS.md", "GEMINI.md"]
  }
}
```

`AGENTS.md` is not in the default list. **Without this edit Gemini CLI gets no instructions at all** from a repository that consolidated into `AGENTS.md`.

When the file already exists:

- Get approval first — it is user-authored.
- Add to the array; do not replace it. Preserve surrounding settings.
- **Comments are legal in this file.** Gemini CLI strips them before parsing, so a user's settings may carry them, and `JSON.parse` on the whole file deletes every one. Make a targeted edit to the `context.fileName` array instead of a parse-and-rewrite, and leave key order and indentation as the author left them. `.claude/settings.json` is the opposite case; see `claude-code.md`.
- Keep `GEMINI.md` in the list if the repository still has one.
