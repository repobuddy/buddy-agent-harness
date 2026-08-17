---
'buddy-agent-harness': minor
---

Teach the `init` skill to take arguments, so `doctor` can hand it a repair verbatim.

`doctor` names repairs like `--copy --force`, and until now the `init` skill had no documented way to receive them. It now reads flags and their prose equivalents out of the invocation, passes them through to the command in Phase 4, and still stops for the Phase 3 approval that `--force` would otherwise skip.

The mechanism is deliberately not a placeholder. Claude Code appends what the caller typed as `ARGUMENTS: <value>` whenever the body omits `$ARGUMENTS`, Codex skills have no argument mechanism at all, and the Agent Skills spec defines none — so a body that says how to read the invocation is the only form that works everywhere, while a literal `$ARGUMENTS` would resolve on one harness and stay on the page on the rest.

`argument-hint` is added for Claude Code's autocomplete. The new references explain why that field is the exception to harness-specific frontmatter being dropped in silence: claude.ai uploads and the Skills API reject it with a hard error.
