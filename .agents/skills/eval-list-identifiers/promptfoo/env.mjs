import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { inheritedInstructions } from '../../eval-delegation/scripts/blind-claude.mjs'

// A blind directory under the run's output directory; throws where an instruction file would still load into it.
export function blindDir(out, ...parts) {
	if (!out) throw new Error('set LISTID_OUT to a directory outside any repository')
	const dir = join(resolve(out), ...parts)
	mkdirSync(dir, { recursive: true })
	const found = inheritedInstructions(dir)
	if (found.length > 0) throw new Error(`these would load into every run from ${dir}: ${found.join(', ')}`)
	return dir
}
