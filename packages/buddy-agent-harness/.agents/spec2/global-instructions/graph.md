# Global instructions: decision graph

Each harness is judged on its own. No branch writes. A row is reported on every path from `D3`; a finding is raised
only when the global instruction file exists (`global-instructions` R21), so the outcomes below name the row and the
finding that row gets when the global file exists.

```mermaid
flowchart TD
  D1{Harness installed for the user, or named by the caller?}
  D1 -->|E1: neither| O1[No row]
  D1 -->|E2: yes| D2{Harness keeps its user rules in a file?}
  D2 -->|E3: no| O1
  D2 -->|E4: yes| D3{Relocating variable for this harness?}
  D3 -->|E5: set and non-empty| L1[Look up every file under the variable's directory]
  D3 -->|E6: unset, or empty where the harness reads empty as unset| L2[Look up every file under the home directory]
  D3 -->|E7: empty where the harness reads empty as its start directory| O2[Emptied finding, replacing the file's own]
  O2 -->|E8: file looked up in the start directory| D4
  L1 --> D4
  L2 --> D4{A file the harness reads first, holding more than whitespace?}
  D4 -->|E9: yes, landing on the global file| OK[Row ok, naming the file read]
  D4 -->|E10: yes, landing elsewhere| O3[Row overridden, overridden finding naming the file read first]
  O3 -->|E11: user-scope file still judged| D5
  D4 -->|E12: none, or only whitespace| D5{What is the user-scope file?}
  D5 -->|E13: nothing| O4[Row missing, missing finding with the step that bridges it]
  D5 -->|E14: a symlink to the global file| OK
  D5 -->|E15: a file importing the global file, in a harness that imports| OK
  D5 -->|E16: anything else| O5[Row unbridged, unbridged finding with the step that bridges it]
```
