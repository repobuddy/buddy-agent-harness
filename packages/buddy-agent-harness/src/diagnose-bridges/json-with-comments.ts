/**
 * `.gemini/settings.json` may legally carry comments — the Gemini CLI loader strips them before
 * parsing. A plain `JSON.parse` of a valid settings file therefore throws, and `doctor` would report
 * a working bridge as unreadable. Comments are removed before parsing for that reason.
 *
 * Only comments. A trailing comma stays a parse error, because nothing documents it as accepted.
 */
export function stripJsonComments(source: string): string {
	let output = ''
	let index = 0
	let inString = false
	let escaped = false

	while (index < source.length) {
		const character = source[index] as string

		if (inString) {
			output += character
			if (escaped) escaped = false
			else if (character === '\\') escaped = true
			else if (character === '"') inString = false
			index += 1
			continue
		}

		if (character === '"') {
			inString = true
			output += character
			index += 1
			continue
		}

		// A `//` inside a string is an ordinary URL; outside one it can only start a comment.
		if (character === '/' && source[index + 1] === '/') {
			while (index < source.length && source[index] !== '\n') index += 1
			continue
		}

		if (character === '/' && source[index + 1] === '*') {
			index += 2
			while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1
			index += 2
			continue
		}

		output += character
		index += 1
	}

	return output
}

/** The parsed value, or `undefined` when the file is not JSON even once its comments are gone. */
export function parseJsonWithComments(source: string): unknown {
	try {
		return JSON.parse(stripJsonComments(source))
	} catch {
		return undefined
	}
}
