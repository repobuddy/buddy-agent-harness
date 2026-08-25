---
'buddy-agent-harness': minor
---

`doctor` reports agent configuration that only one harness can read.

Four finding families all answered a version of "is something broken". None of them asked how far the configuration that is there actually reaches, so a `.cursor/rules/*.mdc` — which works, in Cursor, and nowhere else — was invisible to the one command that is safe to run from a session-start hook. The guidance in it reaches one tool, and nobody finds out except by noticing an agent behave differently somewhere else.

The new family reports each artifact with the canonical form it converts to: legacy instruction files and always-on rules to `AGENTS.md`, harness commands and harness-directory skills to `.agents/skills`. A `.mdc` rule splits on whether its frontmatter binds it to globs — always-on prose is what `AGENTS.md` holds verbatim, while a rule bound to paths converts to a skill only where the scoping is incidental. A subagent names no owner at all: no cross-harness format exists, so the finding reports that gap rather than promising a conversion.

Nothing here is repaired by `repair`, which corrects configuration that is wrong; nothing here is wrong. Nothing is offered by `enhance`, which adds guidance a repository is missing; this guidance is present. Every conversion with a destination is `init`'s, and every one is approved before it lands.

The artifacts are declared per harness in the registry, beside that harness's other paths, and the per-harness reference pages are generated from the same declaration. Hooks, LSP settings, and output styles are deliberately not covered: their shapes differ per harness with no safe projection, so no canonical form can be named for them.
