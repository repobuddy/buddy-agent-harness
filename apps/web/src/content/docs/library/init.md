---
title: 'Library: init and run'
description: 'Library reference for run, initializeHarnesses, and the init command objects.'
---

These exports run the CLI from code and perform the work behind [`init`](/cli/init/). `run` is the whole command line behind one function. `initializeHarnesses` is the linking step `init` performs, without the option parsing or the output. `initCommand`, `harnessCommand`, and `activate` let another CLI mount the commands.

```ts
import { activate, harnessCommand, initCommand, initializeHarnesses, run } from 'buddy-agent-harness'
import type { InitializeOptions, InitializeResult } from 'buddy-agent-harness'
```

## run

```ts
function run(argv: string[]): Promise<number>
```

Parses `argv` against every `buddy-agent-harness` command and runs the one it names. It takes the whole argv, the runtime and script path included, the same shape as `process.argv`.

It resolves to the exit code instead of writing `process.exitCode`, and it never reads `process.argv`, so a caller that is not the process can act on the result:

| Code | Meaning |
| --- | --- |
| `0` | The command did what was asked, or reported no code |
| the command's code | The command returned one, such as `1` when `init` fails |
| `2` | The invocation was rejected or could not be parsed |

A failure goes to stderr as `error: <message>`, never to stdout, which carries the report an agent parses. The command's own report still goes to stdout.

```ts
const code = await run([process.execPath, 'buddy-agent-harness', 'doctor', '--format', 'json'])
```

## initializeHarnesses

```ts
function initializeHarnesses(options: InitializeOptions): InitializeResult
```

Links the canonical `<root>/.agents/skills` directory into every enabled harness that cannot read it directly. It is the function behind [`init`](/cli/init/), and it shares that command's conflict behavior: it checks every target before changing any, and it throws when a conflict is not covered by `force`.

It creates `<root>/.agents/skills` and `<root>/.agents/references` when they are absent. It records nothing else about the run; the returned result is the only report.

```ts
const result = initializeHarnesses({ root: process.cwd(), harnesses: ['codex'] })
console.log(result.linked)
```

It throws when:

- a conflicting target is not covered by `force`, and `force` named no target;
- `force` names a target that no enabled harness projects.

### InitializeOptions

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The repository or package directory to initialize |
| `harnesses` | `HarnessName[]` | Harnesses to enable in addition to Claude Code and Cursor and to the harnesses detected under `root`. Defaults to `[]` |
| `copy` | `boolean` | Copy the canonical skills directory instead of linking it. Defaults to `false` |
| `force` | `boolean \| readonly string[]` | Replace conflicting targets. `true` replaces every conflict. A list names the targets to replace, as repository-relative or absolute paths; a conflict it does not name is skipped and reported, not replaced. Defaults to `false` |

Where a link fails and nothing occupies the target, the directory is copied instead, even when `copy` is `false`.

### InitializeResult

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The `root` it was given |
| `harnesses` | `HarnessName[]` | Every enabled harness |
| `native` | `HarnessName[]` | Enabled harnesses that read `.agents/skills` directly, so nothing was written for them |
| `linked` | `HarnessName[]` | Enabled harnesses that received a projection |
| `skipped` | `HarnessName[]` | Enabled harnesses left untouched because their target conflicts and `force` did not name it |
| `deprecated` | `{ name: HarnessName; replacedBy: HarnessName }[]` | Enabled harnesses whose name has been superseded, with the name that replaces each |
| `skills` | `number` | The number of canonical skills |
| `references` | `number` | The number of [references](/agent-configuration/references/) the project tier holds, legacy `.agents/governances/` included |
| `copied` | `boolean` | Whether copying was requested |

## initCommand

```ts
const initCommand: cli.Command
```

The [`init`](/cli/init/) command as a `clibuilder` command object. Its `run` calls `initializeHarnesses` with the parsed options and writes the result in the requested format. It returns `0` on success and `1` on failure, writing the failure to stderr.

## harnessCommand

```ts
const harnessCommand: cli.Command
```

A `clibuilder` command group named `agent-harness` that holds `init`, `doctor`, `reference`, and `governance`. It is named `agent-harness`, not `harness`, because `repobuddy` mounts every plugin into one namespace.

## activate

```ts
function activate(host: { addCommand(command: typeof harnessCommand): void }): void
```

Adds `harnessCommand` to a host CLI through its `addCommand`. This is how installing the package alongside `repobuddy` mounts the commands as `buddy agent-harness init` and `buddy agent-harness doctor`.

```ts
activate({ addCommand: (command) => commands.push(command) })
```
