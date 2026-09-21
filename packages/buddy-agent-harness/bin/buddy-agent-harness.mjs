#!/usr/bin/env node
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
// `dist/cli.mjs`, and each shipped skill's own bundle, are built by `pnpm build` (see
// `tsdown.config.ts`) and are not committed.
const { run } = await import(pathToFileURL(join(dir, '..', 'dist', 'cli.mjs')).href)

// The process boundary — the only place that reads `process.argv` or writes `process.exitCode`.
// Applied only when non-zero: clibuilder already sets it itself on an unknown option/command.
const code = await run(process.argv)
if (code !== 0) process.exitCode = code
