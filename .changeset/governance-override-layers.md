---
"buddy-agent-harness": minor
---

Add `buddy-agent-harness governance list` and `governance show <name>`, and own the override layers a governance can be replaced in.

A governance is a version-pinned Markdown rule set a skill loads, such as `skill-design` or `agent-tool-output`. Each skill ships its own committed copy, which is the version it was tested against. This command reads the layers someone can override that copy in, in lookup order: the project's `.agents/governances/`, the user's `~/.agents/governances/`, then the machine-wide directory, which is a default rather than enforcement and therefore sits last. The layered resolver moved here from `universal-plugin` rather than being written again; the machine-wide directory keeps the location it has always had (`/etc/universal-plugin/governances` on Linux, `/Library/Application Support/UniPlugin/governances` on macOS, `%ProgramData%\UniPlugin\governances` on Windows), so a machine already carrying one keeps being read.

`governance show` writes the document itself on stdout by default; `--format toon` or `--format json` wraps it with the layer it came from. `governance list` reports every name at the layer that would win, alongside the layers themselves, so a reader knows where to write an override.

`--overrides-only` on either subcommand restricts the answer to those three layers and never returns a governance this package ships, exiting non-zero when none of them holds the name. That is what lets a skill decide whether an override exists without paying for a registry lookup: it runs the command only from an already-installed copy, and reads the exit code.

`init` now also creates `.agents/governances/` when it is absent and reports how many documents it holds, the same contract it already has for `.agents/skills`. `doctor` now carries a `governances` section naming each override and the layer it came from, or stating the zero. An override is a choice someone made, so it is never a finding: `doctor`'s existing findings, its repairs, its exit code, and its project-scope-only MCP policy are unchanged.
