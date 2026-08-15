import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveIndent } from './indentation.ts'

function repository(editorconfig?: string): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-indent-'))
	if (editorconfig !== undefined) writeFileSync(join(root, '.editorconfig'), editorconfig)
	return root
}

describe('resolveIndent', () => {
	it('keeps the indentation the file already uses', () => {
		const root = repository('[*]\nindent_style = tab\n')

		expect(resolveIndent(root, '{\n    "harnesses": []\n}\n')).toBe('    ')
		expect(resolveIndent(root, '{\r\n\t"harnesses": []\r\n}\r\n')).toBe('\t')
	})

	it('falls through to EditorConfig when the file has no indented line', () => {
		const root = repository('[*]\nindent_style = tab\n')

		expect(resolveIndent(root, '{}')).toBe('\t')
	})

	it('reads tab and space styles from EditorConfig', () => {
		expect(resolveIndent(repository('[*]\nindent_style = tab\n'), undefined)).toBe('\t')
		expect(resolveIndent(repository('[*]\nindent_style = space\nindent_size = 4\n'), undefined)).toBe('    ')
	})

	it('defaults a space style with no usable width to two', () => {
		expect(resolveIndent(repository('[*]\nindent_style = space\n'), undefined)).toBe('  ')
		expect(resolveIndent(repository('[*]\nindent_style = space\nindent_size = tab\n'), undefined)).toBe('  ')
		expect(resolveIndent(repository('[*]\nindent_style = space\nindent_size = 0\n'), undefined)).toBe('  ')
	})

	it('applies only the sections that cover config.json', () => {
		const scoped = '[*]\nindent_style = space\nindent_size = 4\n\n[*.{yml,yaml}]\nindent_style = tab\n'
		expect(resolveIndent(repository(scoped), undefined)).toBe('    ')

		const braced = '[*.{json,ts}]\nindent_style = tab\n'
		expect(resolveIndent(repository(braced), undefined)).toBe('\t')

		const exact = '[config.json]\nindent_style = tab\n'
		expect(resolveIndent(repository(exact), undefined)).toBe('\t')
	})

	it('ignores comments, blank lines, and unrelated settings', () => {
		const noisy = '# comment\n\nroot = true\n\n[*]\ncharset = utf-8\nINDENT_STYLE = TAB\n'

		expect(resolveIndent(repository(noisy), undefined)).toBe('\t')
	})

	it('falls back to two spaces without EditorConfig or a usable style', () => {
		expect(resolveIndent(repository(), undefined)).toBe('  ')
		expect(resolveIndent(repository('[*]\ncharset = utf-8\n'), undefined)).toBe('  ')
		expect(resolveIndent(repository('[*]\nindent_style = unset\n'), undefined)).toBe('  ')
	})
})
