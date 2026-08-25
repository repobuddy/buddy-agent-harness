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

## Judgment about this harness

What to generate for it, what to leave alone, and which claims are contested: `../../../init/references/harnesses/cursor.md`. That page is hand-written and is the one to read before writing anything for this harness.
