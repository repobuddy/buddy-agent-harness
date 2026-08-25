#!/usr/bin/env node
// Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand.
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// <package>/skills/<skill>/scripts/doctor.mjs: four levels up is the package root.
const packageRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))
const { run } = await import(pathToFileURL(join(packageRoot, 'dist', 'cli.mjs')).href)

// The subcommand is composed into a fresh argv rather than spliced into the global one, so nothing
// outside this file observes the rewrite. Applied only when non-zero, so a usage code clibuilder
// recorded itself is not overwritten by the zero `run` returns on that path.
const code = await run([...process.argv.slice(0, 2), 'doctor', ...process.argv.slice(2)])
if (code !== 0) process.exitCode = code
