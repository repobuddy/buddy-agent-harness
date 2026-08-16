# Codex

**Write nothing.** Codex reads `.agents/skills/` and `AGENTS.md` natively, and walks up to the repository root on its own.

- Do not create `.codex/skills` — it is redundant.
- Detection directory is `.codex`. Its presence enables Codex in the config record and changes nothing on disk.
- Apply `frontmatter.md` as normal. Codex requires `name` and `description`, and rejects unquoted colons like every other harness.

## Optional sidecar

Codex alone reads `agents/openai.yaml` inside a skill directory (display name, icons, brand color, `allow_implicit_invocation`, MCP dependencies).

Never add one unprompted. If the user asks for it, restate anything load-bearing in the `SKILL.md` body — no other harness reads the sidecar.
