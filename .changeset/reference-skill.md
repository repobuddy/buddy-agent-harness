---
'buddy-agent-harness': minor
---

New `reference` skill for working with references yourself. It routes what you ask to `reference show`, `list`, or `search`, and it writes a new reference, or updates one, after you approve it, since the command is read-only.

When a plugin ships a reference, the skill names the file `<plugin name>.<reference>.md`, so a project's override of one plugin's document does not also replace another plugin's. Updating your own reference edits it in place. Updating a plugin's writes an override, and when more than one plugin holds that name, it warns you first. For a skill that needs a reference, it gives you the `load-reference` caller line.
