import { describe, expect, it } from 'vitest'
import { parseJsonWithComments, stripJsonComments } from './json-with-comments.ts'

describe('stripJsonComments', () => {
	it('removes line and block comments', () => {
		expect(stripJsonComments('{ // why\n "a": 1 /* and */ }')).toBe('{ \n "a": 1  }')
	})

	// The reason this is not a regex: a URL in a value is not a comment.
	it('leaves a comment-looking sequence inside a string alone', () => {
		expect(stripJsonComments('{ "url": "https://example.com", "path": "a/*b*/c" }')).toBe(
			'{ "url": "https://example.com", "path": "a/*b*/c" }',
		)
	})

	it('does not mistake an escaped quote for the end of a string', () => {
		expect(stripJsonComments('{ "a": "say \\"//\\" here" }')).toBe('{ "a": "say \\"//\\" here" }')
	})

	it('tolerates an unterminated block comment at the end of the file', () => {
		expect(stripJsonComments('{ "a": 1 } /* trailing')).toBe('{ "a": 1 } ')
	})
})

describe('parseJsonWithComments', () => {
	// Gemini CLI strips comments before parsing its settings, so a commented file is valid there.
	it('parses a commented settings file', () => {
		expect(parseJsonWithComments('{\n  // instructions\n  "context": { "fileName": ["AGENTS.md"] }\n}')).toEqual({
			context: { fileName: ['AGENTS.md'] },
		})
	})

	it('reports nothing for JSON that is broken once its comments are gone', () => {
		expect(parseJsonWithComments('{ "context": // truncated')).toBeUndefined()
		expect(parseJsonWithComments('{ "a": 1, }')).toBeUndefined()
	})
})
