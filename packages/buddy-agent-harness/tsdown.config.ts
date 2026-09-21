import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

/**
 * Read once here so `skillScriptConfig` can inject it as a literal — a copied-out skill bundle has
 * no `package.json` beside it to read at runtime.
 */
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

// Multiple configs share `outDir` safely: tsdown hoists `clean` and runs it once across all of them,
// not per-config.
const shared = {
	format: 'esm',
	outDir: 'dist',
	platform: 'node',
	clean: true,
} as const

/** Every runtime dependency this package ships inlined, shared by the CLI and skill-script builds. */
const inlineDeps = {
	// jsonc-parser's default (`main`) build is UMD with `require()` calls rolldown can't analyse.
	// Alias to its ESM build instead — unlisted in `exports`, but resolvable as a direct subpath.
	alias: { 'jsonc-parser': 'jsonc-parser/lib/esm/main.js' },
	deps: {
		alwaysBundle: [/^@toon-format\/toon(\/|$)/, /^clibuilder(\/|$)/, /^smol-toml(\/|$)/],
		onlyBundle: false,
	},
} as const

export default defineConfig([
	{
		// Dependencies stay EXTERNAL: `activate`/`*Command` must compose into the host CLI's own
		// `clibuilder` instance, not a private inlined copy that breaks command-registry identity.
		...shared,
		entry: { index: 'src/index.ts' },
		dts: { sourcemap: true },
	},
	{
		// Every runtime dependency is inlined so `dist/cli.mjs` runs with no `node_modules`
		// present — the state an installed agent plugin is actually in.
		//
		// Two build warnings about unanalyzable dynamic imports are expected: clibuilder loads
		// third-party plugins and config files by runtime-computed specifier, and must stay dynamic.
		...shared,
		entry: { cli: 'src/cli.ts' },
		dts: false,
		...inlineDeps,
	},
	...skillScriptConfig('doctor'),
	...skillScriptConfig('init'),
])

/**
 * Each subcommand gets its own build: entries built together get shared modules split into a common
 * chunk, which a copied-out skill folder can't resolve.
 */
function skillScriptConfig(subcommand: string) {
	return [
		{
			...shared,
			entry: { [`skill-scripts/${subcommand}`]: `src/skill-scripts/${subcommand}.ts` },
			dts: false,
			minify: true,
			// Forces every dynamically-imported module into this one file — a copied-out skill
			// script has no sibling chunk files to resolve them from.
			outputOptions: { codeSplitting: false },
			// `cli.ts` reads `__PACKAGE_VERSION__` in preference to `package.json` when the
			// identifier is defined; this is the one build that defines it.
			define: { __PACKAGE_VERSION__: JSON.stringify(version) },
			banner: {
				js: `#!/usr/bin/env node
// Generated from packages/buddy-agent-harness/src/skill-scripts/${subcommand}.ts by \`pnpm build\`
// — do not edit.
// Runs \`buddy-agent-harness ${subcommand}\` from this bundle against the current working
// directory. Nothing outside this file is read.
`,
			},
			...inlineDeps,
		},
	]
}
