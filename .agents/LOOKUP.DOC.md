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
| a term the spec suite binds | `packages/buddy-agent-harness/.agents/spec/glossary.md` |

## Generated tables

| Table naming… | Generated from |
| --- | --- |
| harness names, detection directories, projection targets | `packages/buddy-agent-harness/src/harness-registry/harness-registry.ts` |
| CLI commands and options | `packages/buddy-agent-harness/src/cli.ts` |
