# Worktree diagnosis: decision graph

The checks after `D1` are independent: each runs whatever the others find, so one run can report every fault. No check
writes, and a check that cannot answer reports nothing rather than guessing.

```mermaid
flowchart TD
  D1{A .claude directory exists?}
  D1 -->|E1: no| O1[No worktree finding]
  D1 -->|E15: yes, location check, per entry| D7{This .claude/worktrees/ entry is a directory with a .git entry?}
  D7 -->|E16: yes| O5[In-repository finding naming that worktree]
  D7 -->|E17: no, or no entry| N[No finding from this check]
  D1 -->|E2: yes, ignore check| D2{The root is a git repository?}
  D2 -->|E3: no| N
  D2 -->|E4: yes| D3{.claude/worktrees/ is git-ignored, by its own rule or a parent's?}
  D3 -->|E5: no| O2[Untracked-worktrees finding naming .gitignore]
  D3 -->|E6: yes| N
  D1 -->|E7: yes, exclusion check| D4{A Biome config exists?}
  D4 -->|E8: no| N
  D4 -->|E9: yes| D5{It mentions .claude/worktrees?}
  D5 -->|E18: yes| O3[Self-ignored finding naming that config]
  D5 -->|E19: no| N
  D1 -->|E12: yes, base check| D6{Claude Code settings set the worktree base?}
  D6 -->|E13: unset, unparseable, or no settings file| O4[Base-unset finding naming .claude/settings.json]
  D6 -->|E14: set to either value| N
```

- E10 and E11 are retired: the check for a missing Biome exclusion became the self-matching check, E18 and E19. A
  retired edge ID is never reused.
