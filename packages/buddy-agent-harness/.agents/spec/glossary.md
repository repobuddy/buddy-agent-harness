# Glossary

- **canonical configuration** — the repository-local `.agents/` tree and root `AGENTS.md`, which hold portable instructions, capabilities, and separately named tool settings.
- **canonical skills directory** — `.agents/skills/`, the capabilities portion of the canonical configuration.
- **canonical instructions** — `AGENTS.md` and `.agents/AGENTS.md`, which hold repository and shared behavioral guidance without being rewritten by the initializer.
- **harness** — a coding-agent runtime with its own skill discovery location.
- **active harness** — the coding-agent runtime in which initialization is invoked.
- **enabled harness** — the active harness plus any additional harnesses the user explicitly chose to install.
