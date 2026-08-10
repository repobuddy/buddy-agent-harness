---
status: draft
name: buddy-agent-harness
project-path: packages/buddy-agent-harness
produced-by:
  spec-producer: sdd:automaton
---

# buddy-agent-harness

> Root project spec — descriptive index for the published npm plugin at `packages/buddy-agent-harness`.

## What this is

Buddy Agent Harness initializes a repository-local canonical skill directory and links its skills into supported coding-agent harnesses. Its npm package publishes the CLI, plugin metadata, and shipped skills; `.agents/` is excluded by the package allowlist, so this project spec is colocated safely.

## Placement map — strategy: mirror-source

This project mirrors its source surfaces so a contributor can find a spec beside the corresponding implementation or shipped artifact.

| Source | Spec node |
| --- | --- |
| `skills/<skill>/` | `skills/<skill>/` |
| `src/` CLI behavior | `cli/` |
| build, packaging, and release configuration | `tooling/` |
| project-wide rules and decisions | `design/` |
| cross-capability flows | `workflows/` |

### Where a new concept lives

- A shipped skill's observable behavior lives at `skills/<skill>/`.
- A CLI behavior lives under `cli/`.
- Build, packaging, and release behavior lives under `tooling/`.
- A project-wide rule or rationale lives under `design/`; decisions are appended under `design/decisions/`.
- A flow that crosses skill and CLI surfaces lives under `workflows/`.

## Behavioral nodes

| Node | Subject |
| --- | --- |
| [`skills/harness-init/`](./skills/harness-init/README.md) | Initialize canonical skills across enabled coding-agent harnesses |
| [`cli/`](./cli/README.md) | Expose the package's command-line product surface — stub |

## Backfill gap

The project implementation predates this SDD spec. The CLI and the remaining shipped or tooling surfaces are still stubs; `harness-init` is the first backfilled behavioral node.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
| --- | --- |

<!-- END generated: by-concept -->
