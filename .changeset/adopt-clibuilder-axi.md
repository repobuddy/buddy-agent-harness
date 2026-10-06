---
'buddy-agent-harness': minor
---

`--format` now comes from [`@clibuilder/axi`](https://github.com/clibuilder/clibuilder/tree/main/packages/axi), the output contract clibuilder CLIs share, in place of this package's own copy. `toon`, `json`, and `text` output is byte-identical: axi's TOON encoder and text renderer are the same code.

An unknown `--format` value is now a usage error, the same as an unknown option. Before, `doctor --format yaml` (and every other command) wrote `error: --format must be toon, json, or text.` to stderr and exited `1`. Now clibuilder rejects it before the command runs, with `invalid value for option --format: expected one of: toon, json, text, received "yaml"` and the command's usage text, and exits `2`. A script that checked for exit `1` on a bad format should check for `2`.

The `--format` help line now reads `Output format: toon (default), json, text — toon for agents, json to pipe, text for humans`. `governance show` keeps its own wording and its `text` default.
