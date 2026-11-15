---
title: 'Library: init and run'
description: 'Library reference for run, initializeHarnesses, and the init command objects.'
---

These exports run the CLI from code and perform the work behind [`init`](/cli/init/). `run` is the whole command line behind one function. `initializeHarnesses` is the linking step `init` performs, without the option parsing or the output, and `syncSkillCopies` is the file-by-file merge `sync` performs. `initCommand`, `harnessCommand`, and `activate` let another CLI mount the commands.

```ts
import { activate, harnessCommand, initCommand, initializeHarnesses, run, syncSkillCopies } from 'buddy-agent-harness'
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

An existing copy at a projection path is not a conflict: unless `force` covers it, it is synced with `.agents/skills` as [`syncSkillCopies`](#syncskillcopies) does, and its files are reported in `written` and `left`.

It throws when:

- a conflicting target is not covered by `force`, and `force` named no target;
- `force` names a target that no enabled harness projects;
- an existing copy is to be synced while `.agents/skills` does not exist, a `SyncError` with the code `canonical-missing`, before anything is written.

### InitializeOptions

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The repository or package directory to initialize |
| `harnesses` | `HarnessName[]` | Harnesses to enable in addition to Claude Code and Cursor and to the harnesses detected under `root`. Defaults to `[]` |
| `copy` | `boolean` | Copy the canonical skills directory instead of linking it. Defaults to `false` |
| `force` | `boolean \| readonly string[]` | Replace conflicting targets and existing copies. `true` replaces every one. A list names the targets to replace, as repository-relative or absolute paths; a conflict it does not name is skipped and reported, not replaced, and an existing copy it does not name is synced. Defaults to `false` |

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
| `references` | `number` | The number of [references](/agent-configuration/references/) the project tier holds |
| `copied` | `boolean` | Whether copying was requested |
| `written` | `SyncWrite[]` | Each file the sync of an existing copy wrote, with the side whose version it took |
| `left` | `SyncLeft[]` | Each file of an existing copy left as it is on both sides, for `sync --resolve` to settle |

A copy it writes, syncs, or keeps at a path git tracks gets [copy protection](/cli/doctor/#the-skip-worktree-bit).

## syncSkillCopies

```ts
function syncSkillCopies(options: SyncOptions): SyncResult
```

The work behind [`sync`](/cli/sync/): merges each skills copy bridge of the enabled harnesses with `.agents/skills` file by file, against the last commit where the two agreed, and puts copy protection on each copy at a tracked path. It works at the top of the Git work tree `root` is in, or at `root` outside a repository.

```ts
const result = syncSkillCopies({ root: process.cwd() })
const picks = result.left.map(({ path }) => ({ path, side: 'canonical' as const }))
syncSkillCopies({ root: process.cwd(), resolutions: picks })
```

Every refusal is thrown as a `SyncError` before anything is written, except `write-failed`. Its `code` is a `SyncErrorCode`, and its `entries` name the picks or paths it is about:

| `code` | When |
| --- | --- |
| `invalid-resolution` | A pick names no side `sync` recognizes, or no file. `parseResolutions` throws it |
| `unneeded-resolution` | A pick names a file not left for the user |
| `conflicting-resolution` | The picks for one file would leave several copies holding different versions |
| `canonical-missing` | `.agents/skills` does not exist while a copy does |
| `write-failed` | A write failed partway |

### SyncOptions

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | Any directory of the repository |
| `resolutions` | `readonly SyncResolution[]` | The owner's picks, each `{ path, side }`: the file's path through the bridge, such as `.claude/skills/review/SKILL.md`, and `SyncSide`, `'canonical'` or `'copy'`. Defaults to `[]` |

`parseResolutions(value)` reads the `--resolve` form, `<bridge>/<file>=<canonical|copy>,...`, into that list.

### SyncResult

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The repository root it worked at |
| `outcome` | `SyncOutcome` | `'synced'`, or `'files-left'` when at least one file waits for a pick |
| `copies` | `string[]` | Every copy bridge it synced or kept |
| `written` | `SyncWrite[]` | Each file written, as `{ bridge, path, side }` |
| `left` | `SyncLeft[]` | Each file left for the user, as `{ bridge, path }`; `path` is what a resolution names |
| `protected` | `string[]` | The copies at a tracked path that carry both parts of copy protection after the run |

## syncCommand

```ts
const syncCommand: cli.Command
```

The [`sync`](/cli/sync/) command as a `clibuilder` command object, with the `--root` and `--resolve` options. A refused pick exits `2`, and every other failure exits `1`, each as a coded report on stdout.

## initCommand

```ts
const initCommand: cli.Command
```

The [`init`](/cli/init/) command as a `clibuilder` command object. Its `run` calls `initializeHarnesses` with the parsed options and returns the result, which `clibuilder` prints in the requested format. It exits `0` on success and `1` on failure, writing the failure to stderr.

## harnessCommand

```ts
const harnessCommand: cli.Command
```

A `clibuilder` command group named `agent-harness` that holds `init`, `sync`, `doctor`, `reference`, and `governance`. It is named `agent-harness`, not `harness`, because `repobuddy` mounts every plugin into one namespace.

## activate

```ts
function activate(host: { addCommand(command: typeof harnessCommand): void }): void
```

Adds `harnessCommand` to a host CLI through its `addCommand`. This is how installing the package alongside `repobuddy` mounts the commands as `buddy agent-harness init` and `buddy agent-harness doctor`.

```ts
activate({ addCommand: (command) => commands.push(command) })
```
