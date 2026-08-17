import { unified } from '@astrojs/markdown-remark'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const base = process.env.NODE_ENV === 'development' ? '/' : '/buddy-agent-harness'

/**
 * Astro does not prepend `base` to absolute links written in Markdown, so a
 * link like `/cli/init/` 404s on a site served from a subpath. Rewrite them
 * here, keeping page sources base-agnostic.
 */
function rehypeBaseLinks() {
	if (base === '/') return () => {}
	const prefix = base.replace(/\/$/, '')
	const rewrite = (node) => {
		if (node.tagName === 'a') {
			const href = node.properties?.href
			if (
				typeof href === 'string' &&
				href.startsWith('/') &&
				!href.startsWith('//') &&
				!href.startsWith(`${prefix}/`)
			) {
				node.properties.href = prefix + href
			}
		}
		for (const child of node.children ?? []) rewrite(child)
	}
	return rewrite
}

export default defineConfig({
	site: 'https://repobuddy.github.io',
	base,
	markdown: {
		processor: unified({ rehypePlugins: [rehypeBaseLinks] }),
	},
	redirects: Object.fromEntries(
		Object.entries({
			'/objective': '/getting-started/introduction/',
			'/concepts/canonical-configuration': '/reference/configuration-layout/',
			'/concepts/harness-selection': '/agent-configuration/harness-differences/',
			'/reference/standards': '/agent-configuration/open-standards/',
			'/reference/harness-support': '/agent-configuration/harness-differences/',
			'/guides/initialize': '/skills/init/',
			'/guides/migrating': '/getting-started/migrating/',
		}).map(([from, to]) => [from, base.replace(/\/$/, '') + to]),
	),
	integrations: [
		starlight({
			title: 'Buddy Agent Harness',
			favicon: '/favicon.svg',
			logo: {
				light: './src/assets/logo.svg',
				dark: './src/assets/logo.svg',
			},
			customCss: ['./src/styles/custom.css'],
			/*
			 * `favicon` above sets the SVG. These are the raster fallbacks: Safari
			 * has no SVG favicon support, and Chrome renders one but is erratic
			 * about a file this size. A browser picks the first format it knows.
			 */
			head: [
				{
					tag: 'link',
					attrs: { rel: 'icon', href: `${base.replace(/\/$/, '')}/favicon-32.png`, sizes: '32x32', type: 'image/png' },
				},
				{
					tag: 'link',
					attrs: { rel: 'apple-touch-icon', href: `${base.replace(/\/$/, '')}/apple-touch-icon.png`, sizes: '180x180' },
				},
			],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/repobuddy/buddy-agent-harness',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Migrating Existing Configuration', slug: 'getting-started/migrating' },
					],
				},
				{
					label: 'Skills',
					items: [
						{ label: 'Overview', slug: 'skills' },
						{ label: 'init', slug: 'skills/init' },
						{ label: 'doctor', slug: 'skills/doctor' },
						{ label: 'enhance', slug: 'skills/enhance' },
					],
				},
				{
					label: 'CLI',
					items: [
						{ label: 'Overview', slug: 'cli' },
						{ label: 'init', slug: 'cli/init' },
						{ label: 'doctor', slug: 'cli/doctor' },
					],
				},
				{
					label: 'Agent Configuration',
					items: [
						{ label: 'Open Standards', slug: 'agent-configuration/open-standards' },
						{ label: 'What Belongs in AGENTS.md', slug: 'agent-configuration/instruction-files' },
						{ label: 'Instruction Purpose', slug: 'agent-configuration/instruction-purpose' },
						{ label: 'Instruction Target', slug: 'agent-configuration/instruction-target' },
						{ label: 'Writing Portable Skills', slug: 'agent-configuration/portable-skills' },
						{ label: 'Skill Scripts', slug: 'agent-configuration/skill-scripts' },
						{ label: 'Lookup Files', slug: 'agent-configuration/lookup-files' },
						{
							label: 'Skill Design',
							items: [
								{ label: 'Kinds of Skill', slug: 'agent-configuration/skills/overview' },
								{ label: 'Commands', slug: 'agent-configuration/skills/commands' },
								{ label: 'Direct Invocation Skill', slug: 'agent-configuration/skills/direct-skill' },
								{ label: 'Gateway Skill', slug: 'agent-configuration/skills/gateway-skill' },
								{ label: 'Persona', slug: 'agent-configuration/skills/persona' },
								{ label: 'Responsibility', slug: 'agent-configuration/skills/responsibility' },
							],
						},
						{ label: 'Best Practices', slug: 'agent-configuration/best-practices' },
						{ label: 'Harness Differences', slug: 'agent-configuration/harness-differences' },
						{
							label: 'Harness Notes',
							items: [
								{ label: 'Claude Code', slug: 'agent-configuration/harnesses/claude-code' },
								{ label: 'Cursor', slug: 'agent-configuration/harnesses/cursor' },
								{ label: 'Gemini CLI', slug: 'agent-configuration/harnesses/gemini-cli' },
							],
						},
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Configuration Layout', slug: 'reference/configuration-layout' },
						{ label: 'Glossary', slug: 'reference/glossary' },
						{ label: 'Sources & Confidence', slug: 'sources' },
					],
				},
			],
			editLink: {
				baseUrl: 'https://github.com/repobuddy/buddy-agent-harness/edit/main/apps/web/',
			},
		}),
	],
})
