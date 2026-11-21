---
"buddy-agent-harness": major
---

The `enhance` and `repair` skills are renamed, so their names follow the `<verb>-<plugin>` form that `doctor-buddy-agent-harness` and `init-buddy-agent-harness` already use:

- `enhance` is now `enhance-buddy-agent-harness`: invoke `/buddy-agent-harness:enhance-buddy-agent-harness`, or `pnpm-buddy-agent-harness-enhance-buddy-agent-harness` from a pnpm install.
- `repair` is now `repair-buddy-agent-harness`: invoke `/buddy-agent-harness:repair-buddy-agent-harness`, or `pnpm-buddy-agent-harness-repair-buddy-agent-harness` from a pnpm install.

The old names are gone. They were bare verbs, and in a harness that lists skills without their plugin, such as Codex, they could not be told apart from another plugin's `enhance` or `repair`. `doctor` findings now name the new skills in their repairs. The docs pages moved to `/skills/enhance-buddy-agent-harness/` and `/skills/repair-buddy-agent-harness/`.
