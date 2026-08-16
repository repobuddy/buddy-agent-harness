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
		rehypePlugins: [rehypeBaseLinks],
	},
	redirects: Object.fromEntries(
		Object.entries({
			'/objective': '/getting-started/introduction/',
			'/concepts/canonical-configuration': '/reference/configuration-layout/',
			'/concepts/harness-selection': '/agent-configuration/harness-differences/',
			'/reference/standards': '/agent-configuration/open-standards/',
			'/reference/harness-support': '/agent-configuration/harness-differences/',
		}).map(([from, to]) => [from, base.replace(/\/$/, '') + to]),
	),
	integrations: [
		starlight({
			title: 'Buddy Agent Harness',
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
					items: [{ label: 'Introduction', slug: 'getting-started/introduction' }],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Initialize a Repository', slug: 'guides/initialize' },
						{ label: 'Migrating Existing Configuration', slug: 'guides/migrating' },
					],
				},
				{
					label: 'Agent Configuration',
					items: [
						{ label: 'Open Standards', slug: 'agent-configuration/open-standards' },
						{ label: 'What Belongs in AGENTS.md', slug: 'agent-configuration/instruction-files' },
						{ label: 'Writing Portable Skills', slug: 'agent-configuration/portable-skills' },
						{ label: 'Structuring a Skill', slug: 'agent-configuration/skill-structure' },
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
						{ label: 'CLI Overview', slug: 'cli' },
						{ label: 'CLI: init', slug: 'cli/init' },
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
