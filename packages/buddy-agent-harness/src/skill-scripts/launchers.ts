/**
 * Keyed by skill, not assumed equal to it — `repair` runs `doctor`, and `init` needs `init`, `doctor`,
 * and `sync`. The one list `scripts/generate-skills.ts`, `scripts/pack-check.ts`, and the tests all bind to.
 */
export const launchers: readonly { skill: string; subcommand: string }[] = [
	{ skill: 'doctor-buddy-agent-harness', subcommand: 'doctor' },
	{ skill: 'enhance', subcommand: 'doctor' },
	{ skill: 'init-buddy-agent-harness', subcommand: 'init' },
	{ skill: 'init-buddy-agent-harness', subcommand: 'doctor' },
	{ skill: 'init-buddy-agent-harness', subcommand: 'sync' },
	{ skill: 'repair', subcommand: 'doctor' },
	{ skill: 'repair', subcommand: 'mcp' },
	{ skill: 'repair', subcommand: 'sync' },
]
