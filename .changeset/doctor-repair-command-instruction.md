---
'buddy-agent-harness': minor
---

`doctor` now reports each repair as a runnable command and a prose instruction, instead of wrapping every repair in `Run`

Every `help` entry used to be rendered as ``Run `<repair>` ``, whether or not the repair was a command. Most are not, so the report published lines like ``Run `remove .windsurf/skills and enable the harness that replaced it` `` — an invitation to paste prose into a shell.

`help` is now one row per repair with two columns:

```
help[3]{command,instruction}:
  buddy-agent-harness init --copy --force,run `buddy-agent-harness init --copy --force` to rebuild .claude/skills as a real directory
  buddy-agent-harness init,run `buddy-agent-harness init` to create the bridge at .windsurf/skills
  "","hand .gemini/settings.json to `/buddy-agent-harness:init`, which writes the bridge into it"
```

`command` runs verbatim and completes the repair. It is empty when no single invocation does, which is the signal to act on `instruction` instead — and it stays empty for a repair whose prose quotes a runnable diagnostic, so a caller that executes every non-empty `command` never rebuilds a diverged bridge over the side holding the newer edit.

Both keys are always emitted, so TOON renders `help` in its tabular form rather than degrading to a nested list.
