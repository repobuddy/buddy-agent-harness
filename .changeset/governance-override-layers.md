---
"buddy-agent-harness": minor
---

Add `buddy-agent-harness governance list` and `governance show <name>`, and own the override layers a governance can be replaced in.

A governance is a version-pinned Markdown rule set a skill loads, such as `skill-design` or `agent-tool-output`. Each skill ships its own committed copy, which is the version it was tested against. This command reads the layers someone can override that copy in, in lookup order: the project's `.agents/governances/`, the user's `~/.agents/governances/`, then two machine-wide directories, which are defaults rather than enforcement and therefore sit last. The layered resolver moved here from `universal-plugin` rather than being written again.

There are two machine-wide layers on purpose. A new install uses the directory this package owns (`/etc/buddy-agent-harness/governances` on Linux, `/Library/Application Support/BuddyAgentHarness/governances` on macOS, `%ProgramData%\BuddyAgentHarness\governances` on Windows). The directory `universal-plugin` wrote is still read one layer below it, so a machine already carrying governances keeps resolving them. Wherever that layer appears it is reported as deprecated: `governance list` carries a status on its row alone, and `doctor` names the directory each override was read from, so an admin can see both that there is somewhere else to put it and where it is now. Nothing is enforced — the old location still answers, so there is nothing to repair.

`governance show` writes the document itself on stdout by default; `--format toon` or `--format json` wraps it with the layer it came from. `governance list` reports every name at the layer that would win, alongside the layers themselves, so a reader knows where to write an override.

`--overrides-only` on either subcommand restricts the answer to those three layers and never returns a governance this package ships, exiting non-zero when none of them holds the name. That is what lets a skill decide whether an override exists without paying for a registry lookup: it runs the command only from an already-installed copy, and reads the exit code.

`init` now also creates `.agents/governances/` when it is absent and reports how many documents it holds, the same contract it already has for `.agents/skills`. `doctor` now carries a `governances` section naming each override and the layer it came from, or stating the zero. An override is a choice someone made, so it is never a finding: `doctor`'s existing findings, its repairs, its exit code, and its project-scope-only MCP policy are unchanged.
