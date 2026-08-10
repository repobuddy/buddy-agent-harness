import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://repobuddy.github.io',
	base: '/buddy-agent-harness',
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
			sidebar: [{ label: 'Guide', items: [{ label: 'Overview', link: '/' }] }],
			editLink: {
				baseUrl: 'https://github.com/repobuddy/buddy-agent-harness/edit/main/apps/web/',
			},
		}),
	],
})
