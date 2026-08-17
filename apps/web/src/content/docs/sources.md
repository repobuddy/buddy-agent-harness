---
title: Sources & Confidence
description: How well-sourced each harness claim is, and which ones are not established.
---

The harness claims across this site are not equally well-sourced, and the difference matters when you are deciding how much to rely on one. Supporting evidence is recorded in `.research/agentic-configuration-standards/` in the repository.

| Claim | Confidence | Basis |
| --- | --- | --- |
| Codex, Copilot CLI, and Cursor skill discovery paths | High | primary vendor documentation |
| Claude Code reads neither canonical format | High | primary vendor documentation, plus an independent bug report at user scope |
| Frontmatter field origins | High | primary vendor documentation |
| Devin Desktop skill paths and the rebrand | High | official vendor announcement and documentation |
| Antigravity and VS Code skill paths | High / Medium | primary vendor documentation |
| Gemini CLI paths and `context.fileName` | Medium | project documentation, partly an issue thread |
| Cursor's Agent-mode-only `AGENTS.md` support | Medium | secondary comparisons, not primary Cursor documentation |
| `AGENTS.md` context cost and length guidance | Low | practitioner analysis and reported measurements, no vendor specification |
| Claude Code skill runtime fields, and their turn-scoping | High | primary vendor documentation |
| `user-invocable` and `disable-model-invocation` being independent | High | primary vendor documentation, including the vendor's own comparison table |
| A missing `description` falling back to the body's first paragraph | High | primary vendor documentation |
| `commands/` being merged into skills rather than deprecated | High | primary vendor documentation |
| What an agent definition can express that a skill cannot | High | primary vendor documentation |
| Claude Code skill arguments, and the fields the spec rejects | High | primary vendor documentation |
| Codex skills having no argument mechanism | High | absence from the vendor page that supersedes custom prompts |
| Cursor rule selection via `globs` / `description` / neither | High | primary vendor documentation |
| Copilot `applyTo` path-specific instructions | High | primary vendor documentation |
| Nested `AGENTS.md` resolution (nearest-file-wins) | High | agents.md body copy and FAQ, primary |
| Claude Code concatenating every discovered `CLAUDE.md` | High | Claude Code memory documentation, primary |
| Nested-resolution semantics beyond precedence | Low | unratified v1.1 proposal, no maintainer response |
| A standard local-override file (`AGENTS.local.md`) | Low | absent from the standard; three open issues, two candidate names |

## Cursor's mode split is not confirmed

The claim that Cursor's Agent mode reads `AGENTS.md` while Chat and Composer do not comes from third-party comparisons rather than Cursor's own documentation.

It is consequential: a repository standardizing on `AGENTS.md` alone would lose instructions in two of three Cursor surfaces. Verify it against Cursor's documentation before relying on it. See [Cursor](/agent-configuration/harnesses/cursor/).

## Not established

Two claims about instruction files are left unstated rather than guessed:

- whether Devin Desktop reads `AGENTS.md`,
- whether Antigravity reads `AGENTS.md`.

Both vendors document skills without addressing repository instructions. Their rows in [Harness Differences](/agent-configuration/harness-differences/) say "not established" for that column rather than assuming either way.

## The two standards disagree about a missing description

Claude Code documents that an omitted `description` "uses the first paragraph of markdown content." The Agent Skills client-implementation guide prescribes the opposite: a missing or empty description means the skill is **skipped**.

Both are primary and both are current, so the disagreement is real rather than a sourcing gap. A skill relying on either behavior is not portable, which is why [Direct Invocation Skill](/agent-configuration/skills/direct-skill/) requires an explicit marker string rather than an absent field.

## Harness settings files are not documented here

This site does not carry a table of per-harness settings files (`.claude/settings.json`, `.cursor/permissions.json`, `~/.codex/config.toml`, and peers) covering tool permissions, hooks, and environment defaults.

Two reasons. The readily available sourcing for several of those rows is third-party blog posts rather than vendor documentation, and this project does not publish harness claims at that confidence. And settings are outside what initialization touches: only skills are projected, and [tool settings stay canonical](/reference/configuration-layout/#what-stays-canonical).

Adding the table is therefore a research task rather than an editing one.

## Undocumented but verified

Symlinking the `.claude/skills` **directory itself** is not documented by Claude Code, which documents per-skill symlinks instead. The directory-level link is verified working and preferred because it is live, but it is supported in practice rather than guaranteed by contract. Per-skill links remain the documented fallback.

## Unratified upstream proposals

Two claims on this site describe upstream work that is proposed rather than adopted, and both are labelled as such where they appear:

- the v1.1 [accumulation model](https://github.com/agentsmd/agents.md/issues/135) for nested `AGENTS.md`, which would move the standard toward Claude Code's existing behavior rather than away from it,
- a local-override file, requested in three open issues under two different filenames with two different semantics.

Neither has a maintainer resolution. They are recorded because the divergence they describe is real today, not because either outcome is expected. Positions this project has taken on them are tracked in [unsettled upstream questions](https://github.com/repobuddy/buddy-agent-harness/discussions?discussions_q=label%3Aupstream-unsettled).

The specification's file-reference guidance is recorded as `E-STD-06`. Its first sentence reads as a ban on subdirectories and its second glosses it as a limit on reference chains; [Best Practices](/agent-configuration/best-practices/) takes the second reading, and the layout itself is explicitly unconstrained.

## An unresolved third-party discrepancy

The [`vercel-labs/skills`](https://github.com/vercel-labs/skills) README claims 75 supported agents while its [public listing](https://www.skills.sh/agent) shows twenty. The discrepancy is unresolved; prefer the list to the number.
