---
title: 'Library: MCP and the harness registry'
description: 'Library reference for the harness registry and the MCP exports of buddy-agent-harness: harnessRegistry and its types, listMcpServers, diagnoseMcp, goldenSetPath, and the shared MCP server model.'
---

```ts
import { diagnoseMcp, goldenSetPath, harnessRegistry, listMcpServers } from 'buddy-agent-harness'
```

These exports are the data and the readers behind [`init`](/cli/init/), [`doctor`](/cli/doctor/), and [`mcp`](/cli/mcp/). `harnessRegistry` is the one table of harnesses: where each is detected, where its skills are projected, what stands between it and `AGENTS.md`, and where it keeps its MCP servers. `listMcpServers` and `diagnoseMcp` read MCP configuration through that table. The first lists every configured server, redacted. The second compares a [golden MCP server set](/agent-configuration/mcp-servers/) against each harness's copy and returns `doctor`'s `mcp-*` findings.

None of them write. `listMcpServers` and `diagnoseMcp` read files and, for `diagnoseMcp`, git history; nothing here creates, moves, or repairs anything.

## harnessRegistry

```ts
const harnessRegistry: readonly Harness[]
```

Every harness the package knows, one entry each. The order is `claude-code`, `cursor`, `codex`, `copilot-cli`, `gemini-cli`, `devin-desktop`, `windsurf`.

Skills directories come from `@cyberuni/agent-harness`. The two harnesses it does not know, `devin-desktop` and `windsurf`, are filled in by hand.

```ts
import { harnessRegistry } from 'buddy-agent-harness'

const mcpFiles = harnessRegistry.flatMap((harness) =>
	harness.project.mcpConfig ? [`${harness.name}: ${harness.project.mcpConfig.path}`] : [],
)
// ['claude-code: .mcp.json', 'cursor: .cursor/mcp.json', 'codex: .codex/config.toml', 'gemini-cli: .gemini/settings.json']
```

### Harness

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `HarnessName` | The harness. |
| `project` | `HarnessScope` | What the harness does inside a repository. `init` and `doctor` act only here. |
| `user` | `HarnessScope`, optional | What it does outside any repository. Absent when no user-scope path is documented, as for `devin-desktop` and `windsurf`. Diagnosable, never written. |
| `deprecated` | `HarnessName`, optional | Set when the name has been superseded; the value is the name that replaces it. `windsurf` carries `'devin-desktop'`. |

### HarnessScope

What one harness does at one scope. Every path is relative to that scope's root: the repository for `project`, the home directory for `user`.

| Field | Type | Meaning |
| --- | --- | --- |
| `detect` | `string` | The directory whose presence means this harness is configured at this scope, such as `.claude` or `.github/skills`. |
| `skillsDirectory` | `string`, optional | The projection target for `.agents/skills`. Absent when the harness reads `.agents/skills` natively. |
| `instructionBridge` | `InstructionBridge`, optional | What the harness needs at this scope to read `AGENTS.md`. Diagnosed and gated, never written by `init`. |
| `shadowedBy` | `readonly string[]`, optional | Files whose presence beside `AGENTS.md` stops the harness reading it. For Claude Code: `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`. |
| `mcpConfig` | `McpConfig`, optional | Where this harness keeps its own MCP servers. `doctor` compares against it; `mcp project` writes into it. |
| `nonstandard` | array, optional | What this harness reads that no other can, such as `.cursorrules` or `.claude/commands`. Each item has a `path`, a `shape` (`'file'` or `'directory'`), and a `kind` (`'instructions'`, `'rule'`, `'command'`, `'skill'`, or `'subagent'`). `doctor` reports them so they can be converted to canonical form. |

### HarnessName

```ts
type HarnessName =
	| 'claude-code'
	| 'cursor'
	| 'codex'
	| 'copilot-cli'
	| 'gemini-cli'
	| 'devin-desktop'
	| 'windsurf'
	| 'vscode'
	| 'opencode'
	| 'zed'
```

The first seven have a `harnessRegistry` entry. `vscode`, `opencode`, and `zed` have none: only `listMcpServers` recognizes them, so `McpServerEntry.harness` can name them.

### HarnessScopeName

```ts
type HarnessScopeName = 'project' | 'user'
```

The two scopes a harness reads configuration at. Their roots differ; their shape does not.

### McpConfig

Where one harness keeps its MCP servers at project scope, as its vendor documents it.

| Field | Type | Meaning |
| --- | --- | --- |
| `path` | `string` | Repository-relative path of the file. |
| `key` | `string` | The key the servers sit under. It differs per harness — `mcpServers`, or `mcp_servers` for Codex — and the wrong key reads as an unconfigured repository. |
| `format` | `'json' \| 'toml'` | The file's format. |
| `dialect` | `'claude-code' \| 'cursor' \| 'codex' \| 'gemini-cli'` | Which harness's entry shape the file holds; the same key can hold different fields. See [dialects](/cli/mcp/#dialects). |
| `shared` | `true`, optional | The file holds more than MCP configuration, so only `key` is touched, never the whole file. Set for `.codex/config.toml` and `.gemini/settings.json`. |

A harness with no `mcpConfig` is never read or written. Devin Desktop documents no project-scope file, and Copilot CLI's is not chosen yet.

| Harness | `path` | `key` | `format` |
| --- | --- | --- | --- |
| `claude-code` | `.mcp.json` | `mcpServers` | `json` |
| `cursor` | `.cursor/mcp.json` | `mcpServers` | `json` |
| `codex` | `.codex/config.toml` | `mcp_servers` | `toml` |
| `gemini-cli` | `.gemini/settings.json` | `mcpServers` | `json` |

### InstructionBridge

What a harness needs to read `AGENTS.md`. Only Gemini CLI has one, at project scope.

| Field | Type | Meaning |
| --- | --- | --- |
| `kind` | `'settings-entry'` | An `AGENTS.md` entry in an array inside a JSON settings file. |
| `path` | `string` | Repository-relative path of the settings file: `.gemini/settings.json`. |
| `key` | `string` | Dotted path to the array within it, as the harness documents it: `context.fileName`. |

`kind` is the union's tag. Today it has one member; a harness that needs a different shape adds another.

## listMcpServers

```ts
function listMcpServers(options: ListMcpServersOptions): McpServerEntry[]
```

Lists every configured MCP server across the supported harnesses and scopes, redacted of anything that could carry a credential. It is an inventory, not a diagnosis: a missing or unparseable file contributes no entries and raises nothing. For drift and literal secrets, use [`diagnoseMcp`](#diagnosemcp).

```ts
import { listMcpServers } from 'buddy-agent-harness'

const servers = listMcpServers({ projectDir: process.cwd() })
// [{ harness: 'claude-code', scope: 'project', configFile: '/repo/.mcp.json', name: 'linear',
//    transport: 'stdio', command: 'npx', args: ['-y', 'linear-mcp'], url: undefined, enabled: true }]
```

### Where it reads

| Source | `harness` | `scope` |
| --- | --- | --- |
| Each registry harness's `mcpConfig`, under `projectDir` | that harness | `project` |
| `~/.claude.json`, top-level `mcpServers` | `claude-code` | `user` |
| `~/.claude.json`, `projects[<projectDir>].mcpServers` | `claude-code` | `local` |
| `.mcp.json` of each installed Claude Code plugin, from `~/.claude/plugins/installed_plugins.json` | `claude-code` | `plugin` |
| `~/.cursor/mcp.json` | `cursor` | `user` |
| `config.toml` in `$CODEX_HOME`, or `~/.codex` | `codex` | `user` |
| `mcp-config.json` in `$COPILOT_HOME`, or `~/.copilot` | `copilot-cli` | `user` |
| `~/.gemini/settings.json` | `gemini-cli` | `user` |
| `~/.codeium/windsurf/mcp_config.json` | `devin-desktop` | `user` |
| VS Code's user `mcp.json`, and `.vscode/mcp.json` | `vscode` | `user`, `project` |
| `opencode.json` under `$XDG_CONFIG_HOME/opencode` (or `~/.config/opencode`), and in `projectDir` | `opencode` | `user`, `project` |
| `settings.json` under `$XDG_CONFIG_HOME/zed` (or `~/.config/zed`), and `.zed/settings.json` | `zed` | `user`, `project` |

`windsurf` is skipped as deprecated; its legacy file is read under its new name, `devin-desktop`. A plugin installed for a different project is skipped. A plugin server's `enabled` follows the plugin's own enabled state in `enabledPlugins`, merged from `~/.claude/settings.json`, then `.claude/settings.json`, then `.claude/settings.local.json`, with the last write winning. A plugin not enabled there lists its servers as disabled.

OpenCode's `command` array, Zed's `command` object, and Windsurf's `serverUrl` are reshaped into the shared [`McpServer`](#mcpserver) fields before an entry is built.

### ListMcpServersOptions

| Field | Type | Meaning |
| --- | --- | --- |
| `projectDir` | `string` | The project directory to read project-scope configuration from. |
| `homeDir` | `string`, optional | Overrides `os.homedir()`, for a test that must not touch the real one. |
| `env` | `Record<string, string \| undefined>`, optional | Overrides `process.env`. Read only for `CODEX_HOME`, `COPILOT_HOME`, `XDG_CONFIG_HOME`, and, on Windows, `APPDATA`. |
| `platform` | `NodeJS.Platform`, optional | Overrides `os.platform()`, which decides where VS Code's user directory is. |

### McpServerEntry

One configured server, redacted.

| Field | Type | Meaning |
| --- | --- | --- |
| `harness` | `HarnessName` | The harness whose file declares it. |
| `scope` | `'project' \| 'user' \| 'local' \| 'plugin'` | `local` is Claude Code's per-project entry inside `~/.claude.json`; `plugin` is a server an installed Claude Code plugin ships. |
| `configFile` | `string` | The absolute path of the file the entry was read from. |
| `name` | `string` | The name the server is declared under. |
| `transport` | `McpTransport \| undefined` | Stated, or inferred: `url` means `http`, `command` means `stdio`. |
| `command` | `string \| undefined` | The command's basename, never its full path. |
| `args` | `readonly string[]` | The arguments, with any credential-bearing `--flag=value` pair dropped. |
| `url` | `string \| undefined` | The URL's origin and path, never its query string. |
| `enabled` | `boolean` | `false` only when the entry says so, or when its plugin is not enabled. |
| `plugin` | `string`, optional | The plugin id the server came from. Set only when `scope` is `'plugin'`. |

`env` and `headers` are not carried at all.

## diagnoseMcp

```ts
function diagnoseMcp(options: DiagnoseMcpOptions): ConfigurationFinding[]
```

Returns the `mcp-*` findings `doctor` reports: the golden set at [`goldenSetPath`](#goldensetpath) compared against the MCP file of each enabled harness. A harness is enabled by the rule `doctor` uses: Claude Code and Cursor always, and any other whose `detect` directory exists.

1. Each target file is read first, so one that does not parse is reported as `mcp-target-unreadable` even with no golden set. A target that does not exist yet is skipped: nothing has drifted.
2. Every literal credential in a target is reported, as `mcp-committed-secret` when git tracks the file and `mcp-literal-secret` when it does not.
3. With no golden set, it stops there. A golden set that does not parse is `mcp-golden-unreadable`, with its line and column when the parser gave them.
4. Otherwise, per target: a golden server the target does not carry is `mcp-unprojected`; a target server the golden set does not declare is `mcp-undeclared`; and each field that differs is `mcp-diverged-target`, `mcp-diverged-golden`, `mcp-diverged-both`, or `mcp-diverged-unknown`, naming which side moved.

Only the fields the target's dialect can hold are compared, and a field the golden set leaves unset is never drift. Which side moved is read from the last-projected record that `mcp project --write` leaves at `.agents/buddy-agent-harness/mcp.projected.json`; failing that, from the newest of the last 200 commits where the two files agreed on that field. Every finding and its repair is listed on [MCP Servers](/agent-configuration/mcp-servers/).

A finding never carries a secret's value. Its `path` is a locator such as `.cursor/mcp.json#servers.linear.headers.Authorization`, or `.agents/buddy-agent-harness/mcp.toml#L3:7` for a file that does not parse.

### DiagnoseMcpOptions

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The repository or package directory. |
| `git` | `GitBridgeState` | Answers which files git tracks, which commits touched a path, and a file's content at a commit. Constructed as `new GitBridgeState(root)`; every method degrades to "cannot tell" outside a repository. The class is not exported from the package entry. |
| `cli` | `string` | How to name this tool in the repair commands, such as `buddy-agent-harness`. |

### The returned findings

Each finding has the shape `doctor` prints in its `findings` section:

| Field | Type | Meaning |
| --- | --- | --- |
| `path` | `string` | The locator: a file, a server in it (`#servers.<name>`), a field of that server (`#servers.<name>.<field>`), or a position (`#L<line>:<column>`). |
| `problem` | `McpProblem` | One of the ten `mcp-*` names above. |
| `detail` | `string` | What is wrong, in prose. |
| `repair` | `{ command: string; instruction: string }` | What repairs it. `command` is a shell invocation, or empty when none does; `instruction` is always present and complete on its own. |

## goldenSetPath

```ts
const goldenSetPath: '.agents/buddy-agent-harness/mcp.toml'
```

The repository-relative path of the golden MCP server set. It is namespaced under `.agents/buddy-agent-harness/` rather than sitting at `.agents/mcp.json`; [Where it lives](/agent-configuration/mcp-servers/#where-it-lives-and-why-not-agentsmcpjson) says why. The servers sit under the file's `servers` table.

## McpServer

The shared model every MCP file is read into: the golden set, each harness's copy, and `listMcpServers`'s sources. It is a superset of every harness's fields. It carries what the user wrote and never invents a value.

| Field | Type |
| --- | --- |
| `transport` | `McpTransport`, optional |
| `command` | `string`, optional |
| `args` | `readonly string[]`, optional |
| `env` | `Readonly<Record<string, string>>`, optional |
| `url` | `string`, optional |
| `headers` | `Readonly<Record<string, string>>`, optional |
| `description` | `string`, optional |
| `enabled` | `boolean`, optional |
| `timeout` | `number`, optional |
| `source` | `string`, optional |

A field of the wrong type is dropped on the way in rather than carried through, so a `timeout` written as a string is never reported as a divergence. An unstated transport is inferred: `url` means `http`, `command` means `stdio`. `env` and `headers` keep only their string values.

### McpField

```ts
type McpField =
	| 'transport'
	| 'command'
	| 'args'
	| 'env'
	| 'url'
	| 'headers'
	| 'description'
	| 'enabled'
	| 'timeout'
	| 'source'
```

One field of `McpServer`, in the order a finding reports them. `args` compares in order, as a command line. `env` and `headers` compare per name: only the names the golden set declares count, so a name only the harness has is not drift.

### McpTransport

```ts
type McpTransport = 'stdio' | 'http' | 'sse'
```

### McpDirection

```ts
type McpDirection = 'target' | 'golden' | 'both' | 'unknown'
```

Which side of a diverged field moved since the golden set and the harness's copy last agreed. `unknown` means no baseline could say. Each value names one finding: `mcp-diverged-target`, `mcp-diverged-golden`, `mcp-diverged-both`, and `mcp-diverged-unknown`. See [which side moved](/agent-configuration/mcp-servers/#which-side-moved).
