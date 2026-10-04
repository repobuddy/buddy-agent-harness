import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Harness, HarnessScope } from '../harness-registry/harness-registry.ts'
import { globalInstructions, harnessRegistry } from '../harness-registry/harness-registry.ts'
import type { InstructionBridge } from '../harness-registry/instruction-bridge.ts'
import type { NonstandardKind } from '../harness-registry/nonstandard-artifact.ts'
import { type Locator, locatorText } from './locator.ts'

/**
 * The one place `doctor`'s guidance is written: `skills/doctor-buddy-agent-harness/SKILL.md` is
 * generated from this table, so the shipped skill cannot drift from what the command says.
 */

/** Every way a skills bridge fails to resolve, or resolves and is still unsafe, in the order `doctor` reports them. */
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
 * Configuration that is present and **wrong**; repaired by the `repair` skill, since `init` never
 * corrects a file the user already wrote.
 */
export type ConfigurationFault = 'deprecated-harness' | 'ignored-bridge' | 'unread-local-override' | 'unloadable-skill'

/**
 * Every way the golden MCP server set and a harness's copy of it can disagree, plus the two
 * credential findings.
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

/**
 * Configuration that works, but only for one harness — not wrong, not missing, just narrower reach
 * than the repository intends.
 */
export type NonstandardProblem =
	| 'nonstandard-instructions'
	| 'nonstandard-rule'
	| 'nonstandard-command'
	| 'nonstandard-skill'
	| 'nonstandard-subagent'

/** Every way a harness can end up reading none of `AGENTS.md`. */
export type InstructionProblem =
	| 'no-instructions'
	| 'instructions-missing'
	| 'instructions-unbridged'
	| 'instructions-unreadable'
	| 'instructions-shadowing'
	| 'instructions-superseded'

/** Every way a harness's user-scope instruction file fails to load `~/.agents/AGENTS.md`. */
export type GlobalInstructionProblem =
	| 'global-instructions-missing'
	| 'global-instructions-unbridged'
	| 'global-instructions-overridden'
	| 'global-instructions-emptied'

/** Everything `doctor` can report against, across every section. */
export type DoctorProblem =
	| BridgeProblem
	| InstructionProblem
	| GlobalInstructionProblem
	| ConfigurationFault
	| McpProblem
	| NonstandardProblem

/** Alias kept for callers that name the whole set rather than one section. */
export type ConfigurationProblem = DoctorProblem

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
	 * `at` carries the finding in parts; read fields off it rather than splitting the rendered
	 * locator — no separator survives a server named `io.github.foo`.
	 */
	repair(at: Locator, cli: string): RepairAction
	/**
	 * Delegates bridge rebuilds to the `init-buddy-agent-harness` skill rather than `init`, since
	 * rebuilding can move user-authored skills.
	 */
	skillRepair(at: Locator): string
}

/**
 * One row of a repair table, keyed by problem; a `Record<Problem, RepairRow>` fails to compile
 * until every union variant has a row.
 */
export type RepairRow = Omit<Repair, 'problem'>

/**
 * Turns a table into the list `doctor` reports; the cast is safe because a `Record<P, RepairRow>`'s
 * keys are `P` by construction.
 */
function repairsOf<Problem extends DoctorProblem>(table: Record<Problem, RepairRow>): readonly Repair[] {
	return (Object.entries(table) as [Problem, RepairRow][]).map(([problem, row]) => ({ problem, ...row }))
}

export const commandInvocation = 'buddy-agent-harness'
export const skillInvocation = (version: string) => `npx -y ${commandInvocation}@^${version}`

/** Any `npx` invocation of this CLI, pinned or not, so a stale pin is rewritten rather than doubled. */
export const anyNpxInvocation: RegExp = /npx -y buddy-agent-harness(@[^\s`]+)?/g

/** A hand-written `SKILL.md` whose pinned `npx` fallback the generator rewrites in place. */
export type PinTarget = { path: string; expected: string }

/**
 * Every hand-written `SKILL.md` under `skillsRoot` naming an `npx` invocation of this package,
 * found by scanning `skills/` rather than a maintained list; `doctor`'s own `SKILL.md` is excluded
 * since `renderDoctorSkill` writes it whole.
 */
export function handWrittenPinTargets(skillsRoot: string, version: string): PinTarget[] {
	let skillNames: string[]
	try {
		skillNames = readdirSync(skillsRoot, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
	} catch {
		skillNames = []
	}

	const targets: PinTarget[] = []
	for (const skill of [...skillNames].sort()) {
		if (skill === doctorSkill.name) continue
		let content: string
		try {
			content = readFileSync(join(skillsRoot, skill, 'SKILL.md'), 'utf8')
		} catch {
			continue
		}
		if (!content.includes(`npx -y ${commandInvocation}`)) continue
		targets.push({
			path: join(skillsRoot, skill, 'SKILL.md'),
			expected: content.replaceAll(anyNpxInvocation, skillInvocation(version)),
		})
	}
	return targets
}

/** Named for the subcommand it runs, so a stack trace or process list shows which one it was. */
export const launcherFor = (subcommand: string) => `scripts/${subcommand}.mjs`

/**
 * `node` stays in front: the script ships without an executable bit, and its shebang is a no-op on
 * Windows.
 */
export const launcherInvocation = (subcommand: string) => `node ${launcherFor(subcommand)}`

export const repairSkillInvocation = '/buddy-agent-harness:repair'

/**
 * Qualified rather than bare `init`: a skill name is global to the harness loading it, while the
 * subcommand is scoped to this CLI.
 */
export const initSkillName = 'init-buddy-agent-harness'

export const initSkillInvocation: string = `/buddy-agent-harness:${initSkillName}`

/** Where the user authors the golden MCP server set, named in every MCP repair that points at it. */
const goldenSet = '.agents/buddy-agent-harness/mcp.toml'

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
		// No command: `init` only ever builds a bridge from the canonical directory, so no flag
		// promotes the bridge's content back into it.
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
		// Reads paths back from git rather than assuming them: the tracked entry is a symlink on a
		// Windows checkout, but individual files in a committed copy.
		repair: ({ file }) => ({
			command: `git ls-files -z ${file} | xargs -0 git update-index --skip-worktree`,
			instruction: `run \`git ls-files -z ${file} | xargs -0 git update-index --skip-worktree\` to restore the skip-worktree bit`,
		}),
		skillRepair: ({ file }) => `run \`git ls-files -z ${file} | xargs -0 git update-index --skip-worktree\``,
	},
}

export const bridgeRepairs: readonly Repair[] = repairsOf(bridgeTable)

/**
 * Everything reported in `instructions`: bridges into `AGENTS.md` and the files that suppress it.
 * Every repair is the `init-buddy-agent-harness` skill's judgment, never a shell command.
 */
const instructionTable: Record<InstructionProblem, RepairRow> = {
	'no-instructions': {
		detail: 'no AGENTS.md at the repository root, so the instructions this repository has reach one harness at most',
		repair: () => ({
			command: '',
			instruction: `hand this to \`${initSkillInvocation}\`, which consolidates what the repository has into AGENTS.md, or derives it`,
		}),
		skillRepair: () => `run \`${initSkillInvocation}\`, which consolidates or derives AGENTS.md`,
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
	'instructions-shadowing': {
		detail: 'this file suppresses the AGENTS.md beside it — the harness reads this instead, and none of AGENTS.md',
		repair: ({ file }) => ({
			command: '',
			instruction: `hand ${file} to \`${initSkillInvocation}\`, which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay`,
		}),
		skillRepair: () =>
			`run \`${initSkillInvocation}\`, which consolidates the file into AGENTS.md or imports AGENTS.md from it`,
	},
	'instructions-superseded': {
		detail: 'a bridge from before the harness read AGENTS.md itself — it still works, and nothing needs it',
		repair: ({ file }) => ({
			command: '',
			instruction: `remove ${file}, or keep it for sessions that cannot read AGENTS.md directly — \`${initSkillInvocation}\` offers the choice`,
		}),
		skillRepair: () => `run \`${initSkillInvocation}\`, which offers to remove it`,
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

const globalFile = `~/${globalInstructions}`

/**
 * The step that bridges one harness's user-scope file, in the words it is handed over in; `file` is
 * where it was found, which a variable such as `$CODEX_HOME` may have moved.
 */
export function globalBridgeStep(bridge: InstructionBridge, file = `~/${bridge.path}`): string {
	return bridge.kind === 'import' ? `add the line \`${bridge.line}\` to ${file}` : `run \`ln -s ${globalFile} ${file}\``
}

/** Every spelling of a user-scope path a report can carry: from `~`, and from the variable that moves it. */
function userSpellings(scope: HarnessScope, path: string): string[] {
	const under = `${scope.detect}/`
	return scope.relocatedBy !== undefined && path.startsWith(under)
		? [`~/${path}`, `$${scope.relocatedBy}/${path.slice(under.length)}`]
		: [`~/${path}`]
}

/** The bridge for a reported path; undefined for a path no harness registers, such as a table's `<path>`. */
function userBridgeAt(file: string): InstructionBridge | undefined {
	for (const { user } of harnessRegistry) {
		const bridge = user?.instructionBridge
		if (user && bridge && userSpellings(user, bridge.path).includes(file)) return bridge
	}
	return undefined
}

/** The step for one reported file, or a pointer to where it is written when the path is not one. */
function stepAt(file: string, keepContent: boolean): string {
	const bridge = userBridgeAt(file)
	if (bridge === undefined) return `add the bridge the harness page names for ${file}`
	// A symlink replaces the file, so what it says has to move first or it is lost.
	const keep =
		keepContent && bridge.kind !== 'import' ? `move what ${file} says into ${globalFile} and remove it, then ` : ''
	return `${keep}${globalBridgeStep(bridge, file)}`
}

/** Outside the repository, so never written: a repair is a step handed to the user. */
const handOver = 'hand the user this step, since nothing here writes outside the repository:'

const globalInstructionTable: Record<GlobalInstructionProblem, RepairRow> = {
	'global-instructions-missing': {
		detail: `no user-scope instruction file at this path — the harness loads none of ${globalFile}`,
		repair: ({ file }) => ({ command: '', instruction: `${handOver} ${stepAt(file, false)}` }),
		skillRepair: () => 'hand the user the step the harness page names for that file; write nothing yourself',
	},
	'global-instructions-unbridged': {
		detail: `the file holds its own content and does not load ${globalFile} — text placed there reaches no session of this harness`,
		repair: ({ file }) => ({ command: '', instruction: `${handOver} ${stepAt(file, true)}` }),
		skillRepair: () =>
			'hand the user the step the harness page names for that file, keeping what the file says; write nothing yourself',
	},
	'global-instructions-overridden': {
		detail: `the harness reads this file in place of its own user-scope file, so whatever that file loads goes unread, and this one does not load ${globalFile}`,
		repair: ({ file }) => ({
			command: '',
			instruction: `${handOver} move what ${file} says into ${globalFile} and remove it`,
		}),
		skillRepair: () =>
			'hand the user the move of what that file says into the global file, and its removal; write nothing yourself',
	},
	'global-instructions-emptied': {
		detail:
			'the variable is set but empty, which this harness reads as the directory it starts in rather than as unset — its user-scope file is whichever one sits there, not the one in its own folder',
		repair: ({ file }) => ({
			command: '',
			instruction: `${handOver} unset ${file.slice(1)} where your shell sets it, or set it to the folder you meant`,
		}),
		skillRepair: () => 'hand the user the step of unsetting that variable; write nothing yourself',
	},
}

export const globalInstructionRepairs: readonly Repair[] = repairsOf(globalInstructionTable)

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

export const configurationRepairs: readonly Repair[] = repairsOf(configurationTable)

/**
 * Every repair names a locator rather than a file, and the locator never carries a credential
 * value.
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
			instruction: `add the server ${server} to ${file}, or drop it from the golden set — \`${repairSkillInvocation}\` offers the correction`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to \`${repairSkillInvocation}\`, which projects it from its golden entry with \`mcp project\` — or drop it from the golden set`,
	},
	'mcp-undeclared': {
		detail: 'the harness config carries this server and the golden set does not declare it',
		repair: ({ file, server }) => ({
			command: '',
			instruction: `add the server ${server} to ${goldenSet}, or drop it from ${file} — \`${repairSkillInvocation}\` offers the import`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to \`${repairSkillInvocation}\`, which imports it field by field with \`mcp reconcile\`, refusing any literal credential — or drop it from ${at.file}`,
	},
	'mcp-diverged-target': {
		detail: 'only the harness config changed since the two last agreed — the edit was made through the copy',
		repair: (at) => ({
			command: '',
			instruction: `reconcile the value at ${locatorText(at)} back into ${goldenSet} — \`${repairSkillInvocation}\` offers the import`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to \`${repairSkillInvocation}\`, which imports the field into ${goldenSet} with \`mcp reconcile\` once approved`,
	},
	'mcp-diverged-golden': {
		detail: 'only the golden set changed since the two last agreed — the harness copy is stale',
		repair: (at) => ({
			command: '',
			instruction: `update ${locatorText(at)} from the golden entry — \`${repairSkillInvocation}\` offers the correction`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to \`${repairSkillInvocation}\`, which updates it from the golden entry with \`mcp project\``,
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

export const mcpRepairs: readonly Repair[] = repairsOf(mcpTable)

/**
 * Every repair here is a conversion owned by the `init-buddy-agent-harness` skill, except
 * `nonstandard-subagent`, which names no owner since no cross-harness format exists to convert to.
 */
const nonstandardTable: Record<NonstandardProblem, RepairRow> = {
	'nonstandard-instructions': {
		detail: 'instruction content only one harness reads — AGENTS.md carries the same prose to all of them',
		repair: ({ file }) => ({
			command: '',
			instruction: `consolidate ${file} into AGENTS.md — \`${initSkillInvocation}\` offers the consolidation, and keeps the content reachable where this harness needs it`,
		}),
		skillRepair: ({ file }) => `hand ${file} to \`${initSkillInvocation}\`, which consolidates it into AGENTS.md`,
	},
	'nonstandard-rule': {
		detail: 'a path-scoped rule only one harness reads — a skill reaches every harness where the scoping is incidental',
		repair: ({ file }) => ({
			command: '',
			instruction: `convert ${file} into a skill under .agents/skills where its guidance is not tied to the paths it names — \`${initSkillInvocation}\` offers the conversion; keep it where the path scoping is the point`,
		}),
		skillRepair: ({ file }) =>
			`hand ${file} to \`${initSkillInvocation}\` to convert into a skill, unless the path scoping is load-bearing`,
	},
	'nonstandard-command': {
		detail: 'a harness command file — a skill is the portable form, and this harness reads skills too',
		repair: ({ file }) => ({
			command: '',
			instruction: `move ${file} to .agents/skills/<name>/SKILL.md — \`${initSkillInvocation}\` offers the move`,
		}),
		skillRepair: ({ file }) => `hand ${file} to \`${initSkillInvocation}\`, which moves it to .agents/skills`,
	},
	'nonstandard-skill': {
		detail: 'a skill under a harness directory rather than the canonical one, where only that harness finds it',
		repair: ({ file }) => ({
			command: '',
			instruction: `move ${file} to .agents/skills and project it back where the harness needs one — \`${initSkillInvocation}\` offers the move`,
		}),
		skillRepair: ({ file }) => `hand ${file} to \`${initSkillInvocation}\`, which moves it to .agents/skills`,
	},
	'nonstandard-subagent': {
		detail:
			'a subagent definition with no cross-harness form — nothing outside this harness can read it, and no canonical form exists yet',
		repair: ({ file }) => ({
			command: '',
			instruction: `leave ${file} where it is and record that it reaches one harness only — no portable form exists to convert it to`,
		}),
		skillRepair: ({ file }) =>
			`leave ${file} in place — no portable form exists yet, so this is work for a person rather than a skill`,
	},
}

export const nonstandardRepairs: readonly Repair[] = repairsOf(nonstandardTable)

/**
 * Annotated over the whole union rather than inferred, so an added problem fails to compile until
 * its section carries it.
 */
const doctorTable: Record<DoctorProblem, RepairRow> = {
	...bridgeTable,
	...instructionTable,
	...globalInstructionTable,
	...configurationTable,
	...mcpTable,
	...nonstandardTable,
}

export const doctorRepairs: readonly Repair[] = repairsOf(doctorTable)

/** The repair for one problem. Total by construction: the table is keyed by the union. */
export function repairFor(problem: DoctorProblem): Repair {
	return { problem, ...doctorTable[problem] }
}

export const doctorSkill = {
	name: 'doctor-buddy-agent-harness',
	description:
		'Use this skill when a repository loads no project skills, when skills are missing after a clone, when a harness appears to be ignoring AGENTS.md, or when checking whether the agent configuration bridges into .claude/skills and the other harness files still resolve.',
} as const

/** Written into the generated skill so a reader knows not to edit it in place. */
export const generatedSkillWarning =
	'<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->'

/**
 * A file the generator writes under `skills/doctor-buddy-agent-harness/`, path relative to that
 * directory.
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
 * The shipped `doctor-buddy-agent-harness` skill; the finding tables live in the reference pages
 * below, not here.
 */
export function renderDoctorSkill(version: string): string {
	return `---
name: ${doctorSkill.name}
description: ${doctorSkill.description}
---

${generatedSkillWarning}

# Harness Doctor

A repository keeps one canonical configuration: \`.agents/skills\` for its skills and \`AGENTS.md\` for its instructions. Harnesses that cannot read those get bridges pointing at them: Claude Code needs the skills projection, and Gemini CLI needs the instruction bridge — each reads the other canonical path itself. A bridge that stops resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere.

Instructions fail two ways, both as quiet. A bridge that stops resolving costs more than a skills one, because the harness then reads none of the repository's instructions at all. And a harness that reads \`AGENTS.md\` natively still reads none of it when a file it prefers sits beside it — a \`CLAUDE.md\` next to an \`AGENTS.md\` is read *instead of* it, unless it imports it.

Diagnose it:

\`\`\`sh
${launcherInvocation('doctor')}
\`\`\`

That path is relative to this skill's own directory: \`scripts/doctor.mjs\` is a self-contained bundle built from this package's source and shipped inside the skill folder through the npm package, so it runs against the current working directory with nothing downloaded and no \`node_modules\` needed. Fall back to \`${skillInvocation(version)} doctor\` when \`scripts/doctor.mjs\` is missing or cannot be run — the case for a skill installed from git rather than from the npm package, which does not carry the bundle.

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

\`bridges\` lists every skills bridge \`init\` would create for this repository, each with a \`status\` of \`ok\`, \`missing\`, \`degraded\`, \`stale\`, or \`diverged\`.

\`instructions\` is everything standing between a harness and \`AGENTS.md\`, with a \`status\` of \`ok\`, \`missing\`, \`unbridged\`, \`unreadable\`, \`shadowing\`, or \`superseded\`. The last two are not bridges: they are files that suppress an \`AGENTS.md\` the harness would otherwise read by itself. A separate section because nothing about any of them is shared with \`bridges\`: a different \`kind\`, a different status vocabulary, and a repair that is never a command.

\`globalInstructions\` is the same question one level up: whether each harness installed for this user loads \`${globalFile}\` through its own user-scope file, with a \`status\` of \`ok\`, \`missing\`, \`unbridged\`, or \`overridden\`. No harness reads that file by itself, so text placed there reaches only the harnesses whose row is \`ok\`. The rows are there whether or not the file exists; a finding is raised only when it exists and goes unread.

\`findings\` explains each problem and carries more than the two sections above: the configuration, MCP, and non-standard findings have no section of their own, because they are about files rather than about bridges. \`help\` carries each repair, one row per distinct repair, with two columns:

- \`command\` — a shell invocation that, run exactly as given, **completes** the repair.
- \`instruction\` — the same repair in the imperative, always present and complete on its own.

\`command\` is empty whenever no single invocation does the job, and that emptiness is the signal: act on \`instruction\` and do not assemble a command out of it. A runnable invocation quoted *inside* an \`instruction\` is not the repair either — \`diverged-both\` names \`git diff --no-index\` because the diff shows you what differs, not because running it reconciles anything. Apply the repair, then re-run \`doctor\`.

Nothing in \`help\` is wrapped. An earlier version prefixed every repair with \`Run\`, which read as an instruction to paste prose into a shell.

Do not run an \`init\` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the \`init-buddy-agent-harness\` skill's judgment, so hand the repair to \`${initSkillInvocation}\` instead. Every such repair carries an empty \`command\`: a skill invocation has no shell equivalent at all.

When every bridge resolves, \`findings\` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add \`--format text\` when you need to show the same report to a person, or \`--format json\`.

## Where the detail is

Every \`problem\` name routes to exactly one page. Load the page for the finding in front of you and leave the rest unread — the tables are long, and reading four families to act on one is what this split exists to stop.

| Page | Load it for |
| --- | --- |
| \`references/bridges.md\` | any \`bridges\` row that is not \`ok\` |
| \`references/instructions.md\` | any \`instructions\` row that is not \`ok\` |
| \`references/global-instructions.md\` | any \`globalInstructions\` row that is not \`ok\` |
| \`references/configuration.md\` | a finding about the configuration around the bridges rather than a bridge |
| \`references/mcp.md\` | any finding whose path is an MCP locator — **always** before acting on a credential finding |
| \`references/nonstandard.md\` | a finding about configuration only one harness can read |
| \`references/harnesses/<name>.md\` | the paths and files one named harness uses |

## Rules

- Never repair a \`diverged-both\` or \`diverged-unknown\` bridge by re-running \`init\`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at \`.agents/skills/<name>/SKILL.md\`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to \`.gitignore\`. An untracked bridge swallows a real edit silently.
- Never repeat a value from a file an \`mcp-literal-secret\` or \`mcp-committed-secret\` finding points at. The report withheld it on purpose, and quoting it back puts it in the transcript anyway.
- Never write outside the repository. A \`globalInstructions\` repair is a step for the user to take in their own home directory; hand it over exactly as reported.
- Write instructions in \`AGENTS.md\`, never in \`CLAUDE.md\`. Content written there reaches one harness, drifts from the canonical file, and — because Claude Code prefers it — takes \`AGENTS.md\` out of that harness's context entirely.
`
}

/** Where each kind of harness-exclusive artifact is meant to end up, for the per-harness tables. */
function conversionOf(kind: NonstandardKind): string {
	switch (kind) {
		case 'instructions':
			return '`AGENTS.md`, keeping the content reachable for this harness'
		case 'rule':
			return 'a skill, where the path scoping is incidental'
		case 'command':
			return '`.agents/skills/<name>/SKILL.md`'
		case 'skill':
			return '`.agents/skills`, projected back if needed'
		case 'subagent':
			return 'nothing yet — no cross-harness format exists'
	}
}

/** Every variable that moves a harness's user-scope directory, as prose. */
function relocationList(): string {
	return harnessRegistry
		.flatMap(({ name, user }) =>
			user?.relocatedBy === undefined ? [] : [`\`${user.relocatedBy}\` for \`${name}\` (\`~/${user.detect}\`)`],
		)
		.join(', ')
}

/** The relocating variables whose empty value the harness reads as the directory it starts in, or as unset. */
function emptyRelocationList(asStart: boolean): string {
	return new Intl.ListFormat('en').format(
		harnessRegistry.flatMap(({ user }) =>
			user?.relocatedBy === undefined || (user.emptyRelocatesToStart === true) !== asStart
				? []
				: [`\`${user.relocatedBy}\``],
		),
	)
}

/** One row per harness with a user-scope file that can load the global one. */
function globalBridgeRows(): string {
	return harnessRegistry
		.flatMap((harness) => {
			const bridge = harness.user?.instructionBridge
			return bridge === undefined
				? []
				: [`| \`${harness.name}\` | \`~/${bridge.path}\` | ${globalBridgeStep(bridge)} |`]
		})
		.join('\n')
}

/** One instruction bridge, as its harness page states it. */
function bridgeCell(bridge: InstructionBridge): string {
	switch (bridge.kind) {
		case 'settings-entry':
			return `\`${bridge.path}\` — \`AGENTS.md\` in the \`${bridge.key}\` entry`
		case 'import':
			return `\`${bridge.path}\` — the line \`${bridge.line}\`, which loads \`${globalFile}\``
		case 'symlink':
			return `\`${bridge.path}\` — a symlink to \`${globalFile}\`, since no import this file supports reaches it`
	}
}

/** How one harness's scope reads, for its generated reference page. */
function scopeRows(scope: HarnessScope): string {
	const bridge = scope.instructionBridge
	const mcp = scope.mcpConfig
	return [
		`| detection directory | \`${scope.detect}\` |`,
		`| skills projection | ${scope.skillsDirectory ? `\`${scope.skillsDirectory}\` — written by \`init\`` : 'none — reads `.agents/skills` natively'} |`,
		`| instruction bridge | ${bridge === undefined ? 'none' : bridgeCell(bridge)} |`,
		...(scope.relocatedBy
			? [
					`| moved by | \`${scope.relocatedBy}\` — set and non-empty, it replaces \`${scope.detect}\`, and every path under it moves with it; set but empty, ${scope.emptyRelocatesToStart ? `it is read as the directory the harness starts in, so \`${scope.detect}\` is that directory` : 'it is read as unset'} |`,
				]
			: []),
		...(scope.shadowedBy
			? [
					`| suppresses \`AGENTS.md\` | ${scope.shadowedBy
						.map((path) => `\`${path}\``)
						.join(
							', ',
						)} — this harness reads \`AGENTS.md\` itself, and reads one of these instead where it finds one |`,
				]
			: []),
		`| MCP configuration | ${mcp === undefined ? 'none' : `\`${mcp.path}\` — the \`${mcp.key}\` key, ${mcp.format}${mcp.shared ? ', shared with other settings' : ''}`} |`,
	].join('\n')
}

/**
 * Generated from the registry rather than written by hand, so a page can't drift from the paths the
 * detectors actually use.
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

Described, never written: \`init\` works inside a repository, and \`doctor\` reads only the instruction bridge here, to report whether it loads \`${globalFile}\`.

| What | Path |
| --- | --- |
${scopeRows(harness.user)}
`

	const artifacts = harness.project.nonstandard ?? []
	const nonstandard =
		artifacts.length === 0
			? ''
			: `\n## Configuration only this harness reads

Reported by \`doctor\` so it can be converted; see \`../nonstandard.md\` for what each conversion is.

| Path | Kind | Converts to |
| --- | --- | --- |
${artifacts
	.map(
		(artifact) =>
			`| \`${artifact.path}${artifact.shape === 'directory' ? '/' : ''}\` | ${artifact.kind} | ${conversionOf(artifact.kind)} |`,
	)
	.join('\n')}
`

	const editorial = hasInitReference
		? `\n## Judgment about this harness\n\nWhat to generate for it, what to leave alone, and which claims are contested: \`../../../${initSkillName}/references/harnesses/${harness.name}.md\`. That page is hand-written and is the one to read before writing anything for this harness.\n`
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
${user}${nonstandard}${editorial}`,
	}
}

/**
 * `initReferences` is read off the filesystem rather than maintained here, so a hand-written
 * harness page is linked without a second edit.
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

# Instruction findings

Two shapes, one section. A **bridge** is what a harness needs before it can read \`AGENTS.md\` at all — Gemini CLI is the only one left that needs one. A **shadow** is the reverse: a file sitting beside an \`AGENTS.md\` that a harness reading it natively prefers, so the canonical file is never read. Claude Code is the case, and the files are \`CLAUDE.md\`, \`.claude/CLAUDE.md\`, and \`CLAUDE.local.md\`.

${repairTable(instructionRepairs)}

\`unbridged\` is the one to read carefully. The file is there and looks fine, and it names \`AGENTS.md\` nowhere — a \`.gemini/settings.json\` another tool rewrote without \`AGENTS.md\` in \`context.fileName\`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

\`shadowing\` is the same failure from the other direction, and the most expensive finding in this section: nothing is missing, nothing looks wrong, and the harness is reading a file the rest of the repository does not maintain. Consolidate what the file says into \`AGENTS.md\`, or — where the file has to stay, as a gitignored \`CLAUDE.local.md\` does — put an \`@AGENTS.md\` import in it so both load.

\`superseded\` is not a fault. It is the bridge this tool used to write, still working and no longer needed, and there is one reason to keep it: sessions that cannot read \`AGENTS.md\` directly — a Claude Code before v2.1.277, a third-party provider such as Amazon Bedrock, telemetry disabled, or hooks disabled. Offer the removal; do not make it.

Shadows are reported per directory holding an \`AGENTS.md\`, so a monorepo gets one row per suppressed file rather than one per repository. A \`CLAUDE.md\` in one subtree says nothing about another.
`,
		},
		{
			path: 'references/global-instructions.md',
			content: `${generatedSkillWarning}

# Global instruction findings

\`${globalFile}\` is the user-scope counterpart of the root \`AGENTS.md\`: instructions that hold in every repository one person opens. No harness reads it by itself. Each reads a user-scope file of its own, and that file has to load the global one — by an import where the harness supports one that reaches the home directory, and otherwise by being a symlink to it.

| Harness | User-scope file | What loads \`${globalFile}\` |
| --- | --- | --- |
${globalBridgeRows()}

Cursor keeps its user rules in a settings panel rather than a file, so there is nothing on disk to check; Devin Desktop documents no user-scope path. Neither gets a row.

A harness's directory can be moved by a variable: ${relocationList()}. Where one is set and non-empty, the row and the step name the file under it, written from the variable — \`$CODEX_HOME/AGENTS.md\` — so the step works in the shell the user ran \`doctor\` from. Set but empty, it is read the way the harness reads it: as unset for ${emptyRelocationList(false)}, and as the directory the harness starts in for ${emptyRelocationList(true)}.

${repairTable(globalInstructionRepairs)}

**Hand the step over; never take it.** The file is in the user's home directory, outside the repository this tool works in, so every repair carries an empty \`command\` and names the step for the user to take themselves.

\`unbridged\` is the one to read carefully. The file is there and holds instructions of its own, so the harness loads something — just not the global file. Where the bridge is a symlink, the file it replaces holds content that has to move into \`${globalFile}\` first, or it is lost.

\`overridden\` is the quietest. The user-scope file may be bridged perfectly and still go unread, because the harness reads another file in its place: Codex reads \`AGENTS.override.md\` before \`AGENTS.md\`, and uses whichever first holds more than whitespace. The finding names that file. Its content moves into \`${globalFile}\` before it is removed; where the user-scope file has a problem of its own, that finding is reported beside it, so both steps are handed over at once.

\`global-instructions-emptied\` blames the variable, not a file. A harness that reads an empty variable as the directory it starts in reads its user-scope file from there — in a repository, the project's own file — so the row names that path, relative, from the directory \`doctor\` ran in. The finding names the variable, and the step is to unset it or set it to the folder meant: editing the file the row names would bridge one directory only, and the project's file rather than the user's.

A row is reported for every harness installed for this user, whether or not \`${globalFile}\` exists, so a skill handing text over for that file can say which harnesses will load it. A finding is raised only where the file exists and a harness is not loading it.
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

Comparison is semantic. Six config keys across three file formats means no two of these files are ever byte-equal, so each side is parsed into one model and the models are compared. Each harness file is read in that harness's own spelling, and only over the fields it has a place for: a golden \`description\` Cursor cannot hold is not drift. A field the golden set leaves unset is never a difference, however a harness fills it in: a host restating its own default and a user's deliberate edit are indistinguishable there, and treating both as changes is what makes a golden set accumulate noise.

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
		{
			path: 'references/nonstandard.md',
			content: `${generatedSkillWarning}

# Non-standard configuration

Configuration only one harness can read. Nothing here is broken — a Cursor rule does exactly what it says — which is why none of it is in the other four families. What these findings report is **reach**: guidance that lands in one tool and nowhere else, where nobody finds out except by noticing an agent behave differently somewhere else.

Each finding names the canonical form it converts to. The direction is always the same: move the content to a canonical source, and let the harness file be **generated** from it rather than authored beside it. A repository with none of these is the target; it is a direction to walk, not a gate to pass.

${repairTable(nonstandardRepairs)}

## Two of them need judgment, not a move

**A path-scoped rule may have nowhere to go.** \`AGENTS.md\` scopes by directory nesting and a skill is loaded on relevance, so neither reproduces "these globs and no others". Where the scoping is incidental — a rule that happens to name paths but says something generally true — a skill carries it everywhere. Where the scoping is the point, leave it, and the finding stays as the record of why.

**A subagent has no portable form at all.** No cross-harness format exists, so the finding is the gap rather than a repair. It names no skill, and it is work for a person if it is work at all.

## What is not reported

A harness directory that is a **symlink** is a projection someone already made, not configuration authored here. An artifact is reported whether or not its harness is enabled: a \`.cursorrules\` in a repository nobody opens in Cursor is still instruction content \`AGENTS.md\` does not carry, and filtering by the enabled set would hide exactly the drift worth converting.

Hooks, LSP settings, and output styles are not covered yet. Their event names and shapes differ by harness with no safe projection, and half-reporting them would be worse than the silence.
`,
		},
		...harnessRegistry.map((harness) => harnessPage(harness, initReferences.has(harness.name))),
	]
}
