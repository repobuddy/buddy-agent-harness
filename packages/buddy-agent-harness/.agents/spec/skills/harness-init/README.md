---
spec-type: behavioral
concept: harness-compatibility
---

# harness-init

## What

`harness-init` guides an agent through initializing one consumer repository's shared skill source and making it available to its enabled coding-agent harnesses. It gives a team one editable source at `.agents/skills/` instead of divergent copies in vendor directories. The active harness is always enabled; explicit user preferences may add other supported harnesses.

The skill is for local skill-path setup only. It does not change CI, repository settings, security scanning, branch rules, or unrelated project files.

**Key terms**

- **canonical skills directory** — `.agents/skills/` in the selected consumer repository; each skill directory below it is the source that harness directories receive.
- **active harness** — the harness that invokes initialization.
- **enabled harness** — the active harness and any additional supported harnesses the user explicitly prefers.
- **consumer root** — the Git repository root.

## Use Cases

| Entry point                              | Trigger                                      | Inputs                                         | Outcome                                                                         |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `buddy-agent-harness init`               | An agent is asked to initialize local skills | Consumer root, active harness, and user preferences | Creates the canonical directory, configures enabled harnesses, and records them |
| `buddy-agent-harness init --copy`        | Copying is explicitly required               | Consumer root and canonical skills             | Materializes copies instead of links                                            |
| `buddy-agent-harness init --format json` | Another program needs the result             | Consumer root                                  | Emits the initialization result as JSON                                         |

## Control Flow

```mermaid
flowchart TD
  A[Locate repository root] --> B{Requested output format valid?}
  B -->|no| C[Report format error]
  B -->|yes| D[Ensure .agents/skills exists]
  D --> E[Read canonical skill directories]
  E --> F[Select immediate canonical skill directories]
  F --> G[Select active harness]
  G --> H[Add user-preferred harnesses]
  H --> I{Any conflicting target?}
  I -->|yes, no --force| J[Report every conflict and stop]
  I -->|no, or --force| K{Copy requested or link unavailable?}
  K -->|no| L[Create relative links]
  K -->|yes| M[Copy skill directories]
  L --> N[Write enabled-harness configuration]
  M --> N
  N --> O[Emit TOON or JSON result]
```

The consumer root is always the repository root, including in a monorepo. The active harness is selected unconditionally; a user preference can add other supported harnesses. Existing vendor directories do not themselves express installation intent. Only immediate directory entries in `.agents/skills/`, sorted by name, are canonical skills.

## Scenario map

### `buddy-agent-harness init`

| Edge                       | Path (Given)                                             | Scenario                                                                 |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Ensure canonical directory | default consumer root                                    | `creates the canonical directory at the consumer root`                   |
| Locate repository root     | command is invoked from a package in a monorepo          | `initializes the repository root when invoked from a nested package`     |
| Select enabled harnesses   | no additional user preference exists                     | `configures the active harness by default` |
| Select enabled harnesses   | the user prefers additional supported harnesses           | `configures the active harness and preferred harnesses` |
| Reject conflict            | one or more targets differ from expected canonical links | `preflights every conflict before writing initialization output`         |
| Replace conflict           | targets conflict and force is requested                  | `replaces conflicting skill targets when force is requested`             |
| Link or copy               | links are available and copy is not requested            | `creates relative links for canonical skills`                            |
| Link or copy               | copy is requested or links are unavailable               | `copies canonical skills when links cannot be used`                      |
| Preserve concurrent target | a target appears during a failed link attempt            | `preserves a target that appears during link fallback`                   |
| Write configuration        | canonical skills may be empty                            | `records enabled harnesses even when no skills exist`                    |
| Select canonical skills    | files and directories share the canonical directory      | `selects only immediate canonical skill directories in sorted order`     |
| Write result               | default output requested                                 | `reports the initialization result as TOON by default`                   |
| Write result               | JSON output requested                                    | `reports the requested copy option as JSON`                              |
| Reject format              | an unsupported output format is requested                | `rejects an unsupported output format`                                   |
