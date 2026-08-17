import {
	activate,
	diagnoseBridges,
	doctorCommand,
	doctorRepairs,
	harnessCommand,
	harnessRegistry,
	initCommand,
	initializeHarnesses,
	renderDoctorSkill,
} from 'buddy-agent-harness'
import { expectTypeOf, it } from 'vitest'

it('exports the harness plugin surface from its built package', () => {
	expectTypeOf(activate).toBeFunction()
	expectTypeOf(harnessCommand).toBeObject()
	expectTypeOf(harnessRegistry).toMatchTypeOf<readonly unknown[]>()
	expectTypeOf(initializeHarnesses).toBeFunction()
	expectTypeOf(initCommand).toBeObject()
	expectTypeOf(diagnoseBridges).toBeFunction()
	expectTypeOf(doctorCommand).toBeObject()
	expectTypeOf(doctorRepairs).toMatchTypeOf<readonly unknown[]>()
	expectTypeOf(renderDoctorSkill).toBeFunction()
})
