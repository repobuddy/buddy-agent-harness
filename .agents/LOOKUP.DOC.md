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
| a score, run count, or task from the List identifiers wording evaluation | `.agents/skills/eval-list-identifiers/references/backlog.md` |
| how to run an agent blind, without the host's user-scope instructions | `.agents/skills/eval-delegation/scripts/blind-claude.mjs`; the run policy for the `enhance` suite is in `packages/buddy-agent-harness/.agents/spec/skills/enhance/README.md` |
| a term the spec suite binds | `packages/buddy-agent-harness/.agents/spec/glossary.md` |
| a correction to a claim already published | `apps/web/src/content/docs/sources.md`, Corrections section (rule in `CONTRIBUTING.md`) |
| how a test must reach a table the source keeps | `CONTRIBUTING.md`, "Writing a test against a table the source keeps" |
| which command gates a change before it ships | `turbo.json`, the `verify` task — `pnpm verify` runs every step in it, the docs-site build included |
| whether a harness's JSON config accepts comments | `apps/web/src/content/docs/agent-configuration/harness-differences.md` |
| where a harness keeps its MCP servers, and what the golden set is | `apps/web/src/content/docs/agent-configuration/mcp-servers.md` |
| whether an MCP configuration location is standardizing | `.research/mcp-canonical-location/evidence.md` |
| how each harness spells an MCP server entry — transport, references, timeout | `.research/mcp-canonical-location/evidence.md` (E-MCP-12 to E-MCP-16); the code is `packages/buddy-agent-harness/src/mcp-dialects/mcp-dialects.ts` |
| the marketplace and plugin install commands | `apps/web/src/content/docs/getting-started/introduction.md`, repeated in both `README.md` files and in `docs/index.mdx` and `docs/skills/index.md` |

## Generated tables

| Table naming… | Generated from |
| --- | --- |
| harness names, and per scope their detection directories and projection targets | `packages/buddy-agent-harness/src/harness-registry/harness-registry.ts` |
| the `doctor-buddy-agent-harness` skill's finding-and-repair table | `packages/buddy-agent-harness/src/diagnose-bridges/doctor-guidance.ts` |
| per-harness project-scope MCP file, key, and format | `packages/buddy-agent-harness/src/harness-registry/harness-registry.ts` |
| CLI commands and options | `packages/buddy-agent-harness/src/cli.ts` |
| `llms.txt`, in the package and in `apps/web/public/` — CLI commands, skills, library exports, docs pages | `packages/buddy-agent-harness/scripts/generate-llms-txt.ts`, from `src/cli.ts`, `skills/*/SKILL.md`, `src/index.ts`, and the docs pages' frontmatter |
