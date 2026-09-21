// Gemini CLI strips comments from `settings.json` before parsing (E-JSON-01). Trailing commas stay an
// error: nothing documents them as accepted.
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
