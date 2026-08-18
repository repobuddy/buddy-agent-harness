/**
 * The one place `doctor`'s guidance is written. The command reads `detail` and `repair` to fill its
 * `findings` and `help` sections; `skills/doctor/SKILL.md` is generated from the same table by
 * `scripts/generate-skills.ts`, so the shipped skill cannot drift from what the command says.
 */

/** Every way a skills bridge can fail, in the order `doctor` reports them. */
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

/**
 * Every way an instruction bridge can fail. Separate from `BridgeProblem` because the two share no
 * repair: a skills bridge is rebuilt with `init` flags, and an instruction bridge is a file whose
 * content is the user's, so every repair here goes back to the `init` skill.
 */
/**
 * Configuration that is present and **wrong**, as against a bridge that does not resolve. These are
 * the faults the `repair` skill owns: none is expressible as an `init` flag, because `init`
 * consolidates and creates but never corrects a file the user already wrote.
 */
export type ConfigurationFault = 'deprecated-harness' | 'ignored-bridge' | 'unread-local-override' | 'unloadable-skill'

export type InstructionProblem =
	| 'no-instructions'
	| 'instructions-missing'
	| 'instructions-unbridged'
	| 'instructions-unreadable'

/** Everything `doctor` can report against, across all three sections. */
export type DoctorProblem = BridgeProblem | InstructionProblem | ConfigurationFault

/** Alias kept for callers that name the whole set rather than one section. */
export type ConfigurationProblem = DoctorProblem

export type Repair = {
	problem: DoctorProblem
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

/** How the command names itself. */
export const commandInvocation = 'buddy-agent-harness'
/**
 * How a skill invokes the command. A skill may run without the binary on PATH, so it goes through
 * `npx`, pinned to the caret range of the version that generated the skill.
 *
 * The pin is what makes the shipped guidance honest. A skill states the findings and flags of the
 * version it was generated from, so an unpinned `npx` — which resolves whatever is latest — can
 * hand an agent a table that does not describe the CLI it just ran. The caret keeps patches
 * flowing and stops at the next breaking line.
 */
export const skillInvocation = (version: string) => `npx -y ${commandInvocation}@^${version}`

/**
 * The launcher a skill ships, named for the subcommand it runs so a stack trace or a process list
 * says which one it was. One script per command, beside the `SKILL.md` that documents it.
 */
export const launcherFor = (subcommand: string) => `scripts/${subcommand}.mjs`

/**
 * How a skill names its launcher: the path as the skill sees it, resolved by the agent against the
 * directory it read the `SKILL.md` from.
 *
 * `node` stays in front. The launcher ships without an executable bit, and its shebang does nothing
 * on Windows, so naming the file alone would not run it.
 */
export const launcherInvocation = (subcommand: string) => `node ${launcherFor(subcommand)}`

/**
 * The launcher written into a skill's `scripts/` directory. It resolves the CLI from its own
 * location rather than the working directory, so the skill runs the copy it shipped with and
 * fetches nothing. The repository it inspects is still the working directory, unchanged.
 */
export function renderSkillLauncher(subcommand: string): string {
	return `#!/usr/bin/env node
// Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// <package>/skills/<skill>/scripts/${subcommand}.mjs: four levels up is the package root.
const packageRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))

process.argv.splice(2, 0, '${subcommand}')
await import(join(packageRoot, 'bin', '${commandInvocation}.mjs'))
`
}

/**
 * How the skill hands a repair to `repair`. Bridge and instruction repairs go to `init`, which
 * writes both kinds of bridge in the first place; configuration that is present and wrong goes
 * here, because no `init` flag corrects a file the user already wrote.
 */
export const repairSkillInvocation = '/buddy-agent-harness:repair'

/** How the skill hands a repair back to `init`. */
export const initSkillInvocation = '/buddy-agent-harness:init'

/** The skills bridges, reported in `bridges`. */
export const bridgeRepairs: readonly Repair[] = [
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

/**
 * The instruction bridges, reported in `instructions`. Every repair is the `init` skill: these are
 * files a person wrote, or files carrying content beside the bridge, and deciding what to preserve
 * while restoring the bridge is judgment no flag carries. `repair` therefore names the skill in
 * both places rather than pretending a shell command exists.
 */
export const instructionRepairs: readonly Repair[] = [
	{
		problem: 'no-instructions',
		detail: 'no AGENTS.md at the repository root, so every instruction bridge points at nothing',
		repair: () => initSkillInvocation,
		skillRepair: () => `run \`${initSkillInvocation}\`, which derives AGENTS.md and the bridges to it`,
	},
	{
		problem: 'instructions-missing',
		detail: 'no instruction bridge at this path — the harness reads none of AGENTS.md',
		repair: () => initSkillInvocation,
		skillRepair: () => `run \`${initSkillInvocation}\``,
	},
	{
		problem: 'instructions-unbridged',
		detail: 'the file is present but names AGENTS.md nowhere — the harness reads none of it',
		repair: () => initSkillInvocation,
		skillRepair: () =>
			`run \`${initSkillInvocation}\`, which adds the bridge without discarding what the file already says`,
	},
	{
		problem: 'instructions-unreadable',
		detail: 'the settings file does not parse, so the harness reads none of it',
		repair: () => initSkillInvocation,
		skillRepair: () => `fix the JSON by hand, then run \`${initSkillInvocation}\``,
	},
]

/**
 * Configuration that is present and wrong. Detected here like everything else, but repaired by the
 * `repair` skill rather than by `init` — which is why it is a section of its own.
 */
const configurationRepairs: readonly Repair[] = [
	{
		problem: 'deprecated-harness',
		detail:
			'a projection under a harness name that has been superseded — the replacement reads .agents/skills natively and needs no projection at all',
		repair: (path) => `remove ${path} and enable the harness that replaced it`,
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
	{
		problem: 'ignored-bridge',
		detail: 'a .gitignore rule matches this bridge — an untracked bridge swallows a real edit silently',
		repair: (path) => `narrow or remove the .gitignore rule matching ${path}`,
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
	{
		problem: 'unread-local-override',
		detail: 'no harness reads this filename, so everything in it is invisible to every agent',
		repair: (path) => `move ${path} to CLAUDE.local.md, or hand it to init to consolidate`,
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
	{
		problem: 'unloadable-skill',
		detail: 'frontmatter that does not parse, or no description — either one makes a harness skip the skill outright',
		repair: (path) => `quote the description in ${path}, or add one`,
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
]

/** All three sections, in the order `doctor` reports them. */
export const doctorRepairs: readonly Repair[] = [...bridgeRepairs, ...instructionRepairs, ...configurationRepairs]

const repairsByProblem = new Map(doctorRepairs.map((entry) => [entry.problem, entry]))

export function repairFor(problem: DoctorProblem): Repair {
	return repairsByProblem.get(problem) as Repair
}

export const doctorSkill = {
	name: 'doctor',
	description:
		'Use this skill when a repository loads no project skills, when skills are missing after a clone, when a harness appears to be ignoring AGENTS.md, or when checking whether the agent configuration bridges into .claude/skills, CLAUDE.md, and the other harness files still resolve.',
} as const

/** Written into the generated skill so a reader knows not to edit it in place. */
export const generatedSkillWarning =
	'<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->'

/**
 * The shipped `doctor` skill, rendered from the same table the command prints. `version` is the
 * package version the skill ships with; it pins the `npx` invocation so the table and the CLI that
 * produced it stay on the same breaking line.
 */
export function renderDoctorSkill(version: string): string {
	// A repair may itself contain a pipe, which would otherwise end the table cell early.
	const cell = (value: string) => value.replaceAll('|', '\\|')
	const rows = (repairs: readonly Repair[]) =>
		repairs
			.map((entry) => `| \`${entry.problem}\` | ${entry.detail} | ${cell(entry.skillRepair('<path>'))} |`)
			.join('\n')

	return `---
name: ${doctorSkill.name}
description: ${doctorSkill.description}
---

${generatedSkillWarning}

# Harness Doctor

A repository keeps one canonical configuration: \`.agents/skills\` for its skills and \`AGENTS.md\` for its instructions. Harnesses that cannot read those get bridges pointing at them: Claude Code needs both, and Gemini CLI needs the instruction bridge only — it reads \`.agents/skills\` itself. A bridge that stops resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere. An instruction bridge fails the same way and costs more, because the harness then reads none of the repository's instructions at all.

Diagnose it:

\`\`\`sh
${launcherInvocation('doctor')}
\`\`\`

That path is relative to this skill's own directory. The launcher runs the CLI that shipped beside it against the current working directory, so nothing is downloaded. Fall back to \`${skillInvocation(version)} doctor\` when the launcher cannot be resolved or run, which is the case when the plugin was installed from git rather than npm and its dependencies were never installed.

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

\`bridges\` lists every skills bridge \`init\` would create for this repository, each with a \`status\` of \`ok\`, \`missing\`, \`degraded\`, \`stale\`, or \`diverged\`.

\`instructions\` lists every instruction bridge into \`AGENTS.md\`, with a \`status\` of \`ok\`, \`missing\`, \`unbridged\`, or \`unreadable\`. They are a separate section because nothing about them is shared: a different \`kind\`, a different status vocabulary, and a repair that is never a command.

\`findings\` explains each problem from either section and \`help\` names its repair. Apply the repair from the tables below, then re-run \`doctor\`.

Do not run an \`init\` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the \`init\` skill's judgment, so hand the repair to \`${initSkillInvocation}\` instead. A \`help\` line naming that skill has no shell equivalent at all.

When every bridge resolves, \`findings\` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add \`--format text\` when you need to show the same report to a person, or \`--format json\`.

## Skills bridge findings

| Finding | What it means | Repair |
| --- | --- | --- |
${rows(bridgeRepairs)}

Substitute the reported bridge path for \`<path>\`.

## Instruction bridge findings

| Finding | What it means | Repair |
| --- | --- | --- |
${rows(instructionRepairs)}

## Configuration findings and their repairs

The bridges resolve, and the configuration around them is still wrong: a superseded harness name, a git-ignored bridge, a local-override file nothing reads, a skill whose frontmatter makes every harness skip it. None of these is an \`init\` flag — \`init\` consolidates and creates, and will not correct a file the user already wrote. They go to the \`repair\` skill, which offers each correction with its before and after and writes only what is approved.

| Finding | What it means | Repair |
| --- | --- | --- |
${rows(configurationRepairs)}

\`unbridged\` is the one to read carefully. The file is there and looks fine, and it names \`AGENTS.md\` nowhere — a \`CLAUDE.md\` someone overwrote with real content, or a \`.gemini/settings.json\` another tool rewrote without \`AGENTS.md\` in \`context.fileName\`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

An instruction bridge is reported per file, so a monorepo gets one row per \`AGENTS.md\` in the tree. Each nested \`AGENTS.md\` needs its own stub — an import bridges the file beside it and nothing deeper.

## The Windows case

The common failure is \`degraded\`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with \`core.symlinks\`, which its installer leaves off. With \`core.symlinks=false\` git does not error — it writes the symlink out as a regular file whose contents are the target path. \`${initSkillInvocation} --copy --force\` rebuilds the bridges as real directories on that machine.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into \`.agents/skills\`. That is what the \`diverged\` findings catch.

## Rules

- Never repair a \`diverged-both\` or \`diverged-unknown\` bridge by re-running \`init\`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at \`.agents/skills/<name>/SKILL.md\`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to \`.gitignore\`. An untracked bridge swallows a real edit silently.
- Write instructions in \`AGENTS.md\`, never in \`CLAUDE.md\`. A bridge file holds the import and any harness-specific notes; content written there reaches one harness and drifts from the canonical file.
`
}
