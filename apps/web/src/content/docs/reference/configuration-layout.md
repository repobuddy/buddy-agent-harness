---
title: Configuration Layout
description: What initialization puts on disk, and why it records nothing else.
---

The canonical configuration belongs to the repository, not to a particular agent harness. This page is what ends up on disk: the layout, the projections, and the record of what was enabled.

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

Because the link is at the directory level, a skill added to `.agents/skills/` later appears in every enabled harness with no further action. Where symlinks are unavailable the initializer copies instead. A copy is a snapshot rather than a live projection, so it needs a re-run to pick up changes.

Only [Claude Code](/agent-configuration/harnesses/claude-code/) needs one. Every other supported harness reads `.agents/skills/` directly, so the canonical directory *is* the harness directory and nothing is written. [Harness Differences](/agent-configuration/harness-differences/) has the full table.

`windsurf` remains accepted as a deprecated alias for `devin-desktop`. It still creates the legacy `.windsurf/skills` projection, which Devin continues to scan, so existing repositories keep working. New repositories should use `devin-desktop`, which needs no projection at all. Any enabled deprecated name is reported in the result's `deprecated` field.

## No configuration record

Initialization writes nothing to record what it did. There is no state file, and no key in a shared one.

That is deliberate. The enabled set is derived on every run: Claude Code and Cursor unconditionally, plus any harness whose directory is already present, plus anything named with `--harness`. A stored copy of a derived value cannot be authoritative: it can only agree with detection, in which case it is redundant, or disagree, in which case it is wrong. It would also read as editable when it is not, quietly discarding anyone who tried to disable a harness by hand.

Nor is a record needed to clean up after a harness that drops out, because none can. The enabled set only ever grows.

The command's own output is the report. Read it, or re-run the command. It is idempotent and cheap.

## What stays canonical

Only skills are projected. Everything else is reported and left in place — but for two different reasons, and MCP is the odd one out.

Custom agents, hooks, and path-scoped rules have no open specification, so there is no format to convert them into. See [Open Standards](/agent-configuration/open-standards/#what-the-standards-do-not-cover).

MCP servers do have one. A cross-harness mapping exists and is published: [`agent-install`](https://www.npmjs.com/package/agent-install) (0.0.8) maps server configuration across fourteen hosts, six config keys, and three file formats. What it is not is lossless, and the loss is per host and per transport rather than general:

- Claude Desktop's `claude_desktop_config.json` accepts stdio servers only. A remote server is added through its Connectors interface instead, so it has no representation in that file at all, and a converter has to refuse that one server rather than write a broken entry.
- Writing a server into Goose fills in `description`, `enabled`, and `timeout`; writing one into Zed fills in `source`. None of those values comes from the source configuration.

So MCP is reported rather than converted because conversion would have to invent values you did not write, and initialization invents nothing. It is a policy, not an impossibility: if that changes, [say so](https://github.com/repobuddy/buddy-agent-harness/issues).

That reasoning holds for `init`, and there is now a way around it that keeps it true: a [golden MCP server set](/agent-configuration/mcp-servers/) the user authors at `.agents/buddy-agent-harness/mcp.toml`, holding each server in the superset of fields the hosts accept. A field the user filled in is transcription rather than invention, so where that file exists, `doctor` compares it against each harness's own MCP config and reports drift both ways. Nothing writes yet, and `init` still invents nothing.

Repository instructions are the middle case. `AGENTS.md` is canonical, but the two harnesses that cannot read it need a bridge the CLI does not write, because both need judgment about user-authored content: the [Claude Code](/agent-configuration/harnesses/claude-code/) `CLAUDE.md` import and the [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) `context.fileName` edit. The [`init` skill](/skills/init/) handles both.
