// The commit-msg hook calls node_modules/.bin/commitlint directly: `pnpm exec`
// inside a git hook can prune node_modules and rewrite the lockfile.
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
		],
		// Changesets' "Version Packages" commits and long subjects are fine.
		'header-max-length': [2, 'always', 120],
		'body-max-line-length': [0],
		'footer-max-line-length': [0],
	},
}
