---
name: harness-update
description: "Use when refreshing this repository's harness support data — after a harness-drift issue, when a vendor changes a skills path or instruction file, when adding a harness to the registry, or on requests like \"check if the harness table is still accurate\", \"is Windsurf still right\", or \"update the harness research\"."
---

# Updating harness support data

This repository documents a moving target: other vendors' configuration formats. Its characteristic failure is a stale or unsourced vendor claim surviving in a table long after the vendor changed it. This skill is the loop that catches that.

Two inputs feed it. `scripts/harness-drift.mjs` watches the one machine-readable source and files an issue weekly. Everything else — instruction files, rules, MCP, hooks — has no such source and only changes when someone looks.

## 1. Establish what changed

If a `harness-drift` issue triggered this, start from its findings. Otherwise run the check yourself:

```sh
node scripts/harness-drift.mjs
```

**Treat an upstream mismatch as a question, not an answer.** `vercel-labs/skills` classifies an agent by whether its *single* `skillsDir` equals `.agents/skills`. That is a narrower test than ours in two ways, and both directions produce false signals:

- A harness reading `.agents/skills` **among several paths** is non-universal upstream but native to us — upstream would symlink it, we write nothing.
- Upstream tracks the skills axis only. A harness can be perfectly "universal" there and still need an instruction bridge.

So upstream is a tripwire, never a source. Confirm every finding against the vendor.

**A clean drift run is not evidence the data is current.** The check watches one secondary source on one axis, and that source has already lagged a rebrand by months. Periodically re-verify the harnesses no finding has touched. Broadening this to primary vendor sources is tracked in [issue #8](https://github.com/repobuddy/buddy-agent-harness/issues/8).

## 2. Research against primary sources

For each harness in question, answer both axes separately. They are independent, and conflating them is the most common error here.

| Axis | Question | Consequence |
| --- | --- | --- |
| Skills | Does it read `.agents/skills/` at **project** scope? | native, or needs a projection |
| Instructions | Does it read `AGENTS.md`? | nothing, or needs a bridge |

Watch for the traps that have already bitten this repository:

- **User scope is not project scope.** Gemini CLI reads `.agents/skills` at user scope while reading `.gemini/skills` at project scope. Only project scope decides a projection.
- **A vendor may scan many paths.** Devin scans nine. Reading the canonical path among them still makes it native.
- **Modes differ.** Cursor reads `AGENTS.md` in Agent mode only.
- **Products under one brand differ.** Gemini CLI and Antigravity are both Google's and sit on opposite sides of the projection line.
- **Rebrands.** Windsurf became Devin Desktop, and the change altered behavior, not just the name.

Trace every claim to primary vendor documentation. A blog post, an aggregator, or another skill is corroboration, never the source. When a claim cannot be sourced, record less rather than guessing.

## 3. Record the evidence first

Nothing else may be written until this is done. Update `.research/agentic-configuration-standards/`:

- Add an entry to `evidence.md` with an ID, source URL, date, status (`confirmed` / `contested` / `thin`), confidence, and notes.
- When an entry replaces an older one, mark the old one superseded and say so — do not delete it. Provenance is the point.
- Log the conclusion in `changes.md`: what changed, why, material conclusions, triggering evidence.

## 4. Propagate

A harness fact has many plausible homes, so a partial update is the normal failure. Check all of them:

| Surface | What lives there |
| --- | --- |
| `packages/buddy-agent-harness/src/harness-registry/harness-registry.ts` | `harnessRegistry` — names, detection directories, projection targets |
| `packages/buddy-agent-harness/skills/init/references/harnesses/<harness>.md` | agent instructions for that harness — **instructions only, no rationale** |
| `packages/buddy-agent-harness/skills/init/SKILL.md` | the routing table |
| `apps/web/.../reference/harness-support.md` | the support matrix, evidence confidence |
| `apps/web/.../reference/configuration-layout.md` | owns the paths; other pages link here |
| `README.md`, `packages/*/README.md` | the short summary of who needs a projection |

Grep for the harness name across the repository before declaring the change complete. Retire a name with a deprecated alias rather than a hard rename — `windsurf` is the worked example.

## 5. Accept and verify

Once the research is recorded and propagated:

```sh
node scripts/harness-drift.mjs --update-baseline
pnpm verify
```

Then close the drift issue with a link to the evidence ID. Do not update the baseline before the research is recorded — the baseline is a statement that a human reviewed the change, and updating it early silently discards the finding.

## Boundaries

- Never change a projection target on upstream's say-so alone.
- Never write a vendor claim without a `.research/` entry backing it.
- Keep contested claims marked contested in user-facing docs. Do not smooth them into confident prose.
