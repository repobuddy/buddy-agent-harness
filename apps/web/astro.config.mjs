import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://repobuddy.github.io',
	base: process.env.NODE_ENV === 'development' ? '/' : '/buddy-agent-harness',
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
					items: [
						{ label: 'Overview', link: '/' },
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Objective', slug: 'objective' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'Canonical Configuration', slug: 'concepts/canonical-configuration' },
						{ label: 'Harness Selection', slug: 'concepts/harness-selection' },
					],
				},
				{
					label: 'CLI Reference',
					items: [
						{ label: 'Overview', slug: 'cli' },
						{ label: 'init', slug: 'cli/init' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Configuration Layout', slug: 'reference/configuration-layout' },
						{ label: 'Standards', slug: 'reference/standards' },
						{ label: 'Harness Support', slug: 'reference/harness-support' },
					],
				},
			],
			editLink: {
				baseUrl: 'https://github.com/repobuddy/buddy-agent-harness/edit/main/apps/web/',
			},
		}),
	],
})
