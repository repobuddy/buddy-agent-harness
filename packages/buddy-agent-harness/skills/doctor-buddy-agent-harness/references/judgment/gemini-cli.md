# Gemini CLI

Reads `.agents/skills` at both scopes, so **skills need no bridge**. It does not read `AGENTS.md`, so **the instruction bridge is required**.

## Skills — nothing to write

`.agents/skills` is read directly at project scope, where the alias takes precedence over `.gemini/skills/`. `init` writes no skills bridge for Gemini CLI.

An existing `.gemini/skills` symlink still resolves — that path is still scanned. Leave it; removing it is not part of enabling this harness.

## Instructions — required

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
