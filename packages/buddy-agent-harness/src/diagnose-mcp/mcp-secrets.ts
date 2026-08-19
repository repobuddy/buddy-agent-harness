import type { McpServer } from './mcp-model.ts'

/**
 * Finding a literal credential in MCP configuration, without ever handling one.
 *
 * `doctor` is safe to run from a session-start hook, so its output lands in agent context on every
 * session and from there into transcripts. A value it echoes is amplified far past the file it came
 * from. Every function here answers **where**, never **what**: the return is a field path, and the
 * value never leaves this module.
 *
 * That is also why the redaction lives here rather than in a formatter. `doctor` renders three ways
 * — TOON, `--format text`, and `--format json` — and trusting each of them to mask is three chances
 * to drift. A value that never enters the finding cannot be printed by any of them.
 */

/**
 * Words that mark a field as credential-bearing wherever they appear in its name. Each is one that
 * effectively never turns up inside an innocent word, so a bare substring test is safe and catches
 * the run-together spellings a segment test would miss — `MYTOKEN`, `githubsecret`.
 */
const credentialWord = /token|secret|password|passwd|credential/i

/**
 * Words that mark a field only when they are a **segment** of its name. `key` and `auth` are the
 * two that matter, and both are common inside words that carry nothing — `MONKEY`, `AUTHOR`,
 * `KEYSTONE_URL`. Matching them as substrings reports those, and a scanner that cries wolf on a
 * hook-run command is one people stop reading.
 */
const credentialSegment = new Set(['key', 'apikey', 'auth', 'authorization', 'bearer'])

/** A field name split the two ways these are written: `API_KEY` and `apiKey` alike. */
function segmentsOf(key: string): string[] {
	return key
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase())
}

/**
 * A value that **names** a secret instead of holding one, in the forms the supported hosts
 * document: `${VAR}`, `$VAR`, and the `${env:VAR}` / `${input:id}` variants.
 *
 * Classification is by shape, not by content. An entropy test on the value would be a guess about
 * a string this module has already decided not to look at, and it would fail in both directions —
 * a short password is low-entropy and a base64 configuration blob is high.
 */
const reference = /\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*/

/**
 * A credential-bearing field passes when it carries a reference anywhere in it, because the common
 * legitimate form is a template rather than a bare variable — `Bearer ${LINEAR_TOKEN}` is the
 * documented way to write an authorization header, and requiring the whole value to be a reference
 * would report every correct one.
 */
function holdsLiteral(value: string): boolean {
	return !reference.test(value)
}

function credentialKey(key: string): boolean {
	return credentialWord.test(key) || segmentsOf(key).some((segment) => credentialSegment.has(segment))
}

/**
 * Whether a URL carries a credential in itself. Two shapes: a password in the userinfo component,
 * and a credential-named query parameter holding a literal. Neither value is read past the test.
 *
 * A URL that does not parse is not reported. It is malformed rather than leaky, and guessing at its
 * structure with a regular expression is how a scanner starts matching the thing it must not touch.
 */
function urlHoldsCredential(value: string): boolean {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		return false
	}
	if (url.password) return true
	for (const [key, parameter] of url.searchParams) if (credentialKey(key) && holdsLiteral(parameter)) return true
	return false
}

function literalsIn(field: 'env' | 'headers', values: Readonly<Record<string, string>> | undefined): string[] {
	return Object.entries(values ?? {})
		.filter(([key, value]) => credentialKey(key) && holdsLiteral(value))
		.map(([key]) => `${field}.${key}`)
}

/**
 * Every field of one server holding a literal credential, as a path within that server.
 *
 * The path is the whole answer. It is never a truncated value: `sk-ab…` is a leak into the same
 * transcript and buys a reader nothing the field name does not already give them.
 */
export function credentialFields(server: McpServer): string[] {
	return [
		...literalsIn('env', server.env),
		...literalsIn('headers', server.headers),
		...(server.url && urlHoldsCredential(server.url) ? ['url'] : []),
	]
}
