export type {
	MatchKind,
	MergeMode,
	ReferenceLayer,
	ReferenceListing,
	ReferenceName,
	ReferenceRow,
	ReferenceStatus,
	ReferenceTier,
	ResolvedReference,
	ResolveOptions,
	SearchMatch,
	TraceEntry,
	UsedLayer,
} from '@cyberuni/agent-harness'
export {
	listReferences,
	managedReferencesDir,
	parseReferenceName,
	resolveReference,
	searchReferences,
} from '@cyberuni/agent-harness'
export type {
	ReferenceListReport,
	ReferenceSearchReport,
	ReferenceShowEntry,
} from '@cyberuni/agent-harness/commands'
export { run } from './cli.ts'
export type {
	BridgeFinding,
	BridgeKind,
	BridgeReport,
	BridgeStatus,
	DiagnoseOptions,
	DiagnoseResult,
	DivergenceReport,
} from './diagnose-bridges/diagnose-bridges.ts'
export { diagnoseBridges } from './diagnose-bridges/diagnose-bridges.ts'
export type {
	GlobalInstructionKind,
	GlobalInstructionReport,
	GlobalInstructionStatus,
} from './diagnose-bridges/diagnose-global-instructions.ts'
export { diagnoseGlobalInstructions } from './diagnose-bridges/diagnose-global-instructions.ts'
export type {
	InstructionKind,
	InstructionReport,
	InstructionStatus,
} from './diagnose-bridges/diagnose-instructions.ts'
export { diagnoseInstructions } from './diagnose-bridges/diagnose-instructions.ts'
export type { DoctorReference, DoctorReport } from './diagnose-bridges/doctor.command.ts'
export { buildDoctorReport, doctorCommand } from './diagnose-bridges/doctor.command.ts'
export type {
	BridgeProblem,
	ConfigurationFault,
	ConfigurationProblem,
	DoctorProblem,
	GlobalInstructionProblem,
	InstructionProblem,
	McpProblem,
	Repair,
} from './diagnose-bridges/doctor-guidance.ts'
export {
	bridgeRepairs,
	doctorRepairs,
	doctorSkill,
	globalInstructionRepairs,
	instructionRepairs,
	renderDoctorSkill,
} from './diagnose-bridges/doctor-guidance.ts'
export type { DivergenceDirection } from './diagnose-bridges/git-bridge-state.ts'
export type { DiagnoseMcpOptions } from './diagnose-mcp/diagnose-mcp.ts'
export { diagnoseMcp } from './diagnose-mcp/diagnose-mcp.ts'
export type { McpDirection } from './diagnose-mcp/mcp-baseline.ts'
export type { McpField, McpServer, McpTransport } from './diagnose-mcp/mcp-model.ts'
export { goldenSetPath } from './diagnose-mcp/mcp-sources.ts'
export type { GovernanceListReport, GovernanceShowReport } from './governance-overrides/governance.command.ts'
export { governanceCommand } from './governance-overrides/governance.command.ts'
export type {
	GovernanceDocument,
	GovernanceEntry,
	GovernanceLayer,
	GovernanceScope,
	LayerOptions,
} from './governance-overrides/governance-overrides.ts'
export {
	deprecatedManagedGovernancesDir,
	governanceLayers,
	listGovernances,
	managedGovernancesDir,
	overrideLayers,
	parseGovernanceName,
	resolveGovernance,
} from './governance-overrides/governance-overrides.ts'
export type { Harness, HarnessName, HarnessScope, HarnessScopeName } from './harness-registry/harness-registry.ts'
export { harnessRegistry } from './harness-registry/harness-registry.ts'
export type { InstructionBridge } from './harness-registry/instruction-bridge.ts'
export type { McpConfig } from './harness-registry/mcp-config.ts'
export { activate, harnessCommand, initCommand } from './initialize-harnesses/init.command.ts'
export type { InitializeOptions, InitializeResult } from './initialize-harnesses/initialize-harnesses.ts'
export { initializeHarnesses } from './initialize-harnesses/initialize-harnesses.ts'
export type { ListMcpServersOptions, McpServerEntry } from './mcp-inventory/mcp-inventory.ts'
export { listMcpServers } from './mcp-inventory/mcp-inventory.ts'
export type { ReferenceLayerOptions } from './references/references.ts'
export { referenceCommand, referenceLayers } from './references/references.ts'
