import { defineConfig } from 'tsdown'

// Multiple configs share `outDir` safely: tsdown hoists `clean` and runs it once across all of them,
// not per-config.
const shared = {
	format: 'esm',
	outDir: 'dist',
	platform: 'node',
	clean: true,
} as const

/** Every runtime dependency this package ships inlined into the CLI build. */
const inlineDeps = {
	// jsonc-parser's default (`main`) build is UMD with `require()` calls rolldown can't analyse.
	// Alias to its ESM build instead — unlisted in `exports`, but resolvable as a direct subpath.
	alias: { 'jsonc-parser': 'jsonc-parser/lib/esm/main.js' },
	deps: {
		alwaysBundle: [
			/^cyber-agentkit(\/|$)/,
			/^@clibuilder\/axi(\/|$)/,
			/^@toon-format\/toon(\/|$)/,
			/^clibuilder(\/|$)/,
			/^jsonc-parser(\/|$)/,
			/^smol-toml(\/|$)/,
			/^toml-eslint-parser(\/|$)/,
			/^eslint-visitor-keys(\/|$)/,
			/^yaml(\/|$)/,
		],
		onlyBundle: false,
	},
} as const

export default defineConfig([
	{
		// Dependencies stay EXTERNAL: `activate`/`*Command` plug into the host CLI, so the host's own
		// `clibuilder` (an optional peer) is the copy they run on.
		...shared,
		entry: { index: 'src/index.ts' },
		dts: { sourcemap: true },
	},
	{
		// Every runtime dependency is inlined so `dist/cli.mjs` runs with no `node_modules`
		// present — the state an installed agent plugin is actually in.
		...shared,
		entry: { cli: 'src/cli.ts' },
		dts: false,
		...inlineDeps,
	},
])
