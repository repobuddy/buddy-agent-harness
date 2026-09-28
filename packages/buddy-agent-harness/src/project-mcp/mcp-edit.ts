import { insertJsonProperty, replaceJsonValue } from '../config-edit/jsonc-edit.ts'
import { appendTomlTable, renderTomlTable, replaceTomlTable } from '../config-edit/toml-edit.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'

export type McpEntry = Record<string, unknown>

/** A new file holding only the MCP key, in the format the target reads. */
export function createFile(config: McpConfig, name: string, entry: McpEntry): string {
	return config.format === 'toml'
		? renderTomlTable([config.key, name], entry)
		: `${JSON.stringify({ [config.key]: { [name]: entry } }, null, 2)}\n`
}

/**
 * Adds one server to an existing file without touching a byte of what is already there, or
 * `undefined` when the file's shape leaves no safe place to put it.
 */
export function appendServer(config: McpConfig, source: string, name: string, entry: McpEntry): string | undefined {
	if (config.format === 'toml') return appendTomlTable(source, [config.key, name], entry)
	return (
		insertJsonProperty(source, [config.key], name, entry) ??
		insertJsonProperty(source, [], config.key, { [name]: entry })
	)
}

/**
 * Replaces one server's entry in place, keeping every byte outside it, or `undefined` when it cannot:
 * the entry holds a comment the replacement would drop, which is the user's and not this command's
 * to drop, or is written in a form the editor does not replace.
 */
export function replaceServer(config: McpConfig, source: string, name: string, entry: McpEntry): string | undefined {
	const edit =
		config.format === 'toml'
			? replaceTomlTable(source, [config.key, name], entry)
			: replaceJsonValue(source, [config.key, name], entry)
	return edit.kind === 'edited' ? edit.text : undefined
}

/** The entry as it would read in the target, for a person or a skill to apply by hand. */
export function renderEntry(config: McpConfig, name: string, entry: McpEntry): string {
	return config.format === 'toml'
		? renderTomlTable([config.key, name], entry)
		: JSON.stringify({ [name]: entry }, null, 2)
}
