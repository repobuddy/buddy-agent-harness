import { describe, expect, it, vi } from 'vitest'
import { parseDocument, parseSections, renderSections } from './reference-document.ts'

function noWarn() {
	return vi.fn()
}

describe('parseDocument', () => {
	it('reads frontmatter that parses to nothing as no metadata', () => {
		const warn = noWarn()

		const { metadata, body } = parseDocument('---\n\n---\nbody\n', warn)

		expect(metadata).toEqual({})
		expect(body).toBe('body\n')
		expect(warn).not.toHaveBeenCalled()
	})

	it('drops frontmatter that parses to something other than a mapping, with a warning', () => {
		const warn = noWarn()

		const { metadata, body } = parseDocument('---\n- a\n- b\n---\nbody\n', warn)

		expect(metadata).toEqual({})
		expect(body).toBe('body\n')
		expect(warn).toHaveBeenCalledWith('frontmatter is not a YAML mapping; it is ignored')
	})

	it('drops frontmatter that is not valid YAML, with a warning', () => {
		const warn = noWarn()

		const { metadata, body } = parseDocument('---\nfoo: [unclosed\n---\nbody\n', warn)

		expect(metadata).toEqual({})
		expect(body).toBe('body\n')
		expect(warn).toHaveBeenCalledWith('frontmatter is not a YAML mapping; it is ignored')
	})
})

describe('parseSections', () => {
	it('treats a heading with no title text as an empty title', () => {
		const tree = parseSections('##\n\nbody\n', noWarn())

		expect(tree.children[0]?.title).toBe('')
	})

	it('warns on an unknown section merge comment and keeps the default op', () => {
		const warn = noWarn()

		const tree = parseSections('## Testing\n<!-- merge: bogus -->\n\nbody\n', warn)

		expect(tree.children[0]?.op).toBe('replace')
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown section merge "bogus"'))
	})

	it('tracks a tilde fence the same as a backtick fence', () => {
		const tree = parseSections('~~~\n## not a heading\n~~~\n\n## Real\n\nbody\n', noWarn())

		expect(tree.children).toHaveLength(1)
		expect(tree.children[0]?.title).toBe('Real')
	})
})

describe('renderSections', () => {
	it('renders a section with no body as its heading alone', () => {
		const tree = parseSections('## Empty\n', noWarn())

		expect(renderSections(tree)).toBe('## Empty\n')
	})
})
