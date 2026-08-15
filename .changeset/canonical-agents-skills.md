---
'buddy-agent-harness': minor
---

Align initialization with how harnesses actually discover skills.

`.agents/skills/` is read natively by Codex, Cursor, and GitHub Copilot CLI, so those harnesses no longer receive projected files. Only Claude Code, Gemini CLI, and Windsurf are linked, and the link is now a single directory-level symlink to `.agents/skills` rather than one symlink per skill — a skill added later appears in every enabled harness without re-running the command.

Claude Code and Cursor are always enabled; other harnesses are added by detection or with the new `--harness` option. The result reports `native` and `linked` harnesses separately so it is clear what was written to disk. Gemini CLI is now a supported harness, and the Cursor, Codex, and Windsurf skill paths have been corrected.

The `init` skill is rewritten as a guided survey → classify → confirm → apply → verify workflow. It detects agent configuration a repository already has — instruction files, skills, commands, subagents, rules, MCP servers, hooks — consolidates what has a safe canonical home, reports the rest, and never rewrites a user-authored file without approval. New references cover per-harness support and the cross-harness frontmatter rules that decide whether a shared skill loads at all.
