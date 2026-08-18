# Contributing

For documentation — writing style, where a document belongs, sourcing claims, and auditing — use the `technical-writer` skill from [unional/skills](https://github.com/unional/skills). It reads `.agents/LOOKUP.DOC.md` for this repository's authorities and generated tables.

## Changing what the `enhance` skill offers

The `## Delegation` section in `packages/buddy-agent-harness/skills/enhance/references/delegation.md` ships into other people's repositories and loads on every session there. Its wording is a behavioral claim, and the version it replaced read well, was in real use, and produced an unexecutable plan the first time anyone measured it.

Do not edit that wording on taste. Use the `eval-delegation` skill in `.agents/skills/`: it builds the prompts, names the backlog and the scoring key, and records the baseline the candidate has to beat.

## Correcting a published claim

This site publishes claims about other people's products, and some of them will turn out to be wrong. When you correct one, disclose it.

Add an entry to the Corrections section of `apps/web/src/content/docs/sources.md` naming what the claim said, what replaced it, and whether the project's behavior changed with it. Keep the entry after the page is fixed. A reader who acted on the old wording needs to be able to find out that it moved.

Two things do not count as corrections, and do not need an entry: expanding a claim that was already right, and fixing a typo or a broken link.

Record the evidence that forced the change in `.research/<topic>/evidence.md` with an ID, and reference that ID from the matching `changes.md`. Cite the conclusion in the prose. Do not narrate the investigation on the site.

Give the corrected claim one home and link the other locations to it. A claim restated in six places is corrected in one and stale in five.

## Validation

Run `pnpm check`, `pnpm verify`, and `git diff --check`. Run `pnpm web build` when site content changes — it is the only check that catches a broken Starlight page or a bad sidebar slug.

Add a changeset when published behavior changes. In the PR body, say which claims are newly sourced and name the `.research/` entries backing them.
