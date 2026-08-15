# Frontmatter for cross-harness skills

Linking a skill into every harness is easy. Making it *behave* the same in every harness is not. Each harness parses the frontmatter fields it knows and silently drops the rest.

## Required, everywhere

```yaml
---
name: release-checklist
description: Runs the release checklist. Use when cutting a release or publishing a package version.
---
```

- `name` — 1–64 characters, lowercase letters, digits, and hyphens. No leading, trailing, or consecutive hyphens. **It must match the parent directory name.**
- `description` — 1–1024 characters. Say what the skill does *and* when to use it; this is the only text most harnesses see when deciding whether to load it.

## Two rules that decide whether a skill loads at all

Harnesses are told to validate leniently, but the leniency is asymmetric:

| Problem | Result |
| --- | --- |
| `name` does not match the directory | warning, still loads |
| `name` longer than 64 characters | warning, still loads |
| `description` missing or empty | **skill is skipped** |
| YAML fails to parse | **skill is skipped** |

So the two failures that actually cost you a skill are a missing description and broken YAML. The most common cause of broken YAML is an unquoted colon:

```yaml
# Breaks on strict parsers
description: Use this skill when: the user asks about PDFs

# Correct
description: "Use this skill when: the user asks about PDFs"
```

**Quote any description containing a colon.** When migrating existing skills, check this first.

Enforcing `name` == directory name is also worth doing even though it is only a warning: Claude Code ignores `name` for command resolution and uses the directory name, so matching them removes the discrepancy entirely.

## Which harness understands which field

| Field | Recognized by |
| --- | --- |
| `name`, `description` | all |
| `license`, `metadata`, `compatibility` | accepted broadly, largely ignored |
| `allowed-tools` | most; **not** Kiro CLI or Zencoder |
| `context: fork`, `agent:` | Claude Code only |
| `disable-model-invocation` | Claude Code, Cursor |
| `paths`, legacy `globs` | Cursor only |
| `model` | Copilot CLI only |
| hook configuration | Claude Code, Cline, Kiro CLI |

Codex additionally reads an `agents/openai.yaml` **sidecar file** beside `SKILL.md` — not frontmatter. See `codex.md`; never add one unprompted.

## What follows from that

Claude Code has the largest field surface, so a skill authored for it and shared everywhere carries fields the other harnesses parse and discard. That is a small, unavoidable context cost — accept it rather than maintaining divergent copies.

The cost that is *not* acceptable is silent behavior loss. **Anything that must hold on every harness has to be stated in the Markdown body, not only in a harness-specific field**, because the body is the one part every harness reads. Treat harness-specific frontmatter as an optimization layered on top of instructions that already work without it.

When adding frontmatter to a skill that lacks it, derive `name` from the directory and `description` from the first heading or opening paragraph, then show the user the derived values for approval. If nothing usable can be derived, ask — never write a placeholder description, because a vague description is worse than the warning it silences.
