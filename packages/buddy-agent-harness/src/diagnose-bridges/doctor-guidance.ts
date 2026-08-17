/**
 * The one place `doctor`'s guidance is written. The command reads `detail` and `repair` to fill its
 * `findings` and `help` sections; `skills/doctor/SKILL.md` is generated from the same table by
 * `scripts/generate-doctor-skill.ts`, so the shipped skill cannot drift from what the command says.
 */

/** Every way a bridge can fail, in the order `doctor` reports them. */
export type BridgeProblem =
	| 'no-canonical'
	| 'missing'
	| 'degraded'
	| 'stale'
	| 'diverged-bridge'
	| 'diverged-canonical'
	| 'diverged-both'
	| 'diverged-unknown'
	| 'unpinned-copy'

export type Repair = {
	problem: BridgeProblem
	/** What `doctor` prints in the `findings` row for this problem. */
	detail: string
	/**
	 * The command that fixes it, for `doctor`'s own output. `path` is the repository-relative bridge
	 * path; `cli` is how to invoke this tool.
	 */
	repair(path: string, cli: string): string
	/**
	 * What the shipped skill tells an agent to do instead. A repair that rebuilds a bridge delegates
	 * to the `init` skill rather than calling the `init` command, because rebuilding can move
	 * user-authored skills and that judgment is the `init` skill's, not `doctor`'s.
	 */
	skillRepair(path: string): string
}

/** How the command names itself. A skill may run without the binary on PATH, so it uses `npx`. */
export const commandInvocation = 'buddy-agent-harness'
export const skillInvocation = 'npx -y buddy-agent-harness'
/** How the skill hands a repair back to `init`. */
export const initSkillInvocation = '/buddy-agent-harness:init'

export const doctorRepairs: readonly Repair[] = [
	{
		problem: 'no-canonical',
		detail: 'the canonical skill directory does not exist, so no bridge can resolve',
		repair: (_path, cli) => `${cli} init`,
		skillRepair: () => `run \`${initSkillInvocation}\`, which creates \`.agents/skills\` and the bridges`,
	},
	{
		problem: 'missing',
		detail: 'no bridge at this path — the harness sees zero project skills',
		repair: (_path, cli) => `${cli} init`,
		skillRepair: () => `run \`${initSkillInvocation}\``,
	},
	{
		problem: 'degraded',
		detail: 'expected a directory but found a regular file — checkout without core.symlinks',
		repair: (_path, cli) => `${cli} init --copy --force`,
		skillRepair: () => `run \`${initSkillInvocation} --copy --force\``,
	},
	{
		problem: 'stale',
		detail: 'symlink does not resolve to .agents/skills',
		repair: (_path, cli) => `${cli} init --force`,
		skillRepair: () => `run \`${initSkillInvocation} --force\``,
	},
	{
		problem: 'diverged-bridge',
		detail: 'only the bridge changed since the two last agreed — an agent wrote through the copy',
		repair: (path, cli) =>
			`replace .agents/skills with ${path} to keep the newer edit and then run ${cli} init --force`,
		skillRepair: (path) =>
			`replace .agents/skills with ${path} to keep the newer edit, then run \`${initSkillInvocation} --force\``,
	},
	{
		problem: 'diverged-canonical',
		detail: 'only .agents/skills changed since the two last agreed — the copy is stale',
		repair: (_path, cli) => `${cli} init --copy --force`,
		skillRepair: () => `run \`${initSkillInvocation} --copy --force\``,
	},
	{
		problem: 'diverged-both',
		detail: 'both sides changed since they last agreed — rebuilding would discard one of them',
		repair: (path) => `git diff --no-index .agents/skills ${path} and reconcile by hand`,
		skillRepair: (path) => `run \`git diff --no-index .agents/skills ${path}\` and reconcile by hand`,
	},
	{
		problem: 'diverged-unknown',
		detail: 'contents differ and no commit where they agreed was found — which side moved is unknown',
		repair: (path) => `git diff --no-index .agents/skills ${path} and reconcile by hand`,
		skillRepair: (path) => `run \`git diff --no-index .agents/skills ${path}\` and reconcile by hand`,
	},
	{
		problem: 'unpinned-copy',
		detail: 'tracked copy without the skip-worktree bit — the tree is dirty with content that must not be committed',
		// The index entry is the tracked symlink on a Windows checkout but the individual files in a
		// committed copy, so the paths are read back from git rather than assumed.
		repair: (path) => `git ls-files -z ${path} | xargs -0 git update-index --skip-worktree`,
		skillRepair: (path) => `run \`git ls-files -z ${path} | xargs -0 git update-index --skip-worktree\``,
	},
]

const repairsByProblem = new Map(doctorRepairs.map((entry) => [entry.problem, entry]))

export function repairFor(problem: BridgeProblem): Repair {
	return repairsByProblem.get(problem) as Repair
}

export const doctorSkill = {
	name: 'doctor',
	description:
		'Use this skill when a repository loads no project skills, when skills are missing after a clone, or when checking whether the agent configuration bridges into .claude/skills and the other harness directories still resolve.',
} as const

/** Written into the generated skill so a reader knows not to edit it in place. */
export const generatedSkillWarning =
	'<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-doctor-skill.ts. Do not edit by hand. -->'

/** The shipped `doctor` skill, rendered from the same table the command prints. */
export function renderDoctorSkill(): string {
	// A repair may itself contain a pipe, which would otherwise end the table cell early.
	const cell = (value: string) => value.replaceAll('|', '\\|')
	const rows = doctorRepairs
		.map((entry) => `| \`${entry.problem}\` | ${entry.detail} | ${cell(entry.skillRepair('<path>'))} |`)
		.join('\n')

	return `---
name: ${doctorSkill.name}
description: ${doctorSkill.description}
---

${generatedSkillWarning}

# Harness Doctor

\`.agents/skills\` is the canonical skill directory. Harnesses that cannot read it — Claude Code and Gemini CLI — get a bridge pointing at it, normally a directory symlink. A bridge that stops resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere.

Diagnose it:

\`\`\`sh
${skillInvocation} doctor
\`\`\`

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

\`bridges\` lists every bridge \`init\` would create for this repository, each with a \`status\` of \`ok\`, \`missing\`, \`degraded\`, \`stale\`, or \`diverged\`. \`findings\` explains each problem and \`help\` names its repair. Apply the repair from the table below, then re-run \`doctor\`.

\`help\` names the \`init\` command for a person at a shell. Do not run it yourself. Rebuilding a bridge can move skills a user wrote, and that judgment belongs to the \`init\` skill — hand the repair to \`${initSkillInvocation}\` instead.

When every bridge resolves, \`findings\` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add \`--format text\` when you need to show the same report to a person, or \`--format json\`.

## Findings and their repairs

| Finding | What it means | Repair |
| --- | --- | --- |
${rows}

Substitute the reported bridge path for \`<path>\`.

## The Windows case

The common failure is \`degraded\`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with \`core.symlinks\`, which its installer leaves off. With \`core.symlinks=false\` git does not error — it writes the symlink out as a regular file whose contents are the target path. \`${initSkillInvocation} --copy --force\` rebuilds the bridges as real directories on that machine.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into \`.agents/skills\`. That is what the \`diverged\` findings catch.

## Rules

- Never repair a \`diverged-both\` or \`diverged-unknown\` bridge by re-running \`init\`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at \`.agents/skills/<name>/SKILL.md\`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to \`.gitignore\`. An untracked bridge swallows a real edit silently.
`
}
