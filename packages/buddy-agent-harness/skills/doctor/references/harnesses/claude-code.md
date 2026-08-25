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

## Configuration only this harness reads

Reported by `doctor` so it can be converted; see `../nonstandard.md` for what each conversion is.

| Path | Kind | Converts to |
| --- | --- | --- |
| `.claude/commands/` | command | `.agents/skills/<name>/SKILL.md` |
| `.claude/rules/` | rule | a skill, where the path scoping is incidental |
| `.claude/agents/` | subagent | nothing yet — no cross-harness format exists |

## Judgment about this harness

What to generate for it, what to leave alone, and which claims are contested: `../../../init/references/harnesses/claude-code.md`. That page is hand-written and is the one to read before writing anything for this harness.
