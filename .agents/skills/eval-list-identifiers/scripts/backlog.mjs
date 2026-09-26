// The backlog and its key, fixed. Editing a task or a key line invalidates comparison with every
// run recorded in ../references/backlog.md; add a task instead, and report it on its own.

export const PROJECT = `# buddy-agent-harness

A CLI and skill set that links a canonical \`.agents/skills/\` directory into agent harnesses.

## Conventions

- Package manager is pnpm; \`pnpm -w test\` runs vitest across the workspace.
- Every published change needs a changeset in \`.changeset/\`.
`

// Appended to every first turn. Without it a runner with no tools answers with a file read it cannot make.
export const NO_ACCESS = 'You have no file or shell access in this session. Answer from what is here.'

const REVIEW_SNIPPET = `\`\`\`ts
export async function readManifest(dir: string) {
	const raw = fs.readFileSync(dir + '/plugin.json', 'utf8')
	const data = JSON.parse(raw)
	if (data.version == undefined) data.version = '0.0.0'
	for (var i = 0; i <= data.skills.length; i++) {
		data.skills[i] = path.join(dir, data.skills[i])
	}
	return data
}
\`\`\``

export const TASKS = [
	{
		id: 'I1',
		kind: 'present',
		prompt:
			"The `link` command re-reads every harness's config on each run, and on a large repo that now takes about two seconds. Lay out the approaches you would consider and ask me which one to take. Don't write any code yet.",
		key: 'Every option the reply puts to the user carries a visible identifier the user could answer with (a number, a letter, or a prefixed number such as P1), and no two options share one.',
		revision: {
			id: 'R1',
			prompt:
				"Drop the second one, I don't want to go that way. Add an option that caches the parsed configs on disk, keyed by each file's mtime. Show me the updated list.",
			key: "The revised list keeps each surviving option on the identifier it had in the first reply, does not give the dropped option's identifier to any other item, and gives the new option an identifier not used in the first reply. Fail if the first reply had no identifiers.",
		},
	},
	{
		id: 'I2',
		kind: 'present',
		prompt: 'I want `link` to support a `--dry-run` flag. Before you write anything, ask me whatever you need to know.',
		key: 'Every question the reply puts to the user carries a visible identifier the user could answer with (a number, a letter, or a prefixed number such as Q1), and no two questions share one.',
		revision: {
			id: 'R2',
			prompt:
				"For the first one: it should print the planned symlinks and exit 0. I'm not sure about the rest yet. Also, what about Windows junctions? Show me what's still open.",
			key: "The questions still open keep the identifiers they had in the first reply, the answered question's identifier is not given to any other item, and any new question takes an identifier not used in the first reply. Fail if the first reply had no identifiers.",
		},
	},
	{
		id: 'I3',
		kind: 'present',
		prompt: `Review this function before I merge it.\n\n${REVIEW_SNIPPET}`,
		key: 'Every finding the reply puts to the user carries a visible identifier the user could answer with (a number, a letter, or a prefixed number such as F1), and no two findings share one.',
		// Added after round 1, whose R1 asks for an option most first replies already carry.
		revision: {
			id: 'R3',
			prompt:
				"I've fixed the second one. Next week plugin.json also gains a `schemaVersion` field; add whatever that raises for this function. Show me the updated list.",
			key: "The revised list keeps each finding still open on the identifier it had in the first reply, does not give the fixed finding's identifier to any other item, and gives each new finding an identifier not used in the first reply. Fail if the first reply had no identifiers.",
		},
	},
	{
		id: 'I4',
		kind: 'present',
		prompt:
			"We're about to cut 1.0. Propose what should change in the README before the release, and list anything you need me to decide.",
		key: 'The reply carries at least two lists (proposals and decisions for the user). Every item in both carries a visible identifier, and no identifier string appears twice anywhere in the reply, so a user replying with one identifier names exactly one item. P1 and Q1 are different identifiers; two lists that each carry a bare 1 share one and fail.',
	},
	{
		id: 'N1',
		kind: 'near-miss',
		prompt:
			'Write the commit message for this change: the `link` command gains a `--dry-run` flag that prints the symlinks it would create and exits 0; the README documents the flag; a changeset is added. Reply with the commit message only.',
		key: 'The commit message carries no letter labels (A., B), (a)) and no kind-prefixed labels (P1, C1, S1) on its lines. Plain bullets, plain prose, and plain numerals are fine.',
	},
	{
		id: 'N2',
		kind: 'near-miss',
		prompt:
			'Write the changeset file for adding the `--dry-run` flag to `link` (a minor bump for `buddy-agent-harness`). Reply with the file content only.',
		key: 'The file carries no letter labels (A., B), (a)) and no kind-prefixed labels (P1, C1, S1). Plain bullets, plain prose, and plain numerals are fine.',
	},
	{
		id: 'N3',
		kind: 'near-miss',
		prompt:
			'Explain why symlinking `.claude/skills` to `.agents/skills` can fail on Windows. I just want to understand it, nothing to decide.',
		key: 'The explanation carries no letter labels (A., B), (a)) and no kind-prefixed labels (R1, C1, S1) on its items. Plain bullets, plain prose, headings, and plain numerals are fine.',
	},
]
