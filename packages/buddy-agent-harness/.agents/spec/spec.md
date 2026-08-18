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

Buddy Agent Harness initializes a repository-local canonical skill directory and links its skills into supported agent harnesses. Its npm package publishes the CLI, plugin metadata, and shipped skills; `.agents/` is excluded by the package allowlist, so this project spec is colocated safely.

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
| [`skills/harness-init/`](./skills/harness-init/README.md) | Initialize canonical skills across enabled agent harnesses |
| [`skills/repair/`](./skills/repair/README.md) | Correct agent configuration that is present and wrong |
| [`cli/`](./cli/README.md) | Index over the package's command-line product surface |
| [`cli/bridge-resolution/`](./cli/bridge-resolution/README.md) | Report whether every skills bridge still resolves into `.agents/skills` |
| [`cli/instruction-bridges/`](./cli/instruction-bridges/README.md) | Report whether every enabled harness can still read `AGENTS.md` |
| [`cli/configuration-diagnosis/`](./cli/configuration-diagnosis/README.md) | Report agent configuration that is present and wrong |
| [`cli/mcp-diagnosis/`](./cli/mcp-diagnosis/README.md) | Report drift between a golden MCP server set and the harness copies of it |
| [`cli/diagnosis-report/`](./cli/diagnosis-report/README.md) | The one output shape every finding family is reported through |
| [`workflows/`](./workflows/README.md) | Index over the flows that cross the skill and CLI surfaces |
| [`workflows/detect-and-repair/`](./workflows/detect-and-repair/README.md) | The contract between `doctor` and the skills that correct what it finds |

## Backfill gap

The project implementation predates this SDD spec. `harness-init` was the first backfilled behavioral node.

The `doctor` command is now described in full: every finding family under `cli/`, the output shape they share at `cli/diagnosis-report/`, and the cross-surface flow they feed at `workflows/detect-and-repair/`.

What is still outstanding:

- The **`init` skill's write behavior** — what it consolidates, what it declines to invent, and the bridges it writes without asking. `skills/harness-init/` specifies the `init` **command**; the skill every instruction repair routes to has no node.
- The **shared command output layer** — the TOON/JSON/text encoder and its text rendering, used by both commands, at `src/command-output/`.
- The **CLI entry-point contract** — how the package is called and what it answers with. Its home is held open at `cli/entry-point/`.
- **`tooling/`**, still a reference stub over the build, packaging, and release surfaces.
- **`skills/enhance/`** and **`skills/doctor/`**, shipped skills with no node of their own; the `doctor` skill's content is generated from the same guidance table the command reports from.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
| --- | --- |

<!-- END generated: by-concept -->
