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

## Cursor's mode split is not confirmed

The claim that Cursor's Agent mode reads `AGENTS.md` while Chat and Composer do not comes from third-party comparisons rather than Cursor's own documentation.

It is consequential — a repository standardizing on `AGENTS.md` alone would lose instructions in two of three Cursor surfaces — so it is worth verifying against Cursor's documentation before relying on it. See [Cursor](/agent-configuration/harnesses/cursor/).

## Not established

Two claims about instruction files are left unstated rather than guessed:

- whether Devin Desktop reads `AGENTS.md`,
- whether Antigravity reads `AGENTS.md`.

Both vendors document skills without addressing repository instructions. Their rows in [Harness Differences](/agent-configuration/harness-differences/) say "not established" for that column rather than assuming either way.

## Undocumented but verified

Symlinking the `.claude/skills` **directory itself** is not documented by Claude Code, which documents per-skill symlinks instead. The directory-level link is verified working and preferred because it is live, but it is supported in practice rather than guaranteed by contract. Per-skill links remain the documented fallback.

## An unresolved third-party discrepancy

The [`vercel-labs/skills`](https://github.com/vercel-labs/skills) README claims 75 supported agents while its [public listing](https://www.skills.sh/agent) shows twenty. The discrepancy is unresolved; prefer the list to the number.
