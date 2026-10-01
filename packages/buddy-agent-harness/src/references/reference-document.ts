import { parse } from 'yaml'
import { isRecord } from '../is-record/is-record.ts'

export type MergeMode = 'first-wins' | 'combine' | 'merge-sections'

const mergeModes: readonly MergeMode[] = ['first-wins', 'combine', 'merge-sections']

export type ParsedDocument = { metadata: Record<string, unknown>; body: string }

export const frontmatterPattern: RegExp = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/

/** Frontmatter that is not a YAML mapping is dropped with a warning, never passed off as body text. */
export function parseDocument(raw: string, warn: (message: string) => void): ParsedDocument {
	const match = frontmatterPattern.exec(raw)
	if (!match) return { metadata: {}, body: raw }
	const body = raw.slice(match[0].length)
	try {
		const value: unknown = parse(match[1] as string)
		if (value === null || value === undefined) return { metadata: {}, body }
		if (isRecord(value)) return { metadata: value, body }
	} catch {}
	warn('frontmatter is not a YAML mapping; it is ignored')
	return { metadata: {}, body }
}

export function readMergeMode(metadata: Record<string, unknown>, warn: (message: string) => void): MergeMode {
	const value = metadata['merge']
	if (value === undefined) return 'first-wins'
	if (mergeModes.includes(value as MergeMode)) return value as MergeMode
	warn(`unknown merge mode "${String(value)}"; read as first-wins`)
	return 'first-wins'
}

const mergeCommentPattern = /^\s*<!--\s*merge:\s*([\w-]*)\s*-->\s*$/
const headingPattern = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
const fenceOpenPattern = /^ {0,3}(`{3,}|~{3,})/

/**
 * Tracks fenced code blocks line by line — a `#` or a merge comment inside one is body text, and the
 * one thing a Markdown-unaware split gets wrong.
 */
function fenceTracker() {
	let fence: string | undefined
	return (line: string): boolean => {
		if (fence) {
			const closing = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`)
			if (closing.test(line)) fence = undefined
			return true
		}
		const open = fenceOpenPattern.exec(line)
		if (open) {
			fence = open[1]
			return true
		}
		return false
	}
}

export function stripMergeComments(body: string): string {
	const inFence = fenceTracker()
	return body
		.split('\n')
		.filter((line) => inFence(line) || !mergeCommentPattern.test(line))
		.join('\n')
}

/** Each heading with a single `#` outside a code fence, as written. */
export function titleHeadings(body: string): string[] {
	const inFence = fenceTracker()
	return body.split('\n').filter((line) => !inFence(line) && headingPattern.exec(line)?.[1] === '#')
}

export type SectionOp = 'replace' | 'combine' | 'remove'

export type Section = {
	level: number
	title: string
	heading: string
	op: SectionOp
	body: string[]
	children: Section[]
}

export type SectionTree = { preamble: string[]; children: Section[] }

function sectionKey(title: string): string {
	return title.trim().replace(/\s+/g, ' ').toLowerCase()
}

function displayHeading(section: Section): string {
	return `${'#'.repeat(section.level)} ${section.title}`
}

export function parseSections(body: string, warn: (message: string) => void): SectionTree {
	const tree: SectionTree = { preamble: [], children: [] }
	const stack: Section[] = []
	const inFence = fenceTracker()
	let awaitingOp: Section | undefined
	for (const line of body.split('\n')) {
		const current = stack.at(-1)
		const fenced = inFence(line)
		const heading = fenced ? null : headingPattern.exec(line)
		if (heading) {
			const level = (heading[1] as string).length
			const title = (heading[2] ?? '').trim()
			const section: Section = { level, title, heading: line.trimEnd(), op: 'replace', body: [], children: [] }
			while ((stack.at(-1)?.level ?? 0) >= level) stack.pop()
			;(stack.at(-1)?.children ?? tree.children).push(section)
			stack.push(section)
			awaitingOp = section
			continue
		}
		if (awaitingOp && !fenced) {
			if (!line.trim()) continue
			const comment = mergeCommentPattern.exec(line)
			if (comment) {
				const op = comment[1] as string
				if (op === 'replace' || op === 'combine' || op === 'remove') awaitingOp.op = op
				else warn(`unknown section merge "${op}" under "${displayHeading(awaitingOp)}"; read as replace`)
				awaitingOp = undefined
				continue
			}
		}
		awaitingOp = undefined
		;(current?.body ?? tree.preamble).push(line)
	}
	return tree
}

function trimBlank(lines: readonly string[]): string[] {
	let start = 0
	let end = lines.length
	while (start < end && !(lines[start] as string).trim()) start++
	while (end > start && !(lines[end - 1] as string).trim()) end--
	return lines.slice(start, end)
}

function warnDuplicates(sections: readonly Section[], path: string, where: string, warn: (message: string) => void) {
	const seen = new Set<string>()
	for (const section of sections) {
		const key = sectionKey(section.title)
		if (seen.has(key)) {
			warn(`heading path "${path}${displayHeading(section)}" appears more than once in ${where}; the first is matched`)
		}
		seen.add(key)
	}
}

function warnUnmatched(section: Section, path: string, where: string, warn: (message: string) => void) {
	warn(`"<!-- merge: ${section.op} -->" on "${path}${displayHeading(section)}" in ${where} matches no section below`)
}

/** A section placed without merging has nothing below its subsections, so their merge comments match nothing. */
function place(section: Section, path: string, where: string, warn: (message: string) => void): Section {
	const childPath = `${path}${displayHeading(section)} > `
	const children = section.children.flatMap((child) => {
		if (child.op !== 'replace') warnUnmatched(child, childPath, where, warn)
		return child.op === 'remove' ? [] : [place(child, childPath, where, warn)]
	})
	return { ...section, children }
}

function mergeChildren(
	base: readonly Section[],
	overlay: readonly Section[],
	path: string,
	where: string,
	warn: (message: string) => void,
): Section[] {
	warnDuplicates(base, path, 'the layers below', warn)
	warnDuplicates(overlay, path, where, warn)
	const slots: (Section | undefined)[] = [...base]
	const appended: Section[] = []
	const matched = new Set<number>()
	for (const section of overlay) {
		const key = sectionKey(section.title)
		const index = base.findIndex((candidate, i) => !matched.has(i) && sectionKey(candidate.title) === key)
		if (index === -1) {
			if (section.op !== 'replace') warnUnmatched(section, path, where, warn)
			if (section.op !== 'remove') appended.push(place(section, path, where, warn))
			continue
		}
		// Only the first occurrence of a duplicated path is matched; a second overlay section with the
		// same path finds nothing left and is appended.
		for (let i = 0; i < base.length; i++) if (sectionKey((base[i] as Section).title) === key) matched.add(i)
		const target = base[index] as Section
		if (section.op === 'remove') slots[index] = undefined
		else if (section.op === 'combine') {
			const baseBody = trimBlank(target.body)
			const overlayBody = trimBlank(section.body)
			slots[index] = {
				...target,
				body: baseBody.length && overlayBody.length ? [...baseBody, '', ...overlayBody] : [...baseBody, ...overlayBody],
				children: mergeChildren(target.children, section.children, `${path}${displayHeading(target)} > `, where, warn),
			}
		} else slots[index] = place(section, path, where, warn)
	}
	return [...slots.filter((slot): slot is Section => slot !== undefined), ...appended]
}

/** `where` names the overlay in warnings, so a person can find the heading it is about. */
export function mergeSections(
	base: SectionTree,
	overlay: SectionTree,
	where: string,
	warn: (message: string) => void,
): SectionTree {
	const overlayPreamble = trimBlank(overlay.preamble)
	return {
		preamble: overlayPreamble.length ? overlayPreamble : base.preamble,
		children: mergeChildren(base.children, overlay.children, '', where, warn),
	}
}

export function renderSections(tree: SectionTree): string {
	const blocks: string[] = []
	const preamble = trimBlank(tree.preamble)
	if (preamble.length) blocks.push(preamble.join('\n'))
	const visit = (section: Section) => {
		const body = trimBlank(section.body)
		blocks.push(body.length ? `${section.heading}\n\n${body.join('\n')}` : section.heading)
		for (const child of section.children) visit(child)
	}
	for (const section of tree.children) visit(section)
	return `${blocks.join('\n\n')}\n`
}
