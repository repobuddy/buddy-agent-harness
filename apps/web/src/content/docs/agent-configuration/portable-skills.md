---
title: Writing Portable Skills
description: Which SKILL.md frontmatter survives across harnesses, and which two mistakes silently drop a skill.
---

Linking a skill into every harness is straightforward. Making it *behave* the same everywhere is not, and this is where the real cost of cross-harness authoring sits.

This page covers frontmatter: what survives the trip between harnesses. For how to split a skill across `SKILL.md` and `references/`, see [Best Practices](/agent-configuration/best-practices/).

## Frontmatter is a per-harness superset

The [Agent Skills specification](https://agentskills.io/specification) requires `name` (1 to 64 characters, lowercase letters, digits, and hyphens, matching the parent directory) and `description` (1 to 1024 characters). Everything beyond that is a per-harness extension, and each harness silently drops the fields it does not recognize.

| Field | Origin | Recognized by |
| --- | --- | --- |
| `name`, `description` | specification | all |
| `license`, `metadata`, `compatibility` | specification | accepted broadly, largely ignored |
| `allowed-tools` | specification (experimental) | most harnesses |
| `context: fork`, `agent:` | Claude Code | Claude Code only |
| `disable-model-invocation` | Claude Code, Cursor | those two |
| `paths`, legacy `globs` | Cursor | Cursor only |
| `model` | Copilot CLI | Copilot CLI only |

Two consequences follow.

Claude Code has the largest field surface, so a skill authored there and shared everywhere carries fields other harnesses parse and discard. That is a small, unavoidable context cost.

More importantly, **behavior encoded only in a harness-specific field disappears on every harness that drops it**. Anything that must hold everywhere belongs in the Markdown body, which is the one part every harness reads. Treat harness-specific frontmatter as an optimization over instructions that already work without it.

## The Codex sidecar is a separate file

Codex reads one thing no other harness does, and it lives beside `SKILL.md` rather than inside its frontmatter:

```text
.agents/skills/<skill>/
├── SKILL.md
└── agents/
    └── openai.yaml
```

It carries a display name, icons, a brand color, `allow_implicit_invocation` (default `true`), and MCP server dependency declarations.

The portability rule is the same as for harness-specific frontmatter, and stricter in practice: no other harness reads the file at all, so anything load-bearing has to be restated in the `SKILL.md` body. Adding one is a deliberate Codex optimization, not part of authoring a portable skill.

## Validation is lenient, but asymmetrically

The client-implementation guide prescribes lenient validation, and the leniency is uneven:

| Problem | Result |
| --- | --- |
| `name` does not match the directory | warning, still loads |
| `name` longer than 64 characters | warning, still loads |
| `description` missing or empty | **skill is skipped** |
| YAML fails to parse | **skill is skipped** |

The two failures that actually cost you a skill are a missing description and broken YAML.

The most common real-world cause of the latter is an unquoted colon inside a description. `description: Use this skill when: ...` is invalid YAML that some parsers accept and others reject, so the skill works in one harness and vanishes in the next. **Quote any description containing a colon.**

## Match `name` to the directory

Claude Code deviates semantically: `name` sets only the display label, and the invoking command comes from the directory name. Complying with the specification's directory-match rule makes the deviation invisible, which is a practical reason to enforce it even though a mismatch is only a warning.

## A portable skill, in short

- `name` equal to the directory name, lowercase and hyphenated.
- A `description` that is present, non-empty, and quoted if it contains a colon.
- Load-bearing behavior stated in the Markdown body, not only in frontmatter.
- Harness-specific fields kept as optimizations, added last, never depended on.
