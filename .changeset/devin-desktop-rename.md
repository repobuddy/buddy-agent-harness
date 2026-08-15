---
'buddy-agent-harness': minor
---

Add `devin-desktop` and deprecate `windsurf`.

Cognition rebranded Windsurf to Devin Desktop on 2026-06-02. More consequentially, Devin scans nine project-scope skill paths and lists `.agents/skills/` first as the recommended one, so it reads the canonical directory natively and needs no projection at all.

`devin-desktop` is now a supported harness with no projection target. `windsurf` remains accepted as a deprecated alias and still creates the legacy `.windsurf/skills` symlink, which Devin continues to scan — existing repositories keep working unchanged. The initialization result gains a `deprecated` field listing any enabled superseded names alongside their replacements.

This leaves **only Claude Code and Gemini CLI** requiring a skills projection.

Documentation adds Antigravity and VS Code as native `.agents/skills` readers. Neither is a registry entry: both need nothing written, and neither has a safe project-scope detection marker — VS Code's `.vscode/` indicates the editor rather than skills support. Harness Support also now records per-claim evidence confidence and the agent list published by `npx skills`.
