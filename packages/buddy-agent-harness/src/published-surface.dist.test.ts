import { activate, harnessCommand, harnessRegistry, initCommand, initializeHarnesses } from 'buddy-agent-harness'
import { expectTypeOf, it } from 'vitest'

it('exports the harness plugin surface from its built package', () => {
	expectTypeOf(activate).toBeFunction()
	expectTypeOf(harnessCommand).toBeObject()
	expectTypeOf(harnessRegistry).toMatchTypeOf<readonly unknown[]>()
	expectTypeOf(initializeHarnesses).toBeFunction()
	expectTypeOf(initCommand).toBeObject()
})
