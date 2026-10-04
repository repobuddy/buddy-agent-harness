---
'buddy-agent-harness': minor
---

`doctor` now reports whether each harness installed for you loads `~/.agents/AGENTS.md`, in a new `globalInstructions` section. No harness reads that file by itself; each loads it only through a user-scope file of its own. On Claude Code that is an `@~/.agents/AGENTS.md` line in `~/.claude/CLAUDE.md`. On Codex, Copilot CLI, and Gemini CLI it is `~/.codex/AGENTS.md`, `~/.copilot/copilot-instructions.md`, or `~/.gemini/GEMINI.md` as a symlink to it. Gemini CLI's `context.fileName` setting cannot do it at user scope, because there it names files inside `~/.gemini/` only.

Where `~/.agents/AGENTS.md` exists and a harness does not load it, `doctor` reports `global-instructions-missing` or `global-instructions-unbridged`. The repair names the exact line or symlink, for you to add yourself; nothing writes outside the repository. The `repair` skill passes that step to you unchanged. When the `enhance` skill hands a global placement over, it now says whether the harness in use loads the file, and gives you the bridge beside the text where it does not.

The library adds `diagnoseGlobalInstructions`, a `home` option on `diagnoseBridges`, and `import` and `symlink` variants of `InstructionBridge`.
