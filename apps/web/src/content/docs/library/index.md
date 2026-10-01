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

More pages are planned: `library/doctor` for the bridge, instruction, and MCP diagnostics; `library/references` for reference and governance resolution; and `library/mcp` for the MCP server inventory and harness registry.
