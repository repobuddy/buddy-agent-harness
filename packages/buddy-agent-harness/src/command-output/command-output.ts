import { collapseHome } from 'buddy-agent-reference/command-output'

export type { OutputFormat } from 'buddy-agent-reference/command-output'
export {
	collapseHome,
	formats,
	parseFormat,
	renderText,
	writeDocument,
	writeResult,
} from 'buddy-agent-reference/command-output'

export function displayBinPath(home: string, executable: string | undefined): string {
	return executable ? collapseHome(home, executable) : 'buddy-agent-harness'
}
