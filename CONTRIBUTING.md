# Contributing

For documentation — writing style, where a document belongs, sourcing claims, and auditing — use the `technical-writer` skill from [unional/skills](https://github.com/unional/skills). It reads `.agents/LOOKUP.DOC.md` for this repository's authorities and generated tables.

## Validation

Run `pnpm check`, `pnpm verify`, and `git diff --check`. Run `pnpm web build` when site content changes — it is the only check that catches a broken Starlight page or a bad sidebar slug.

Add a changeset when published behavior changes. In the PR body, say which claims are newly sourced and name the `.research/` entries backing them.
