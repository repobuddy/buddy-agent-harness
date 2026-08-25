<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# claude-code

## Project scope

Where `doctor` looks inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.claude` |
| skills projection | `.claude/skills` — written by `init` |
| instruction bridge | `CLAUDE.md` — an import of `AGENTS.md` |
| MCP configuration | `.mcp.json` — the `mcpServers` key, json |

## User scope

Described, never written: `init` and `doctor` both work inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.claude` |
| skills projection | `.claude/skills` — written by `init` |
| instruction bridge | none |
| MCP configuration | none |

## Judgment about this harness

What to generate for it, what to leave alone, and which claims are contested: `../../../init/references/harnesses/claude-code.md`. That page is hand-written and is the one to read before writing anything for this harness.
