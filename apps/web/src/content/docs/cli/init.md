---
title: init
description: Create canonical skill links or copies for supported coding harnesses.
---

```sh
buddy-agent-harness init [--root <directory>] [--copy] [--force] [--format toon|json]
```

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Selects the directory the current implementation initializes. The product direction is repository-root-only configuration. |
| `--copy` | Copy each canonical skill when links are unavailable or copying is required. |
| `--force` | Replace a conflicting target after the command has identified it. |
| `--format toon|json` | Choose token-efficient TOON output (default) or JSON. |

## Output

The result reports the selected root, enabled harnesses, canonical skill count, and whether copying was requested. It also writes `.agents/buddy-agent-harness/config.json` with the enabled harness names.

## Conflicts

The command checks every target before changing any of them. Without `--force`, conflicts stop the command and leave targets unchanged. A target that appears during a failed link attempt is preserved rather than overwritten.
