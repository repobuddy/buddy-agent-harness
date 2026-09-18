<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# MCP findings

A repository may keep a **golden MCP server set** at `.agents/buddy-agent-harness/mcp.toml` — one canonical entry per server, in the superset of fields the supported hosts accept, written by the user. Where it exists, `doctor` compares it against each harness's own MCP configuration and reports how the two have drifted. **No golden set means no MCP drift findings at all**, and a harness with no MCP file yet has nothing that could have drifted.

Comparison is semantic. Six config keys across three file formats means no two of these files are ever byte-equal, so each side is parsed into one model and the models are compared. A field the golden set leaves unset is never a difference, however a harness fills it in: a host restating its own default and a user's deliberate edit are indistinguishable there, and treating both as changes is what makes a golden set accumulate noise.

Each finding names a **locator**, not a file: `.cursor/mcp.json#servers.linear.command` is the server and field, and that is what you route on.

| Finding | What it means | Repair |
| --- | --- | --- |
| `mcp-golden-unreadable` | the golden MCP set does not parse — the locator gives the line and column, and nothing else can be said about it | fix the TOML at <path> by hand — the reported line and column are all that can be quoted, because the parser's own message repeats the offending line and that line is the one holding the credential |
| `mcp-target-unreadable` | this harness config does not parse, so the harness starts none of its servers and nothing in it can be compared | fix the syntax of <path> by hand |
| `mcp-unprojected` | the golden set declares this server and the harness config does not carry it | add the server at <path> to that file from its golden entry, or drop it from the golden set |
| `mcp-undeclared` | the harness config carries this server and the golden set does not declare it | copy the server at <path> into .agents/buddy-agent-harness/mcp.toml, refusing any literal credential it carries, or drop it from <path> |
| `mcp-diverged-target` | only the harness config changed since the two last agreed — the edit was made through the copy | reconcile the value at <path> back into .agents/buddy-agent-harness/mcp.toml, field by field |
| `mcp-diverged-golden` | only the golden set changed since the two last agreed — the harness copy is stale | update <path> from the golden entry |
| `mcp-diverged-both` | both sides changed since they last agreed — merging either way would discard the other | reconcile <path> against .agents/buddy-agent-harness/mcp.toml by hand — never merge a three-way conflict automatically |
| `mcp-diverged-unknown` | the two disagree and no baseline says which side moved — neither history nor a last-projected record covers this server | compare <path> against .agents/buddy-agent-harness/mcp.toml by hand |
| `mcp-literal-secret` | a credential-bearing field holds a literal rather than a reference to an environment variable | move the value at <path> into an environment variable and reference it — read the value from the file, never from this report, and never repeat it back |
| `mcp-committed-secret` | a credential-bearing field holds a literal in a git-tracked file — the credential is committed, and moving it does not un-commit it | rotate the credential behind <path> at its issuer, then reference it from an environment variable — it is in the repository's history, so moving it is not enough |

## Credentials

The two secret findings are the ones to handle carefully.

- **The report never contains the value.** It gives you the locator and stops. Read the value out of the file named in the locator, and do not repeat it into your reply, into a commit message, or into any other file. There is no truncated preview to work from because a truncated credential is a leaked credential in the same transcript.
- **`mcp-committed-secret` is not `mcp-literal-secret` with worse wording.** The file is tracked, so the value is in the repository's history and every clone already has it. Moving it into an environment variable fixes the working tree and changes nothing about that. Rotate it at its issuer first.
- **A reference passes.** `${LINEAR_TOKEN}` and `Bearer ${LINEAR_TOKEN}` are the documented ways to write these fields and are never reported. The test is that shape, not how random the value looks.
- **An unreadable golden set is reported by position only.** The parser's own message quotes the line it failed on, and in this file that line is the one holding the credential — so neither the message nor the offending line is ever carried into the report. Open the file at the reported line and column.
