import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { collapseHome } from '../command-output/command-output.ts'
import {
	DEPRECATED_MANAGED,
	type GovernanceListReport,
	governanceCommand,
	governanceListCommand,
	governanceShowCommand,
} from './governance.command.ts'

/**
 * What the resolver throws on the next call, so the commands' own failure path can be reached. A
 * layered file lookup has no input that makes it throw — the layers swallow what they cannot read —
 * which is exactly why the failure has to be arranged here.
 */
const failure = vi.hoisted(() => ({ value: undefined as unknown }))

vi.mock('./governance-overrides.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./governance-overrides.ts')>()
	const failing =
		<T extends (...args: never[]) => unknown>(fn: T) =>
		(...args: Parameters<T>) => {
			if (failure.value !== undefined) throw failure.value
			return fn(...args)
		}
	return {
		...actual,
		listGovernances: failing(actual.listGovernances),
		resolveGovernance: failing(actual.resolveGovernance),
	}
})

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

type Args = { root?: string; format?: string; 'overrides-only'?: boolean }

function list(args: Args): number {
	return (governanceListCommand as unknown as { run(value: Args): number }).run({ format: 'json', ...args })
}

function show(name: string, args: Args = {}): number {
	return (governanceShowCommand as unknown as { run(value: Args & { name: string }): number }).run({
		format: 'text',
		name,
		...args,
	})
}

/** Everything the last run put on stdout. */
function written(): string {
	return stdout.mock.calls.map(([value]: unknown[]) => String(value)).join('')
}

function repository(documents: Record<string, string> = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'governance-command-'))
	mkdirSync(join(root, '.agents', 'governances'), { recursive: true })
	for (const [name, content] of Object.entries(documents)) {
		writeFileSync(join(root, '.agents', 'governances', `${name}.md`), content)
	}
	return root
}

beforeEach(() => {
	failure.value = undefined
	stdout.mockClear()
	stderr.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

describe('governance', () => {
	it('is one command over two, so neither has to restate the layers', () => {
		expect(governanceCommand.name).toBe('governance')
		expect(governanceCommand.commands).toEqual([governanceListCommand, governanceShowCommand])
	})
})

describe('governance list', () => {
	it('names every layer in lookup order', () => {
		expect(list({ root: repository() })).toBe(0)

		const report = JSON.parse(written()) as GovernanceListReport
		expect(report.layers.map((entry) => entry.scope)).toEqual([
			'project',
			'user',
			'managed',
			'managed-deprecated',
			'package',
		])
	})

	// Said on the layer rather than as a finding: the old location still answers, so nothing is
	// broken — there is somewhere better to put it.
	it('marks the layer universal-plugin wrote as deprecated, and says so on it alone', () => {
		expect(list({ root: repository() })).toBe(0)

		const report = JSON.parse(written()) as GovernanceListReport
		expect(report.layers.find((entry) => entry.scope === 'managed-deprecated')?.status).toBe(DEPRECATED_MANAGED)
		expect(report.layers.filter((entry) => entry.status !== '')).toHaveLength(1)
	})

	it('reports each governance at the layer that would win', () => {
		const root = repository({ 'agent-tool-output': '# Rules', 'cli-resolution': '# Rules' })

		expect(list({ root })).toBe(0)

		const report = JSON.parse(written()) as GovernanceListReport
		expect(report.governances).toEqual([
			{
				name: 'agent-tool-output',
				scope: 'project',
				path: join(root, '.agents', 'governances', 'agent-tool-output.md'),
			},
			{ name: 'cli-resolution', scope: 'project', path: join(root, '.agents', 'governances', 'cli-resolution.md') },
		])
	})

	// AXI §5: the zero is stated with its context, so a caller does not re-run to confirm it.
	it('states the zero outright rather than leaving the section empty', () => {
		expect(list({ root: repository() })).toBe(0)

		expect((JSON.parse(written()) as GovernanceListReport).governances).toBe('0 governances — no layer holds one')
	})

	it('leaves the package layer out when only overrides were asked for', () => {
		expect(list({ root: repository(), 'overrides-only': true })).toBe(0)

		const report = JSON.parse(written()) as GovernanceListReport
		expect(report.layers.map((entry) => entry.scope)).toEqual(['project', 'user', 'managed', 'managed-deprecated'])
	})

	// The user layer is under the reader's home directory, and a report naming it in full is one
	// another reader cannot paste.
	it('collapses the home directory out of the reported paths', () => {
		expect(list({ root: repository() })).toBe(0)

		const report = JSON.parse(written()) as GovernanceListReport
		expect(report.layers.find((entry) => entry.scope === 'user')?.path).toBe('~/.agents/governances')
		expect(written()).not.toContain(homedir())
	})

	// The default an invocation actually gets is the one the option declares; a direct call to `run`
	// never passes through the parser that applies it.
	it('defaults to TOON, the format the agent reading it parses', () => {
		expect((governanceListCommand.options as unknown as { format: { default: string } }).format.default).toBe('toon')

		expect(list({ root: repository(), format: 'toon' })).toBe(0)
		expect(written()).toContain('layers')
	})

	it('rejects an unsupported output format rather than falling back', () => {
		expect(list({ root: repository(), format: 'yaml' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()
	})

	it('resolves the project layer against the working directory when no root is named', () => {
		expect(list({})).toBe(0)

		const report = JSON.parse(written()) as GovernanceListReport
		expect(report.layers[0]).toEqual({
			scope: 'project',
			path: collapseHome(homedir(), join(process.cwd(), '.agents', 'governances')),
			status: '',
		})
	})

	// Returned rather than written to the process: a caller that is not the process learns of it too.
	it('reports a failure it cannot read a message from', () => {
		failure.value = 'unavailable'

		expect(list({ root: repository() })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: Governance listing failed.\n')
	})
})

describe('governance show', () => {
	it('defaults to the document itself rather than to a wire format', () => {
		expect((governanceShowCommand.options as unknown as { format: { default: string } }).format.default).toBe('text')
	})

	it('writes the document itself, and nothing else, by default', () => {
		const root = repository({ 'agent-tool-output': '# Agent tool output\n\nState the zero.\n' })

		expect(show('agent-tool-output', { root })).toBe(0)

		expect(written()).toBe('# Agent tool output\n\nState the zero.\n')
	})

	it('ends the document with a newline even when the file does not', () => {
		const root = repository({ 'agent-tool-output': '# Agent tool output' })

		expect(show('agent-tool-output', { root })).toBe(0)

		expect(written()).toBe('# Agent tool output\n')
	})

	it('wraps the document with the layer it came from when asked for a machine format', () => {
		const root = repository({ 'agent-tool-output': '# Rules' })

		expect(show('agent-tool-output', { root, format: 'json' })).toBe(0)

		expect(JSON.parse(written())).toEqual({
			name: 'agent-tool-output',
			scope: 'project',
			path: join(root, '.agents', 'governances', 'agent-tool-output.md'),
			content: '# Rules',
		})
	})

	// The whole point of step 2 of the lookup order: the answer is an override or it is nothing, and
	// the exit code is what the caller reads.
	it('exits non-zero, writing nothing to stdout, when no override layer holds the name', () => {
		expect(show('skill-design', { root: repository(), 'overrides-only': true })).toBe(1)

		expect(stdout).not.toHaveBeenCalled()
		expect(stderr).toHaveBeenCalledWith(
			'error: no override for governance "skill-design" in the project, user, or machine-wide layer.\n',
		)
	})

	it('exits non-zero when no layer at all holds the name', () => {
		expect(show('skill-design', { root: repository() })).toBe(1)

		expect(stdout).not.toHaveBeenCalled()
		expect(stderr).toHaveBeenCalledWith('error: no governance named "skill-design" in any layer.\n')
	})

	it('rejects a name that is a path rather than reading outside the layer', () => {
		expect(show('../../../etc/passwd', { root: repository() })).toBe(1)

		expect(stdout).not.toHaveBeenCalled()
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('is not a governance name'))
	})

	it('rejects an unsupported output format rather than falling back', () => {
		expect(show('agent-tool-output', { root: repository({ 'agent-tool-output': '# Rules' }), format: 'yaml' })).toBe(1)

		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()
	})

	it('reports a failure it cannot read a message from', () => {
		failure.value = 'unavailable'

		expect(show('agent-tool-output', { root: repository() })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: Governance lookup failed.\n')
	})
})
