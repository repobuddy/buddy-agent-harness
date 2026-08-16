# Glossary

These terms are normative for this spec suite: scenarios and code bind to them. Keep this list narrow.

The user-facing glossary at `apps/web/src/content/docs/reference/glossary.md` is broader and explanatory. It must not contradict the definitions here.

- **canonical configuration** — the repository-local `.agents/` tree and root `AGENTS.md`, which hold portable instructions, capabilities, and separately named tool settings.
- **canonical skills directory** — `.agents/skills/`, the capabilities portion of the canonical configuration.
- **canonical instructions** — `AGENTS.md` and `.agents/AGENTS.md`, which hold repository and shared behavioral guidance without being rewritten by the initializer.
- **harness** — a coding-agent runtime with its own skill discovery location.
- **active harness** — the coding-agent runtime in which initialization is invoked.
- **enabled harness** — the active harness plus any additional harnesses the user explicitly chose to install.
