---
'buddy-agent-harness': patch
---

Read each harness's skills directories from `@cyberuni/agent-harness` instead of keeping a copy. The projection targets `init` and `doctor` use are unchanged: Claude Code is still the only harness projected into.
