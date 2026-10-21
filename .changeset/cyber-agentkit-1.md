---
'buddy-agent-harness': minor
---

Moves from `@cyberuni/agent-harness` to `cyber-agentkit` 1.0, and the plugin dependency from `cyber-agent-harness` to `cyber-agentkit`; install that plugin on harnesses that read no plugin dependencies.

The `reference` command and its exports no longer read `governances/` folders (project, user, and the machine-wide ones). Move those documents to the `references/` folder of the same tier. The `governance` command is unchanged and still reads them. The machine-wide `/etc/buddy-agent-harness/references` folder is no longer read: the managed tier is a `references/` folder beside the managed files of each detected harness.

The package no longer exports `managedReferencesDir`, `MergeMode`, `ReferenceRow`, `TraceEntry`, or `UsedLayer`. `referenceLayers` now resolves to `ReferenceLayers`, and `ReferenceListing` holds `references` and `layers` in place of `rows`. `ReferenceListLayerRow` and `ReferenceListRow` are exported.
