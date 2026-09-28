---
title: 'CLI: mcp'
description: 'CLI reference for buddy-agent-harness mcp project and mcp reconcile: writing the golden MCP server set into each harness, importing a harness-side change back, what each refuses, and the last-projected record.'
---

```sh
buddy-agent-harness mcp project [--root <directory>] [--write] [--format toon|json|text]
```

`mcp project` writes the [golden MCP server set](/agent-configuration/mcp-servers/) into each enabled harness's own project-scope MCP file. It is the forward half of the writers [`doctor`](/cli/doctor/) names as its own non-goal: `doctor` only reports drift between the golden set and a harness copy, and this command is what acts on that report. It is a dry run unless `--write` is passed.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Repository or package directory. Defaults to the current directory. |
| `--write` | Apply the plan and record what was projected. Without it, nothing on disk changes. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

## What it writes, and what it will not touch

The command writes only where the golden set is plainly ahead: a server the target does not carry yet, or a field where only the golden side changed since the two last agreed. A harness-side change is never overwritten — pulling it back into the golden set is [`mcp reconcile`](#mcp-reconcile)'s job. Removing a server the golden set no longer declares is not this command's either; that is `mcp-undeclared`, and deciding which side is right is a person's call.

Every write is byte-preserving. A new JSON server is spliced into the existing file at the parse tree's offsets; a new Codex table is appended. Every other server and every comment in the file is kept exactly as it was. A write is verified by parsing the new text back through the target's own dialect: the changed server must read back equal to the golden server, and every other server must come back unchanged. If it does not, the change becomes an `edit` instead of being written.

## Example

Given a golden set with three servers — a stdio filesystem server, a remote server with a bearer token reference, and one on the deprecated SSE transport — a dry run against a fresh repository with no MCP files yet reports:

```
golden: .agents/buddy-agent-harness/mcp.toml
mode: dry run — nothing written; re-run with --write to apply

actions:
  target                 server  action  detail
  .mcp.json              fs      add     creates the file
  .mcp.json              linear  add     creates the file
  .mcp.json              old     add     creates the file
  .cursor/mcp.json       fs      add     creates the file
  .cursor/mcp.json       linear  add     creates the file
  .cursor/mcp.json       old     add     creates the file
  .codex/config.toml     fs      add     appends the server
  .codex/config.toml     linear  add     appends the server
  .codex/config.toml     old     refuse  transport: Codex supports no SSE transport
  .gemini/settings.json  fs      add     appends the server
  .gemini/settings.json  linear  add     appends the server
  .gemini/settings.json  old     add     appends the server

entries:
  target                 server  action  entry
  .cursor/mcp.json       linear  add     {
  "linear": {
    "url": "https://mcp.linear.app/mcp",
    "headers": {
      "Authorization": "Bearer ${env:LINEAR_TOKEN}"
    }
  }
}
  .codex/config.toml     linear  add     [mcp_servers.linear]
url = "https://mcp.linear.app/mcp"
bearer_token_env_var = "LINEAR_TOKEN"

record: not written — dry run
```

(`entries` truncated here; the full report carries one entry per `add`, `update`, or `edit` row, each rendered exactly as it would read in that target.)

Three things to notice:

- The golden set's `${LINEAR_TOKEN}` reference is rewritten per dialect: `${env:LINEAR_TOKEN}` for Cursor, and Codex's dedicated `bearer_token_env_var` field for Codex — never a literal token, and never the same syntax twice. See [dialects](#dialects).
- The `old` server, on the SSE transport, is written for Claude Code, Cursor, and Gemini CLI, but **refused** for Codex, which documents no SSE support at all.
- The `linear` server's header reference is written into Gemini CLI as `${LINEAR_TOKEN}`, since Gemini CLI expands a reference in every string of its settings file.

`--write` applies the same plan, writes each changed target, and records what was projected:

```
mode: written
record: .agents/buddy-agent-harness/mcp.projected.json
```

## The actions

| Action | Meaning |
| --- | --- |
| `add` | the server is written into a target that did not carry it, creating the file if there was none |
| `update` | the fields only the golden side changed are rewritten in place |
| `edit` | the change is due, but this command will not make it byte-safely; the entry is listed for a person or the [`repair` skill](/skills/repair/) to apply. See [what it keeps](#what-it-keeps) |
| `skip` | the target moved, both sides moved, or no baseline can say which side moved, so nothing is written |
| `refuse` | the target cannot hold this server as written, or the golden set holds a literal credential; `detail` names the field and why |

A server already in agreement produces no row at all, so a run with nothing to do states its zero rather than printing an empty section.

## What it keeps

Every byte outside the entry being written stays as it was, comments included. That holds in the shared files too: `.gemini/settings.json` also carries Gemini CLI's other settings, and `.codex/config.toml` all of Codex's project configuration.

- **JSON:** the server's value is replaced at its offsets in the parse tree.
- **TOML:** the `[mcp_servers.<name>]` table and every `[mcp_servers.<name>.*]` sub-table are replaced, wherever they sit in the file.

The change becomes an `edit` when the command cannot make it that way:

- **The entry holds a comment.** Replacing the entry would drop the comment, and where a comment belongs in a rewritten entry is your call. A comment on the entry's last line counts as inside it.
- **A Codex server is not written as a `[mcp_servers.<name>]` table.** An inline table (`linear = { command = "npx" }`) or dotted keys (`linear.command = "npx"`) are left for you.
- **The new text does not read back.** Each write is parsed again. The server must come back equal to the golden server, with every other server unchanged.

## What is refused, and why

| Refusal | Cause |
| --- | --- |
| A literal credential in the golden set | writing it would copy the credential into up to four more files; the field is named, never the value |
| No `command` or `url` on the server | there is nothing to run |
| An SSE server projected into Codex | Codex documents no SSE transport at all (E-MCP-14) |
| A reference the target cannot expand | Codex expands none (E-MCP-14) |
| A variable renamed on the way into Codex, such as `A = "${B}"` | Codex's `env_vars` passes a variable through under its own name, so it cannot express a rename (E-MCP-14) |
| A target that does not parse | that target is refused and left alone; the others still proceed |

A field the golden set leaves unset is never invented, and a field the target's dialect has no place for is dropped rather than reported as drift — the same rule [MCP Servers](/agent-configuration/mcp-servers/#comparison-is-semantic) states for `doctor`'s comparison.

## Dialects

Each harness's MCP file has its own shape for the same concepts. `mcp project` reads and writes through a per-harness dialect rather than one shared shape:

| Concept | Claude Code | Cursor | Codex | Gemini CLI |
| --- | --- | --- | --- | --- |
| transport | `type` | `type: "stdio"` only; SSE and streamable HTTP are not told apart | from `command` vs `url`; no SSE | `command`; `url` is SSE; `httpUrl` is streamable HTTP |
| reference | `${NAME}` as written | `${env:NAME}`; no default form | no expansion: `env_vars`, `env_http_headers`, `bearer_token_env_var` | `${NAME}` as written, in every field |
| timeout | `timeout`, ms | none | `tool_timeout_sec`, seconds | `timeout`, ms |
| other | `description` | — | `enabled` | — |

The golden set writes a reference as `${NAME}`, and each dialect translates it on the way out. `.research/mcp-canonical-location/evidence.md` E-MCP-12 through E-MCP-16 back this table; E-MCP-13 is why Cursor has no remote transport field, E-MCP-14 is why Codex refuses SSE and every inline reference, E-MCP-15 is why Gemini CLI splits `url` and `httpUrl`, and E-MCP-18 is why a reference passes into Gemini CLI unchanged.

## The last-projected record

On `--write`, the command records every server that now agrees with the golden set at `.agents/buddy-agent-harness/mcp.projected.json`, per target, keeping what was already recorded for servers this run left alone. [`doctor`](/cli/doctor/) reads this file as its baseline for [which side moved](/agent-configuration/mcp-servers/#which-side-moved).

## Approval

The command has no approval of its own — it writes whatever `--write` tells it to, unconditionally. The [`repair` skill](/skills/repair/) is what shows a dry run to a person and passes `--write` only once they approve it; see [what it owns](/skills/repair/#what-it-corrects).

## Non-goals

- **Reconciling.** Importing a target-side change back into the golden set is [`mcp reconcile`](#mcp-reconcile)'s.
- **User scope.** The command does not read or write `~/.codex/config.toml`, `~/.claude.json`, or `claude_desktop_config.json`.
- **Removing a server.** A server present in a target but not in the golden set is `mcp-undeclared`, and deciding which side is right is a person's call.

## Targets

A target is every MCP file an enabled harness reads, chosen by the same rule `doctor` uses: Claude Code and Cursor are always enabled, Codex and Gemini CLI are enabled when their directory already exists. A file that does not exist yet is created only for an enabled harness.

## mcp reconcile

```sh
buddy-agent-harness mcp reconcile [--root <directory>] [--accept <path>]... [--format toon|json|text]
```

`mcp reconcile` is the other direction. It imports a change made in a harness's MCP file back into the golden set, **one approved field at a time**. It covers the two findings where the harness side is plainly ahead: `mcp-diverged-target` and `mcp-undeclared`. It is a dry run unless `--accept` names a field.

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Repository or package directory. Defaults to the current directory. |
| `--accept <path>` | Approve one field by the `path` the dry run lists for it. Repeat it for each field. There is no approve-all. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

A dry run against a golden set whose `linear` server the harness changed, and a `docs` server only `.mcp.json` declares with a literal bearer token:

```
golden: .agents/buddy-agent-harness/mcp.toml
mode: dry run — nothing written; re-run with --accept <path> for each approved field

fields:
  path                                          action  value
  .mcp.json#servers.linear.command              import  command = "bunx"
  .mcp.json#servers.docs.url                    import  url = "https://docs"
  .mcp.json#servers.docs.headers.Authorization  refuse

record: not written — dry run
```

(`detail` is left out here.) Approve fields one by one:

```sh
buddy-agent-harness mcp reconcile --accept '.mcp.json#servers.linear.command' --accept '.mcp.json#servers.docs.url'
```

The golden set is then edited in place. The comment on the changed line stays, and the new server is appended as its own table:

```toml
# Linear: the tracker.
[servers.linear]
command = "bunx" # pinned
args = ["-y", "linear-mcp"]

[servers.docs]
url = "https://docs"
```

### The actions

| Action | Meaning |
| --- | --- |
| `import` | offered; approving it writes the field into the golden set |
| `imported` | approved and written |
| `edit` | approved, but the golden set writes this field in a shape the command does not take apart, such as a sub-table; `value` is for a person to apply |
| `skip` | both sides changed, no baseline says which side moved, or the value is the harness's own default |
| `refuse` | the target does not parse, or the field holds a literal credential |

A field only the golden side changed produces no row: that is `mcp project`'s.

### What it will not import

| Case | Why |
| --- | --- |
| A field both sides changed, or one no baseline can place | a three-way conflict is a person's to settle; approving it fails with nothing written |
| A literal credential | it would move a secret into the file every harness is projected from. `env` and `headers` are refused per name and their other names are still offered; a `url` or `args` holding one is refused whole. The value is never shown. Move it into an environment variable and reference it as `${VAR}` |
| A value equal to the harness's default | a harness restating its default cannot be told from a user's edit. Codex's tool timeout defaults to 60 seconds (E-MCP-14), Gemini CLI's to 600000 ms (E-MCP-15) |
| A transport the golden set would infer | an entry with `url` is `http` and one with `command` is `stdio` without saying so |
| A name only the harness has in `env` or `headers` | the golden set never compared it, so it never pulls it |

Values come back through the harness's [dialect](#dialects), so Cursor's `${env:NAME}` and Codex's `bearer_token_env_var` land as `${NAME}`.

Approval fails whole, writing nothing, when a `path` names no `import` row, when one field is approved from two harnesses with different values, or when a new server is approved without its `command` or `url`.

On a write, each imported field is recorded in the [last-projected record](#the-last-projected-record) for the harness it came from. The other harnesses still carry the old value, and `doctor` then reports them as `mcp-diverged-golden` for `mcp project` to update. The [`repair` skill](/skills/repair/) offers each field on its own and passes `--accept` only for the ones you approve.
