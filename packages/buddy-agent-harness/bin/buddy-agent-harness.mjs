#!/usr/bin/env node
// `dist/cli.mjs`, and each shipped skill's own bundle, are built by `pnpm build` (see
// `tsdown.config.ts`) and are not committed. Keep the specifier a literal: a skill's forwarder
// checks that the files it names exist before it runs this checkout instead of the published CLI.
const { run } = await import('../dist/cli.mjs')

// The process boundary — the only place that reads `process.argv` or writes `process.exitCode`.
process.exitCode = await run(process.argv)
