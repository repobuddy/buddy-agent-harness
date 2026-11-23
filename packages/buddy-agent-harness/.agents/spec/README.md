# buddy-agent-harness design specs

The design specs of the `buddy-agent-harness` package at `packages/buddy-agent-harness`: what each of its
capabilities must do, in terms a reader can check without the code.

This file is an index, not a spec. Each folder below holds one capability's design spec: `README.md`, and `graph.md`
where the behavior branches. Each spec stands alone, with its own IDs; an ID such as `R3` is cited with its folder
(`bridge-resolution` R3). The terms several specs share are defined once, in [glossary.md](./glossary.md).

`.agents/` is outside the package's published file allowlist, so these specs never ship.

## Where a spec lives

- One capability is one folder, named for what an actor gets from it, never for the layer that delivers it. A
  capability reached through the command line, a library call, and a skill is one spec, and each delivery is an
  entry point of its use cases.
- What a shipped skill's instructions add on top of a command (what to ask, what to tell the user) is a use case of
  the skill's own spec, checked by an eval run of the skill.
- Encodings (exit numbers, output field names, flag spelling, message wording) are not stated here. They belong to the
  lower rung: the package's tests, which pin them.
- A rule several specs depend on has one home spec, and the others link it.

## Specs

### Setting a repository up

| Spec | Outcome |
| --- | --- |
| [`harness-init/`](./harness-init/README.md) | The `init` command projects the canonical skills into every enabled harness |
| [`init-buddy-agent-harness/`](./init-buddy-agent-harness/README.md) | The `init-buddy-agent-harness` skill consolidates a repository's agent configuration into the canonical form |
| [`agent-worktree-settings/`](./agent-worktree-settings/README.md) | A repository that uses Claude Code accounts for its agent worktrees, one setting at a time, on the owner's word |
| [`enhance/`](./enhance/README.md) | The `enhance` skill offers the vetted guidance a repository's `AGENTS.md` lacks, or carries in a retired form |
| [`retro/`](./retro/README.md) | The `retro` skill turns what happened in a repository's agent sessions into owner-approved changes to its agent setup |

### Finding what is wrong (`doctor`)

| Spec | Outcome |
| --- | --- |
| [`diagnosis-report/`](./diagnosis-report/README.md) | Every finding family is reported through one output shape |
| [`bridge-resolution/`](./bridge-resolution/README.md) | Every skills bridge that no longer resolves into the canonical skills directory is reported |
| [`instruction-bridges/`](./instruction-bridges/README.md) | Every enabled harness that can no longer read `AGENTS.md` is reported |
| [`global-instructions/`](./global-instructions/README.md) | Every installed harness that does not load `~/.agents/AGENTS.md` is reported |
| [`configuration-diagnosis/`](./configuration-diagnosis/README.md) | Agent configuration that is present and wrong is reported |
| [`nonstandard-configuration/`](./nonstandard-configuration/README.md) | Agent configuration only one harness can read is reported |
| [`worktree-diagnosis/`](./worktree-diagnosis/README.md) | Agent worktrees a repository leaves unaccounted for are reported |
| [`mcp-diagnosis/`](./mcp-diagnosis/README.md) | Drift between the golden MCP server set and each harness copy is reported |

### Correcting it

| Spec | Outcome |
| --- | --- |
| [`detect-and-repair/`](./detect-and-repair/README.md) | Each finding reaches the skill that owns its repair |
| [`repair/`](./repair/README.md) | The `repair` skill corrects agent configuration that is present and wrong |
| [`copy-sync/`](./copy-sync/README.md) | Each skills copy bridge and the canonical skills directory end up holding the same files, with every edit made on either side kept |
| [`mcp-projection/`](./mcp-projection/README.md) | The golden MCP server set is written into each harness's own MCP file |
| [`mcp-reconcile/`](./mcp-reconcile/README.md) | A harness-side MCP change is brought back into the golden set, one approved field at a time |

### Reading rule sets and references

| Spec | Outcome |
| --- | --- |
| [`references/`](./references/README.md) | The package offers the `reference` command, with itself as a plugin |
| [`governance-overrides/`](./governance-overrides/README.md) | A caller learns where a governance comes from when someone has overridden it |

### Calling the package

| Spec | Outcome |
| --- | --- |
| [`entry-point/`](./entry-point/README.md) | A program reaches any command without starting a process |
| [`mcp-inventory/`](./mcp-inventory/README.md) | A program learns every MCP server configured for a project, across harnesses and scopes, with no credential in the answer |
| [`command-output/`](./command-output/README.md) | Every command's result becomes the bytes on stdout the same way |

## Not yet specified

- The `doctor-buddy-agent-harness` skill has no spec of its own. Its content is generated from the same guidance
  table the `doctor` command reports from.
- The build, packaging, and release surfaces have no spec.
