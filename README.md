# buddy-agent-harness

Initialize `.agents/skills/` for the coding-agent harnesses enabled in a consumer repository.

```sh
npx -y buddy-agent-harness init
```

To mount the same command on `bd`, install the package alongside `repobuddy` and declare its plugin module in the consumer repository's `.repobuddy.json`:

```json
{
  "plugins": ["buddy-agent-harness"]
}
```

Then run `bd harness init`. `repobuddy` deliberately loads plugins declared in this configuration; it does not scan installed dependencies.

Claude Code receives relative per-skill links unconditionally. Cursor, Codex, Copilot CLI, and Windsurf are configured only when their documented skills path already exists. The command is non-interactive, reports TOON by default, and records its enabled harnesses in `.agents/buddy-agent-harness/config.json`.
