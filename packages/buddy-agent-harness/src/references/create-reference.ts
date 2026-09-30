import { readFileSync } from 'node:fs'
import { frontmatterPattern, parseDocument, titleHeadings } from './reference-document.ts'

/** No `#` title: `merge-sections` matches by heading path, so a title would hold every section under it. */
export const defaultTemplate: string = `---
description: What this reference covers, and when an agent should read it.
tags: [topic]
---

## Overview

Write the guidance here. Give each topic its own top-level \`##\` section.
`

export type Template = { content: string; metadata: Record<string, unknown>; body: string }

export function readTemplate(path: string | undefined): Template {
	if (path === undefined) return parseTemplate(defaultTemplate, 'the default template')
	let content: string
	try {
		content = readFileSync(path, 'utf8')
	} catch (error) {
		throw new Error(`cannot read the template ${path}: ${(error as Error).message}`)
	}
	return parseTemplate(content, `the template ${path}`)
}

function parseTemplate(content: string, label: string): Template {
	let mapping = true
	const { metadata, body } = parseDocument(content, () => {
		mapping = false
	})
	// `show` would drop such frontmatter, so the reference would lose every key in it.
	if (!mapping) throw new Error(`${label} has frontmatter that is not a YAML mapping.`)
	return { content, metadata, body }
}

/** Adds one line and changes nothing else, so the result still reads as the template it came from. */
export function withMergeSections(content: string): string {
	const match = frontmatterPattern.exec(content)
	if (!match) return `---\nmerge: merge-sections\n---\n\n${content}`
	const open = match[0].indexOf('\n') + 1
	const newline = match[0][open - 2] === '\r' ? '\r\n' : '\n'
	const end = open + (match[1] as string).length
	return `${content.slice(0, end)}${newline}merge: merge-sections${content.slice(end)}`
}

export function templateWarnings({ metadata, body }: Template): string[] {
	const warnings = titleHeadings(body).map(
		(heading) =>
			`"${heading.trim()}" is a heading with one hash; merge-sections matches by heading path, so an override would replace or duplicate the whole document. Use top-level ## sections.`,
	)
	if (typeof metadata['description'] !== 'string' || !metadata['description'].trim()) {
		warnings.push('the reference has no `description` in its frontmatter; `list` and `search` show it blank.')
	}
	return warnings
}
