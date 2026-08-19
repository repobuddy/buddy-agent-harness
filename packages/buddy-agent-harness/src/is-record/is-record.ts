/**
 * Whether a value is a record: an object with named keys, and not an array.
 *
 * Everything this package reads is a file someone else wrote — a golden MCP set, a harness config,
 * a projection record — so every parse lands on `unknown` and every reader narrows it here before
 * asking for a key. Four modules had their own copy of the same three clauses; a predicate that
 * decides what counts as a parsed object is one fact, and a copy of it that drifts changes what a
 * file is read to say.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
