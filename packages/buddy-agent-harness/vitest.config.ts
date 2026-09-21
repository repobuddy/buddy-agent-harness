import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['src/**/*.dist.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['src/**/*.ts'],
			// Process-boundary entries excluded from coverage; exercised behaviorally instead by
			// `doctor-guidance.test.ts` (runs the built bundle) and `pack-check.ts` (runs the
			// packed copy).
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
