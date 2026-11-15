# MCP inventory

A program learns every MCP server configured for a project, across harnesses and scopes, with no credential in the
answer.

## What

A tool that wants to show which MCP servers an agent will start for a project, such as a dashboard or a setup check,
has to know where every harness keeps its MCP configuration, at the project and in the user's home directory, in each
harness's own file, key, and syntax. Those files also hold tokens: in `env` and `headers`, in an argument, or in a
URL's query string. A tool that copies an entry as it stands carries the token into its own output, and from there
into a log or a transcript.

The package exports one call that answers this. Given a project directory, it reads every MCP configuration file the
supported harnesses keep for that project and for the user, and returns one entry per declared server: where it was
declared, under which name, how it runs, and whether it is enabled. Every part that could carry a credential is
removed before the entry is built. It reads and never writes, and it reports an inventory, not a diagnosis: a file it
cannot read contributes nothing and says nothing.

## Non-goals

- N1 **Diagnosing drift or literal credentials.** Comparing the golden set with each harness copy, and reporting a
  literal credential, is [mcp-diagnosis](../mcp-diagnosis/README.md). The inventory raises no finding.
- N2 **Changing what `doctor` reads.** The inventory reads user-scope files `doctor` never reads; adding a source here
  adds nothing to `doctor`.
- N3 **Writing.** No MCP file is created or changed, and no golden set or record is read or written.
- N4 **A command.** The inventory is a library call only; the command line does not offer it.
- N5 **Merging or ranking servers.** Two files declaring the same name give two entries; which one a harness would
  start is not decided.
- N6 **Reporting why a file was skipped.** A missing or unreadable file is silent.

## Key terms

- K1 **harness**: see [glossary](../glossary.md#harness).
- K2 **source**: one MCP configuration file the inventory reads, with the key its servers sit under.
- K3 **scope**: where a source applies. **project**: a file under the project directory. **user**: a file under the
  user's home directory, or under the directory a relocating variable names. **local**: Claude Code's entry for this
  project inside its user-scope file. **plugin**: a server an installed Claude Code plugin ships.
- K4 **sources read**:

  | Harness | Project scope | User scope |
  | --- | --- | --- |
  | Claude Code | `.mcp.json` | `~/.claude.json` (its top-level servers; the entry for this project is local scope) |
  | Cursor | `.cursor/mcp.json` | `~/.cursor/mcp.json` |
  | Codex | `.codex/config.toml` | `config.toml` under `CODEX_HOME`, or `~/.codex/` |
  | Copilot CLI | none | `mcp-config.json` under `COPILOT_HOME`, or `~/.copilot/` |
  | Gemini CLI | `.gemini/settings.json` | `~/.gemini/settings.json` |
  | VS Code | `.vscode/mcp.json` | `mcp.json` in VS Code's user directory for the platform |
  | Devin Desktop | none | `~/.codeium/windsurf/mcp_config.json` |
  | OpenCode | `opencode.json` | `opencode/opencode.json` under `XDG_CONFIG_HOME`, or `~/.config/` |
  | Zed | `.zed/settings.json` | `zed/settings.json` under `XDG_CONFIG_HOME`, or `~/.config/` |

  Plugin scope reads the MCP file of each installed Claude Code plugin.
- K5 **credential-bearing field**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K11.
- K6 **reference**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K10.
- K7 **entry**: what the inventory returns for one declared server: the harness, the scope, the file it was read from,
  the name it is declared under, its transport, its command, its arguments, its URL, whether it is enabled, and, for
  plugin scope, the plugin it came from.
- K8 **plugin enabled**: the plugin's enabled setting, read from the user's Claude Code settings, then the project's,
  then the project's local settings, a later file overriding an earlier one.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | package consumer | learn every MCP server configured for a project, across harnesses and scopes, in one shape |
| A1.2 | package consumer | tell an enabled server from a disabled one, and a plugin's server from one the user declared |
| A2.1 | person whose MCP files hold credentials | have no credential of theirs in the inventory's answer |
| A3.1 | test | run the inventory against a fixture home directory, environment, and platform, never the machine's own |

## Use cases

### UC1 — List every configured MCP server (A1.1, A1.2, A2.1)

- **Trigger**: a program wants the MCP servers configured for a project.
- **Entry points**:
  - Library (primary): `listMcpServers`, exported from the package's public entry
    ([entry-point](../entry-point/README.md)).
- **Inputs**: the project directory; optionally a home directory, an environment, and a platform.
- **Success**: one entry per server declared in every source that exists and parses, with nothing that could carry a
  credential.
- **Extensions**:
  - UC1.1 A source does not exist, does not parse, or holds no server table: it contributes no entry, and the call
    still succeeds.
  - UC1.2 A server declares itself disabled, or comes from a plugin that is not enabled: its entry says it is disabled.
  - UC1.3 A plugin was installed for another project: its servers are not listed.
  - UC1.4 A server's URL does not parse: its entry carries no URL.
  - UC1.5 A source spells a server in its harness's own shape, such as a command given as a list or an object, or a
    URL under another key: the entry carries the same fields as any other.

### UC2 — Run the inventory in isolation (A3.1)

- **Trigger**: a test calls the inventory with a fixture home directory, environment, and platform.
- **Entry points**:
  - Library (primary): `listMcpServers` with those options.
- **Inputs**: the project directory and the three fixtures.
- **Success**: the answer depends only on the project directory and the fixtures.
- **Extensions**:
  - UC2.1 An option is left out: the user's home directory, the process environment, or the running platform stands
    in for it.

## Criteria

### What is listed

- R1 (UC1) The answer holds one entry for each server declared in each source of K4 that exists and parses, and only
  those, with every part K7 names.
- R2 (UC1) A relocating variable (`CODEX_HOME`, `COPILOT_HOME`, `XDG_CONFIG_HOME`, and, on Windows, `APPDATA`) that is
  set and non-empty moves its user-scope source under the directory it names; unset or empty, the source is read
  from its place under the home directory.
- R3 (UC1) The VS Code user-scope source is read from the user directory VS Code uses on the platform: under
  `XDG_CONFIG_HOME` or `~/.config/` on Linux, under `Library/Application Support/` on macOS, and under `APPDATA` or
  `AppData/Roaming/` on Windows.
- R4 (UC1) Claude Code's servers for this project inside its user-scope file are listed in local scope, and its
  servers for any other project are not listed.
- R5 (UC1, UC1.3) The servers of each installed Claude Code plugin installed for every project, or for this project,
  are listed in plugin scope naming the plugin, whether its MCP file holds them under a server key or at its top
  level; a plugin installed for another project contributes none.
- R6 (UC1.2) An entry is reported disabled when its server declares itself disabled, or, in plugin scope, when its
  plugin is not enabled (K8); otherwise it is reported enabled.
- R7 (UC1.5) A server whose source spells its command as a list or an object, or its URL under another key, gets an
  entry with the same command, arguments, and URL as one spelled in the common shape.
- R8 (UC1) A deprecated harness name gets no entry of its own; a source a renamed harness kept is listed under its
  current name, as Windsurf's is under Devin Desktop.
- R9 (UC1.1) A source that does not exist, does not parse, or holds no server table contributes no entry, raises no
  error, and does not stop the other sources from being read.

### Redaction

- R10 (UC1) No entry carries a value of a server's `env` or `headers`, or the name of any of their fields.
- R11 (UC1) An entry's command is the command's file name alone, never the path to it.
- R12 (UC1) An entry's arguments are the server's own, in order, except that an argument of the form `--flag=value`
  whose flag is a credential-bearing field and whose value is not a reference is dropped.
- R13 (UC1, UC1.4) An entry's URL holds only the origin and path of the server's URL, never its userinfo, query
  string, or fragment, and a URL that does not parse gives the entry no URL.

### Isolation

- R14 (UC1) A call creates, changes, or removes no file.
- R15 (UC2) A call given a home directory, an environment, and a platform reads no user-scope source outside that
  home directory or the directories that environment names, and its answer is the same on every machine.
- R16 (UC2.1) A call that leaves out the home directory, the environment, or the platform uses the user's home
  directory, the process environment, or the running platform for it.

## Open questions

None.

## References

- [mcp-diagnosis](../mcp-diagnosis/README.md): the credential-bearing test and the reference shapes the redaction
  uses, and the project-scope files `doctor` compares.
- [entry-point](../entry-point/README.md): the public entry that exports the call.
- [mcp-canonical-location evidence](../../../../../.research/mcp-canonical-location/evidence.md): where each harness
  keeps its MCP configuration.
- The library page `apps/web/src/content/docs/library/mcp.md`: the user-facing account of the call.
