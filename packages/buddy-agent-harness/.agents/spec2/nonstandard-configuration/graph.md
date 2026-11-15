# Nonstandard configuration: decision graph

Every path the package declares as read by one harness only goes through this graph. A path two harnesses declare
goes through it once. Whether the harness is enabled is never asked.

```mermaid
flowchart TD
  S[A declared harness-only path] -->|E13| P{What is at the path?}
  P -->|E1 nothing| O1[Nothing reported]
  P -->|E2 a symlink| O1
  P -->|E3 a file| K
  P -->|E4 a directory of skills| SK[One finding per SKILL.md below it]
  P -->|E5 another directory| K
  K{A rule in the Cursor rule format?}
  K -->|E6 no| C
  K -->|E7 yes| G{Frontmatter binds it to globs with a value?}
  G -->|E8 yes| R[Kind: rule]
  G -->|E9 no| I[Kind: instructions]
  SK -->|E14| C
  R -->|E15| C
  I -->|E16| C
  C{Canonical form of the kind}
  C -->|E10 instructions| O2[Finding names the canonical instructions]
  C -->|E11 rule, command, or skill| O3[Finding names the canonical skills directory]
  C -->|E12 subagent| O4[Finding names no canonical form]
```

E5 yields one finding per file below the directory, each under the directory's declared kind.
