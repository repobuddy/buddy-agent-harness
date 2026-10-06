---
title: 'Library: doctor'
description: 'Library reference for diagnoseBridges, diagnoseInstructions, buildDoctorReport, the doctor command object, and the repair tables behind the doctor skill.'
---

These exports perform the work behind [`doctor`](/cli/doctor/). `diagnoseBridges` checks the skills bridges and the instruction bridges, and `diagnoseInstructions` checks the instruction side alone. `buildDoctorReport` shapes a diagnosis into the report the command prints. `doctorCommand` mounts the command in another CLI. The repair tables and `renderDoctorSkill` are the one source the [`doctor-buddy-agent-harness` skill](/skills/doctor-buddy-agent-harness/) is generated from.

Every function here is read-only. Nothing is created, moved, or repaired; each finding carries its repair, and the caller decides what to run.

```ts
import {
	bridgeRepairs,
	buildDoctorReport,
	diagnoseBridges,
	diagnoseGlobalInstructions,
	diagnoseInstructions,
	doctorCommand,
	doctorRepairs,
	doctorSkill,
	globalInstructionRepairs,
	instructionRepairs,
	renderDoctorSkill,
} from 'buddy-agent-harness'
import type { DiagnoseOptions, DiagnoseResult, DoctorProblem, DoctorReport, Repair } from 'buddy-agent-harness'
```

## diagnoseBridges

```ts
function diagnoseBridges(options: DiagnoseOptions): DiagnoseResult
```

Checks every skills bridge that [`init`](/cli/init/) would create under `root`, then everything standing between a harness and `AGENTS.md`. It is the diagnosis `doctor` runs before it adds the configuration, MCP, and non-standard findings.

The harnesses checked are Claude Code and Cursor, the ones `harnesses` names, and every harness whose detection directory is present under `root`. Only harnesses that need a skills projection get a `bridges` row.

When `<root>/.agents/skills` is not a directory, the result carries a `no-canonical` finding first. The bridges are still inspected.

```ts
const result = diagnoseBridges({ root: process.cwd(), harnesses: ['windsurf'], cli: 'buddy-agent-harness' })
for (const finding of result.findings) console.log(finding.problem, finding.repair.command)
```

### DiagnoseOptions

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The repository or package directory to diagnose |
| `harnesses` | `HarnessName[]` | Harnesses to check in addition to Claude Code and Cursor and to the harnesses detected under `root`. Defaults to `[]` |
| `cli` | `string` | How to name this tool in the repair commands, such as `buddy-agent-harness` |
| `home` | `string` | The home directory whose user-scope instruction files are checked for loading `~/.agents/AGENTS.md`. Omitted, none are |
| `env` | `NodeJS.ProcessEnv` | The environment whose `CODEX_HOME`, `COPILOT_HOME`, and `CLAUDE_CONFIG_DIR` move a harness's user-scope directory. Omitted, none is followed. The `doctor` command passes `process.env` |

### DiagnoseResult

| Field | Type | Meaning |
| --- | --- | --- |
| `bridges` | `BridgeReport[]` | One row per skills bridge |
| `instructions` | `InstructionReport[]` | One row per instruction bridge and per file that suppresses `AGENTS.md`. Kept out of `bridges` because its `kind` and `status` vocabularies differ and its repair is never a command |
| `globalInstructions` | `GlobalInstructionReport[]` | One row per harness installed for the user, saying whether its user-scope file loads `~/.agents/AGENTS.md`. Empty when `home` is omitted |
| `divergence` | `DivergenceReport[]` | One row per `diverged` bridge, with the side that moved |
| `findings` | `BridgeFinding[]` | One row per problem, across every section |

### BridgeReport

| Field | Type | Meaning |
| --- | --- | --- |
| `harness` | `HarnessName` | The harness the bridge serves |
| `path` | `string` | The bridge path, repository-relative, as the harness registry declares it |
| `kind` | `BridgeKind` | What is on disk at the path now |
| `status` | `BridgeStatus` | Whether the bridge works |

### BridgeKind

```ts
type BridgeKind = 'symlink' | 'copy' | 'file' | 'none'
```

What is on disk at a bridge path: a symlink, a directory copy, a regular file, or nothing.

### BridgeStatus

```ts
type BridgeStatus = 'ok' | 'missing' | 'degraded' | 'stale' | 'diverged'
```

The statuses are described on [`doctor`](/cli/doctor/#output). A tracked copy whose skip-worktree bit was lost is still `ok`; it carries an `unpinned-copy` finding.

### BridgeFinding

| Field | Type | Meaning |
| --- | --- | --- |
| `path` | `string` | The path the finding is about |
| `problem` | `DoctorProblem` | The finding's name. Route on this, never on `detail`, whose wording may change |
| `detail` | `string` | What the finding means, in prose for a person |
| `repair` | `{ command: string; instruction: string }` | What repairs it, already carrying the path. `command` completes the repair when run as given and is empty when no single invocation does; `instruction` is the same repair in the imperative and is always present |

### DivergenceReport

| Field | Type | Meaning |
| --- | --- | --- |
| `path` | `string` | The bridge path |
| `direction` | `DivergenceDirection` | Which side moved |

### DivergenceDirection

```ts
type DivergenceDirection = 'bridge' | 'canonical' | 'both' | 'unknown'
```

Which side of a diverged copy moved since the last commit where the bridge and `.agents/skills` agreed. It is `unknown` when `root` is not in a git repository or no such commit is found. [Divergence](/cli/doctor/#divergence) says what to do for each.

## diagnoseGlobalInstructions

```ts
function diagnoseGlobalInstructions(
	home: string,
	preferred: readonly HarnessName[],
	cli: string,
	env?: NodeJS.ProcessEnv,
	start?: string,
): { globalInstructions: GlobalInstructionReport[]; findings: BridgeFinding[] }
```

Checks whether each harness installed under `home`, or named in `preferred`, loads `~/.agents/AGENTS.md` through its own user-scope file, looked up under the directory a variable in `env` moves it to. Where Claude Code's `CLAUDE_CONFIG_DIR` is set but empty, Claude Code reads its config folder from the directory it starts in, and that is `start`, which defaults to `process.cwd()`. `diagnoseBridges` calls it when given `home`, passing `root` as `start`. It reads the home directory and writes nothing. A finding is raised only where `~/.agents/AGENTS.md` exists. [Reaching ~/.agents/AGENTS.md](/cli/doctor/#reaching-agentsagentsmd) has the rules.

### GlobalInstructionReport

| Field | Type | Meaning |
| --- | --- | --- |
| `harness` | `HarnessName` | The harness |
| `path` | `string` | Its user-scope instruction file, written from `~`, such as `~/.claude/CLAUDE.md`, or from the variable that moved it, such as `$CODEX_HOME/AGENTS.md`. Under an empty `CLAUDE_CONFIG_DIR`, it is `./CLAUDE.md`, relative to `start`. Where a file read in its place loads the global file, that file, such as `~/.codex/AGENTS.override.md` |
| `kind` | `GlobalInstructionKind` | What is at that path: `import`, `symlink`, `file`, or `none` |
| `status` | `GlobalInstructionStatus` | `ok`, `missing`, `unbridged`, or `overridden` |

## diagnoseInstructions

```ts
function diagnoseInstructions(
	root: string,
	harnesses: readonly Harness[],
	cli: string,
): { instructions: InstructionReport[]; findings: BridgeFinding[] }
```

Checks whether each instruction bridge resolves, and whether a file suppresses `AGENTS.md` for a harness that reads it natively. `diagnoseBridges` calls it with the harnesses it selected; call it directly to check the instruction side alone. It reads project scope only.

`harnesses` are registry entries, not names. Pass entries from [`harnessRegistry`](/library/mcp/#harnessregistry):

```ts
const harnesses = harnessRegistry.filter(({ name }) => name === 'claude-code' || name === 'gemini-cli')
const { instructions, findings } = diagnoseInstructions(process.cwd(), harnesses, 'buddy-agent-harness')
```

A shadowing file is checked beside every `AGENTS.md` in the repository, not only the root one. `AGENTS.md` files under a dot-directory or `node_modules` are not counted. A missing root `AGENTS.md` is a `no-instructions` finding only when something depends on it: an instruction bridge, or a shadowing file at the root. [Reaching AGENTS.md](/cli/doctor/#reaching-agentsmd) has the rules.

### InstructionReport

| Field | Type | Meaning |
| --- | --- | --- |
| `harness` | `HarnessName` | The harness the file affects |
| `path` | `string` | Repository-relative path of the file that carries the bridge, or that shadows `AGENTS.md` |
| `kind` | `InstructionKind` | What is on disk at the path now |
| `status` | `InstructionStatus` | Whether the harness reaches `AGENTS.md` through it |

### InstructionKind

```ts
type InstructionKind = 'import' | 'symlink' | 'settings-entry' | 'file' | 'none'
```

`import` is a file with an `@AGENTS.md` line. `settings-entry` is a settings file whose array names `AGENTS.md`. `symlink` is a shadowing path that is a symlink. `file` is any other file, and `none` is nothing.

### InstructionStatus

```ts
type InstructionStatus = 'ok' | 'missing' | 'unbridged' | 'unreadable' | 'shadowing' | 'superseded'
```

The statuses are described in [Reaching AGENTS.md](/cli/doctor/#reaching-agentsmd). `shadowing` and `superseded` describe a file that suppresses `AGENTS.md`, not a missing bridge.

## buildDoctorReport

```ts
function buildDoctorReport(
	bin: string,
	result: DiagnoseResult,
	configuration?: { path: string; problem: DoctorProblem; detail: string; repair: { command: string; instruction: string } }[],
	held?: DoctorReference[],
): DoctorReport
```

Shapes a diagnosis into the report `doctor` prints. `bin` is the path shown on the report's first line. `configuration` adds findings beyond the bridges, such as the configuration findings and the MCP findings from [`diagnoseMcp`](/library/mcp/#diagnosemcp); it defaults to `[]`. `held` is the references to list; it defaults to `[]`.

When there are no findings, `findings` is a sentence rather than an empty list, and `help` and `divergence` are left out:

```ts
buildDoctorReport('~/bin/bah', result).findings
// '0 problems found — all 3 bridges resolve and the configuration around them is current'
```

The count adds the `bridges` and `instructions` rows together. When `held` is empty, `references` is the sentence `0 references — no layer outside the plugin tier holds one`.

When there are findings, each repair moves into `help`, one entry per distinct pair of `command` and `instruction`, and `divergence` appears when it has rows.

### DoctorReport

| Field | Type | Meaning |
| --- | --- | --- |
| `bin` | `string` | The `bin` it was given |
| `bridges` | `BridgeReport[]` | The skills bridges |
| `instructions` | `InstructionReport[]` | The instruction bridges and shadowing files |
| `globalInstructions` | `GlobalInstructionReport[]` | Whether each installed harness loads `~/.agents/AGENTS.md` |
| `references` | `DoctorReference[] \| string` | The references held, or the zero sentence |
| `divergence` | `DivergenceReport[]` | Present only when there are findings and a bridge diverged |
| `findings` | `{ path: string; problem: DoctorProblem; detail: string }[] \| string` | The findings without their repairs, or the zero sentence |
| `help` | `{ command: string; instruction: string }[]` | Present only when there are findings. One entry per distinct repair. `command` is always present, empty when no command does the repair |

### DoctorReference

```ts
type DoctorReference = { name: string; tier: ReferenceTier; path: string; status: string }
```

One reference row: its name, the tier holding it, the file's path, and the status [`reference list`](/cli/reference/#reference-list) gives it, such as `used`.

## doctorCommand

```ts
const doctorCommand: cli.Command
```

The [`doctor`](/cli/doctor/) command as a `clibuilder` command object, with the `--root`, `--harness`, and `--format` options. Its `run` calls `diagnoseBridges`, adds the configuration, MCP, and non-standard findings and the references outside the plugin tier, and writes `buildDoctorReport`'s result in the requested format.

It returns `0` whether or not there are findings. It returns `1` when the diagnosis fails, such as on an unknown harness name, and writes the failure to stderr. An unknown `--format` never reaches `run`: `clibuilder` rejects it as a usage error, exit code `2`.

## The repair tables

Each problem `doctor` can report has one row: what the finding means and how to repair it. The CLI's repairs and the generated skill's both come from these rows, so the two cannot drift apart.

| Export | Holds |
| --- | --- |
| `bridgeRepairs` | One `Repair` per `BridgeProblem`, in the order `doctor` reports them |
| `instructionRepairs` | One `Repair` per `InstructionProblem` |
| `globalInstructionRepairs` | One `Repair` per `GlobalInstructionProblem` |
| `doctorRepairs` | One `Repair` per `DoctorProblem`, across every section |

All four are `readonly Repair[]`.

```ts
const degraded = bridgeRepairs.find(({ problem }) => problem === 'degraded')
degraded?.repair({ file: '.claude/skills' }, 'buddy-agent-harness').command
// 'buddy-agent-harness init --copy --force .claude/skills'
```

### Repair

| Field | Type | Meaning |
| --- | --- | --- |
| `problem` | `DoctorProblem` | The finding's name |
| `detail` | `string` | What `doctor` prints in the `findings` row for it |
| `repair` | `(at: Locator, cli: string) => { command: string; instruction: string }` | The repair the CLI reports, for the location `at`, naming the tool as `cli` |
| `skillRepair` | `(at: Locator) => string` | The repair the generated skill gives. It hands a bridge rebuild to the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/) rather than `init`, since rebuilding can move skills a user wrote |

`at` is a location in parts: `file`, the repository-relative path, plus `server` and `field` when the finding is about an MCP server entry, and `position` when the file does not parse. Read the parts off it rather than splitting a rendered path.

### DoctorProblem

```ts
type DoctorProblem =
	| BridgeProblem
	| InstructionProblem
	| GlobalInstructionProblem
	| ConfigurationFault
	| McpProblem
	| NonstandardProblem
```

Every finding name `doctor` can report, across every section. `ConfigurationProblem` is an alias for the same union.

| Type | Values | Documented in |
| --- | --- | --- |
| `BridgeProblem` | `no-canonical`, `missing`, `degraded`, `stale`, `diverged-bridge`, `diverged-canonical`, `diverged-both`, `diverged-unknown`, `unpinned-copy` | [Output](/cli/doctor/#output), [Divergence](/cli/doctor/#divergence), [The skip-worktree bit](/cli/doctor/#the-skip-worktree-bit) |
| `InstructionProblem` | `no-instructions`, `instructions-missing`, `instructions-unbridged`, `instructions-unreadable`, `instructions-shadowing`, `instructions-superseded` | [Reaching AGENTS.md](/cli/doctor/#reaching-agentsmd) |
| `GlobalInstructionProblem` | `global-instructions-missing`, `global-instructions-unbridged` | [Reaching ~/.agents/AGENTS.md](/cli/doctor/#reaching-agentsagentsmd) |
| `ConfigurationFault` | `deprecated-harness`, `ignored-bridge`, `unread-local-override`, `unloadable-skill` | [Configuration findings](/cli/doctor/#configuration-findings) |
| `McpProblem` | `mcp-golden-unreadable`, `mcp-target-unreadable`, `mcp-unprojected`, `mcp-undeclared`, `mcp-diverged-target`, `mcp-diverged-golden`, `mcp-diverged-both`, `mcp-diverged-unknown`, `mcp-literal-secret`, `mcp-committed-secret` | [MCP Servers](/agent-configuration/mcp-servers/) |
| `NonstandardProblem` | `nonstandard-instructions`, `nonstandard-rule`, `nonstandard-command`, `nonstandard-skill`, `nonstandard-subagent` | [Non-standard configuration findings](/cli/doctor/#non-standard-configuration-findings) |

`NonstandardProblem` is not exported by name; it is reachable only through `DoctorProblem`.

## doctorSkill

```ts
const doctorSkill: { readonly name: 'doctor-buddy-agent-harness'; readonly description: string }
```

The generated skill's `name` and `description`, as they appear in its frontmatter.

## renderDoctorSkill

```ts
function renderDoctorSkill(version: string): string
```

Returns the full `SKILL.md` of the [`doctor-buddy-agent-harness` skill](/skills/doctor-buddy-agent-harness/), frontmatter included. `version` is the package version; it sets the fallback `npx -y buddy-agent-harness@^<version> doctor` invocation the skill names. The finding tables are not in it; they are in the skill's reference pages.

The package's build writes the shipped skill from this function, and the drift check in `pnpm verify` compares the two.
