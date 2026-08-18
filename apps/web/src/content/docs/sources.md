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
| Gemini CLI reads `.agents/skills` at both scopes | High | the Gemini CLI discovery source, corroborated by its documentation |
| Gemini CLI `context.fileName` | Medium | project documentation, partly an issue thread |
| JSON comment tolerance in `.gemini/settings.json` and `.claude/settings.json` | High | the Gemini CLI loader source, and Claude Code documentation plus an open request for JSONC support |
| Cursor's Agent-mode-only `AGENTS.md` support | Medium | secondary comparisons, not primary Cursor documentation |
| `AGENTS.md` context cost and length guidance | Low | practitioner analysis and reported measurements, no vendor specification |
| Claude Code skill runtime fields, and their turn-scoping | High | primary vendor documentation |
| `user-invocable` and `disable-model-invocation` being independent | High | primary vendor documentation, including the vendor's own comparison table |
| A missing `description` falling back to the body's first paragraph | High | primary vendor documentation |
| `commands/` being merged into skills rather than deprecated | High | primary vendor documentation |
| What an agent definition can express that a skill cannot | High | primary vendor documentation |
| Claude Code skill arguments, and the fields the spec rejects | High | primary vendor documentation |
| Codex skills having no argument mechanism | High | absence from the vendor page that supersedes custom prompts |
| Plugin dependencies installed for an npm source but not a git source | Low | direct observation of local installs, no vendor specification |
| Cursor rule selection via `globs` / `description` / neither | High | primary vendor documentation |
| Copilot `applyTo` path-specific instructions | High | primary vendor documentation |
| Nested `AGENTS.md` resolution (nearest-file-wins) | High | agents.md body copy and FAQ, primary |
| Claude Code concatenating every discovered `CLAUDE.md` | High | Claude Code memory documentation, primary |
| Nested-resolution semantics beyond precedence | Low | unratified v1.1 proposal, no maintainer response |
| A standard local-override file (`AGENTS.local.md`) | Low | absent from the standard; three open issues, two candidate names |
| MCP configuration having a cross-harness mapping that is not lossless | High | primary vendor documentation per host, plus inspection of the published `agent-install` registry |

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

## Harness settings files are documented only where verified

This site does not carry a table of per-harness settings files (`.claude/settings.json`, `.cursor/permissions.json`, `~/.codex/config.toml`, and peers) covering tool permissions, hooks, and environment defaults. The readily available sourcing for several of those rows is third-party blog posts rather than vendor documentation, and this project does not publish harness claims at that confidence. Adding the table is a research task rather than an editing one.

What is documented is what has been verified and what initialization depends on. Settings are not wholly outside `init`'s reach: it edits `.gemini/settings.json` to add `AGENTS.md` to `context.fileName`, which is why [JSON configuration disagrees about comments](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments) is on the site. That claim was established by testing, and it governs a file `init` writes to.

## Corrections

A claim that turns out to be wrong is corrected in place and recorded here. The entry stays after the page is fixed, so you can tell whether something you read earlier has since changed.

### 2026-08-18 — MCP was said to have no cross-harness mapping

Six pages and skill files stated that MCP servers stay canonical because "no safe cross-harness mapping exists". That was wrong. One exists and is published, mapping server configuration across fourteen hosts, six config keys, and three file formats.

Corrected at [What stays canonical](/reference/configuration-layout/#what-stays-canonical), which now separates MCP (a published mapping that is not lossless) from custom agents, hooks, and rules (no published specification at all). The other five locations link there instead of restating a reason. What has not changed is the behavior: this project still does not convert MCP configuration.

### 2026-08-18 — Settings files were said to be outside initialization's reach

This page gave two reasons for not documenting harness settings files. The second, that "settings are outside what initialization touches", was false: `init` edits `.gemini/settings.json` to add `AGENTS.md` to `context.fileName`. The sourcing-quality reason was and remains true. The section above now states only that one.

## Undocumented but verified

Claude Code parses `.claude/settings.json`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json` as **strict JSON**. Comments and trailing commas are total parse failures, not warnings. The vendor settings page documents five settings filenames and says nothing about comments either way, so this was established against Claude Code 2.1.234 by testing each file with `claude plugin validate` and `claude doctor`. It is verified behavior, not a contract, and could change without notice.

Symlinking the `.claude/skills` **directory itself** is not documented by Claude Code, which documents per-skill symlinks instead. The directory-level link is verified working and preferred because it is live, but it is supported in practice rather than guaranteed by contract. Per-skill links remain the documented fallback.

## Unratified upstream proposals

Two claims on this site describe upstream work that is proposed rather than adopted, and both are labelled as such where they appear:

- the v1.1 [accumulation model](https://github.com/agentsmd/agents.md/issues/135) for nested `AGENTS.md`, which would move the standard toward Claude Code's existing behavior rather than away from it,
- a local-override file, requested in three open issues under two different filenames with two different semantics.

Neither has a maintainer resolution. They are recorded because the divergence they describe is real today, not because either outcome is expected. Positions this project has taken on them are tracked in [unsettled upstream questions](https://github.com/repobuddy/buddy-agent-harness/discussions?discussions_q=label%3Aupstream-unsettled).

The specification's file-reference guidance is recorded as `E-STD-06`. Its first sentence reads as a ban on subdirectories and its second glosses it as a limit on reference chains; [Best Practices](/agent-configuration/best-practices/) takes the second reading, and the layout itself is explicitly unconstrained.

## An unresolved third-party discrepancy

The [`vercel-labs/skills`](https://github.com/vercel-labs/skills) README claims 75 supported agents while its [public listing](https://www.skills.sh/agent) shows twenty. The discrepancy is unresolved; prefer the list to the number.
