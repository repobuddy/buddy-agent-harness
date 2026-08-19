#!/usr/bin/env node
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const { run } = await import(pathToFileURL(join(dir, '..', 'dist', 'cli.mjs')).href)

// The process boundary: the only place that reads `process.argv` or writes `process.exitCode`.
// Applied only when non-zero, so a usage code `clibuilder` recorded itself is not overwritten by
// the zero `run` returns on that path.
const code = await run(process.argv)
if (code !== 0) process.exitCode = code
