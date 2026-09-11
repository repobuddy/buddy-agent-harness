---
"buddy-agent-harness": patch
---

Bundle the CLI's dependencies into `dist/cli.mjs`, so the shipped skill launchers actually work.

The `skills/*/scripts/*.mjs` launchers already preferred the shipped CLI over `npx`, but an installed
plugin directory is a copy of a source checkout rather than an npm install, so its `node_modules` is
absent or incomplete — running a launcher from one failed with
`Cannot find package 'type-plus' imported from .../clibuilder/esm/builder.js`. The published
`dist/cli.mjs` now inlines every runtime dependency and runs with no `node_modules` present at all.

Bundling also required pointing `jsonc-parser` (reached through clibuilder) at its ESM build. Its
`main` is a UMD bundle whose factory calls `require("./impl/format")` and three siblings — specifiers
a bundler cannot analyse, so those modules were silently left out and the CLI threw
`Cannot find module './impl/format'` at startup.

The library entry (`.`) is unchanged. Its dependencies stay external on purpose: it exports
`activate` / `*Command` for a host CLI to compose, and host and plugin must share one `clibuilder`
instance rather than each holding a private copy.
