# Worktree diagnosis: decision graph

The three checks after `D1` are independent: each runs whatever the others find, so one run can report all three
faults. No check writes, and a check that cannot answer reports nothing rather than guessing.

```mermaid
flowchart TD
  D1{A .claude directory exists?}
  D1 -->|E1: no| O1[No worktree finding]
  D1 -->|E2: yes, ignore check| D2{The root is a git repository?}
  D2 -->|E3: no| N[No finding from this check]
  D2 -->|E4: yes| D3{.claude/worktrees/ is git-ignored, by its own rule or a parent's?}
  D3 -->|E5: no| O2[Untracked-worktrees finding naming .gitignore]
  D3 -->|E6: yes| N
  D1 -->|E7: yes, scan check| D4{A Biome config exists?}
  D4 -->|E8: no| N
  D4 -->|E9: yes| D5{It mentions .claude/worktrees?}
  D5 -->|E10: no| O3[Scanned-worktrees finding naming that config]
  D5 -->|E11: yes| N
  D1 -->|E12: yes, base check| D6{Claude Code settings set the worktree base?}
  D6 -->|E13: unset, unparseable, or no settings file| O4[Base-unset finding naming .claude/settings.json]
  D6 -->|E14: set to either value| N
```
