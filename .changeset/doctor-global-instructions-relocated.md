---
'buddy-agent-harness': minor
---

`doctor`'s `globalInstructions` check now follows the variables that move a harness's directory: `CODEX_HOME`, `COPILOT_HOME`, and `CLAUDE_CONFIG_DIR`. Where one is set and non-empty, the row and the repair name the file under it, written from the variable, such as `$CODEX_HOME/AGENTS.md`.

It also catches Codex's `AGENTS.override.md`. Codex reads that file in place of `AGENTS.md` when it holds more than whitespace, so a bridged `AGENTS.md` beside it loads nothing. The row is then `overridden`, and a `global-instructions-overridden` finding names the override, with the step to move what it says into `~/.agents/AGENTS.md` and remove it. The `repair` and `enhance` skills hand that step over like the others.

Copilot CLI is confirmed to follow a `copilot-instructions.md` symlink that points outside its directory, so the symlink bridge stands.

The library adds an `env` option to `diagnoseBridges` and an `env` parameter to `diagnoseGlobalInstructions`; omitted, no variable is followed.
