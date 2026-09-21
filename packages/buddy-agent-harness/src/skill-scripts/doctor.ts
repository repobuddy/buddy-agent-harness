import { run } from '../cli.ts'

// Bundled per skill by scripts/generate-skills.ts; see tsdown.config.ts for the build.
//
// Composed into a fresh argv, not spliced into the global one, so nothing outside this file
// observes the rewrite. Applied only when non-zero, since clibuilder already writes
// `process.exitCode` itself on an unknown option/command and returns 0 there.
const code = await run([...process.argv.slice(0, 2), 'doctor', ...process.argv.slice(2)])
if (code !== 0) process.exitCode = code
