import { harnessIds, skillInvocation } from '@cyberuni/agent-harness'
import { PACKAGE_PLUGIN } from './reference-layers.ts'

export const referenceSkill = 'reference'

const begin = '<!-- generated: harness invocations -->'
const end = '<!-- /generated -->'

/** Generated from `@cyberuni/agent-harness`, so a harness that changes how it names a plugin skill changes here. */
export function renderInvocationTable(): string {
	const rows = harnessIds.map((harness) => {
		const invocation = skillInvocation(harness, { plugin: PACKAGE_PLUGIN, skill: referenceSkill })
		if (!invocation) return `| \`${harness}\` | no typed form recorded | — |`
		return `| \`${harness}\` | \`${invocation.text}\` | ${invocation.namespaced ? 'yes' : 'no'} |`
	})
	return [begin, '| Harness | What a user types | Names the plugin |', '| --- | --- | --- |', ...rows, end].join('\n')
}

/** Replaces only the generated region, so the prose around it stays hand-written. */
export function renderReferenceReadme(current: string): string | undefined {
	const start = current.indexOf(begin)
	const stop = current.indexOf(end, start)
	if (start === -1 || stop === -1) return undefined
	return current.slice(0, start) + renderInvocationTable() + current.slice(stop + end.length)
}
