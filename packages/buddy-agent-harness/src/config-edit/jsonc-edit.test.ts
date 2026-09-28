import { describe, expect, it } from 'vitest'
import { insertJsonProperty, replaceJsonValue } from './jsonc-edit.ts'

describe('insertJsonProperty', () => {
	it('refuses a name the object already holds', () => {
		expect(insertJsonProperty('{ "a": { "b": 1 } }', ['a'], 'b', 2)).toBeUndefined()
	})

	it('inserts at the depth of its path', () => {
		const source = '{\n\t"a": {\n\t\t"b": 1\n\t}\n}'

		expect(insertJsonProperty(source, ['a'], 'c', { d: 2 })).toBe(
			'{\n\t"a": {\n\t\t"b": 1,\n\t\t"c": {\n\t\t\t"d": 2\n\t\t}\n\t}\n}',
		)
	})
})

describe('replaceJsonValue', () => {
	it('keeps every comment outside the value', () => {
		const source = '{\n  // the servers\n  "a": {\n    "b": 1\n  } // after\n}'

		const edit = replaceJsonValue(source, ['a'], { b: 2 })

		expect(edit).toEqual({ kind: 'edited', text: '{\n  // the servers\n  "a": {\n    "b": 2\n  } // after\n}' })
	})

	it('reports a path that is not there as absent', () => {
		expect(replaceJsonValue('{}', ['a', 'b'], 1)).toEqual({ kind: 'refused', reason: 'absent' })
	})

	it('reports an empty source as absent', () => {
		expect(replaceJsonValue('', ['a'], 1)).toEqual({ kind: 'refused', reason: 'absent' })
	})

	it('refuses a value holding a comment', () => {
		expect(replaceJsonValue('{ "a": { "b": 1 /* keep */ } }', ['a'], {})).toEqual({
			kind: 'refused',
			reason: 'comment',
		})
	})
})
