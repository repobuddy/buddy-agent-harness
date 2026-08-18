---
"buddy-agent-harness": patch
---

Correct the `init` skill's reason for leaving MCP servers alone. It said no safe cross-harness mapping exists; one does, published across fourteen hosts. The reason that survives is that the mapping is not lossless — some servers cannot be expressed for some hosts, and writing one into another host's format means supplying fields the source never carried. `init` still reports MCP configuration rather than converting it, and now says why accurately.
