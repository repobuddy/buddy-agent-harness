---
'buddy-agent-harness': minor
---

Model user scope as well as project scope in the harness registry. `Harness` now carries a `project` record and an optional `user` record, each with its own `detect` directory and optional `skillsDirectory`, so a harness that answers the canonical-directory question differently at each scope can be recorded truthfully — Gemini CLI needs a projection inside a repository and none at user scope. A missing `user` record means no vendor path is documented, as with Devin Desktop.

The published `harnessRegistry` entries change shape: read `harness.project.detect` and `harness.project.skillsDirectory` in place of `harness.detect` and `harness.skillsDirectory`. The `Harness`, `HarnessScope`, and `HarnessScopeName` types are now exported. `init` and `doctor` are unchanged and still act only inside the repository.
