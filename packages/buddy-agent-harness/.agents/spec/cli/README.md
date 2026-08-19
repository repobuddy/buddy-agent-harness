# CLI

> Descriptive index — the package's command-line product surface.

The package publishes one binary with two commands: `init`, which writes a repository's canonical configuration and the bridges into it, and `doctor`, which reports what is wrong with what is already there.

`doctor` is the larger surface, and it is **one command reporting several families of fault through one output shape**. The families are independent — each answers a different question about the same repository, and a single run reports as many as it finds, across all of them. The shape they share is a node of its own, because a field added to the report belongs to every family at once and to none of them in particular, and because the set of families grows.

| Node | Subject |
| --- | --- |
| [`bridge-resolution/`](./bridge-resolution/README.md) | Whether every skills bridge still resolves into `.agents/skills` |
| [`instruction-bridges/`](./instruction-bridges/README.md) | Whether every enabled harness can still read `AGENTS.md` |
| [`configuration-diagnosis/`](./configuration-diagnosis/README.md) | Whether the configuration around those bridges is present and wrong |
| [`mcp-diagnosis/`](./mcp-diagnosis/README.md) | Whether the golden MCP server set and the harness copies of it have drifted |
| [`diagnosis-report/`](./diagnosis-report/README.md) | The one output shape every family is reported through |
| [`entry-point/`](./entry-point/README.md) | How the package is called, and what it answers with |
| [`command-output/`](./command-output/README.md) | How a result becomes the bytes on stdout, for both commands |

The cross-surface flow these findings feed — one surface detects, another repairs — is at [`../workflows/detect-and-repair/`](../workflows/detect-and-repair/README.md).

## Where the boundaries fall

The shared output layer is [`command-output/`](./command-output/README.md): `diagnosis-report/` states which formats `doctor` accepts, and that node states how a result becomes those bytes, for both commands rather than for either.

The `init` **skill**'s write behavior is [`../skills/init/`](../skills/init/README.md) — what it consolidates, what it declines to invent, and the writes it makes without asking. [`../skills/harness-init/`](../skills/harness-init/README.md) keeps the **`init` command**: its options, its formats, and its error behavior. The skill every instruction-bridge repair routes to is a different subject, and now says what arriving there does.

The entry-point contract that was the third gap here is now [`entry-point/`](./entry-point/README.md), and the asymmetry this section recorded is closed: `run(argv)` answers the consumer that wants exactly what the command **prints**, the exported report builder answers the one that wants the **report as data**, and the diagnosis functions still answer the one that wants the findings the report was assembled from.
