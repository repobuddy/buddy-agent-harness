---
name: bah-doc-standards
description: 'Use when writing, moving, reviewing, or auditing documentation in the buddy-agent-harness repo — choosing where a fact lives, separating concepts from reference, sourcing harness claims, trimming duplication, or handling requests like "improve the docs", "audit the docs", "where should this be documented", or "this page is too long".'
---

# Applying the Buddy Agent Harness documentation standard

This repository documents a moving target: other vendors' configuration formats. Its characteristic failure is not prose quality but **stale or unsourced vendor claims** — three reference pages once stated harness skill paths that no vendor had used for months. Placement and sourcing therefore come before editing.

This is guidance, not a script. Never treat length alone as a defect.

## Where documentation lives

| Home | Holds | Audience |
| --- | --- | --- |
| `apps/web/src/content/docs/` | the published site — the primary documentation surface | users |
| `README.md` (root) | what the project is, install, one CLI example | someone deciding whether to use it |
| `packages/*/README.md` | package-level orientation | someone consuming the package |
| `packages/*/skills/<skill>/SKILL.md` | a shipped skill's procedure, loaded into an agent's context | agents |
| `packages/*/skills/<skill>/references/*.md` | payload the skill loads on demand | agents |
| `packages/*/.agents/spec/` | SDD behavioral specs — what the code must do | contributors, judges |
| `.research/<topic>/` | evidence for external claims | contributors |

Site pages fall into four sections, defined in `apps/web/astro.config.mjs`. The sidebar is hand-maintained, so **a new page needs a sidebar entry in the same change or it ships unreachable.**

- **Getting Started** — ordered work to an observable outcome. Tutorial form.
- **Concepts** — why the design is shaped this way. Prose, no exhaustive tables.
- **CLI Reference** — one page per command: options, output, failure modes.
- **Reference** — lookup within an explicit scope. Tables, no sequential reading required.

Classify a page by its intended use, not its path or title. A tutorial leads through ordered steps; a reference supports lookup. Split substantial mixed forms; keep a small secondary form in a clearly labeled section.

## Placement before prose

1. Locate the document in the tree above. State its own subject and name its direct children.
2. Keep full detail about the subject. Summarize children by purpose and behavior, and push deeper explanation into the child with a link.
3. Give every load-bearing fact exactly **one home**, and link to it from everywhere else. The recurring offenders here are the harness path table and the default-harness rule, which have plausible-looking homes in the root README, `reference/configuration-layout.md`, `reference/harness-support.md`, `concepts/harness-selection.md`, and the `init` skill's references. `reference/configuration-layout.md` owns paths; the others link.
4. Before moving or renaming a page, grep for inbound references — nothing in this repo validates Markdown links. Check the sidebar in `astro.config.mjs`, cross-page links, `skills/**/SKILL.md`, and both READMEs.
5. A move is atomic: remove from the old home, add to the new, fix every inbound link in the same change.

## Sourcing external claims

Any statement about what a harness reads, writes, or supports is a claim about someone else's product, and it decays.

- Trace it to **primary vendor documentation**. A blog post, an aggregator, or another skill is corroboration, never the source.
- Record it in `.research/<topic>/evidence.md` with an evidence ID, source URL, date, status, and confidence, then let prose cite the conclusion rather than restating the investigation.
- Mark contested or single-sourced claims as such in the doc. Do not smooth them into confident prose.
- State conventions as conventions. `.agents/skills/` is not in the Agent Skills specification; a page that implies otherwise is wrong even though the path works.
- When a claim cannot be sourced, write less rather than guessing.

A doc change that adds a vendor claim without a corresponding `.research/` entry is incomplete.

## Audit the corpus

Cheapest probes first.

1. Size outliers: `git ls-files '*.md' ':(exclude)**/node_modules/**' ':(exclude)**/dist/**' | xargs wc -w | sort -rn | head -30`. There is no budget gate in this repo — the list is a prompt for judgment, not a verdict.
2. Duplication: grep distinctive phrases across `apps/web`, `README.md`, `packages/*/README.md`, and `skills/**`. Keep one home, replace the rest with links.
3. Drift against code: any table naming harness paths, harness names, or CLI options must match `packages/buddy-agent-harness/src/harness.ts` and `src/plugin.ts`. Verify against the source, not against another doc.
4. Reasoning-transcript leakage: narrated investigation, dead design-session citations, "we considered X but". Rationale worth keeping belongs in `.research/` or an SDD spec; the doc keeps the rule plus a link.
5. Aspiration stated as fact. This project's docs deliberately separate the objective from current behavior — keep that separation explicit and keep both current.

Keep every load-bearing rule, preferably as one to three lines plus a link to its rationale. Cut stories, duplicates, and the path used to derive the rule.

## Skill documents specifically

Shipped skills under `packages/*/skills/` are read by agents, so they follow the Agent Skills spec and the constraints in `packages/buddy-agent-harness/skills/init/references/frontmatter.md`:

- `name` matches the directory name; `description` says what it does *and* when to use it.
- **Quote any description containing a colon** — unquoted, it is invalid YAML and some harnesses drop the skill entirely.
- Keep `SKILL.md` short and move payload into `references/`, which loads only when needed.
- Anything that must hold on every harness goes in the Markdown body, never only in harness-specific frontmatter.

## Validation

Run `pnpm check`, `pnpm verify`, and `git diff --check`. When site content changes, run `pnpm web build` — it is the only check that catches a broken Starlight page or a bad sidebar slug.

If published behavior changed, add a changeset. The PR body should say which claims are newly sourced and which `.research/` entries back them.
