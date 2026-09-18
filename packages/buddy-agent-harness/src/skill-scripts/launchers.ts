/**
 * Which subcommand each shipped skill's script bundle runs. Keyed by skill rather than assumed
 * equal to it: `repair` runs `doctor` to find what it repairs, and `init` needs both — `init` to
 * write the projections, and `doctor` to list the artifacts only one harness can read.
 *
 * The single list `scripts/generate-skills.ts` copies bundles from, `scripts/pack-check.ts` verifies
 * a packed tarball against, and the tests bind to — so a skill added to one of those without being
 * added here has no home to go stale in.
 */
export const launchers: readonly { skill: string; subcommand: string }[] = [
	{ skill: 'doctor-buddy-agent-harness', subcommand: 'doctor' },
	{ skill: 'init-buddy-agent-harness', subcommand: 'init' },
	{ skill: 'init-buddy-agent-harness', subcommand: 'doctor' },
	{ skill: 'repair', subcommand: 'doctor' },
]
