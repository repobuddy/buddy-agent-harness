---
'buddy-agent-harness': minor
---

The `doctor` skill is split into a lean `SKILL.md` and lazy-loaded reference pages, the way `init` is.

Everything `doctor` knows was in one 125-line file, so an agent acting on a single MCP credential finding read the skills-bridge table, the instruction-bridge table, the configuration table and the Windows case to get there. `SKILL.md` is now 62 lines — how to run it, how to read the report, the routing rule, and a pointer table — and the finding tables live one family per page under `references/`, with a page per harness under `references/harnesses/`.

The pages are generated from the same guidance table and the harness registry that the command reports from, so they cannot drift from it. Editorial judgment about a harness stays hand-written in the `init` skill, and each generated harness page links to it where one exists; which harnesses have one is read off the filesystem rather than listed.

Three checks come with the split: every reference page matches what the generator would write, every page the pointer table names exists, and every cross-reference into the `init` skill resolves.
