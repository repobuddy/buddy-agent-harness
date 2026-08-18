# LOOKUP.DOC

Where to look when writing or checking documentation in this repository. Pointers only.

## Claims

| To check or place… | Look in |
| --- | --- |
| a claim about another vendor's product | `.research/<topic>/evidence.md` |
| what the code must do | `packages/*/.agents/spec/` |
| harness paths and the canonical layout | `apps/web/src/content/docs/reference/configuration-layout.md` |
| which harness needs a projection or a bridge | `apps/web/src/content/docs/agent-configuration/harness-differences.md` |
| a term used on the site | `apps/web/src/content/docs/reference/glossary.md` |
| a score, run count, or task from the Delegation wording evaluation | `.agents/skills/eval-delegation/references/backlog.md` |
| a term the spec suite binds | `packages/buddy-agent-harness/.agents/spec/glossary.md` |
| a correction to a claim already published | `apps/web/src/content/docs/sources.md`, Corrections section (rule in `CONTRIBUTING.md`) |
| whether a harness's JSON config accepts comments | `apps/web/src/content/docs/agent-configuration/harness-differences.md` |
| where a harness keeps its MCP servers, and what the golden set is | `apps/web/src/content/docs/agent-configuration/mcp-servers.md` |
| whether an MCP configuration location is standardizing | `.research/mcp-canonical-location/evidence.md` |
| the marketplace and plugin install commands | `apps/web/src/content/docs/getting-started/introduction.md`, repeated in both `README.md` files and in `docs/index.mdx` and `docs/skills/index.md` |

## Generated tables

| Table naming… | Generated from |
| --- | --- |
| harness names, and per scope their detection directories and projection targets | `packages/buddy-agent-harness/src/harness-registry/harness-registry.ts` |
| the `doctor` skill's finding-and-repair table | `packages/buddy-agent-harness/src/diagnose-bridges/doctor-guidance.ts` |
| per-harness project-scope MCP file, key, and format | `packages/buddy-agent-harness/src/harness-registry/harness-registry.ts` |
| CLI commands and options | `packages/buddy-agent-harness/src/cli.ts` |
