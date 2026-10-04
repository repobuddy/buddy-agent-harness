export { declaredDependencies, packageDir } from './dependencies/dependencies.ts'
export type { LoadReferenceOptions } from './load-reference.ts'
export { loadReference } from './load-reference.ts'
export type {
	ReferenceCommandOptions,
	ReferenceCommands,
	ReferenceCreateReport,
	ReferenceListReport,
	ReferenceSearchReport,
	ReferenceShowEntry,
} from './reference.command.ts'
export { createReferenceCommand, createReferenceCommands } from './reference.command.ts'
export type { MatchKind, ReferenceListing, ReferenceRow, SearchMatch } from './reference-catalog.ts'
export { listReferences, searchReferences } from './reference-catalog.ts'
export type { MergeMode } from './reference-document.ts'
export type { ReferenceLayer, ReferenceLayerOptions, ReferencePlugin, ReferenceTier } from './reference-layers.ts'
export {
	deprecatedManagedGovernancesDir,
	managedGovernancesDir,
	managedReferencesDir,
	projectReferenceLayers,
	projectReferencesDir,
	referenceLayers,
} from './reference-layers.ts'
export type { ReferenceWhereReport, ReferenceWhereSlot, WhereOptions } from './reference-where.ts'
export { whereReference } from './reference-where.ts'
export type {
	ReferenceName,
	ReferenceStatus,
	ResolvedReference,
	ResolveOptions,
	TraceEntry,
	UsedLayer,
} from './resolve-reference.ts'
export { parseReferenceName, referenceNames, resolveReference } from './resolve-reference.ts'
