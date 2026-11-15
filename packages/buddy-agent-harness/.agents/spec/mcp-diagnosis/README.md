# MCP diagnosis

Every drift between the golden MCP server set and each harness copy of it is reported, with the side that moved.

## What

A repository that configures MCP servers for several harnesses keeps one copy per harness, each in its own file,
key, and syntax. The copies drift. A user edits `.cursor/mcp.json` because that file is open; a harness rewrites its
own config. Nothing says the copies no longer match, and nothing says which one holds the newer edit. Users also paste
tokens into whichever file is open, and a tool that echoes a token into a session transcript spreads it further.

The `doctor` command answers both. Where the user keeps a golden set, it compares the golden set with each harness
copy and reports each server that is missing, extra, or different, and for a difference, which side moved since the
two last agreed. In every MCP file, golden set or not, it reports a credential written as a literal, without ever
showing the value. It reads and never writes, so a session-start hook can run it.

## Non-goals

- N1 Projecting the golden set into a harness file. That is [mcp-projection](../mcp-projection/README.md).
- N2 Importing a harness-side change into the golden set. That is [mcp-reconcile](../mcp-reconcile/README.md).
- N3 Reading or reporting user-scope MCP files, such as `~/.codex/config.toml`, `~/.claude.json`, or
  `claude_desktop_config.json`. Output that lands in every transcript should not read a user's home directory.
- N4 Judging whether a server should be configured at all.
- N5 Reporting that a repository has no golden set. Without one there is no drift diagnosis, only the credential
  check.
- N6 Merging a three-way conflict, or picking a side when no baseline can say which moved.
- N7 Deciding the report's shared shape, its healthy summary, or its encoding. That is
  [diagnosis-report](../diagnosis-report/README.md).

## Key terms

These terms are shared with [mcp-projection](../mcp-projection/README.md) and
[mcp-reconcile](../mcp-reconcile/README.md), which link them here.

- K1 **harness**: see [glossary](../glossary.md#harness).
- K2 **golden set**: the file `.agents/buddy-agent-harness/mcp.toml` that the user authors, holding one canonical
  entry per MCP server in the superset of fields the supported hosts accept. Its schema is documented on the
  [MCP servers page](../../../../../apps/web/src/content/docs/agent-configuration/mcp-servers.md#the-file).
- K3 **MCP target**: the project-scope MCP file of a harness, with the key and format its vendor documents. The
  targets are those of Claude Code and Cursor always, and those of Codex and Gemini CLI when their own directory
  exists. A harness whose vendor documents no project-scope MCP file has no target. Copilot CLI has none of its own:
  it reads the `.mcp.json` projected for Claude Code, only in a folder it trusts, and ignores `.github/mcp.json`
  wherever `.mcp.json` exists, so `.github/mcp.json` is never a target. The file, key, and format of each
  are on the [MCP servers page](../../../../../apps/web/src/content/docs/agent-configuration/mcp-servers.md#the-files-it-is-compared-against),
  backed by the [evidence](../../../../../.research/mcp-canonical-location/evidence.md), E-MCP-21 for Copilot CLI.
- K4 **dialect**: one harness's entry shape, read and written as a pair: its field names, how it chooses the
  transport, how it references an environment variable, its timeout unit, and which golden fields it has a place for.
  Each mapping is backed by E-MCP-12 to E-MCP-18 in the
  [evidence](../../../../../.research/mcp-canonical-location/evidence.md).
- K5 **representable field**: a golden field the target's dialect has a place for.
- K6 **canonical model**: the parsed form both sides are compared in, each target read through its dialect. Two
  servers agree when they are equal over the representable fields the golden set fills in. A field the golden set
  leaves unset is not compared, and inside `env` and `headers` this holds per name. `args` is compared in order.
- K7 **last-projected record**: `.agents/buddy-agent-harness/mcp.projected.json`, the per-target record of each
  server as it last agreed with the golden set. [mcp-projection](../mcp-projection/README.md) and
  [mcp-reconcile](../mcp-reconcile/README.md) write it; a person may write it by hand.
- K8 **baseline**: the value a field held when the golden set and a target last agreed on it. It is read from the
  last-projected record where the record holds the server for that target and parses. Otherwise, for a git-tracked
  target, it is read from the newest commit in which both files parse and agree on that field. Otherwise there is
  none.
- K9 **direction**: which side changed a field since its baseline: the target, the golden set, both, or unknown when
  there is no baseline.
- K10 **reference**: a value that names a secret instead of holding one: `${VAR}`, `$VAR`, `${env:VAR}`, or
  `${input:id}`, alone or inside a template such as `Bearer ${TOKEN}`. A value shaped like one that names no variable,
  such as `$ {TOKEN}`, is not a reference.
- K11 **credential-bearing field**: a field whose name marks it as carrying a secret, plus a URL's userinfo and a
  credential-named query parameter of a URL. A name qualifies when it contains `token`, `secret`, `password`,
  `passwd`, or `credential` anywhere, or when one of its segments, split on separators and on case changes, is `key`,
  `apikey`, `auth`, `authorization`, or `bearer`. So `MYTOKEN` and `apiKey` qualify and `MONKEY_PATCH` and `AUTHOR`
  do not.
- K12 **literal credential**: a credential-bearing field whose value is not a reference.
- K13 **locator**: one string naming a file and the server in it, and the field where a field is at fault. It never
  carries a value or any part of one.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | person authoring the golden set | learn which harness copy no longer matches what they wrote, and which side moved |
| A1.2 | person authoring the golden set | learn that a credential sits in an MCP file as a literal, without being shown it again |
| A2.1 | `repair` skill | know every drifted server and field, and its direction, precisely enough to act on each |
| A3.1 | session-start hook | learn of drift with no write and no secret in the output |
| A4.1 | anyone who reads a session transcript | never see a credential the diagnosis came across |
| A5.1 | `doctor-buddy-agent-harness` skill | route each MCP finding to whoever repairs it |

## Use cases

### UC1 — Learn how each harness copy has drifted from the golden set (A1.1, A2.1)

- **Trigger**: a caller asks what is wrong with the repository's agent configuration.
- **Entry node**: `G` in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `buddy-agent-harness doctor`.
  - library: the package's MCP diagnosis export.
  - skill: `doctor-buddy-agent-harness` runs the command and presents the report.
- **Inputs**: the repository root.
- **Success**: each server missing from a target, each target server the golden set does not declare, and each
  diverged field with its direction is reported, located by a locator.
- **Extensions**:
  - UC1.1 No golden set: no drift is reported.
  - UC1.2 The golden set does not parse: it is reported by position only, and nothing is compared.
  - UC1.3 A target does not parse: it is reported unreadable and nothing in it is compared.
  - UC1.4 A target file does not exist, or a harness has no MCP target: nothing is reported for it.
  - UC1.7 The repository has a `.github/mcp.json`: it is not a target, and nothing is reported for it.
  - UC1.5 The last-projected record does not parse, or holds nothing for the server: the baseline falls through to
    git, then to unknown.
  - UC1.6 The repository is not a git repository, or the two sides never agreed in history: the direction is unknown.

### UC2 — Learn of a literal credential without seeing it (A1.2, A4.1)

- **Trigger**: a caller asks what is wrong with the repository's agent configuration.
- **Entry node**: `F` in [graph.md](./graph.md).
- **Entry points**: as UC1.
- **Inputs**: the repository root.
- **Success**: each literal credential in a target or in the golden set is reported at its locator, with a repair
  that fits whether the file is git-tracked, and the value appears nowhere in the output.
- **Extensions**:
  - UC2.1 No golden set: the targets are still checked.
  - UC2.2 The repository is not a git repository: tracking cannot be read, and the literal is reported as untracked.
  - UC2.3 A URL does not parse: it is not reported.
  - UC2.4 A file does not parse on the line that holds a credential: the file is reported unreadable with none of its
    content.

### UC3 — Diagnose unattended without risk (A3.1)

- **Trigger**: a session-start hook runs the command.
- **Entry node**: `F` and `G` in [graph.md](./graph.md).
- **Entry points**: command line (primary): `buddy-agent-harness doctor`.
- **Inputs**: the repository root.
- **Success**: the findings are reported and nothing on disk changed.
- **Extensions**: extensions: none, the command makes no decision here that UC1 and UC2 do not already cover.

### UC4 — Route each MCP finding to its repair (A5.1, A2.1)

- **Trigger**: a skill reads the report to hand each finding on.
- **Entry node**: `G` in [graph.md](./graph.md).
- **Entry points**: skill: `doctor-buddy-agent-harness` and `repair` read the report the command line produced.
- **Inputs**: the report.
- **Success**: each finding's kind tells the caller what went wrong, and its repair says in prose what fixes it.
- **Extensions**: extensions: none, which skill owns each repair is decided in
  [detect-and-repair](../detect-and-repair/README.md).

## Criteria

### Drift (UC1)

- R1 With no golden set, no missing, undeclared, or diverged server is reported against any target. (UC1, E8)
- R2 When the golden set does not parse, one finding reports it unreadable with only its line and column, and no
  missing, undeclared, or diverged server is reported against any target. (UC1, E3, E9)
- R3 A target that does not parse is reported unreadable, naming the file with no position and no content from it,
  and no missing, undeclared, or diverged server is reported against it. (UC1, E3)
- R4 A target file that does not exist, and a harness with no MCP target, get no finding. (UC1, E1)
- R28 No finding names Copilot CLI, and a `.github/mcp.json` gets no finding of any kind, whatever it holds and whether
  or not a `.mcp.json` sits beside it. (UC1.7, E1)
- R5 A golden server a target does not carry is reported as missing from that target, at a locator naming the
  server in that file. (UC1, E11)
- R6 A target server the golden set does not declare is reported as undeclared, at a locator naming the server in
  that file. (UC1, E12)
- R7 A golden server and its target copy that agree in the canonical model produce no finding, though the files
  differ in format, key, and syntax. (UC1, E14)
- R8 A field the golden set leaves unset, or one the target's dialect has no place for, is never reported as
  diverged, whatever the target holds there. (UC1, E14)
- R9 A file that holds settings besides MCP is read only for its MCP key, and nothing about its other settings is
  reported. (UC1, E10)
- R10 A field on which the golden server and its target copy disagree in the canonical model is reported as
  diverged, at a locator naming the field, with its direction. (UC1, E15)
- R11 When the last-projected record holds the server for the target and parses, the direction is the target when
  the golden set still matches the record, the golden set when the target still matches it, and both when neither
  does. (UC1, E16, E21, E22, E23)
- R12 When the record does not parse or holds nothing for the server, a git-tracked target's direction is judged
  against the newest commit in which both files parse and agree on that field. (UC1, E17, E19)
- R13 When no baseline exists (no usable record, and the target untracked, outside git, or never in agreement in
  its history), the direction is reported as unknown, never as a side. (UC1, E18, E20)
- R14 A record that does not parse does not stop the diagnosis. (UC1, E17)
- R15 The four directions are four distinct finding kinds. (UC1, E21, E22, E23, E20)
- R16 The repair of a both-moved finding says to reconcile by hand and not to rebuild either side. (UC1, E23)

### Credentials (UC2)

- R17 A literal credential in a target or in the golden set that parses is reported at a locator naming its field,
  whether or not a golden set exists. (UC2, E6, E7)
- R18 A credential-bearing field holding a reference is not reported. (UC2, E5)
- R19 A literal in a git-tracked file and a literal in an untracked file are distinct finding kinds. The tracked
  one's repair says to rotate the credential at its issuer and then reference it; the untracked one's says to move it
  into an environment variable and reference it. (UC2, E6, E7)
- R20 Outside a git repository a literal credential is reported as untracked. (UC2, E7)
- R21 A URL that does not parse is not reported as a credential. (UC2, E5)
- R22 No part of the command's output contains a literal credential's value, or a leading or trailing part of it,
  whether the value sits in a target, in the golden set, in a diverged field, or on a line of a file that does not
  parse. (UC2, E3, E6, E7, E15)

### Read-only (UC3)

- R23 A diagnosis changes no file, the last-projected record included. (UC3, E8, E10)
- R24 A diagnosis reads no user-scope MCP file. (UC3, E2)
- R25 The MCP findings are the same whatever harness preference the caller passes, since every harness with an MCP
  file on disk is already selected. (UC3, E2)

### Adapters (UC4)

- R26 Each MCP finding kind is distinct and stable, and is reported through the shared shape of
  [diagnosis-report](../diagnosis-report/README.md). (UC4, E11)
- R27 Every MCP finding carries a non-empty prose repair, and none carries a repair a program may run as given.
  (UC4, E11)

## Open questions

None.

## References

- [graph.md](./graph.md): the decision graph.
- [MCP servers page](../../../../../apps/web/src/content/docs/agent-configuration/mcp-servers.md): the golden set's
  schema, the target table, and the rationale for the path, semantic comparison, and the credential policy.
- [mcp-canonical-location evidence](../../../../../.research/mcp-canonical-location/evidence.md) and its
  [conclusion](../../../../../.research/mcp-canonical-location/conclusion.md): where each harness keeps MCP
  configuration and each dialect's facts.
- [diagnosis-report](../diagnosis-report/README.md): the report every finding is emitted through.
- [detect-and-repair](../detect-and-repair/README.md): which skill owns each finding's repair.
- [mcp-projection](../mcp-projection/README.md) and [mcp-reconcile](../mcp-reconcile/README.md): the two writers that
  act on these findings.
