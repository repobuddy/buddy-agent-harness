<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# windsurf

> **Superseded by `devin-desktop`.** The legacy paths still work, so a projection here keeps resolving and `doctor` reports the name as deprecated rather than broken. New repositories should enable `devin-desktop`.

## Project scope

Where `doctor` looks inside a repository.

| What | Path |
| --- | --- |
| detection directory | `.windsurf` |
| skills projection | `.windsurf/skills` — written by `init` |
| instruction bridge | none |
| MCP configuration | none |

No user-scope paths are primary-sourced for this harness, so `doctor` describes none.

## Configuration only this harness reads

Reported by `doctor` so it can be converted; see `../nonstandard.md` for what each conversion is.

| Path | Kind | Converts to |
| --- | --- | --- |
| `.windsurfrules` | instructions | `AGENTS.md`, with a generated bridge left behind |
| `.windsurf/rules/` | rule | a skill, where the path scoping is incidental |
