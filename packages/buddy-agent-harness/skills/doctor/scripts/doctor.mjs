#!/usr/bin/env node
// Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// <package>/skills/<skill>/scripts/doctor.mjs: four levels up is the package root.
const packageRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))

process.argv.splice(2, 0, 'doctor')
await import(join(packageRoot, 'bin', 'buddy-agent-harness.mjs'))
