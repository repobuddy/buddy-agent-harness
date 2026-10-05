import { dirname } from 'node:path'
import {
	type ReferenceLayerOptions as LayerOptions,
	referenceLayers as layersOf,
	type ReferenceLayer,
} from '@cyberuni/agent-harness'
import { createReferenceCommand } from '@cyberuni/agent-harness/commands'
import type { cli } from 'clibuilder'
import { packageGovernancesDir } from '../governance-overrides/governance-overrides.ts'

export const PACKAGE_PLUGIN = 'buddy-agent-harness'

export type ReferenceLayerOptions = Omit<LayerOptions, 'plugin'> & {
	/** This package's own root, the `buddy-agent-harness` plugin. */
	packageRoot?: string | undefined
}

/** `@cyberuni/agent-harness`'s reference layers, with this package as the plugin whose own references come first. */
export function referenceLayers({
	packageRoot = dirname(packageGovernancesDir()),
	...options
}: ReferenceLayerOptions): Promise<ReferenceLayer[]> {
	return layersOf({ ...options, plugin: { name: PACKAGE_PLUGIN, root: packageRoot } })
}

export const referenceCommand: cli.Command = createReferenceCommand({
	plugin: { name: PACKAGE_PLUGIN, root: dirname(packageGovernancesDir()) },
})
