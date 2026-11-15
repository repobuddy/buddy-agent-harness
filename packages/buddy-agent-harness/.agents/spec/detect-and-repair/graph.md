# Detect and repair: decision graph

How a finding travels from the detector to its owner. Nodes are decisions a consumer can observe. Every leaf is an
outcome, and each criterion in [README.md](./README.md) cites the edges it constrains.

```mermaid
flowchart TD
  Detect[Run the detector] -->|E1| Any{Any finding?}
  Any -->|E2 no| Done([The flow ends; nothing detects further])
  Any -->|E3 yes| Read[Read each finding's fault name]
  Read -->|E4| Owner{Which family is the fault in, and under which condition?}
  Owner -->|E5 instruction bridge| Init([With the init-buddy-agent-harness skill])
  Owner -->|E15 skills bridge whose repair rebuilds it| Init
  Owner -->|E7 non-standard, with a portable form| Init
  Owner -->|E8 configuration| Repair([With the repair skill])
  Owner -->|E9 MCP drift, one side plainly the source| Repair
  Owner -->|E10 agent worktree| Both([With the init-buddy-agent-harness and enhance skills])
  Owner -->|E16 skills bridge: a diverged or an unprotected copy| Repair
  Owner -->|E12 MCP drift needing the user's judgment| Person([Reported for a person, routed to no skill])
  Owner -->|E13 non-standard, with no portable form| Person
  Owner -->|E14 global instructions| User([A step for the user in their home directory, routed to no skill])
```

E6 and E11 are retired. Routing reads the fault name only. No edge reads the prose description, and no edge writes.
