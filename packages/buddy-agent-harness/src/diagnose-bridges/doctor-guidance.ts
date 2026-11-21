import type { Harness, HarnessName, HarnessScope } from '../harness-registry/harness-registry.ts'
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
 * Configuration that is present and **wrong**; repaired by the `repair-buddy-agent-harness` skill, since `init` never
 * corrects a file the user already wrote.
 */
export type ConfigurationFault = 'deprecated-harness' | 'ignored-bridge' | 'unread-local-override' | 'unloadable-skill'

/**
 * Why a harness will not load a skill. Both share the `unloadable-skill` name, and each has its own
 * repair: frontmatter that does not parse is corrected, while a missing description is the skill
 * author's to write.
 */
export type UnloadableSkillCause = 'unparsable-frontmatter' | 'missing-description'

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
	| 'global-instructions-no-file'

/**
 * Where Claude Code's agent worktrees land and what breaks them; each repair is an offer the
 * `init-buddy-agent-harness` skill makes and writes only on approval.
 */
export type WorktreeProblem =
	| 'worktrees-in-repository'
	| 'worktrees-untracked'
	| 'worktrees-self-ignored'
	| 'worktree-base-unset'

/** Everything `doctor` can report against, across every section. */
export type DoctorProblem =
	| BridgeProblem
	| InstructionProblem
	| GlobalInstructionProblem
	| ConfigurationFault
	| McpProblem
	| NonstandardProblem
	| WorktreeProblem

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
	/** Which cause of an `unloadable-skill` fault this repair is for; absent for every other problem. */
	cause?: UnloadableSkillCause
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
/**
 * The forwarder `universal-plugin plugin build` writes into each skill that runs this CLI, named after
 * the bin, as `plugin.json` declares it.
 */
export const forwarderPath: string = `scripts/${commandInvocation}.mjs`

/**
 * `node` stays in front: the forwarder ships without a hashbang or an executable bit. The folder is
 * spelled out because a skill runs from the user's repository, not from its own directory.
 */
export const forwarderInvocation = (args: string): string => `node <this skill's folder>/${forwarderPath} ${args}`

export const repairSkillInvocation = '/buddy-agent-harness:repair-buddy-agent-harness'

/**
 * Qualified rather than bare `init`: a skill name is global to the harness loading it, while the
 * subcommand is scoped to this CLI.
 */
export const initSkillName = 'init-buddy-agent-harness'

export const initSkillInvocation: string = `/buddy-agent-harness:${initSkillName}`

/**
 * A skill reference as the CLI prints it and the generated skill carries it: pnpm links a skill as
 * `pnpm-<package>-<skill>`, where the plugin form resolves to nothing. This is the form
 * `universal-plugin plugin build` writes, so a build over generated text changes nothing.
 */
export const pnpmSkillRef = (invocation: string): string =>
	`\`${invocation}\` (pnpm install: \`pnpm-${commandInvocation}-${invocation.slice(invocation.indexOf(':') + 1)}\`)`

export const enhanceSkillInvocation = '/buddy-agent-harness:enhance-buddy-agent-harness'

export const initSkillRef: string = pnpmSkillRef(initSkillInvocation)
export const enhanceSkillRef: string = pnpmSkillRef(enhanceSkillInvocation)
export const repairSkillRef: string = pnpmSkillRef(repairSkillInvocation)

/** Where the user authors the golden MCP server set, named in every MCP repair that points at it. */
const goldenSet = '.agents/buddy-agent-harness/mcp.toml'

const bridgeTable: Record<BridgeProblem, RepairRow> = {
	'no-canonical': {
		detail: 'the canonical skill directory does not exist, so no bridge can resolve',
		repair: (_at, cli) => ({
			command: `${cli} init`,
			instruction: `run \`${cli} init\` to create .agents/skills and the bridges into it`,
		}),
		skillRepair: () => `run ${initSkillRef}, which creates \`.agents/skills\` and the bridges`,
	},
	missing: {
		detail: 'no bridge at this path — the harness sees zero project skills',
		repair: ({ file }, cli) => ({
			command: `${cli} init`,
			instruction: `run \`${cli} init\` to create the bridge at ${file}`,
		}),
		skillRepair: () => `run ${initSkillRef}`,
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
		repair: ({ file }, cli) => ({
			command: `${cli} sync`,
			instruction: `run \`${cli} sync\` to carry the edits made through ${file} into .agents/skills, file by file`,
		}),
		skillRepair: ({ file }) => `run ${repairSkillRef}, which syncs ${file} with .agents/skills file by file`,
	},
	'diverged-canonical': {
		detail: 'only .agents/skills changed since the two last agreed — the copy is stale',
		repair: ({ file }, cli) => ({
			command: `${cli} sync`,
			instruction: `run \`${cli} sync\` to carry the newer .agents/skills into ${file}, file by file`,
		}),
		skillRepair: ({ file }) => `run ${repairSkillRef}, which syncs ${file} with .agents/skills file by file`,
	},
	// No command for the next two: the sync leaves each file both sides changed until someone picks a
	// side for it, so no single invocation completes the repair.
	'diverged-both': {
		detail: 'both sides changed since they last agreed — rebuilding would discard one of them',
		repair: ({ file }, cli) => ({
			command: '',
			instruction: `run \`${cli} sync\`, which carries every file only one side changed and leaves each file both sides changed; pick a side for each of those after \`git diff --no-index .agents/skills ${file}\` shows what differs, and pass the picks as \`${cli} sync --resolve ${file}/<file>=<canonical|copy>\``,
		}),
		skillRepair: ({ file }) =>
			`run ${repairSkillRef}, which syncs ${file} with .agents/skills and asks which side wins each file both sides changed`,
	},
	'diverged-unknown': {
		detail: 'contents differ and no commit where they agreed was found — which side moved is unknown',
		repair: ({ file }, cli) => ({
			command: '',
			instruction: `run \`${cli} sync\`, which leaves every file that differs, since no commit where the two agreed was found; pick a side for each after \`git diff --no-index .agents/skills ${file}\` shows what differs, and pass the picks as \`${cli} sync --resolve ${file}/<file>=<canonical|copy>\``,
		}),
		skillRepair: ({ file }) =>
			`run ${repairSkillRef}, which syncs ${file} with .agents/skills and asks which side wins each file that differs`,
	},
	'unpinned-copy': {
		detail:
			'tracked copy without both parts of copy protection — git still shows its changes, or would add its files to a commit',
		// Reads paths back from git rather than assuming them: the tracked entry is a symlink on a
		// Windows checkout, but individual files in a committed copy.
		repair: ({ file }) => {
			const command = `git ls-files -z ${file} | xargs -0 git update-index --skip-worktree && echo /${file}/ >> "$(git rev-parse --git-path info/exclude)"`
			return {
				command,
				instruction: `run \`${command}\` to set skip-worktree on the copy's tracked files and list ${file} in the clone's own exclude file`,
			}
		},
		skillRepair: ({ file }) => `run ${repairSkillRef}, which puts both parts of copy protection on ${file}`,
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
			instruction: `hand this to ${initSkillRef}, which consolidates what the repository has into AGENTS.md, or derives it`,
		}),
		skillRepair: () => `run ${initSkillRef}, which consolidates or derives AGENTS.md`,
	},
	'instructions-missing': {
		detail: 'no instruction bridge at this path — the harness reads none of AGENTS.md',
		repair: ({ file }) => ({
			command: '',
			instruction: `hand ${file} to ${initSkillRef}, which writes the bridge into it`,
		}),
		skillRepair: () => `run ${initSkillRef}`,
	},
	'instructions-unbridged': {
		detail: 'the file is present but names AGENTS.md nowhere — the harness reads none of it',
		repair: ({ file }) => ({
			command: '',
			instruction: `hand ${file} to ${initSkillRef}, which adds the bridge without discarding what the file already says`,
		}),
		skillRepair: () => `run ${initSkillRef}, which adds the bridge without discarding what the file already says`,
	},
	'instructions-shadowing': {
		detail: 'this file suppresses the AGENTS.md beside it — the harness reads this instead, and none of AGENTS.md',
		repair: ({ file }) => ({
			command: '',
			instruction: `hand ${file} to ${initSkillRef}, which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay`,
		}),
		skillRepair: () => `run ${initSkillRef}, which consolidates the file into AGENTS.md or imports AGENTS.md from it`,
	},
	'instructions-superseded': {
		detail: 'a bridge from before the harness read AGENTS.md itself — it still works, and nothing needs it',
		repair: ({ file }) => ({
			command: '',
			instruction: `remove ${file}, or keep it for sessions that cannot read AGENTS.md directly — ${initSkillRef} offers the choice`,
		}),
		skillRepair: () => `run ${initSkillRef}, which offers to remove it`,
	},
	'instructions-unreadable': {
		detail: 'the settings file does not parse, so the harness reads none of it',
		repair: ({ file }) => ({
			command: '',
			instruction: `fix the JSON in ${file} by hand, then hand it to ${initSkillRef}`,
		}),
		skillRepair: () => `fix the JSON by hand, then run ${initSkillRef}`,
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

/**
 * Where a report names the user rules of a harness that keeps them outside a file: there is no path,
 * so the harness's name stands in for one.
 */
export const userRulesAt = (harness: HarnessName): string => `${harness} user rules`

/** The paste step for one reported harness, naming the reported place itself when no harness has it. */
function pasteStepAt(file: string): string {
	const place =
		harnessRegistry.find((harness) => harness.userRules !== undefined && userRulesAt(harness.name) === file)
			?.userRules ?? file
	return `paste what ${globalFile} says into ${place}, and paste it again whenever that file changes, since a pasted copy does not follow it`
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
	'global-instructions-no-file': {
		detail: `the harness keeps its user rules outside a file, so no file can load ${globalFile} for it — its text reaches the harness only pasted in`,
		repair: ({ file }) => ({ command: '', instruction: `${handOver} ${pasteStepAt(file)}` }),
		skillRepair: () =>
			"hand the user the step of pasting the global file's text into that harness's user rules; write nothing yourself",
	},
}

export const globalInstructionRepairs: readonly Repair[] = repairsOf(globalInstructionTable)

const configurationTable: Record<Exclude<ConfigurationFault, 'unloadable-skill'>, RepairRow> = {
	'deprecated-harness': {
		detail:
			'a projection under a harness name that has been superseded — the replacement reads .agents/skills natively and needs no projection at all',
		repair: ({ file }) => ({
			command: '',
			instruction: `remove ${file} and enable the harness that replaced it — ${repairSkillRef} offers the correction`,
		}),
		skillRepair: () => `run ${repairSkillRef}`,
	},
	'ignored-bridge': {
		detail: 'a .gitignore rule matches this bridge — an untracked bridge swallows a real edit silently',
		repair: ({ file }) => ({
			command: '',
			instruction: `narrow or remove the .gitignore rule matching ${file} — ${repairSkillRef} offers the correction`,
		}),
		skillRepair: () => `run ${repairSkillRef}`,
	},
	'unread-local-override': {
		detail: 'no harness reads this filename, so everything in it is invisible to every agent',
		repair: ({ file }) => ({
			command: '',
			instruction: `move ${file} to CLAUDE.local.md, or consolidate it into AGENTS.md — ${repairSkillRef} offers the correction`,
		}),
		skillRepair: () => `run ${repairSkillRef}`,
	},
}

const unloadableSkillTable: Record<UnloadableSkillCause, RepairRow> = {
	'unparsable-frontmatter': {
		detail:
			'the frontmatter block does not parse, such as a description holding an unquoted colon — a harness skips the skill outright',
		repair: ({ file }) => ({
			command: '',
			instruction: `make the frontmatter in ${file} parse, such as by quoting the description — ${repairSkillRef} offers the correction`,
		}),
		skillRepair: () => `run ${repairSkillRef}`,
	},
	'missing-description': {
		detail: 'no frontmatter block, or no description with a value — a harness skips the skill outright',
		repair: ({ file }) => ({
			command: '',
			instruction: `have the skill's author write a description in ${file} — only they can say when it applies, so ${repairSkillRef} reports it and writes none`,
		}),
		skillRepair: () => `run ${repairSkillRef}, which reports that the skill's author must write a description`,
	},
}

const unloadableSkillRepairs: readonly Repair[] = (
	Object.entries(unloadableSkillTable) as [UnloadableSkillCause, RepairRow][]
).map(([cause, row]) => ({ problem: 'unloadable-skill', cause, ...row }))

export const configurationRepairs: readonly Repair[] = [...repairsOf(configurationTable), ...unloadableSkillRepairs]

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
			instruction: `add the server ${server} to ${file}, or drop it from the golden set — ${repairSkillRef} offers the correction`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to ${repairSkillRef}, which projects it from its golden entry with \`mcp project\` — or drop it from the golden set`,
	},
	'mcp-undeclared': {
		detail: 'the harness config carries this server and the golden set does not declare it',
		repair: ({ file, server }) => ({
			command: '',
			instruction: `add the server ${server} to ${goldenSet}, or drop it from ${file} — ${repairSkillRef} offers the import`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to ${repairSkillRef}, which imports it field by field with \`mcp reconcile\`, refusing any literal credential — or drop it from ${at.file}`,
	},
	'mcp-diverged-target': {
		detail: 'only the harness config changed since the two last agreed — the edit was made through the copy',
		repair: (at) => ({
			command: '',
			instruction: `reconcile the value at ${locatorText(at)} back into ${goldenSet} — ${repairSkillRef} offers the import`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to ${repairSkillRef}, which imports the field into ${goldenSet} with \`mcp reconcile\` once approved`,
	},
	'mcp-diverged-golden': {
		detail: 'only the golden set changed since the two last agreed — the harness copy is stale',
		repair: (at) => ({
			command: '',
			instruction: `update ${locatorText(at)} from the golden entry — ${repairSkillRef} offers the correction`,
		}),
		skillRepair: (at) =>
			`hand ${locatorText(at)} to ${repairSkillRef}, which updates it from the golden entry with \`mcp project\``,
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
			instruction: `consolidate ${file} into AGENTS.md — ${initSkillRef} offers the consolidation, and keeps the content reachable where this harness needs it`,
		}),
		skillRepair: ({ file }) => `hand ${file} to ${initSkillRef}, which consolidates it into AGENTS.md`,
	},
	'nonstandard-rule': {
		detail: 'a path-scoped rule only one harness reads — a skill reaches every harness where the scoping is incidental',
		repair: ({ file }) => ({
			command: '',
			instruction: `convert ${file} into a skill under .agents/skills where its guidance is not tied to the paths it names — ${initSkillRef} offers the conversion; keep it where the path scoping is the point`,
		}),
		skillRepair: ({ file }) =>
			`hand ${file} to ${initSkillRef} to convert into a skill, unless the path scoping is load-bearing`,
	},
	'nonstandard-command': {
		detail: 'a harness command file — a skill is the portable form, and this harness reads skills too',
		repair: ({ file }) => ({
			command: '',
			instruction: `move ${file} to .agents/skills/<name>/SKILL.md — ${initSkillRef} offers the move`,
		}),
		skillRepair: ({ file }) => `hand ${file} to ${initSkillRef}, which moves it to .agents/skills`,
	},
	'nonstandard-skill': {
		detail: 'a skill under a harness directory rather than the canonical one, where only that harness finds it',
		repair: ({ file }) => ({
			command: '',
			instruction: `move ${file} to .agents/skills and project it back where the harness needs one — ${initSkillRef} offers the move`,
		}),
		skillRepair: ({ file }) => `hand ${file} to ${initSkillRef}, which moves it to .agents/skills`,
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

/** Who offers every worktree repair but the guidance, named the same way in each row. */
const worktreeOffer = `${initSkillRef} offers it`

const worktreeTable: Record<WorktreeProblem, RepairRow> = {
	'worktrees-in-repository': {
		detail:
			'this agent worktree is inside the repository, so it carries the repository config, and a tool exclusion meant to skip nested worktrees matches every file in it',
		repair: ({ file }) => ({
			command: '',
			instruction: `once no session works in it, move ${file} out of the repository to a sibling \`<repository>.worktrees/\` directory with \`git worktree move\`, and keep agents creating worktrees there — ${enhanceSkillRef} offers the Agent worktrees guidance`,
		}),
		skillRepair: () => `run ${enhanceSkillRef}, which offers the Agent worktrees guidance`,
	},
	'worktrees-untracked': {
		detail:
			'.claude/worktrees/ is not git-ignored, so every agent worktree Claude Code creates there shows up as untracked in git status',
		repair: ({ file }) => ({ command: '', instruction: `add \`.claude/worktrees/\` to ${file} — ${worktreeOffer}` }),
		skillRepair: () => `run ${initSkillRef}, which offers the .gitignore line`,
	},
	'worktrees-self-ignored': {
		detail:
			'this config excludes .claude/worktrees, and an agent worktree under .claude/worktrees/ carries the same config, so inside one every file matches the exclusion and Biome processes nothing',
		repair: ({ file }) => ({
			command: '',
			instruction: `remove the \`.claude/worktrees\` exclusion from ${file} and set \`"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }\`, so Biome skips the worktrees through the \`.gitignore\` rule instead — ${worktreeOffer}`,
		}),
		skillRepair: () => `run ${initSkillRef}, which offers the replacement`,
	},
	'worktree-base-unset': {
		detail:
			'worktree.baseRef is unset, so agent worktrees branch from the default branch rather than the current HEAD — work on a feature branch starts without its commits',
		repair: ({ file }) => ({
			command: '',
			instruction: `decide whether agent worktrees should branch from HEAD, and if so set \`"worktree": { "baseRef": "head" }\` in ${file} — ${worktreeOffer}`,
		}),
		skillRepair: () => `run ${initSkillRef}, which explains the trade-off and offers the setting`,
	},
}

export const worktreeRepairs: readonly Repair[] = repairsOf(worktreeTable)

/**
 * Annotated over the whole union rather than inferred, so an added problem fails to compile until
 * its section carries it. `unloadable-skill` is keyed by cause in its own table.
 */
const doctorTable: Record<Exclude<DoctorProblem, 'unloadable-skill'>, RepairRow> = {
	...bridgeTable,
	...instructionTable,
	...globalInstructionTable,
	...configurationTable,
	...mcpTable,
	...nonstandardTable,
	...worktreeTable,
}

export const doctorRepairs: readonly Repair[] = [
	...bridgeRepairs,
	...instructionRepairs,
	...globalInstructionRepairs,
	...configurationRepairs,
	...mcpRepairs,
	...nonstandardRepairs,
	...worktreeRepairs,
]

/**
 * The repair for one problem, and for `unloadable-skill` the one for its cause, which it cannot do
 * without. Total by construction: the tables are keyed by the unions.
 */
export function repairFor(problem: DoctorProblem, cause?: UnloadableSkillCause): Repair {
	if (problem !== 'unloadable-skill') return { problem, ...doctorTable[problem] }
	if (cause === undefined) throw new TypeError('An unloadable-skill repair needs its cause.')
	return { problem, cause, ...unloadableSkillTable[cause] }
}

export const doctorSkill = {
	name: 'doctor-buddy-agent-harness',
	description:
		"Checks whether a repository's agent configuration bridges into .claude/skills and the other harness files still resolve — when a repository loads no project skills, when skills are missing after a clone, or when a harness appears to be ignoring AGENTS.md.",
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
	.map(
		(entry) =>
			`| \`${entry.problem}\`${entry.cause === undefined ? '' : `, cause \`${entry.cause}\``} | ${entry.detail} | ${cell(entry.skillRepair({ file: '<path>' }))} |`,
	)
	.join('\n')}`
}

/**
 * The shipped `doctor-buddy-agent-harness` skill; the finding tables live in the reference pages
 * below, not here.
 */
export function renderDoctorSkill(): string {
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
${forwarderInvocation('doctor')}
\`\`\`

\`<this skill's folder>\` is the directory that holds this \`SKILL.md\`. The script forwards every argument to the \`${commandInvocation}\` CLI and runs against the current working directory.

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

\`bridges\` lists every skills bridge \`init\` would create for this repository, each with a \`status\` of \`ok\`, \`missing\`, \`degraded\`, \`stale\`, or \`diverged\`.

\`instructions\` is everything standing between a harness and \`AGENTS.md\`, with a \`status\` of \`ok\`, \`missing\`, \`unbridged\`, \`unreadable\`, \`shadowing\`, or \`superseded\`. The last two are not bridges: they are files that suppress an \`AGENTS.md\` the harness would otherwise read by itself. A separate section because nothing about any of them is shared with \`bridges\`: a different \`kind\`, a different status vocabulary, and a repair that is never a command.

\`globalInstructions\` is the same question one level up: whether each harness installed for this user loads \`${globalFile}\` through its own user-scope file, with a \`status\` of \`ok\`, \`missing\`, \`unbridged\`, \`overridden\`, or \`cannot-load-file\` for a harness that keeps its user rules outside a file. No harness reads that file by itself, so text placed there reaches only the harnesses whose row is \`ok\`. The rows are there whether or not the file exists; a finding is raised only when it exists and goes unread. \`harnessInUse\` names the harness this run is under, or \`unknown\` when the environment cannot tell, so you can answer for that harness's row.

\`findings\` explains each problem and carries more than the sections above: the configuration, MCP, and non-standard findings have no section of their own, because they are about files rather than about bridges. Each finding carries its own repair on its row, in two columns:

- \`command\` — a shell invocation that, run exactly as given, **completes** the repair.
- \`instruction\` — the same repair in the imperative, always present and complete on its own.

An \`unloadable-skill\` finding also names its \`cause\`, \`unparsable-frontmatter\` or \`missing-description\`, since each has its own repair; \`cause\` is empty on every other finding. \`help\` lists each distinct repair once, as a summary of the findings' own.

\`command\` is empty whenever no single invocation does the job, and that emptiness is the signal: act on \`instruction\` and do not assemble a command out of it. A runnable invocation quoted *inside* an \`instruction\` is not the repair either — \`diverged-both\` names \`git diff --no-index\` because the diff shows you what differs, not because running it reconciles anything. Apply the repair, then re-run \`doctor\`.

No repair is wrapped, on a finding or in \`help\`.

Do not run an \`init\` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the \`init-buddy-agent-harness\` skill's judgment, so hand the repair to ${initSkillRef} instead. Every such repair carries an empty \`command\`: a skill invocation has no shell equivalent at all.

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
| \`references/worktrees.md\` | a finding about where Claude Code puts agent worktrees, or what breaks them |
| \`references/harnesses/<name>.md\` | the paths and files one named harness uses |

## Rules

- Never repair a \`diverged-*\` bridge by re-running \`init --force\`. Rebuilding overwrites whichever side holds the newer edit. Hand it to ${repairSkillRef}, which syncs the two file by file.
- Edit skills at \`.agents/skills/<name>/SKILL.md\`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to \`.gitignore\`. An untracked bridge swallows a real edit silently.
- Never repeat a value from a file an \`mcp-literal-secret\` or \`mcp-committed-secret\` finding points at. The report withheld it on purpose, and quoting it back puts it in the transcript anyway.
- Never write outside the repository. A \`globalInstructions\` repair is a step for the user to take in their own home directory; hand it over exactly as reported.
- Write instructions in \`AGENTS.md\`, never in \`CLAUDE.md\`. Content written there reaches one harness, drifts from the canonical file, and — because Claude Code prefers it — takes \`AGENTS.md\` out of that harness's context entirely.

## Done when

- **C1.** The reply names each problem the report found and its cause, or, when the report found none, says the configuration is healthy and calls for no change.
- **C2.** No bridge, skill, or instruction file changed: no \`init\` ran, and nothing was written to \`CLAUDE.md\`.
- **C3.** The reply repeats no value that a secret finding withheld.
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

Cursor keeps its user rules in a settings panel rather than a file, and Devin Desktop documents no user-scope path, so no file of theirs can load \`${globalFile}\`. Each gets a \`cannot-load-file\` row, named by the harness rather than a path, and, while \`${globalFile}\` exists, a \`global-instructions-no-file\` finding whose step is to paste its text into that harness's user rules. Devin Desktop has no directory to detect it by, so it gets a row only when named with \`--harness\`.

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
		{
			path: 'references/worktrees.md',
			content: `${generatedSkillWarning}

# Agent worktree findings

Claude Code runs a session started with \`--worktree\`, and a subagent isolated in a worktree, in a git worktree under \`.claude/worktrees/<name>/\` inside the repository. Each one is a whole checkout, config files included, so a tool exclusion that keeps the main checkout from scanning \`.claude/worktrees\` also matches every file of the worktree itself. \`doctor\` checks these findings only where a \`.claude\` directory exists.

${repairTable(worktreeRepairs)}

Each is an offer, written only on approval: \`enhance\` offers the Agent worktrees guidance, which has agents create worktrees in a sibling \`<repository>.worktrees/\` directory instead, and \`init-buddy-agent-harness\` offers each of the other lines, one at a time.

\`worktrees-in-repository\` is reported once per worktree found under \`.claude/worktrees/\`. Moving one is safe only when no session is working in it, so ask before running \`git worktree move\`; the finding carries no command.

\`worktree-base-unset\` is a choice, not an error. The default branch suits agents given unrelated tasks; \`"head"\` suits agents asked to build on the branch in front of them. Put the trade-off to the owner, and report an explicit \`"fresh"\` as their answer rather than as a finding — \`doctor\` already does.

\`worktrees-untracked\` stays a backstop with the guidance in place: an agent that skips it, or a session started with \`--worktree\`, still lands under \`.claude/worktrees/\`.

\`worktrees-self-ignored\` is checked for Biome only, the tool whose exclusion is confirmed to match a worktree's own files. The skill also offers to remove the same exclusion from ESLint, Prettier, knip, and TypeScript configuration, where an earlier version of the skill added it.
`,
		},
		...harnessRegistry.map((harness) => harnessPage(harness, initReferences.has(harness.name))),
	]
}
