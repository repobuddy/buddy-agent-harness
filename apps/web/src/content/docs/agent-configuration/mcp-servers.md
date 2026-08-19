---
title: MCP Servers
description: 'The user-authored golden set of MCP servers: where it lives, how doctor compares it against each harness copy, and the credential policy.'
---

A repository may keep one canonical list of its MCP servers in a **golden set** the user authors at `.agents/buddy-agent-harness/mcp.toml`. Where that file exists, [`doctor`](/cli/doctor/) compares it against each harness's own project-scope MCP configuration and reports drift in both directions, plus any literal credential sitting in either file. `doctor` stays what it is everywhere else: read-only. It detects and never writes.

This page is the home for the golden set. The [CLI reference](/cli/doctor/) and the [`doctor` skill](/skills/doctor/) link here rather than restating it.

## What a golden set changes

[What stays canonical](/reference/configuration-layout/#what-stays-canonical) explains why `init` reports MCP configuration rather than converting it: converting a config someone wrote for harness A into harness B's format has to invent values they never wrote. Writing a server into Goose fills in `description`, `enabled`, and `timeout`; writing one into Zed fills in `source`. None of those values comes from the input, and `init` invents nothing.

A golden set the user authors changes that premise. Its schema is the superset of fields the supported hosts accept, so a field the user filled in is transcription, not invention. They wrote it once, deliberately.

The honest caveat: the superset only removes invention for fields actually filled in. Leave `timeout` unset and whatever writes a Goose config still has to choose one. The gain is that invention becomes declarable or refused, never silent.

No golden set means no drift diagnosis. `doctor` then reports nothing about MCP except literal credentials, because a credential in a file is wrong whether or not this project manages that file.

## Where it lives, and why not `.agents/mcp.json`

The path is tool-namespaced deliberately, following the `.agents/<tool>/` convention. `.agents/` is the shared standard surface — `.agents/skills` is read natively by several harnesses — and claiming an unqualified name there for one tool's superset would squat a namespace that belongs to the standard.

No standard forced a different answer. The research behind this decision is recorded in `.research/mcp-canonical-location/` in the repository (E-MCP-06 through E-MCP-09):

- The [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic) covers the wire protocol and names no configuration file, filename, or directory. The de jure answer is that there is no answer.
- The proposals that would change that ([SEP-2633](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2633), [issue #292](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/292), [discussion #2218](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2218)) are open and unratified, and they standardize the file's *shape*, not its home. SEP-2633 explicitly leaves directory placement out.
- What is converging in practice is a filename, not a directory: `.mcp.json` at the repository root, which [Visual Studio documents reading](https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers?view=visualstudio) alongside Cursor's and VS Code's paths. That path is already [Claude Code's own project config](https://code.claude.com/docs/en/mcp) in Claude Code's own shape, so it was never available to a superset file.
- The one outside proposal for an `.agents/`-rooted MCP file, the unaffiliated [.agents Protocol draft](https://dotagentsprotocol.com/), wants exactly `.agents/mcp.json` — the name this project declined to take, for the reason above.

Namespacing also keeps a future standard free. If a canonical MCP location is ever ratified, the golden set becomes a source that projects into it rather than a competitor for the same path.

## The file

TOML, one table per server under `servers`, in the superset of fields the supported hosts accept: `transport`, `command`, `args`, `env`, `url`, `headers`, `description`, `enabled`, `timeout`, and `source`. The last four are the fields conversion used to invent — `description`, `enabled`, and `timeout` are Goose's, `source` is Zed's. Comments are first-class, which is much of why the format is TOML: the superset carries fields the harness copies do not, and those are exactly the ones needing a note.

```toml
# One canonical entry per server. Harness copies are compared against this file.

[servers.linear]
url = "https://mcp.linear.app/mcp"
# A reference, never the token itself. doctor reports a literal here as a secret.
headers = { Authorization = "Bearer ${LINEAR_TOKEN}" }

[servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env = { DEFAULT_MINIMUM_TOKENS = "6000" }
# Goose wants these; filled in here, they are transcription rather than invention.
description = "library documentation lookup"
enabled = true
timeout = 300
```

`transport` may be stated (`stdio`, `http`, or `sse`) or left implied: an entry with a `url` is `http`, an entry with a `command` is `stdio`. Hosts spell the key differently or not at all, and inferring it is what lets a `url` entry in one file compare equal to a `type: http` entry in another.

## The files it is compared against

Each supported harness keeps its project-scope MCP servers where its own vendor documents, and no two agree on all of file, key, and format. The table is derived from the same registry the rest of the tooling reads (`src/harness-registry/harness-registry.ts`), backed by `.research/mcp-canonical-location/`:

| Harness | Project-scope MCP file | Key | Format |
| --- | --- | --- | --- |
| Claude Code | `.mcp.json` | `mcpServers` | JSON |
| Cursor | `.cursor/mcp.json` | `mcpServers` | JSON |
| Codex | `.codex/config.toml` | `mcp_servers` | TOML |
| Gemini CLI | `.gemini/settings.json` | `mcpServers` | JSON |
| Copilot CLI | none documented | — | — |
| Devin Desktop | none documented | — | — |

Copilot CLI's absence is documented, not a gap: [GitHub's own page](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) names `~/.copilot/mcp-config.json` at user scope and states that `.vscode/mcp.json` is not read. Harnesses with no project-scope file are never reported against.

`.gemini/settings.json` holds far more than MCP — it also carries the [instruction bridge](/agent-configuration/harnesses/gemini-cli/) — so `doctor` reads only the `mcpServers` key and says nothing about the rest of the file.

## Comparison is semantic

The two sides of this comparison are never byte-equal. Across the published cross-harness mapping the same servers spread over six config keys and three serialization formats, and the golden set itself is TOML while three of its four targets are JSON. So bytes cannot be the test. Both sides are parsed into one canonical model and the models are compared, which is how a `[mcp_servers.linear]` table in Codex TOML compares equal to a `"linear"` entry in `.cursor/mcp.json`.

One rule keeps the comparison honest: **a field the golden set leaves unset is never a difference**, however the target fills it. A harness restating its own default is indistinguishable from a user's deliberate edit in that position, and treating the pair as drift is what makes a golden set accumulate noise on every round-trip — pull `enabled: true` back today and you diff against it forever. The golden set speaks only about fields it fills in, and the same rule applies inside `env` and `headers`, per name.

`args` is the exception to leniency in the other direction: it is compared in order, because it is a command line and reordering it changes what runs.

## Which side moved

"These two differ" is not actionable, so a diverged field also gets a direction, answered from two baselines in order:

1. **The last-projected record**, `.agents/buddy-agent-harness/mcp.projected.json`: a per-target record of what was last written. It is asked first because it records exactly what was projected, and it exists because git can only answer for a file it can see — harnesses write these configs themselves, often untracked or ignored.
2. **Git history**, for a tracked target the record does not cover: the newest commit where the golden set and the target agreed on that field, then which side still matches it.

Nothing writes that record yet, because nothing projects yet — `doctor` reads it where it finds one, and today it will not find one. Until projection lands, every direction comes from git or is reported as unknown. You may write the file by hand, and `doctor` will honor it.

Where neither answers, the finding says `mcp-diverged-unknown` rather than guessing. Naming a side on a guess would send a repair at the wrong file. A record that does not parse is ignored the same way: it is a cache of an answer, not the answer, and the baseline falls through to git or to `unknown`.

The drift findings, then:

| Finding | Meaning |
| --- | --- |
| `mcp-unprojected` | the golden set declares a server the harness config does not carry |
| `mcp-undeclared` | the harness config carries a server the golden set does not declare |
| `mcp-diverged-target` | only the harness copy changed since the two last agreed |
| `mcp-diverged-golden` | only the golden set changed; the harness copy is stale |
| `mcp-diverged-both` | both changed — a three-way conflict, reconciled by hand and never auto-merged |
| `mcp-diverged-unknown` | the two disagree and no baseline says which side moved |
| `mcp-golden-unreadable` | the golden set does not parse; reported by line and column only |
| `mcp-target-unreadable` | a harness config does not parse, so the harness starts none of its servers |

Each finding's `path` carries a locator, not only a file: `.cursor/mcp.json#servers.linear` names the server and `.cursor/mcp.json#servers.linear.command` names the field. In a file holding twenty servers, the file alone would be useless.

## Credentials, and why the report never shows one

`doctor` is safe to run from a session-start hook, so its output lands in agent context on every session and from there into transcripts. A value it echoes is amplified far past the file it came from. So the policy is that a secret's value never enters a finding at all:

- A secret finding carries a locator like `.cursor/mcp.json#servers.linear.headers.Authorization` and never the value. Redaction happens at the source rather than in the formatters: `doctor` renders three ways, and trusting each to mask is three chances to drift.
- No truncated previews either. `sk-ab…` is a leak into the same transcript and buys a reader nothing the field path does not.
- An unreadable golden set is reported by line and column only. A TOML parser's error message quotes the offending line back, and in a file of MCP configuration that line is exactly the one holding the secret, so the parser's message is never read past its two numbers.

Classification is by shape, not by content. A field whose name marks it as credential-bearing must hold a **reference** — `${VAR}`, `$VAR`, `${env:VAR}`, `${input:id}`, including inside a template like `Bearer ${LINEAR_TOKEN}` — or it is reported. Entropy heuristics are deliberately not the test: they guess about a string the scanner has already decided not to look at, and they fail in both directions, since a short password is low-entropy and a base64 config blob is high.

A name qualifies two ways. `token`, `secret`, `password`, `passwd`, and `credential` count anywhere in it, because none of them turns up inside an innocent word — so `MYTOKEN` is caught along with `LINEAR_TOKEN`. `key`, `auth`, `authorization`, and `bearer` count only as a whole segment, split on both `API_KEY` and `apiKey`, because as bare substrings they also match `MONKEY_PATCH` and `AUTHOR`. A URL's userinfo and its credential-named query parameters are covered on top of both.

Two findings, split on git tracking:

| Finding | Meaning |
| --- | --- |
| `mcp-literal-secret` | a credential-bearing field in an untracked file holds a literal; the repair is to move it into an environment variable and reference it |
| `mcp-committed-secret` | the same, in a git-tracked file. The credential is in the repository's history, so moving it does not un-commit it. The repair is to **rotate** it at its issuer, then reference it |

The golden set gets the same checks as every harness copy. A user pastes a token into whichever file is open, and the golden set is a file.

## What is deliberately not done yet

Nothing writes. `doctor` detects drift; it does not create a harness's MCP file, update a stale copy, or pull a target-side edit back into the golden set. Forward projection and reconcile are writes, they need an approval-gated home, and they are a later change. Until then, each finding names its repair and a person (or the [`doctor` skill](/skills/doctor/), as a separate approved step) carries it out.

Project scope only. User-scope MCP configuration — `~/.codex/config.toml`, `~/.claude.json`, `claude_desktop_config.json` — holds much of the world's servers and stays described, never read and never written. Reading a user's home directory into output that lands in every session's transcript is a wider blast radius than diagnosis needs.
