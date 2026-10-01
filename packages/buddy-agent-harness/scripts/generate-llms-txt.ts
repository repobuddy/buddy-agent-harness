/**
 * Generates `llms.txt` (https://llmstxt.org) from the package's real surface — the CLI command tree,
 * the shipped skills, the library entry, and the docs site's pages — so the orientation map an agent
 * reads cannot describe a command, skill, or page that no longer exists.
 *
 * Each surface member must have an entry in one of the tables below; a member with none is an error,
 * and `null` records one that exists but has no documentation page, reported by `--gaps`.
 *
 *   pnpm llms:gen          write llms.txt to the package and to the docs site's public folder
 *   pnpm llms:gen --check  fail when either copy on disk is stale (run by `pnpm verify`)
 *   pnpm llms:gen --gaps   print the undocumented surface as markdown
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { cli } from 'clibuilder'
import { parse as parseYaml } from 'yaml'
import { rootCommand } from '../src/cli.ts'
import { formats } from '../src/command-output/command-output.ts'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const repoRoot = dirname(dirname(packageRoot))
const webRoot = join(repoRoot, 'apps', 'web')
const docsRoot = join(webRoot, 'src', 'content', 'docs')

const outputs = [join(packageRoot, 'llms.txt'), join(webRoot, 'public', 'llms.txt')]

/** Command path, space-separated below the root, to its docs page slug. */
const commandPages: Record<string, string | null> = {
	init: 'cli/init',
	doctor: 'cli/doctor',
	mcp: 'cli/mcp',
	'mcp project': 'cli/mcp',
	'mcp reconcile': 'cli/mcp',
	'dep-plugins': 'cli/dep-plugins',
	reference: 'cli/reference',
	'reference show': 'cli/reference',
	'reference list': 'cli/reference',
	'reference search': 'cli/reference',
	'reference where': 'cli/reference',
	'reference create': 'cli/reference',
	governance: 'cli/governance',
	'governance list': 'cli/governance',
	'governance show': 'cli/governance',
}

const skillPages: Record<string, string | null> = {
	'init-buddy-agent-harness': 'skills/init-buddy-agent-harness',
	'doctor-buddy-agent-harness': 'skills/doctor-buddy-agent-harness',
	enhance: 'skills/enhance',
	repair: 'skills/repair',
	reference: 'skills/reference',
}

/** Module `src/index.ts` re-exports from, to the docs page covering it. */
const libraryPages: Record<string, string | null> = {
	'./cli.ts': 'library/init',
	'./diagnose-bridges/diagnose-bridges.ts': null,
	'./diagnose-bridges/diagnose-instructions.ts': null,
	'./diagnose-bridges/doctor.command.ts': null,
	'./diagnose-bridges/doctor-guidance.ts': null,
	'./diagnose-bridges/git-bridge-state.ts': null,
	'./diagnose-mcp/diagnose-mcp.ts': 'library/mcp',
	'./diagnose-mcp/mcp-baseline.ts': 'library/mcp',
	'./diagnose-mcp/mcp-model.ts': 'library/mcp',
	'./diagnose-mcp/mcp-sources.ts': 'library/mcp',
	'./governance-overrides/governance.command.ts': 'library/governance',
	'./governance-overrides/governance-overrides.ts': 'library/governance',
	'./harness-registry/harness-registry.ts': 'library/mcp',
	'./harness-registry/instruction-bridge.ts': 'library/mcp',
	'./harness-registry/mcp-config.ts': 'library/mcp',
	'./initialize-harnesses/init.command.ts': 'library/init',
	'./initialize-harnesses/initialize-harnesses.ts': 'library/init',
	'./mcp-inventory/mcp-inventory.ts': 'library/mcp',
	'./references/reference.command.ts': 'library/references',
	'./references/reference-catalog.ts': 'library/references',
	'./references/reference-document.ts': 'library/references',
	'./references/reference-layers.ts': 'library/references',
	'./references/resolve-reference.ts': 'library/references',
}

/**
 * Top-level folder or page of the docs content, to its section heading here, in the order the sections
 * appear; `null` for one linked elsewhere — `cli` and `skills` have their own sections, `library` is
 * linked from the library rows, the home page is the site link.
 */
const docAreas: Record<string, string | null> = {
	'getting-started': 'Getting started',
	'agent-configuration': 'Agent configuration',
	reference: 'Reference',
	'sources.md': 'Reference',
	cli: null,
	skills: null,
	library: null,
	'index.mdx': null,
}

function fail(message: string): never {
	process.stdout.write(`error: ${message}\n`)
	process.exit(1)
}

function read(path: string): string | undefined {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return undefined
	}
}

function lookup<T>(table: Record<string, T>, key: string, tableName: string): T {
	if (!Object.hasOwn(table, key)) fail(`\`${key}\` has no entry in ${tableName} in scripts/generate-llms-txt.ts`)
	return table[key] as T
}

function frontmatter(path: string): Record<string, unknown> {
	const match = /^---\n([\s\S]*?)\n---/.exec(readFileSync(path, 'utf8'))
	if (!match) fail(`${relative(repoRoot, path)} has no frontmatter`)
	return parseYaml(match[1] as string) as Record<string, unknown>
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
	const groups = new Map<string, T[]>()
	for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item])
	return groups
}

function text(value: unknown, what: string): string {
	if (typeof value !== 'string' || value.trim() === '') fail(`${what} is missing`)
	return value.trim()
}

// Read from the Astro config rather than repeated, so a move of the site moves every link here.
function siteUrl(): string {
	const config = readFileSync(join(webRoot, 'astro.config.mjs'), 'utf8')
	const site = /\bsite:\s*'([^']+)'/.exec(config)?.[1]
	const base = /\bconst base\s*=[^\n]*:\s*'([^']+)'/.exec(config)?.[1]
	if (!site || !base) fail('could not read `site` and the production `base` from apps/web/astro.config.mjs')
	return `${site.replace(/\/$/, '')}/${base.replace(/^\/|\/$/g, '')}/`
}

const site = siteUrl()
const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
	name: string
	description: string
	repository: { url: string }
}
const repoUrl = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')
const sourceUrl = (path: string) => `${repoUrl}/blob/main/${relative(repoRoot, path)}`

function docFile(slug: string): string {
	const candidates = [`${slug}.md`, `${slug}.mdx`, `${slug}/index.md`, `${slug}/index.mdx`].map((file) =>
		join(docsRoot, file),
	)
	const found = candidates.find((path) => existsSync(path))
	if (!found) fail(`docs page \`${slug}\` does not exist under apps/web/src/content/docs`)
	return found
}

function pageUrl(slug: string): string {
	docFile(slug)
	return slug === '' ? site : `${site}${slug}/`
}

function slugOf(path: string): string {
	return relative(docsRoot, path)
		.replace(/\.mdx?$/, '')
		.replace(/(^|\/)index$/, '')
}

type Gap = { area: string; item: string }
const gaps: Gap[] = []

// --- CLI ---

type CommandRow = { path: string; description: string; slug: string | null; formatDefault: unknown; leaf: boolean }

function walk(commands: readonly cli.Command[], prefix: string): CommandRow[] {
	return commands.flatMap((command) => {
		const path = prefix ? `${prefix} ${command.name}` : command.name
		const children = command.commands ?? []
		const format = (command.options as Record<string, { default?: unknown }> | undefined)?.['format']
		const row: CommandRow = {
			path,
			description: text(command.description, `the description of \`${path}\``),
			slug: lookup(commandPages, path, 'commandPages'),
			formatDefault: format ? (format.default ?? null) : undefined,
			leaf: children.length === 0,
		}
		return [row, ...walk(children, path)]
	})
}

const commandRows = walk(rootCommand.commands, '')
for (const key of Object.keys(commandPages)) {
	if (!commandRows.some((row) => row.path === key)) fail(`commandPages lists \`${key}\`, which is not a command`)
}
for (const row of commandRows) {
	if (row.slug === null) gaps.push({ area: 'CLI', item: `\`${rootCommand.name} ${row.path}\`` })
}

// --- Skills ---

type SkillRow = { name: string; description: string; slug: string | null; userInvocable: boolean }

const skillsDir = join(packageRoot, 'skills')
const skillRows: SkillRow[] = readdirSync(skillsDir)
	.filter((entry) => existsSync(join(skillsDir, entry, 'SKILL.md')))
	.sort()
	.map((entry) => {
		const data = frontmatter(join(skillsDir, entry, 'SKILL.md'))
		const name = text(data['name'], `the name of skills/${entry}`)
		return {
			name,
			description: text(data['description'], `the description of skills/${entry}`),
			slug: lookup(skillPages, name, 'skillPages'),
			userInvocable: data['user-invocable'] !== false,
		}
	})
for (const key of Object.keys(skillPages)) {
	if (!skillRows.some((row) => row.name === key)) fail(`skillPages lists \`${key}\`, which is not a shipped skill`)
}
for (const row of skillRows) {
	if (row.slug === null) gaps.push({ area: 'Skills', item: `\`${row.name}\`` })
}

// --- Library ---

type LibraryRow = { module: string; values: string[]; types: string[]; slug: string | null }

const indexPath = join(packageRoot, 'src', 'index.ts')
const exportStatement = /export\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'\s*;?/g
const indexSource = readFileSync(indexPath, 'utf8')
if (indexSource.replace(exportStatement, '').trim() !== '') {
	fail('src/index.ts holds a statement other than `export { … } from` — extend the parser in generate-llms-txt.ts')
}
const libraryRows = new Map<string, LibraryRow>()
for (const [, typeOnly, names, module] of indexSource.matchAll(exportStatement)) {
	const key = module as string
	const row = libraryRows.get(key) ?? {
		module: key,
		values: [],
		types: [],
		slug: lookup(libraryPages, key, 'libraryPages'),
	}
	const list = (names as string)
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean)
	for (const name of list) {
		if (typeOnly || name.startsWith('type ')) row.types.push(name.replace(/^type\s+/, ''))
		else row.values.push(name)
	}
	libraryRows.set(key, row)
}
for (const key of Object.keys(libraryPages)) {
	if (!libraryRows.has(key)) fail(`libraryPages lists \`${key}\`, which src/index.ts does not export from`)
}
for (const row of libraryRows.values()) {
	if (row.slug !== null) continue
	for (const name of row.values) gaps.push({ area: 'Library', item: `\`${name}\` (\`${row.module}\`)` })
	for (const name of row.types) gaps.push({ area: 'Library', item: `type \`${name}\` (\`${row.module}\`)` })
}

// --- Docs pages ---

function pagesUnder(path: string): string[] {
	if (!statSync(path).isDirectory()) return [path]
	return readdirSync(path)
		.sort()
		.flatMap((entry) => pagesUnder(join(path, entry)))
		.filter((file) => /\.mdx?$/.test(file))
}

const docSections = new Map<string, { title: string; description: string; url: string }[]>()
for (const entry of readdirSync(docsRoot)) lookup(docAreas, entry, 'docAreas')
for (const [entry, heading] of Object.entries(docAreas)) {
	if (heading === null) continue
	const pages = docSections.get(heading) ?? []
	for (const file of pagesUnder(join(docsRoot, entry))) {
		const data = frontmatter(file)
		const where = relative(repoRoot, file)
		pages.push({
			title: text(data['title'], `the title of ${where}`),
			description: text(data['description'], `the description of ${where}`),
			url: pageUrl(slugOf(file)),
		})
	}
	docSections.set(heading, pages)
}
for (const key of Object.keys(docAreas)) {
	if (!existsSync(join(docsRoot, key))) fail(`docAreas lists \`${key}\`, which is not in apps/web/src/content/docs`)
}

// --- Render ---

function overview(slug: string): string {
	const data = frontmatter(docFile(slug))
	return `- [${text(data['title'], slug)}](${pageUrl(slug)}): ${text(data['description'], slug)}`
}

function listed(names: readonly string[], conjunction = 'and'): string {
	const quoted = names.map((name) => `\`${name}\``)
	return quoted.length < 3
		? quoted.join(` ${conjunction} `)
		: `${quoted.slice(0, -1).join(', ')}, ${conjunction} ${quoted[quoted.length - 1]}`
}

function conventions(): string[] {
	const lines: string[] = []
	const readOnly = commandRows.filter((row) => !row.path.includes(' ') && /\bRead-only\.?/.test(row.description))
	const writers = commandRows.filter((row) => !row.path.includes(' ') && !readOnly.includes(row))
	if (readOnly.length > 0) {
		lines.push(
			`Of the CLI's top-level commands, ${listed(readOnly.map((row) => row.path))} say they are read-only; ${listed(writers.map((row) => row.path))} can write.`,
		)
	}
	const leaves = commandRows.filter((row) => row.leaf)
	if (leaves.every((row) => typeof row.formatDefault === 'string')) {
		const byDefault = groupBy(leaves, (row) => row.formatDefault as string)
		const common = [...byDefault.entries()].sort((a, b) => b[1].length - a[1].length)
		const [main, ...others] = common
		const exceptions = others
			.map(([value, rows]) => `${listed(rows.map((row) => row.path))} default to \`${value}\``)
			.join('; ')
		lines.push(
			`Every runnable command takes \`--format\` with ${listed(formats, 'or')}; the default is \`${main?.[0]}\`${exceptions ? `, except that ${exceptions}` : ''}.`,
		)
	}
	return lines
}

function render(): string {
	const out: string[] = []
	out.push(`# ${pkg.name}`, '')
	out.push(
		`> ${pkg.description}. The npm package \`${pkg.name}\` ships a CLI, an agent plugin's skills, and a library.`,
	)
	out.push('')
	out.push(
		`Generated by \`packages/${pkg.name}/scripts/generate-llms-txt.ts\` (\`pnpm --filter ${pkg.name} llms:gen\`) from the command tree, the shipped skills, the library entry, and the docs site. Edit the generator or its sources, not this file.`,
	)
	out.push('')
	out.push(
		'A repository keeps one canonical agent configuration — a root `AGENTS.md` and an `.agents/` tree, with skills in `.agents/skills/` — and harnesses that cannot read it directly get bridges to it.',
	)
	for (const line of conventions()) out.push('', line)
	const home = frontmatter(docFile(''))
	out.push('', `Documentation site: [${text(home['title'], 'the home page title')}](${site}).`)

	out.push('', '## CLI', '', overview('cli'))
	for (const row of commandRows) {
		if (row.slug === null) continue
		out.push(`- [\`${rootCommand.name} ${row.path}\`](${pageUrl(row.slug)}): ${row.description}`)
	}

	out.push('', '## Skills', '', overview('skills'))
	for (const row of skillRows) {
		if (row.slug === null) continue
		const note = row.userInvocable
			? ''
			: ' Not user-invocable: the agent loads it when asked in words, rather than from a typed command.'
		out.push(`- [\`${row.name}\`](${pageUrl(row.slug)}): ${row.description}${note}`)
	}

	for (const [heading, pages] of docSections) {
		out.push('', `## ${heading}`, '')
		for (const page of pages) out.push(`- [${page.title}](${page.url}): ${page.description}`)
	}

	out.push('', '## Optional', '')
	for (const row of libraryRows.values()) {
		const names = [...row.values.map((name) => `\`${name}\``), ...row.types.map((name) => `type \`${name}\``)]
		const target = row.slug === null ? sourceUrl(join(packageRoot, 'src', row.module)) : pageUrl(row.slug)
		const status = row.slug === null ? ' No documentation page; the link is the source.' : ''
		out.push(`- [Library: \`${row.module.replace(/^\.\//, '')}\`](${target}): exports ${names.join(', ')}.${status}`)
	}
	out.push(`- [Source repository](${repoUrl}): the code, the spec, and the research behind the documentation.`)
	return `${out.join('\n')}\n`
}

// --- Modes ---

const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--gaps') ? 'gaps' : 'write'

if (mode === 'gaps') {
	if (gaps.length === 0) {
		process.stdout.write('No undocumented surface.\n')
		process.exit(0)
	}
	const byArea = groupBy(gaps, (gap) => gap.area)
	const sections = [...byArea].map(
		([area, items]) => `## ${area} (${items.length})\n\n${items.map((gap) => `- ${gap.item}`).join('\n')}`,
	)
	process.stdout.write(`# Undocumented surface (${gaps.length})\n\n${sections.join('\n\n')}\n`)
	process.exit(0)
}

const content = render()

if (mode === 'check') {
	const stale = outputs.filter((path) => read(path) !== content).map((path) => relative(repoRoot, path))
	if (stale.length > 0) {
		fail(
			`out of date with the CLI, skills, library entry, or docs pages: ${stale.join(', ')}\n` +
				`help: Run \`pnpm --filter ${pkg.name} llms:gen\` and commit the result`,
		)
	}
	process.stdout.write('llms: llms.txt is up to date\n')
	process.exit(0)
}

for (const path of outputs) {
	writeFileSync(path, content)
	process.stdout.write(`llms: wrote ${relative(repoRoot, path)}\n`)
}
