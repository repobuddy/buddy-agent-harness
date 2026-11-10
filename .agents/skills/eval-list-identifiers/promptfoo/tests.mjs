// One test per backlog task; a task with a revision carries a second assertion scored on the
// resumed turn. The metric is the task id the table reports.

import { TASKS } from '../scripts/backlog.mjs'

export default function tests() {
	return TASKS.map((task) => ({
		description: task.id,
		vars: { task: task.id },
		assert: [
			{ type: 'javascript', value: 'file://assert.mjs:first', metric: task.id },
			...(task.revision ? [{ type: 'javascript', value: 'file://assert.mjs:second', metric: task.revision.id }] : []),
		],
	}))
}
