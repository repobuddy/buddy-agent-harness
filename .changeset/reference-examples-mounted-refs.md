---
"buddy-agent-harness": minor
---

Upgrade to clibuilder 12.3 and cyber-agentkit 2.2.

- Every `reference` subcommand now carries `examples` in its `--help`, each starting with `buddy-agent-harness reference`.
- `governance show`'s `governance-not-found` help is checked against the command tree, and names the command line the group is reached by: `buddy-agent-harness reference list` standalone, `repobuddy agent-harness reference list` when mounted under `repobuddy`. It no longer ends with a period.
- From cyber-agentkit 2.2, `reference search` shows the best 10 matches unless `--full` is given, and `reference customize` and `reference implementations` accept a `<prefix>.*` family. `reference migrate` is documented on the `reference` page.
