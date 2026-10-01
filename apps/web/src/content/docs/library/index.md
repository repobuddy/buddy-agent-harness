---
title: Library Overview
description: The buddy-agent-harness library, how to import it, and which page documents each export.
---

The `buddy-agent-harness` package exports a library as well as the CLI. Everything the commands do is reachable as a function, so a script or another tool can run a command, initialize harnesses, or read a report without spawning a process.

The library is the package's `.` export, built from `src/index.ts`. It is an ES module:

```ts
import { initializeHarnesses, run } from 'buddy-agent-harness'
```

Types are exported alongside the values and are imported the same way:

```ts
import type { InitializeOptions, InitializeResult } from 'buddy-agent-harness'
```

## Pages

| Page | Covers |
| --- | --- |
| [Init and run](/library/init/) | `run`, the CLI entry point, and `initializeHarnesses` with the `init` command objects |
| [References](/library/references/) | `referenceLayers`, `resolveReference`, `listReferences`, `searchReferences`, and `referenceCommand`: reading reference documents through the layered tiers |
| [MCP and the harness registry](/library/mcp/) | `harnessRegistry`, the MCP server inventory `listMcpServers`, the golden-set check `diagnoseMcp`, and the shared MCP server model |
| [Doctor](/library/doctor/) | `diagnoseBridges`, `diagnoseInstructions`, `buildDoctorReport`, the `doctor` command object, and the repair tables behind the doctor skill |
| [Governance (deprecated)](/library/governance/) | The deprecated governance override layers, `resolveGovernance`, `listGovernances`, and `governanceCommand`, with the `reference` export that replaces each |
