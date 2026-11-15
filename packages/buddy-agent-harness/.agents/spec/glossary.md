# Glossary

The terms every spec in this tree shares. A spec's Key terms item for one of these links here instead of defining it
again. A term only one spec leans on is defined in that spec.

The user-facing glossary at `apps/web/src/content/docs/reference/glossary.md` is broader and explanatory. It must not
contradict the definitions here.

- <a id="canonical-configuration"></a>**canonical configuration**: the repository-local `.agents/` tree and the root
  `AGENTS.md`, which hold portable instructions, capabilities, and separately named tool settings.
- <a id="canonical-skills-directory"></a>**canonical skills directory**: `.agents/skills/`, the capabilities portion of
  the canonical configuration.
- <a id="canonical-instructions"></a>**canonical instructions**: `AGENTS.md` and `.agents/AGENTS.md`, which hold
  repository and shared behavioral guidance without being rewritten by the initializer.
- <a id="harness"></a>**harness**: a coding-agent runtime with its own skill discovery location.
- <a id="default-harness"></a>**default harness**: a harness that is enabled in every repository without being asked
  for: Claude Code and Cursor.
- <a id="enabled-harness"></a>**enabled harness**: a harness a command acts on in a repository: every default
  harness, every harness the user names, and every harness whose own directory is present in the repository.
- <a id="governance"></a>**governance**: a version-pinned Markdown rule set a skill loads, addressed by a name that is a
  file stem.
- <a id="override-layer"></a>**override layer**: one of the directories a governance can be overridden in: the
  project's `.agents/governances/`, the user's `~/.agents/governances/`, and the machine-wide directory, below which a
  legacy machine-wide directory is still read. The copy a skill ships is not one.
