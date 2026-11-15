---
"buddy-agent-harness": major
---

`doctor` now puts each finding's repair on the finding's own row. Every row in `findings` has `path`, `problem`, `cause`, `detail`, `command`, and `instruction`, so you can tell which repair goes with which finding without matching rows against `help`. `help` still lists each distinct repair once, as a summary. This breaks code that reads `findings` rows as `path`, `problem`, and `detail` only, or that pairs findings with `help` entries by position. The `findings` rows of `buildDoctorReport` change the same way.
