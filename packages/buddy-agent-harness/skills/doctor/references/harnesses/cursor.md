<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# cursor

## Project scope

Where `doctor` looks inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.cursor` |
| skills projection | none — reads `.agents/skills` natively |
| instruction bridge | none |
| MCP configuration | `.cursor/mcp.json` — the `mcpServers` key, json |

## User scope

Described, never written: `init` and `doctor` both work inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.cursor` |
| skills projection | none — reads `.agents/skills` natively |
| instruction bridge | none |
| MCP configuration | none |

## Configuration only this harness reads

Reported by `doctor` so it can be converted; see `../nonstandard.md` for what each conversion is.

| Path | Kind | Converts to |
| --- | --- | --- |
| `.cursorrules` | instructions | `AGENTS.md`, with a generated bridge left behind |
| `.cursor/rules/` | rule | a skill, where the path scoping is incidental |
| `.cursor/commands/` | command | `.agents/skills/<name>/SKILL.md` |
| `.cursor/skills/` | skill | `.agents/skills`, projected back if needed |

## Judgment about this harness

What to generate for it, what to leave alone, and which claims are contested: `../../../init/references/harnesses/cursor.md`. That page is hand-written and is the one to read before writing anything for this harness.
