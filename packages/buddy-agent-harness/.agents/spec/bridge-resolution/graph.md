# Bridge resolution: decision graph

Each checked harness is judged on its own from `D2` onward. No branch writes. A branch that cannot tell reports the
"cannot tell" outcome rather than guessing.

```mermaid
flowchart TD
  D1{Canonical skills directory exists?}
  D1 -->|E1: no| O1[Report the canonical directory missing, once, before any bridge]
  O1 -->|E2: bridges still inspected| D2
  D1 -->|E3: yes| D2{Checked harness needs a bridge?}
  D2 -->|E4: reads it natively| O2[Not listed, no finding]
  D2 -->|E5: yes| D3{What is at the bridge path?}
  D3 -->|E6: nothing| O3[Listed absent, missing-bridge finding]
  D3 -->|E7: a regular file| O4[Listed as a file, degraded-bridge finding]
  D3 -->|E8: a symlink| D4{Lands on the canonical directory?}
  D4 -->|E9: yes| OK[Listed resolving, no finding]
  D4 -->|E10: elsewhere, or target gone| O5[Listed not resolving, stale-bridge finding]
  D3 -->|E11: a copy| D5{Same files and content?}
  D5 -->|E12: no| D6{Which side moved since the last agreement?}
  D6 -->|E13: only the bridge| O6[Bridge-moved finding]
  D6 -->|E14: only the canonical directory| O7[Canonical-moved finding]
  D6 -->|E15: both| O8[Both-moved finding]
  D6 -->|E16: no last agreement| O9[Unknown-direction finding]
  D5 -->|E17: yes| D7{Tracked in git without skip-worktree protection?}
  D7 -->|E18: yes| O10[Listed resolving, unprotected-copy finding]
  D7 -->|E19: no, untracked, or no git| OK
```
