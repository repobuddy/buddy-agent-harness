# MCP reconcile

A change made in a harness's own MCP file is brought back into the golden set, one approved field at a time.

## What

A person often edits the MCP file of the harness in front of them rather than the golden set. Projection then holds
that server back, and the edit lives in one harness only. Copying it into the golden set by hand means translating
it back out of that harness's syntax, and a careless copy can carry a pasted token into the one file every harness
is projected from.

The `mcp reconcile` command is the reverse of [mcp-projection](../mcp-projection/README.md). Where the harness side
is plainly ahead (a field only the harness copy changed, or a server only a harness declares) it offers each field
as its own row, in the golden set's own form. It writes only the fields the caller approves by name, keeps every
comment in the golden set, and never imports a literal credential or a change both sides made.

## Non-goals

- N1 Importing a field both sides changed, or one no baseline can place, whatever is approved.
- N2 Acting where the golden side is ahead. That is [mcp-projection](../mcp-projection/README.md).
- N3 Writing a harness MCP file.
- N4 Pulling a name inside `env` or `headers` that only the harness carries for a server the golden set declares.
  The golden set never compared it.
- N5 Approving every offered field at once. Each field is its own approval.
- N6 Reading or writing user-scope MCP files.
- N7 Asking for approval. The [repair](../repair/README.md) skill offers each field and passes only the approved
  ones.

## Key terms

- K1 **golden set**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K2.
- K2 **MCP target**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K3.
- K3 **dialect** and **representable field**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K4 and K5.
- K4 **canonical model**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K6.
- K5 **last-projected record**, **baseline**, and **direction**: see
  [mcp-diagnosis](../mcp-diagnosis/README.md) K7 to K9.
- K6 **reference**, **credential-bearing field**, and **literal credential**: see
  [mcp-diagnosis](../mcp-diagnosis/README.md) K10 to K12.
- K7 **locator**: see [mcp-diagnosis](../mcp-diagnosis/README.md) K13.
- K8 **hand edit**: see [mcp-projection](../mcp-projection/README.md) K8; here the entry is the field as it would read
  in the golden set.
- K9 **golden form**: a value as the golden set writes it, read back through the target's dialect, so that each
  harness's reference syntax and named reference fields become `${NAME}`.
- K10 **offered field**: one field of one server in one target, proposed for import with its value in golden form,
  or as a removal.
- K11 **harness default**: a value a harness's vendor documents as what it uses when the field is unset. The two
  documented ones are timeouts, in E-MCP-14 and E-MCP-15 of the
  [evidence](../../../../../.research/mcp-canonical-location/evidence.md).

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | person who edited a harness copy | have that edit kept in the golden set, the one file every harness is projected from |
| A2.1 | `repair` skill | offer each field on its own, and import only the ones the person approved |
| A3.1 | person authoring the golden set | find no unapproved or conflicting change in it, and every comment kept |
| A4.1 | anyone who reads a session transcript | never see a credential the command came across |

## Use cases

### UC1 — See each harness-side change as its own field (A1.1, A2.1)

- **Trigger**: a caller wants to know what a harness copy holds that the golden set does not.
- **Entry node**: `G` in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `buddy-agent-harness mcp reconcile`, with no approval.
  - skill: [repair](../repair/README.md) offers each row to the person.
- **Inputs**: the repository root.
- **Success**: one row per field the harness side is plainly ahead on, its value in golden form, and nothing on disk
  changed.
- **Extensions**:
  - UC1.1 No golden set: there is nothing to reconcile into.
  - UC1.2 The golden set does not parse: the run fails by position only.
  - UC1.3 A target does not parse: it is refused; the others proceed.
  - UC1.4 Only the golden side moved: no row.
  - UC1.5 Both sides moved, or no baseline can place the field: held back, never offered.
  - UC1.6 The value is the harness's default: held back.
  - UC1.7 The value is a literal credential: refused.

### UC2 — Import the approved fields and nothing else (A1.1, A2.1, A3.1)

- **Trigger**: a caller approves one or more offered fields.
- **Entry node**: `Q` in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `buddy-agent-harness mcp reconcile`, naming each approved field by its locator.
  - skill: [repair](../repair/README.md) passes the fields the person approved.
- **Inputs**: the repository root, and the locator of each approved field.
- **Success**: each approved field is in the golden set, every other byte of it is unchanged, and the
  last-projected record shows the field in agreement.
- **Extensions**:
  - UC2.1 An approval names a field that was not offered, or one field from two targets with different values, or
    adds a server with nothing to run: nothing is written.
  - UC2.2 The golden set writes the field in a shape the command does not take apart: a hand edit.
  - UC2.3 The new text does not read back: a hand edit.

### UC3 — Keep credentials out of the golden set and the output (A4.1, A3.1)

- **Trigger**: an offered server or field holds a literal credential.
- **Entry node**: `M` in [graph.md](./graph.md).
- **Entry points**: as UC1.
- **Inputs**: the target's server.
- **Success**: the literal is refused by name, the rest is still offered, and the value appears nowhere.
- **Extensions**:
  - UC3.1 The literal was the only change: nothing but the refusal.
  - UC3.2 The literal sits in a URL or in an argument: the whole field is refused.

## Criteria

### Inputs (UC1)

- R1 With no golden set, nothing is written and the result says there is nothing to reconcile into, as a success.
  (UC1, E1)
- R2 When the golden set does not parse, the run fails naming only the line and column and writes nothing.
  (UC1, E2)
- R3 A target that does not parse is refused and left unchanged, and the other targets proceed. (UC1, E4)

### What is offered (UC1)

- R4 A field of a declared server is offered only when the baseline shows the target alone changed it. (UC1, E8)
- R5 A field only the golden side changed produces no row. (UC1, E6)
- R6 A field both sides changed, or one no baseline can place, is reported as held back, saying which, and is never
  offered. (UC1, E7)
- R7 A field the target removed is offered as a removal from the golden set. (UC1, E8)
- R8 For a map field (`env`, `headers`), only the names the golden set holds are compared: a changed name is offered
  with the target's value, a name the target dropped is removed, and a map left with none of the golden set's names
  is offered as a removal of the whole map. (UC1, E8)
- R9 For a server only a target declares, each representable field is offered, except a transport equal to the one
  the golden set would infer from its command or url. (UC1, E9)
- R10 Every offered value is in golden form. (UC1, E8, E9)
- R11 A value equal to the target harness's documented default is held back, saying so, and not offered.
  (UC1, E12)

### Credentials (UC3)

- R12 A name in `env` or `headers` holding a literal credential is refused by name, and the map's other names are
  still offered. (UC3, E10)
- R13 Where the golden set holds a reference for a name the target replaced with a literal, the offered map keeps
  the golden reference for that name. (UC3, E10)
- R14 When a literal credential is the only change in a field, the field is refused and nothing in it is offered.
  (UC3, E10)
- R15 A `url` holding a credential, or an `args` holding a credential-named flag assigned a literal, is refused as a
  whole field. (UC3, E10)
- R16 No part of the command's output, and nothing it writes, contains a literal credential's value. (UC3, E10)

### Approval and writing (UC2)

- R17 A run with no approval changes no file and no record, and its result lists each offered field. (UC1, E14)
- R18 An approval names a field by the same locator the diagnosis reports for it, and only the approved fields are
  written. (UC2, E16)
- R19 The whole approval is rejected, nothing is written, and the failure names each reason, when it names a field
  that was not offered, approves one field from two targets with different values, or adds a server with neither a
  command nor a url. (UC2, E15)
- R20 A server approved from two targets that agree on it is added to the golden set once and recorded for both.
  (UC2, E16)
- R21 An import changes only the text of the field it writes, or appends the new server, and every comment in the
  golden set survives. (UC2, E18)
- R22 A field the golden set spreads over a sub-table or dotted keys, a server not written as its own table, or a
  golden set that declares its servers inline, is a hand edit, and the golden set is unchanged. (UC2, E17)
- R23 A new text that does not parse back to the expected server with every other server unchanged is not written
  and is a hand edit instead. (UC2, E19)
- R24 No harness MCP file is changed by any run. (UC2, E18)

### Record (UC2)

- R25 An imported field is recorded as in agreement for the target it came from, and a new server is recorded
  whole. (UC2, E18)
- R26 A server the record lacks is recorded only when every one of its other fields has a baseline; otherwise the
  record is left alone for that server. (UC2, E18)

### Adapters

- R27 Each per-field outcome (offered, imported, hand edit, held back for each of its reasons, refused for each of
  its reasons) is distinct and stable in the result, and each row that changes a field carries its value in golden
  form or says it would be unset. (UC1, E6, E7, E12, E10, E17, E18)
- R28 A failed run is told apart from a successful one without reading the result. (UC2, E2, E15)

## Open questions

None.

## References

- [graph.md](./graph.md): the decision graph.
- [mcp-diagnosis](../mcp-diagnosis/README.md): the golden set, the dialects, the baseline, the locator, and the
  credential test.
- [mcp-projection](../mcp-projection/README.md): the forward direction and the hand edit.
- [repair](../repair/README.md): the skill that offers each field and passes the approved ones.
- [mcp-canonical-location evidence](../../../../../.research/mcp-canonical-location/evidence.md): E-MCP-12 to
  E-MCP-18 back each dialect's reading; E-MCP-14 and E-MCP-15 give the documented timeout defaults.
