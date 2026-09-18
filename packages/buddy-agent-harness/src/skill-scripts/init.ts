import { run } from '../cli.ts'

// Bundled into skills/init-buddy-agent-harness/scripts/init.mjs by scripts/generate-skills.ts (via
// `pnpm build`). The
// bundle is what ships inside the skill folder — nothing here reaches outside it at runtime.
//
// The subcommand is composed into a fresh argv rather than spliced into the global one, so nothing
// outside this file observes the rewrite. Applied only when non-zero, so a usage code clibuilder
// recorded itself is not overwritten by the zero `run` returns on that path.
const code = await run([...process.argv.slice(0, 2), 'init', ...process.argv.slice(2)])
if (code !== 0) process.exitCode = code
