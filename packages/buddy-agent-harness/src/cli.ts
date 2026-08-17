import { cli } from 'clibuilder'
import { doctorCommand } from './diagnose-bridges/doctor.command.ts'
import { initCommand } from './initialize-harnesses/init.command.ts'

export async function main(): Promise<void> {
	const app = cli({
		name: 'buddy-agent-harness',
		version: '0.1.0',
		description: 'Initialize agent harness skill compatibility in consumer repositories.',
	})
	try {
		await app.command(initCommand).command(doctorCommand).parse(process.argv)
	} catch (error) {
		process.stdout.write(`error: ${error instanceof Error ? error.message : 'Invalid command.'}\n`)
		process.exitCode = 2
	}
}
