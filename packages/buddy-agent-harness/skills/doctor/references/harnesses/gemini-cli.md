<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# gemini-cli

## Project scope

Where `doctor` looks inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.gemini` |
| skills projection | none — reads `.agents/skills` natively |
| instruction bridge | `.gemini/settings.json` — `AGENTS.md` in the `context.fileName` entry |
| MCP configuration | `.gemini/settings.json` — the `mcpServers` key, json, shared with other settings |

## User scope

Described, never written: `init` and `doctor` both work inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.gemini` |
| skills projection | none — reads `.agents/skills` natively |
| instruction bridge | none |
| MCP configuration | none |

## Configuration only this harness reads

Reported by `doctor` so it can be converted; see `../nonstandard.md` for what each conversion is.

| Path | Kind | Converts to |
| --- | --- | --- |
| `GEMINI.md` | instructions | `AGENTS.md`, with a generated bridge left behind |
| `.gemini/skills/` | skill | `.agents/skills`, projected back if needed |

## Judgment about this harness

What to generate for it, what to leave alone, and which claims are contested: `../../../init/references/harnesses/gemini-cli.md`. That page is hand-written and is the one to read before writing anything for this harness.
