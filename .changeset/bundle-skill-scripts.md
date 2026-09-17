---
"buddy-agent-harness": patch
---

Bundle each shipped skill's script per skill folder, so it runs standalone from a copy of that folder alone — the state an installer that copies only the skill folder (`skills add --skill <name>`, a symlinked or partial install) actually leaves it in.

Previously each skill's `scripts/<subcommand>.mjs` walked four directories up from itself to `dist/cli.mjs`, which only resolves when the whole package sits above the skill. Each script is now a self-contained bundle — built from a small `src/skill-scripts/<subcommand>.ts` source, with every runtime dependency inlined — that reaches nothing outside its own file.

The bundle is a build artifact distributed through the npm package's `files`, not committed to git: `pnpm build` produces and copies it, and `prepack` runs it before publish. A skill installed from a git source, or a harness that cannot resolve or run the script path, falls back to the pinned `npx -y buddy-agent-harness@^<version> <subcommand>` invocation each `SKILL.md` documents — unchanged from before.

`pnpm skill:gen:check` no longer compares the bundle (there is nothing committed left to diff); a new `pnpm pack:check` packs the package the way `npm publish` would, unpacks it, and verifies every shipped script is present and one runs standalone with no `node_modules` above it. It runs as part of `pnpm verify`, after `build`.
