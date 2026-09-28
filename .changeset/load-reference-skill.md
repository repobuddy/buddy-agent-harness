---
'buddy-agent-harness': minor
---

New `load-reference` skill: the one way a skill loads a reference. A calling skill writes one line, such as "Load `skill-design` and `agent-tool-output` with the `load-reference` skill in the `buddy-agent-harness` plugin." The skill runs `reference show` for every name at once, from a launcher bundled in its own folder, with no `npx` and no network access. When a name is missing everywhere, or the launcher is absent because the plugin was installed from git, it reads the calling skill's own copy under `references/` and tells you so.

The skill's `README.md` lists how each harness names it: `/buddy-agent-harness:load-reference` in Claude Code, `/load-reference` in Cursor and GitHub Copilot CLI, `$load-reference` in Codex. The table is generated from `@cyberuni/agent-harness`.

The launchers bundled into the shipped skills no longer break a command that takes several values. Minifying renamed the class the CLI parser uses to recognize them, so `reference show` rejected every name when run from a bundle.
