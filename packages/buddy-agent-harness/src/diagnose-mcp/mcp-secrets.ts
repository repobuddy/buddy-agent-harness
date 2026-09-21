import type { McpServer } from './mcp-model.ts'

/**
 * Finding a literal credential in MCP configuration, without ever handling one: every function
 * here answers where, never what, and the value itself never leaves this module — redaction lives
 * here, once, rather than being trusted to each of `doctor`'s three output formats.
 */

/**
 * Marks a field as credential-bearing anywhere in its name — safe as a substring, since none of
 * these turn up inside an innocent word.
 */
const credentialWord = /token|secret|password|passwd|credential/i

/**
 * Marks a field only as a whole name segment: `key`/`auth` are common inside innocent words like
 * `MONKEY` or `AUTHOR`.
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
 * A value that names a secret rather than holding one: `${VAR}`, `$VAR`, `${env:VAR}`,
 * `${input:id}`. Classification is by shape, not entropy — a short password and a base64 blob look
 * identical to an entropy test.
 */
const reference = /\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*/

/**
 * True unless a reference appears anywhere in the value — `Bearer ${LINEAR_TOKEN}` is the
 * documented template form, so requiring the whole value to be a reference would flag it as
 * literal.
 */
function holdsLiteral(value: string): boolean {
	return !reference.test(value)
}

function credentialKey(key: string): boolean {
	return credentialWord.test(key) || segmentsOf(key).some((segment) => credentialSegment.has(segment))
}

/**
 * A password in the URL's userinfo, or a credential-named query parameter holding a literal. An
 * unparseable URL is not reported — malformed, not leaky.
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

/** Field paths only — never a truncated value; `sk-ab…` is still a leak into the same transcript. */
export function credentialFields(server: McpServer): string[] {
	return [
		...literalsIn('env', server.env),
		...literalsIn('headers', server.headers),
		...(server.url && urlHoldsCredential(server.url) ? ['url'] : []),
	]
}

/**
 * Drops a `--flag=value` pair whose flag names a credential and whose value is a literal; a
 * positional argument or a flag with no `=` has no key to test and passes through.
 */
export function nonSecretArgs(args: readonly string[] | undefined): string[] {
	return (args ?? []).filter((arg) => {
		const at = arg.indexOf('=')
		if (at === -1) return true
		return !(credentialKey(arg.slice(0, at)) && holdsLiteral(arg.slice(at + 1)))
	})
}
