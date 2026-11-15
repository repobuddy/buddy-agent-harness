# MCP diagnosis: decision graph

Two independent checks. The credential check runs on every MCP file. The drift check runs only where a golden set
parses.

## Each MCP file: every MCP target and the golden set

```mermaid
flowchart TD
  F[An MCP file: a target, or the golden set] -->|E1 does not exist, or the harness has no MCP target| O1[Nothing reported for it]
  F -->|E2 exists| P{Does it parse?}
  P -->|E3 no| O2[Reported unreadable, with none of its content]
  P -->|E4 yes| K{Does each credential-bearing field hold a reference?}
  K -->|E5 yes| O3[No credential reported]
  K -->|E6 no, and the file is git-tracked| O4[Committed literal credential reported]
  K -->|E7 no, and the file is untracked or outside git| O5[Untracked literal credential reported]
```

## Drift against the golden set

```mermaid
flowchart TD
  G{Golden set?} -->|E8 absent| O6[No drift reported]
  G -->|E9 does not parse| O6
  G -->|E10 parses: for each target that parses, read for its MCP key only| M{Which side carries the server?}
  M -->|E11 golden set only| O7[Reported missing from the target]
  M -->|E12 target only| O8[Reported undeclared]
  M -->|E13 both| D{Differ on a representable field the golden set fills in?}
  D -->|E14 no| O9[Nothing reported]
  D -->|E15 yes, per field| R{Does the record hold the server for this target, and parse?}
  R -->|E16 yes| W{Which side still matches the baseline?}
  R -->|E17 no, and the target is git-tracked| H{A commit where both files parse and agree on the field?}
  R -->|E18 no, and the target is untracked or outside git| O13[Diverged, direction unknown]
  H -->|E19 yes, the newest one| W
  H -->|E20 none| O13
  W -->|E21 the golden set| O10[Diverged, the target moved]
  W -->|E22 the target| O11[Diverged, the golden set moved]
  W -->|E23 neither| O12[Diverged, both moved]
```
