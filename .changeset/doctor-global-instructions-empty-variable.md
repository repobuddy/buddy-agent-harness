---
'buddy-agent-harness': minor
---

`doctor`'s `globalInstructions` check now reads an empty `CODEX_HOME`, `COPILOT_HOME`, or `CLAUDE_CONFIG_DIR` the way that harness does. Codex and Copilot CLI read an empty value as unset, so nothing changes for them. Claude Code reads an empty `CLAUDE_CONFIG_DIR` as the directory it starts in. Its row now names `./CLAUDE.md`, the file Claude Code reads when started in the repository, and a new `global-instructions-emptied` finding names `$CLAUDE_CONFIG_DIR`, with the step to unset it or set it to the folder you meant. The `repair` and `enhance` skills hand that step over like the others.

The library adds a `start` parameter to `diagnoseGlobalInstructions`: the directory Claude Code is taken to start in, defaulting to `process.cwd()`. `diagnoseBridges` passes `root`.
