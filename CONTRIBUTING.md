# Contributing

For documentation — writing style, where a document belongs, sourcing claims, and auditing — use the `technical-writer` skill from [unional/skills](https://github.com/unional/skills). It reads `.agents/LOOKUP.DOC.md` for this repository's authorities and generated tables.

## Changing what the `enhance` skill offers

The `## Delegation` section in `packages/buddy-agent-harness/skills/enhance/references/delegation.md` ships into other people's repositories and loads on every session there. Its wording is a behavioral claim, and the version it replaced read well, was in real use, and produced an unexecutable plan the first time anyone measured it.

Do not edit that wording on taste. Use the `eval-delegation` skill in `.agents/skills/`: it builds the prompts, names the backlog and the scoring key, and records the baseline the candidate has to beat.

## Validation

Run `pnpm check`, `pnpm verify`, and `git diff --check`. Run `pnpm web build` when site content changes — it is the only check that catches a broken Starlight page or a bad sidebar slug.

Add a changeset when published behavior changes. In the PR body, say which claims are newly sourced and name the `.research/` entries backing them.
