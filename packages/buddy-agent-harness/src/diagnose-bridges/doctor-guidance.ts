import type { Harness, HarnessScope } from '../harness-registry/harness-registry.ts'
import { harnessRegistry } from '../harness-registry/harness-registry.ts'
import { type Locator, locatorText } from './locator.ts'

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

/**
 * Every way the golden MCP server set and a harness's copy of it can disagree, plus the two
 * credential findings.
 *
 * A family of its own because nothing it says is shared with the others. A bridge either resolves
 * or does not; two MCP files never share a byte, so every finding here is the result of a semantic
 * comparison, and each one names a **server** and usually a **field** rather than a file.
 */
export type McpProblem =
	| 'mcp-golden-unreadable'
	| 'mcp-target-unreadable'
	| 'mcp-unprojected'
	| 'mcp-undeclared'
	| 'mcp-diverged-target'
	| 'mcp-diverged-golden'
	| 'mcp-diverged-both'
	| 'mcp-diverged-unknown'
	| 'mcp-literal-secret'
	| 'mcp-committed-secret'

export type InstructionProblem =
	| 'no-instructions'
	| 'instructions-missing'
	| 'instructions-unbridged'
	| 'instructions-unreadable'

/** Everything `doctor` can report against, across all three sections. */
export type DoctorProblem = BridgeProblem | InstructionProblem | ConfigurationFault | McpProblem

/** Alias kept for callers that name the whole set rather than one section. */
export type ConfigurationProblem = DoctorProblem

/**
 * What resolves one finding, for `doctor`'s own output. Two fields rather than one string, because
 * the caller `doctor` is written for is an agent parsing TOON, and the question it has to answer is
 * "can I execute this, or is this judgment I hand to a skill?" A single string leaves that
 * answerable only by parsing English.
 *
 * The contract is exact, and it is what makes the field safe to act on blindly:
 *
 * - `command` non-empty — a shell invocation that, run verbatim, **completes** the repair.
 * - `command` empty — no single invocation does; act on `instruction` and do not synthesize one.
 *
 * So a diagnostic worth running is not a `command`. `diverged-both` carries none even though
 * `git diff --no-index …` is perfectly runnable: the diff shows what differs, it does not reconcile
 * anything. That is what stops an agent executing every `command` it is handed from rebuilding a
 * diverged bridge over whichever side holds the newer edit. A skill invocation is not a `command`
 * either — nothing in a shell runs `/buddy-agent-harness:init`.
 */
export type RepairAction = {
	/** A shell invocation that completes the repair, or empty when none does. */
	command: string
	/** The imperative, in prose, always present and complete on its own. */
	instruction: string
}

export type Repair = {
	problem: DoctorProblem
	/** What `doctor` prints in the `findings` row for this problem. */
	detail: string
	/**
	 * What fixes it, for `doctor`'s own output. `at` is where the finding is, in parts — the file
	 * alone for a bridge, the file, server, and field for an MCP finding; `cli` is how to invoke this
	 * tool. A repair that names only part of a locator reads it off `at` rather than splitting the
	 * rendered string, which no separator survives: a server may be named `io.github.foo`.
	 */
	repair(at: Locator, cli: string): RepairAction
	/**
	 * What the shipped skill tells an agent to do instead. A repair that rebuilds a bridge delegates
	 * to the `init` skill rather than calling the `init` command, because rebuilding can move
	 * user-authored skills and that judgment is the `init` skill's, not `doctor`'s.
	 */
	skillRepair(at: Locator): string
}

/**
 * One row of a repair table. The problem is the key it is filed under rather than a field on it, so
 * a table typed `Record<…Problem, RepairRow>` cannot be written with a row missing: adding a
 * variant to one of the unions above fails to compile until its row exists. That is the only place
 * the invariant can be held — a union is not enumerable at runtime, so no test can walk it, and a
 * lookup that asserts its own completeness reads `.detail` off `undefined` the first time it is
 * wrong.
 */
export type RepairRow = Omit<Repair, 'problem'>

/**
 * A table as the list `doctor` reports, in the order it was written. The keys of a
 * `Record<P, RepairRow>` are `P` by construction, which is what the assertion says; nothing here
 * claims a row exists.
 */
function repairsOf<Problem extends DoctorProblem>(table: Record<Problem, RepairRow>): readonly Repair[] {
	return (Object.entries(table) as [Problem, RepairRow][]).map(([problem, row]) => ({ problem, ...row }))
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
import { fileURLToPath, pathToFileURL } from 'node:url'

// <package>/skills/<skill>/scripts/${subcommand}.mjs: four levels up is the package root.
const packageRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))
const { run } = await import(pathToFileURL(join(packageRoot, 'dist', 'cli.mjs')).href)

// The subcommand is composed into a fresh argv rather than spliced into the global one, so nothing
// outside this file observes the rewrite. Applied only when non-zero, so a usage code clibuilder
// recorded itself is not overwritten by the zero \`run\` returns on that path.
const code = await run([...process.argv.slice(0, 2), '${subcommand}', ...process.argv.slice(2)])
if (code !== 0) process.exitCode = code
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

/** Where the user authors the golden MCP server set, named in every MCP repair that points at it. */
const goldenSet = '.agents/buddy-agent-harness/mcp.toml'

/** The skills bridges, reported in `bridges`. */
const bridgeTable: Record<BridgeProblem, RepairRow> = {
	'no-canonical': {
		detail: 'the canonical skill directory does not exist, so no bridge can resolve',
		repair: (_at, cli) => ({
			command: `${cli} init`,
			instruction: `run \`${cli} init\` to create .agents/skills and the bridges into it`,
		}),
		skillRepair: () => `run \`${initSkillInvocation}\`, which creates \`.agents/skills\` and the bridges`,
	},
	missing: {
		detail: 'no bridge at this path — the harness sees zero project skills',
		repair: ({ file }, cli) => ({
			command: `${cli} init`,
			instruction: `run \`${cli} init\` to create the bridge at ${file}`,
		}),
		skillRepair: () => `run \`${initSkillInvocation}\``,
	},
	degraded: {
		detail: 'expected a directory but found a regular file — checkout without core.symlinks',
		repair: ({ file }, cli) => ({
			command: `${cli} init --copy --force ${file}`,
			instruction: `run \`${cli} init --copy --force ${file}\` to rebuild ${file} as a real directory`,
		}),
		skillRepair: ({ file }) => `run \`${initSkillInvocation} --copy --force ${file}\``,
	},
	stale: {
		detail: 'symlink does not resolve to .agents/skills',
		repair: ({ file }, cli) => ({
			command: `${cli} init --force ${file}`,
			instruction: `run \`${cli} init --force ${file}\` to repoint ${file} at .agents/skills`,
		}),
		skillRepair: ({ file }) => `run \`${initSkillInvocation} --force ${file}\``,
	},
	'diverged-bridge': {
		detail: 'only the bridge changed since the two last agreed — an agent wrote through the copy',
		// No command, unlike `diverged-canonical`, and the asymmetry is real: `init` only ever builds a
		// bridge *from* the canonical directory, so no flag promotes the bridge's newer content back
		// into it. Deciding to keep that side is the caller's, and the rebuild is what follows.
		repair: ({ file }, cli) => ({
			command: '',
			instruction: `replace .agents/skills with ${file} to keep the newer edit, then run \`${cli} init --force ${file}\``,
		}),
		skillRepair: ({ file }) =>
			`replace .agents/skills with ${file} to keep the newer edit, then run \`${initSkillInvocation} --force ${file}\``,
	},
	'diverged-canonical': {
		detail: 'only .agents/skills changed since the two last agreed — the copy is stale',
		repair: ({ file }, cli) => ({
			command: `${cli} init --copy --force ${file}`,
			instruction: `run \`${cli} init --copy --force ${file}\` to rebuild ${file} from the newer .agents/skills`,
		}),
		skillRepair: ({ file }) => `run \`${initSkillInvocation} --copy --force ${file}\``,
	},
	'diverged-both': {
		detail: 'both sides changed since they last agreed — rebuilding would discard one of them',
		repair: ({ file }) => ({
			command: '',
			instruction: `reconcile .agents/skills with ${file} by hand — rebuilding would discard one of them; \`git diff --no-index .agents/skills ${file}\` shows what differs`,
		}),
		skillRepair: ({ file }) => `run \`git diff --no-index .agents/skills ${file}\` and reconcile by hand`,
	},
	'diverged-unknown': {
		detail: 'contents differ and no commit where they agreed was found — which side moved is unknown',
		repair: ({ file }) => ({
			command: '',
			instruction: `reconcile .agents/skills with ${file} by hand — which side moved is unknown; \`git diff --no-index .agents/skills ${file}\` shows what differs`,
		}),
		skillRepair: ({ file }) => `run \`git diff --no-index .agents/skills ${file}\` and reconcile by hand`,
	},
	'unpinned-copy': {
		detail: 'tracked copy without the skip-worktree bit — the tree is dirty with content that must not be committed',
		// The index entry is the tracked symlink on a Windows checkout but the individual files in a
		// committed copy, so the paths are read back from git rather than assumed.
		repair: ({ file }) => ({
			command: `git ls-files -z ${file} | xargs -0 git update-index --skip-worktree`,
			instruction: `run \`git ls-files -z ${file} | xargs -0 git update-index --skip-worktree\` to restore the skip-worktree bit`,
		}),
		skillRepair: ({ file }) => `run \`git ls-files -z ${file} | xargs -0 git update-index --skip-worktree\``,
	},
}

export const bridgeRepairs: readonly Repair[] = repairsOf(bridgeTable)

/**
 * The instruction bridges, reported in `instructions`. Every repair is the `init` skill: these are
 * files a person wrote, or files carrying content beside the bridge, and deciding what to preserve
 * while restoring the bridge is judgment no flag carries. `repair` therefore names the skill in
 * both places rather than pretending a shell command exists.
 */
const instructionTable: Record<InstructionProblem, RepairRow> = {
	'no-instructions': {
		detail: 'no AGENTS.md at the repository root, so every instruction bridge points at nothing',
		repair: () => ({
			command: '',
			instruction: `hand this to \`${initSkillInvocation}\`, which derives AGENTS.md and the bridges to it`,
		}),
		skillRepair: () => `run \`${initSkillInvocation}\`, which derives AGENTS.md and the bridges to it`,
	},
	'instructions-missing': {
		detail: 'no instruction bridge at this path — the harness reads none of AGENTS.md',
		repair: ({ file }) => ({
			command: '',
			instruction: `hand ${file} to \`${initSkillInvocation}\`, which writes the bridge into it`,
		}),
		skillRepair: () => `run \`${initSkillInvocation}\``,
	},
	'instructions-unbridged': {
		detail: 'the file is present but names AGENTS.md nowhere — the harness reads none of it',
		repair: ({ file }) => ({
			command: '',
			instruction: `hand ${file} to \`${initSkillInvocation}\`, which adds the bridge without discarding what the file already says`,
		}),
		skillRepair: () =>
			`run \`${initSkillInvocation}\`, which adds the bridge without discarding what the file already says`,
	},
	'instructions-unreadable': {
		detail: 'the settings file does not parse, so the harness reads none of it',
		repair: ({ file }) => ({
			command: '',
			instruction: `fix the JSON in ${file} by hand, then hand it to \`${initSkillInvocation}\``,
		}),
		skillRepair: () => `fix the JSON by hand, then run \`${initSkillInvocation}\``,
	},
}

export const instructionRepairs: readonly Repair[] = repairsOf(instructionTable)

/**
 * Configuration that is present and wrong. Detected here like everything else, but repaired by the
 * `repair` skill rather than by `init` — which is why it is a section of its own.
 */
const configurationTable: Record<ConfigurationFault, RepairRow> = {
	'deprecated-harness': {
		detail:
			'a projection under a harness name that has been superseded — the replacement reads .agents/skills natively and needs no projection at all',
		repair: ({ file }) => ({
			command: '',
			instruction: `remove ${file} and enable the harness that replaced it — \`${repairSkillInvocation}\` offers the correction`,
		}),
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
	'ignored-bridge': {
		detail: 'a .gitignore rule matches this bridge — an untracked bridge swallows a real edit silently',
		repair: ({ file }) => ({
			command: '',
			instruction: `narrow or remove the .gitignore rule matching ${file} — \`${repairSkillInvocation}\` offers the correction`,
		}),
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
	'unread-local-override': {
		detail: 'no harness reads this filename, so everything in it is invisible to every agent',
		repair: ({ file }) => ({
			command: '',
			instruction: `move ${file} to CLAUDE.local.md, or consolidate it into AGENTS.md — \`${repairSkillInvocation}\` offers the correction`,
		}),
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
	'unloadable-skill': {
		detail: 'frontmatter that does not parse, or no description — either one makes a harness skip the skill outright',
		repair: ({ file }) => ({
			command: '',
			instruction: `quote the description in ${file}, or add one — \`${repairSkillInvocation}\` offers the correction`,
		}),
		skillRepair: () => `run \`${repairSkillInvocation}\``,
	},
}

const configurationRepairs: readonly Repair[] = repairsOf(configurationTable)

/**
 * The golden MCP server set against the harness copies of it.
 *
 * Every repair names a **locator** rather than a file — `.cursor/mcp.json#servers.linear.command` —
 * because a file holding twenty servers is not an address. The locator never carries a value: not
 * a whole one, and not a prefix. `doctor` is safe to run from a session-start hook, so a value it
 * echoes lands in agent context on every session and from there into transcripts, and `sk-ab…`
 * leaks into exactly the same place the whole string would.
 */
const mcpTable: Record<McpProblem, RepairRow> = {
	'mcp-golden-unreadable': {
		detail:
			'the golden MCP set does not parse — the locator gives the line and column, and nothing else can be said about it',
		repair: (at) => ({ command: '', instruction: `fix the TOML at ${locatorText(at)}` }),
		skillRepair: (at) =>
			`fix the TOML at ${locatorText(at)} by hand — the reported line and column are all that can be quoted, because the parser's own message repeats the offending line and that line is the one holding the credential`,
	},
	'mcp-target-unreadable': {
		detail:
			'this harness config does not parse, so the harness starts none of its servers and nothing in it can be compared',
		repair: (at) => ({ command: '', instruction: `fix the syntax of ${locatorText(at)}` }),
		skillRepair: (at) => `fix the syntax of ${locatorText(at)} by hand`,
	},
	'mcp-unprojected': {
		detail: 'the golden set declares this server and the harness config does not carry it',
		repair: ({ file, server }) => ({
			command: '',
			instruction: `add the server ${server} to ${file}, or drop it from the golden set`,
		}),
		skillRepair: (at) =>
			`add the server at ${locatorText(at)} to that file from its golden entry, or drop it from the golden set`,
	},
	'mcp-undeclared': {
		detail: 'the harness config carries this server and the golden set does not declare it',
		repair: ({ file, server }) => ({
			command: '',
			instruction: `add the server ${server} to ${goldenSet}, or drop it from ${file}`,
		}),
		skillRepair: (at) =>
			`copy the server at ${locatorText(at)} into ${goldenSet}, refusing any literal credential it carries, or drop it from ${at.file}`,
	},
	'mcp-diverged-target': {
		detail: 'only the harness config changed since the two last agreed — the edit was made through the copy',
		repair: (at) => ({ command: '', instruction: `reconcile the value at ${locatorText(at)} back into ${goldenSet}` }),
		skillRepair: (at) => `reconcile the value at ${locatorText(at)} back into ${goldenSet}, field by field`,
	},
	'mcp-diverged-golden': {
		detail: 'only the golden set changed since the two last agreed — the harness copy is stale',
		repair: (at) => ({ command: '', instruction: `update ${locatorText(at)} from the golden entry` }),
		skillRepair: (at) => `update ${locatorText(at)} from the golden entry`,
	},
	'mcp-diverged-both': {
		detail: 'both sides changed since they last agreed — merging either way would discard the other',
		repair: (at) => ({ command: '', instruction: `reconcile ${locatorText(at)} against ${goldenSet} by hand` }),
		skillRepair: (at) =>
			`reconcile ${locatorText(at)} against ${goldenSet} by hand — never merge a three-way conflict automatically`,
	},
	'mcp-diverged-unknown': {
		detail:
			'the two disagree and no baseline says which side moved — neither history nor a last-projected record covers this server',
		repair: (at) => ({ command: '', instruction: `compare ${locatorText(at)} against ${goldenSet} by hand` }),
		skillRepair: (at) => `compare ${locatorText(at)} against ${goldenSet} by hand`,
	},
	'mcp-literal-secret': {
		detail: 'a credential-bearing field holds a literal rather than a reference to an environment variable',
		repair: (at) => ({
			command: '',
			instruction: `move the value at ${locatorText(at)} into an environment variable and reference it`,
		}),
		skillRepair: (at) =>
			`move the value at ${locatorText(at)} into an environment variable and reference it — read the value from the file, never from this report, and never repeat it back`,
	},
	'mcp-committed-secret': {
		detail:
			'a credential-bearing field holds a literal in a git-tracked file — the credential is committed, and moving it does not un-commit it',
		repair: (at) => ({
			command: '',
			instruction: `rotate the credential behind ${locatorText(at)}, then reference it from an environment variable`,
		}),
		skillRepair: (at) =>
			`rotate the credential behind ${locatorText(at)} at its issuer, then reference it from an environment variable — it is in the repository's history, so moving it is not enough`,
	},
}

const mcpRepairs: readonly Repair[] = repairsOf(mcpTable)

/**
 * All four sections, in the order `doctor` reports them. Annotated over the whole union rather than
 * inferred, so a problem added to any of the four fails here too if its section was left alone.
 */
const doctorTable: Record<DoctorProblem, RepairRow> = {
	...bridgeTable,
	...instructionTable,
	...configurationTable,
	...mcpTable,
}

export const doctorRepairs: readonly Repair[] = repairsOf(doctorTable)

/** The repair for one problem. Total by construction: the table is keyed by the union. */
export function repairFor(problem: DoctorProblem): Repair {
	return { problem, ...doctorTable[problem] }
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
 * A file the generator writes under `skills/doctor/`, path relative to that directory. The skill is
 * split the way `init`'s is: a lean `SKILL.md` an agent always reads, and reference pages it loads
 * only for the family it is acting on. One flat file made every reader of one finding pay for the
 * prose behind all five.
 */
export type GeneratedDoc = { path: string; content: string }

/** A repair table, rendered for the skill's reader. */
function repairTable(repairs: readonly Repair[]): string {
	// A repair may itself contain a pipe, which would otherwise end the table cell early.
	const cell = (value: string) => value.replaceAll('|', '\\|')
	return `| Finding | What it means | Repair |
| --- | --- | --- |
${repairs
	.map((entry) => `| \`${entry.problem}\` | ${entry.detail} | ${cell(entry.skillRepair({ file: '<path>' }))} |`)
	.join('\n')}`
}

/**
 * The shipped `doctor` skill, rendered from the same table the command prints. `version` is the
 * package version the skill ships with; it pins the `npx` invocation so the table and the CLI that
 * produced it stay on the same breaking line.
 *
 * The finding tables are NOT here. They live in the reference pages below, and this file carries
 * only what every reader needs: how to run it, how to read the report, and where to go next.
 */
export function renderDoctorSkill(version: string): string {
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

\`findings\` explains each problem and carries more than the two sections above: the configuration and MCP findings have no section of their own, because they are about files rather than about bridges. \`help\` carries each repair, one row per distinct repair, with two columns:

- \`command\` — a shell invocation that, run exactly as given, **completes** the repair.
- \`instruction\` — the same repair in the imperative, always present and complete on its own.

\`command\` is empty whenever no single invocation does the job, and that emptiness is the signal: act on \`instruction\` and do not assemble a command out of it. A runnable invocation quoted *inside* an \`instruction\` is not the repair either — \`diverged-both\` names \`git diff --no-index\` because the diff shows you what differs, not because running it reconciles anything. Apply the repair, then re-run \`doctor\`.

Nothing in \`help\` is wrapped. An earlier version prefixed every repair with \`Run\`, which read as an instruction to paste prose into a shell.

Do not run an \`init\` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the \`init\` skill's judgment, so hand the repair to \`${initSkillInvocation}\` instead. Every such repair carries an empty \`command\`: a skill invocation has no shell equivalent at all.

When every bridge resolves, \`findings\` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add \`--format text\` when you need to show the same report to a person, or \`--format json\`.

## Where the detail is

Every \`problem\` name routes to exactly one page. Load the page for the finding in front of you and leave the rest unread — the tables are long, and reading four families to act on one is what this split exists to stop.

| Page | Load it for |
| --- | --- |
| \`references/bridges.md\` | any \`bridges\` row that is not \`ok\` |
| \`references/instructions.md\` | any \`instructions\` row that is not \`ok\` |
| \`references/configuration.md\` | a finding about the configuration around the bridges rather than a bridge |
| \`references/mcp.md\` | any finding whose path is an MCP locator — **always** before acting on a credential finding |
| \`references/harnesses/<name>.md\` | the paths and files one named harness uses |

## Rules

- Never repair a \`diverged-both\` or \`diverged-unknown\` bridge by re-running \`init\`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at \`.agents/skills/<name>/SKILL.md\`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to \`.gitignore\`. An untracked bridge swallows a real edit silently.
- Never repeat a value from a file an \`mcp-literal-secret\` or \`mcp-committed-secret\` finding points at. The report withheld it on purpose, and quoting it back puts it in the transcript anyway.
- Write instructions in \`AGENTS.md\`, never in \`CLAUDE.md\`. A bridge file holds the import and any harness-specific notes; content written there reaches one harness and drifts from the canonical file.
`
}

/** How one harness's scope reads, for its generated reference page. */
function scopeRows(scope: HarnessScope): string {
	const bridge = scope.instructionBridge
	const mcp = scope.mcpConfig
	return [
		`| detection directory | \`${scope.detect}\` |`,
		`| skills projection | ${scope.skillsDirectory ? `\`${scope.skillsDirectory}\` — written by \`init\`` : 'none — reads `.agents/skills` natively'} |`,
		`| instruction bridge | ${
			bridge === undefined
				? 'none'
				: bridge.kind === 'import'
					? `\`${bridge.path}\` — an import of \`AGENTS.md\``
					: `\`${bridge.path}\` — \`AGENTS.md\` in the \`${bridge.key}\` entry`
		} |`,
		`| MCP configuration | ${mcp === undefined ? 'none' : `\`${mcp.path}\` — the \`${mcp.key}\` key, ${mcp.format}${mcp.shared ? ', shared with other settings' : ''}`} |`,
	].join('\n')
}

/**
 * One page per harness, generated from the registry rather than written by hand. These are the
 * paths the detectors actually use, so a page written beside them would drift the first time a
 * harness moved a file. Editorial judgment about a harness — what is contested, what not to
 * generate — stays in the `init` skill's own reference pages, which these link to where one exists.
 */
function harnessPage(harness: Harness, hasInitReference: boolean): GeneratedDoc {
	const deprecated =
		harness.deprecated === undefined
			? ''
			: `\n> **Superseded by \`${harness.deprecated}\`.** The legacy paths still work, so a projection here keeps resolving and \`doctor\` reports the name as deprecated rather than broken. New repositories should enable \`${harness.deprecated}\`.\n`

	const user =
		harness.user === undefined
			? '\nNo user-scope paths are primary-sourced for this harness, so `doctor` describes none.\n'
			: `\n## User scope

Described, never written: \`init\` and \`doctor\` both work inside a repository.

| What | Path |
| --- | --- |
${scopeRows(harness.user)}
`

	const editorial = hasInitReference
		? `\n## Judgment about this harness\n\nWhat to generate for it, what to leave alone, and which claims are contested: \`../../../init/references/harnesses/${harness.name}.md\`. That page is hand-written and is the one to read before writing anything for this harness.\n`
		: ''

	return {
		path: `references/harnesses/${harness.name}.md`,
		content: `${generatedSkillWarning}

# ${harness.name}
${deprecated}
## Project scope

Where \`doctor\` looks inside a repository.

| What | Path |
| --- | --- |
${scopeRows(harness.project)}
${user}${editorial}`,
	}
}

/**
 * The reference pages, split by finding family plus one per harness. `initReferences` names the
 * harnesses the `init` skill has a hand-written page for; it is read off the filesystem by the
 * generator rather than written down here, so a page added there is linked without a second edit.
 */
export function renderDoctorReferences(initReferences: ReadonlySet<string>): GeneratedDoc[] {
	return [
		{
			path: 'references/bridges.md',
			content: `${generatedSkillWarning}

# Skills bridge findings

${repairTable(bridgeRepairs)}

Substitute the reported bridge path for \`<path>\`.

## The Windows case

The common failure is \`degraded\`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with \`core.symlinks\`, which its installer leaves off. With \`core.symlinks=false\` git does not error — it writes the symlink out as a regular file whose contents are the target path. \`${initSkillInvocation} --copy --force\` rebuilds every bridge as a real directory on that machine; name one bridge to rebuild only that one.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into \`.agents/skills\`. That is what the \`diverged\` findings catch.
`,
		},
		{
			path: 'references/instructions.md',
			content: `${generatedSkillWarning}

# Instruction bridge findings

${repairTable(instructionRepairs)}

\`unbridged\` is the one to read carefully. The file is there and looks fine, and it names \`AGENTS.md\` nowhere — a \`CLAUDE.md\` someone overwrote with real content, or a \`.gemini/settings.json\` another tool rewrote without \`AGENTS.md\` in \`context.fileName\`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

An instruction bridge is reported per file, so a monorepo gets one row per \`AGENTS.md\` in the tree. Each nested \`AGENTS.md\` needs its own stub — an import bridges the file beside it and nothing deeper.
`,
		},
		{
			path: 'references/configuration.md',
			content: `${generatedSkillWarning}

# Configuration findings

The bridges resolve, and the configuration around them is still wrong: a superseded harness name, a git-ignored bridge, a local-override file nothing reads, a skill whose frontmatter makes every harness skip it. None of these is an \`init\` flag — \`init\` consolidates and creates, and will not correct a file the user already wrote. They go to the \`repair\` skill, which offers each correction with its before and after and writes only what is approved.

${repairTable(configurationRepairs)}
`,
		},
		{
			path: 'references/mcp.md',
			content: `${generatedSkillWarning}

# MCP findings

A repository may keep a **golden MCP server set** at \`${goldenSet}\` — one canonical entry per server, in the superset of fields the supported hosts accept, written by the user. Where it exists, \`doctor\` compares it against each harness's own MCP configuration and reports how the two have drifted. **No golden set means no MCP drift findings at all**, and a harness with no MCP file yet has nothing that could have drifted.

Comparison is semantic. Six config keys across three file formats means no two of these files are ever byte-equal, so each side is parsed into one model and the models are compared. A field the golden set leaves unset is never a difference, however a harness fills it in: a host restating its own default and a user's deliberate edit are indistinguishable there, and treating both as changes is what makes a golden set accumulate noise.

Each finding names a **locator**, not a file: \`.cursor/mcp.json#servers.linear.command\` is the server and field, and that is what you route on.

${repairTable(mcpRepairs)}

## Credentials

The two secret findings are the ones to handle carefully.

- **The report never contains the value.** It gives you the locator and stops. Read the value out of the file named in the locator, and do not repeat it into your reply, into a commit message, or into any other file. There is no truncated preview to work from because a truncated credential is a leaked credential in the same transcript.
- **\`mcp-committed-secret\` is not \`mcp-literal-secret\` with worse wording.** The file is tracked, so the value is in the repository's history and every clone already has it. Moving it into an environment variable fixes the working tree and changes nothing about that. Rotate it at its issuer first.
- **A reference passes.** \`\${LINEAR_TOKEN}\` and \`Bearer \${LINEAR_TOKEN}\` are the documented ways to write these fields and are never reported. The test is that shape, not how random the value looks.
- **An unreadable golden set is reported by position only.** The parser's own message quotes the line it failed on, and in this file that line is the one holding the credential — so neither the message nor the offending line is ever carried into the report. Open the file at the reported line and column.
`,
		},
		...harnessRegistry.map((harness) => harnessPage(harness, initReferences.has(harness.name))),
	]
}
