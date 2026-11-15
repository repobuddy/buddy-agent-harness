# Diagnosis report: decision graph

The decisions one `doctor` run makes that a consumer can observe. The report's decisions after `A` are independent:
each sets one part of the same report.

```mermaid
flowchart TD
  S[A caller asks doctor about a repository] -->|E15| U{Invocation well formed?}
  U -->|E1 no| O1[Refused, nothing diagnosed]
  U -->|E6 yes| H{Every requested harness supported?}
  H -->|E2 no| O11[Refused with an error naming the harness, no report]
  H -->|E3 yes| D{Every family's diagnosis completed?}
  D -->|E4 no| O2[Failure with its error, no report]
  D -->|E5 yes| A[One report assembled]
  A -->|E16| F{A managed, project, or user layer holds a reference?}
  F -->|E7 yes| O3[References section lists each row]
  F -->|E8 no| O4[References section states the zero]
  A -->|E17| W{Any fault found?}
  W -->|E9 no| O5[Findings hold the healthy answer, no repairs section]
  W -->|E10 yes| O6[One finding per fault, repairs section present]
  A -->|E18| V{Any bridge diverged?}
  V -->|E11 yes| O7[Divergence section present]
  V -->|E12 no| O8[No divergence section]
  O6 -->|E19| P{Does one invocation complete this repair?}
  P -->|E13 yes| O9[Repair offers the command and an instruction]
  P -->|E14 no| O10[Repair offers an instruction only]
```

E1 is the format refusal [command-output](../command-output/README.md) owns; this spec cites it only
for the outcome a hook tells apart (R26).
