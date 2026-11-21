# MCP projection

The golden MCP server set is written into each harness's own MCP file wherever the golden set is plainly ahead.

## What

A person who configures MCP servers for several harnesses has to write each server four times, in four syntaxes,
and keep the copies in step. Each harness spells the transport, the environment-variable reference, and the timeout
its own way, so a hand copy is easy to get wrong.

The `mcp project` command writes the golden set into each harness's MCP file through that harness's dialect. It
transcribes only what the user filled in, and refuses a server by name when a target cannot hold it as written. It
writes only where the golden set is plainly ahead: a server the target lacks, or a field only the golden side
changed. A harness-side edit in the way is held back, never overwritten. Every byte outside the entry it writes is
kept. Each write is recorded, so a later diagnosis can tell which side moved.

## Non-goals

- N1 Importing a harness-side change into the golden set, or writing the golden set at all. That is
  [mcp-reconcile](../mcp-reconcile/README.md).
- N2 Overwriting a field the harness side changed, or resolving a three-way conflict.
- N3 Removing a server only a target carries. Which side is right is a person's call.
- N4 Reading or writing user-scope MCP files, such as `~/.codex/config.toml`, `~/.claude.json`, or
  `claude_desktop_config.json`.
- N5 Filling in a value the golden set leaves unset, even one a target would use.
- N6 Asking for approval. The command plans unless asked to write; the [repair](../repair-buddy-agent-harness/README.md) skill shows the
  plan and asks.
- N7 A Copilot CLI target. Copilot CLI reads the `.mcp.json` projected for Claude Code
  ([mcp-diagnosis](../mcp-diagnosis/README.md) K3), so it gets no file of its own.

## Key terms

- K1 **golden set**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K2.
- K2 **MCP target**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K3.
- K3 **dialect** and **representable field**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K4 and K5.
- K4 **canonical model**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K6.
- K5 **last-projected record**, **baseline**, and **direction**: see
  [mcp-diagnosis](../mcp-diagnosis/README.md) K7 to K9.
- K6 **literal credential** and **reference**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K10 to K12.
- K7 **shared file**: a target that also holds settings other than MCP, such as `.gemini/settings.json` and
  `.codex/config.toml`.
- K8 **hand edit**: a change that is due but that the command does not make, because it cannot make it while keeping
  every byte outside the entry. The result carries the entry as the target would read it, for a person or a skill to
  apply.
- K9 **plan**: the result of a run that was not asked to write: what a write would do, with nothing on disk changed.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | person authoring the golden set | have every harness carry the servers they wrote, without retyping them per syntax |
| A1.2 | person authoring the golden set | have a later diagnosis know which side moved after a projection |
| A2.1 | `repair-buddy-agent-harness` skill | show what would change next to each file as it stands, apply it on approval, and list the hand edits |
| A3.1 | person who edited a harness copy | keep that edit; it is not overwritten |
| A4.1 | owner of other settings in a shared file | find those settings and comments unchanged |

## Use cases

### UC1 — Bring each harness MCP file up to the golden set (A1.1, A2.1)

- **Trigger**: a caller wants the harness MCP files to carry the golden set.
- **Entry node**: `G` in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `buddy-agent-harness mcp project`, a plan unless asked to write.
  - skill: [repair](../repair-buddy-agent-harness/README.md) shows the plan and asks the command to write on approval.
- **Inputs**: the repository root, and whether to write.
- **Success**: each server the golden set is plainly ahead on is written into each target, each server that could
  not be written is named with the reason, and the result says per server per target what was or would be done.
- **Extensions**:
  - UC1.1 No golden set: there is nothing to project.
  - UC1.2 The golden set does not parse: the run fails by position only.
  - UC1.3 A target does not parse: that target is refused; the others proceed.
  - UC1.4 A golden server holds a literal credential: it is refused for every target.
  - UC1.5 A golden server has nothing to run: it is refused.
  - UC1.6 A target's dialect cannot express a golden server: it is refused for that target.
  - UC1.7 A change cannot be made byte-preservingly, or does not read back: it is a hand edit.
  - UC1.8 Not asked to write: nothing on disk changes.

### UC2 — Keep a harness-side edit (A3.1)

- **Trigger**: a target's copy of a golden server differs from it.
- **Entry node**: `O` in [graph.md](./graph.md).
- **Entry points**: as UC1.
- **Inputs**: the golden set, the target, and the baseline.
- **Success**: only a field the golden side alone changed is written.
- **Extensions**:
  - UC2.1 The target moved, both moved, or no baseline can say: the server is held back.

### UC3 — Leave everything outside the entry intact (A4.1)

- **Trigger**: a write to a target that holds anything besides the entry.
- **Entry node**: `L` and `S` in [graph.md](./graph.md).
- **Entry points**: as UC1.
- **Inputs**: the target file.
- **Success**: every byte outside the written entry is as it was.
- **Extensions**:
  - UC3.1 The entry holds a comment, or the server is written in a form the command does not replace in place: a
    hand edit.

### UC4 — Record what now agrees (A1.2)

- **Trigger**: a run that writes.
- **Entry node**: `V` in [graph.md](./graph.md).
- **Entry points**: as UC1.
- **Inputs**: the run's outcome and the existing record.
- **Success**: the last-projected record holds each server that now agrees with the golden set, per target.
- **Extensions**: extensions: none, a run that does not write changes no record (UC1.8).

## Criteria

### Inputs (UC1)

- R1 With no golden set, nothing is written and the result says there is nothing to project, as a success.
  (UC1, E1)
- R2 When the golden set does not parse, the run fails naming only the line and column, writes nothing, and its
  output holds no text of the file. (UC1, E2)
- R3 The command writes only to the MCP target of a harness that has one, and creates a target file only for such a
  harness: no file for Codex or Gemini CLI when its directory is absent. (UC1, E3)
- R4 A target that does not parse is refused and left unchanged, and the other targets proceed. (UC1, E4)

### Refusals (UC1)

- R5 A golden server holding a literal credential is refused for every target, naming the field and never the value,
  and no target receives it. (UC1, E6)
- R6 A golden server with neither a command nor a url is refused, naming what is missing. (UC1, E8)
- R7 A golden server that a target's dialect cannot express as written (a transport it lacks, a reference it does not
  expand, a variable it would have to rename) is refused for that target only, naming the field. (UC1, E8)
- R8 A golden field the target's dialect has no place for is left out of that target's entry and does not refuse the
  server, and a second run reports nothing for that server. (UC1, E9)

### Writing (UC1, UC2)

- R9 A field the golden set leaves unset is absent from every entry the command writes. (UC1, E9)
- R10 A golden server a target does not carry is added to it, and the target file is created when it does not exist.
  (UC1, E11)
- R11 A golden server that agrees with its target copy in the canonical model produces no row, and a run with nothing
  to do states a zero count. (UC1, E12)
- R12 A server whose differing fields the baseline shows only the golden side changed is updated in place. (UC2, E14)
- R13 A server whose target copy changed, whose two sides both changed, or for which no baseline exists is held back:
  nothing is written for it, and the result says which of the three. (UC2, E13)
- R14 Each entry written spells the transport, the references, and the timeout as the target's dialect does, so that
  reading it back through the dialect yields the golden server over its representable fields. (UC1, E16)
- R25 No entry written to `.mcp.json` holds a reference spelled `${env:VAR}`, the spelling Copilot CLI, which also
  reads that file, leaves unexpanded. (UC1, E8, E16)
- R26 No run writes or creates `.github/mcp.json`. (UC1, E3)

### Byte preservation (UC3)

- R15 A write keeps every byte of the target outside the entry it writes, comments and other settings included, in
  JSON and TOML targets and in shared files alike. (UC3, E15)
- R16 A change to an entry that holds a comment, or to a TOML server not written as its own table, is a hand edit,
  and the target is unchanged. (UC3, E18)
- R17 An add to a JSON target whose root, or whose MCP key, is not an object is a hand edit, and the target is
  unchanged. (UC3, E17)
- R18 A new text that does not read back through the dialect as the golden server, with every other server
  unchanged, is not written and is a hand edit instead. (UC1, E22)

### Plan and record (UC1, UC4)

- R19 A run not asked to write changes no file and no record, and its result lists what a write would do.
  (UC1, E20)
- R20 For each add, update, and hand edit, the result carries the server's entry as it would read in that target.
  (UC1, E16, E18)
- R21 A run that writes leaves the last-projected record holding, for each target, every server that now agrees
  with the golden set, and keeps what the record held for servers the run did not touch. (UC4, E19)
- R22 The golden set is unchanged after any run. (UC1, E19)

### Adapters

- R23 Each per-server outcome (added, updated, hand edit, held back for each of its three reasons, refused) is
  distinct and stable in the result, and the result names the golden file, whether it is a plan or a write, and
  where the record was written or why it was not. (UC1, E12, E13, E16, E18, E19, E20)
- R24 A failed run is told apart from a successful one without reading the result. (UC1, E2)
- R27 With no format named, the result is written in `toon`. (UC1, E19, E20)

## Open questions

None.

## References

- [graph.md](./graph.md): the decision graph.
- [mcp-diagnosis](../mcp-diagnosis/README.md): the golden set, the targets, the dialects, the baseline, and the
  credential test this command inherits.
- [mcp-reconcile](../mcp-reconcile/README.md): the reverse direction.
- [repair](../repair-buddy-agent-harness/README.md): the skill that shows the plan and approves the write.
- [mcp-canonical-location evidence](../../../../../.research/mcp-canonical-location/evidence.md): E-MCP-12 to
  E-MCP-18 back each dialect's write mapping, including which transports and references each harness can hold;
  E-MCP-21 backs what Copilot CLI reads from `.mcp.json`.
- [MCP servers page](../../../../../apps/web/src/content/docs/agent-configuration/mcp-servers.md): the user-facing
  account of the golden set and the writers.
