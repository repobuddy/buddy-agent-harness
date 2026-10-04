import { defineConfig } from 'tsdown'

const shared = {
	format: 'esm',
	outDir: 'dist',
	platform: 'node',
	clean: true,
} as const

export default defineConfig([
	{
		// Dependencies stay EXTERNAL: `createReferenceCommand` must compose into the host CLI's own
		// `clibuilder` instance, not a private inlined copy that breaks command-registry identity.
		// A host that ships a self-contained bundle inlines this package and its dependencies itself.
		...shared,
		entry: { index: 'src/index.ts', 'command-output': 'src/command-output.ts' },
		dts: { sourcemap: true },
	},
	{
		...shared,
		entry: { cli: 'src/cli.ts' },
		dts: false,
	},
])
