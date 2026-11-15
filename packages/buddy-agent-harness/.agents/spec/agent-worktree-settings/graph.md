# Agent-worktree settings: decision graph

Asked once per run at `inuse`, then once per setting and file. No setting's answer changes another's path.

```mermaid
flowchart TD
  inuse{Is Claude Code in use?} -->|E1 no| none([Nothing offered])
  inuse -->|E2 yes| cov{Is this setting already covered for this file?}
  cov -->|E3 yes| covered([Not offered, reported covered])
  cov -->|E4 no| offer[Offered on its own, the base with its trade-off first]
  offer -->|E5 approved| written([The line written in place])
  offer -->|E6 declined, or no answer| declined([Nothing written, reported declined])
```

- Outcomes: `none`, `covered`, `written`, and `declined`.
