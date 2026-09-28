import { run } from '../cli.ts'

// Bundled per skill by scripts/generate-skills.ts; see tsdown.config.ts for the build.
//
// Composed into a fresh argv, not spliced into the global one, so nothing outside this file
// observes the rewrite.
process.exitCode = await run([...process.argv.slice(0, 2), 'doctor', ...process.argv.slice(2)])
