# Devin Desktop (formerly Windsurf)

**Write nothing.** Devin Desktop reads `.agents/skills/` natively — it is the recommended path of the nine it scans.

Windsurf was rebranded to Devin Desktop on 2026-06-02. Use `devin-desktop`; `windsurf` still works as a deprecated alias.

## The alias

`--harness windsurf` enables a legacy entry that still creates `.windsurf/skills → ../.agents/skills`. Devin also scans `.windsurf/skills/`, so the projection works — it is redundant, not broken.

- For a new repository, use `--harness devin-desktop` and write nothing.
- If a repository already has a `.windsurf/skills` link, leave it. Report it as legacy compatibility, and mention the rename.
- `init` reports any enabled deprecated name in its `deprecated` result field. Surface that to the user.

## Instructions

Whether Devin Desktop reads `AGENTS.md` is **not established**. Do not assert it either way, and do not write an instruction bridge for it.

`.windsurfrules` and `.windsurf/rules/` are **canonical-only**. Report them and leave them in place.
