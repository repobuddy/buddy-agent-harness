import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['src/**/*.dist.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['src/**/*.ts'],
			// `src/skill-scripts/{doctor,init}.ts` are process-boundary entries like `bin/*.mjs`: a
			// four-line composition of `run(argv)` that a unit test would only exercise by actually
			// invoking the CLI against the working directory. They are covered behaviorally instead —
			// `doctor-guidance.test.ts` runs the bundle built from them, and `pack-check.ts` runs the
			// packed copy standalone.
			exclude: ['src/**/*.test.ts', 'src/skill-scripts/doctor.ts', 'src/skill-scripts/init.ts'],
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100,
			},
		},
	},
})
