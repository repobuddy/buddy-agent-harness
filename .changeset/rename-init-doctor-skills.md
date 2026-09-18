---
'buddy-agent-harness': minor
---

Rename the `init` and `doctor` skills to `init-buddy-agent-harness` and `doctor-buddy-agent-harness`.

A plugin-scoped skill named `init` or `doctor` collides with the same names shipped by other plugins, so a harness loading several plugins could not tell which one a bare `init` or `doctor` invocation meant. Invoke them as `/buddy-agent-harness:init-buddy-agent-harness` and `/buddy-agent-harness:doctor-buddy-agent-harness`.

The CLI commands `init` and `doctor` keep their names — this only renames the two agent skills that wrap them.
