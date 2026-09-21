import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

/**
 * Read once here so the skill-script builds can inject it as a literal (see `skillScriptConfig`):
 * a bundle that ships without the rest of the package tree beside it cannot read `package.json` off
 * the filesystem at run time the way `dist/cli.mjs` does.
 */
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string

// Several configs, because entries want different dependency and output treatment. They share an
// `outDir`, which is safe: tsdown hoists `clean` and runs it once across every config before any
// build writes, so none wipes another.
//
// No `outExtensions` here: this package publishes `.mjs` / `.d.mts` and `exports`
// names those paths, so tsdown's defaults are already correct.
const shared = {
	format: 'esm',
	outDir: 'dist',
	platform: 'node',
	clean: true,
} as const

/** Every runtime dependency this package ships inlined, shared by the CLI and skill-script builds. */
const inlineDeps = {
	// `jsonc-parser` (reached through clibuilder) resolves to its UMD build via `main`, and that
	// build's factory calls `require("./impl/format")` and three siblings — specifiers rolldown
	// cannot analyse. So its `impl/` modules were never inlined, and at runtime the require
	// resolved against `dist/` and threw `Cannot find module './impl/format'`.
	//
	// The package also ships a real ESM build whose imports are static. It has no `exports`
	// field, so addressing that subpath directly is allowed; the build's extensionless
	// specifiers are fine because a bundler resolves them, which is what its `module` entry
	// exists for.
	alias: { 'jsonc-parser': 'jsonc-parser/lib/esm/main.js' },
	deps: {
		alwaysBundle: [/^@toon-format\/toon(\/|$)/, /^clibuilder(\/|$)/, /^smol-toml(\/|$)/],
		onlyBundle: false,
	},
} as const

export default defineConfig([
	{
		// Library entry. Dependencies stay EXTERNAL on purpose, and `clibuilder` is the
		// reason: this entry exports `activate` / `*Command` so a HOST cli can compose
		// them. Host and plugin must share one clibuilder instance — a private inlined
		// copy would break command-registry identity and leave the public `.d.ts`
		// referencing types from a module that is no longer a resolvable import.
		...shared,
		entry: { index: 'src/index.ts' },
		dts: { sourcemap: true },
	},
	{
		// CLI entry. Every runtime dependency is inlined so the published
		// `dist/cli.mjs` runs with no `node_modules` present — which is the state an
		// installed agent plugin is actually in, since the plugin directory is a copy
		// of the source checkout rather than an npm install.
		//
		// Only this package's own `dependencies` need listing — those are the only ones
		// tsdown externalizes by default, so clibuilder's ~30 transitive packages are
		// inlined automatically. `onlyBundle: false` silences the "bundled a
		// dependency" warnings that are the whole point here.
		//
		// Expect two build warnings about unanalyzable dynamic imports: clibuilder
		// loads third-party plugins and user config files by runtime-computed
		// specifier. Both are correct by design and must stay dynamic; keeping this
		// output ESM preserves their semantics.
		...shared,
		entry: { cli: 'src/cli.ts' },
		dts: false,
		...inlineDeps,
	},
	...skillScriptConfig('doctor'),
	...skillScriptConfig('init'),
])

/**
 * Each shipped skill runs its subcommand from a bundle built here and copied into the skill folder
 * by `scripts/generate-skills.ts`. The bundle is distributed through the npm package (never
 * committed — see `.gitignore`), so a source/git install has no `dist/` beside it; those installs
 * fall back to the pinned `npx` invocation each SKILL.md documents.
 *
 * Each subcommand gets its **own** rolldown build rather than sharing one with `cli` or with each
 * other: entries that compile together and share modules get those modules split into a common
 * chunk, and a chunk that lives beside the bundle rather than inside it is exactly what a copied-out
 * skill folder cannot resolve. Minified, because the only reader is an agent that loads the header
 * comment for usage and never the body.
 */
function skillScriptConfig(subcommand: string) {
	return [
		{
			...shared,
			entry: { [`skill-scripts/${subcommand}`]: `src/skill-scripts/${subcommand}.ts` },
			dts: false,
			minify: true,
			// Forces every dynamically-imported module into the one output file. Without it,
			// rolldown splits clibuilder's plugin/config loader (and its own transitive chunks)
			// into sibling files beside the entry — fine for `dist/cli.mjs`, which always has
			// those siblings in the same directory, but fatal for a skill script that gets
			// copied out of `dist/` alone into a skill's own `scripts/` folder.
			outputOptions: { codeSplitting: false },
			// `cli.ts` reads `__PACKAGE_VERSION__` in preference to `package.json` when the
			// identifier is defined; this is the one build that defines it.
			define: { __PACKAGE_VERSION__: JSON.stringify(version) },
			banner: {
				js: `#!/usr/bin/env node
// Generated from packages/buddy-agent-harness/src/skill-scripts/${subcommand}.ts by \`pnpm build\` — do not edit.
// Runs \`buddy-agent-harness ${subcommand}\` from this bundle against the current working directory. Nothing outside this file is read.
`,
			},
			...inlineDeps,
		},
	]
}
