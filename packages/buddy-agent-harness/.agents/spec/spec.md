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
| [`skills/init/`](./skills/init/README.md) | What the `init` skill consolidates, declines to invent, and writes without asking |
| [`skills/repair/`](./skills/repair/README.md) | Correct agent configuration that is present and wrong |
| [`cli/`](./cli/README.md) | Index over the package's command-line product surface |
| [`cli/bridge-resolution/`](./cli/bridge-resolution/README.md) | Report whether every skills bridge still resolves into `.agents/skills` |
| [`cli/instruction-bridges/`](./cli/instruction-bridges/README.md) | Report whether every enabled harness can still read `AGENTS.md` |
| [`cli/configuration-diagnosis/`](./cli/configuration-diagnosis/README.md) | Report agent configuration that is present and wrong |
| [`cli/mcp-diagnosis/`](./cli/mcp-diagnosis/README.md) | Report drift between a golden MCP server set and the harness copies of it |
| [`cli/nonstandard-configuration/`](./cli/nonstandard-configuration/README.md) | Report agent configuration that only one harness can read |
| [`cli/diagnosis-report/`](./cli/diagnosis-report/README.md) | The one output shape every finding family is reported through |
| [`cli/entry-point/`](./cli/entry-point/README.md) | Reach a command without going through the process |
| [`cli/command-output/`](./cli/command-output/README.md) | How a command's result becomes the bytes on stdout |
| [`workflows/`](./workflows/README.md) | Index over the flows that cross the skill and CLI surfaces |
| [`workflows/detect-and-repair/`](./workflows/detect-and-repair/README.md) | The contract between `doctor` and the skills that correct what it finds |

## Backfill gap

The project implementation predates this SDD spec. `harness-init` was the first backfilled behavioral node.

The `doctor` command is now described in full: every finding family under `cli/`, the output shape they share at `cli/diagnosis-report/`, and the cross-surface flow they feed at `workflows/detect-and-repair/`. How that command is reached at all is at `cli/entry-point/`, and how any command's result becomes bytes is at `cli/command-output/`. The `init` skill — as distinct from the `init` command at `skills/harness-init/` — is at `skills/init/`.

What is still outstanding:

- **`tooling/`**, still a reference stub over the build, packaging, and release surfaces.
- **`skills/enhance/`** and **`skills/doctor/`**, shipped skills with no node of their own; the `doctor` skill's content is generated from the same guidance table the command reports from.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
| --- | --- |

<!-- END generated: by-concept -->
