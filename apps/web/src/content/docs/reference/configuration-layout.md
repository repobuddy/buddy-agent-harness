---
title: Configuration Layout
description: What initialization puts on disk — the canonical tree and the projections, and why it records nothing else.
---

The canonical configuration belongs to the repository, not to a particular coding harness. This page is what ends up on disk: the layout, the projections, and the record of what was enabled.

For what the formats themselves are and how much authority they carry, see [Open Standards](/agent-configuration/open-standards/).

## Layout

```text
repository/
├── AGENTS.md                 # project-level agent instructions
└── .agents/
    ├── AGENTS.md             # shared repository guidance
    ├── skills/
    │   └── <skill>/SKILL.md  # reusable capabilities
    └── <tool-setting>        # separately named tool configuration
```

Each immediate directory under `.agents/skills/` is a canonical skill. Files at that level are ignored.

Tool settings stay in separately named files rather than being merged into one, because each setting has its own schema and compatibility rules.

## What a projection is

A projection is a single directory-level symlink from a harness path to `.agents/skills`:

```text
.claude/skills → ../.agents/skills
```

Because the link is at the directory level, a skill added to `.agents/skills/` later appears in every enabled harness with no further action. Where symlinks are unavailable the initializer copies instead — a copy is a snapshot, not a live projection, and needs a re-run to pick up changes.

Only [Claude Code](/agent-configuration/harnesses/claude-code/) and [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) need one. Every other supported harness reads `.agents/skills/` directly, so the canonical directory *is* the harness directory and nothing is written. [Harness Differences](/agent-configuration/harness-differences/) has the full table.

`windsurf` remains accepted as a deprecated alias for `devin-desktop`. It still creates the legacy `.windsurf/skills` projection, which Devin continues to scan, so existing repositories keep working. New repositories should use `devin-desktop`, which needs no projection at all. Any enabled deprecated name is reported in the result's `deprecated` field.

## No configuration record

Initialization writes nothing to record what it did. There is no state file, and no key in a shared one.

That is deliberate. The enabled set is derived on every run — Claude Code and Cursor unconditionally, plus any harness whose directory is already present, plus anything named with `--harness`. A stored copy of a derived value cannot be authoritative: it can only agree with detection, in which case it is redundant, or disagree, in which case it is wrong. It would also read as editable when it is not, quietly discarding anyone who tried to disable a harness by hand.

Nor is a record needed to clean up after a harness that drops out, because none can. The enabled set only ever grows.

The command's own output is the report. Read it, or re-run the command — it is idempotent and cheap.

## What stays canonical

Only skills are projected. MCP servers, custom agents, hooks, and path-scoped rules have no safe cross-harness mapping, so they stay canonical and are reported rather than converted — see [Open Standards](/agent-configuration/open-standards/#what-the-standards-do-not-cover).

Repository instructions are the middle case. `AGENTS.md` is canonical, but the two harnesses that cannot read it need a bridge the CLI does not write, because both need judgment about user-authored content: the [Claude Code](/agent-configuration/harnesses/claude-code/) `CLAUDE.md` import and the [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) `context.fileName` edit. The [`init` skill](/guides/initialize/) handles both.
