# buddy-agent-harness

Initialize `.agents/skills/` for the coding-agent harnesses enabled in a consumer repository.

```sh
npx -y buddy-agent-harness harness init
```

Claude Code receives relative per-skill links unconditionally. Cursor, Codex, Copilot CLI, and Windsurf are configured only when their documented skills path already exists. The command is non-interactive, reports TOON by default, and records its enabled harnesses in `.agents/buddy-agent-harness/config.json`.
