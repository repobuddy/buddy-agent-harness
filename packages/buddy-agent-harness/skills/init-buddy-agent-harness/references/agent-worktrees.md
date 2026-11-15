# Agent worktrees

Claude Code runs a session started with `--worktree`, and a subagent isolated in a worktree, in a git worktree under `.claude/worktrees/<name>/` at the repository root, on a branch named `worktree-<name>`. The place is by design: no setting moves it, and only a `WorktreeCreate` hook, which replaces Claude Code's git logic outright, can put worktrees elsewhere. That is rarely worth it, so do not offer it.

Each worktree is a whole checkout inside the repository, config files included. A repository that does not account for that pays three ways:

- **`git status` lists `.claude/worktrees/` as untracked.** Claude Code does not ignore the directory itself; its documentation tells users to.
- **Tools that walk the tree find each worktree's config.** Biome stops with "Found a nested root configuration, but there's already a root configuration", and a pre-commit hook running it fails every commit until the worktrees are gone. ESLint, Prettier, knip, and a tsconfig `include` walk the same tree.
- **Agent worktrees branch from the default branch.** Unless `worktree.baseRef` is `"head"`, a subagent asked to build on a feature branch starts from `main` without that branch's commits, and its work comes back as merge conflicts.

Two offers follow. Make them only where Claude Code is in use: a `.claude/` directory exists, or the owner named Claude Code in this run. Claude Code is enabled by default, and that alone does not count. Each is offered on its own, and the owner's answer to one decides nothing about the other.

## P1: ignore the worktree directory

**Covered when** `git check-ignore -q .claude/worktrees/` succeeds, and each tool config listed below that the repository has already excludes `.claude/worktrees`. A rule on a parent directory counts. Where that rule is `.claude/` whole, it also ignores `.claude/skills`, which `doctor` reports as `ignored-bridge`; that is `repair`'s, not this offer's.

Offer each missing line as its own item, naming the file and showing the line:

| File | Line to add |
| --- | --- |
| `.gitignore` | `.claude/worktrees/` |
| `biome.json` or `biome.jsonc` | `"!**/.claude/worktrees"` as an element of `files.includes`; where `files.includes` is absent, `"files": { "includes": ["**", "!**/.claude/worktrees"] }` |
| `.eslintignore` | `**/.claude/worktrees` |
| `eslint.config.*` (flat config) | `"**/.claude/worktrees/**"` in a global `ignores` entry |
| `.prettierignore` | `**/.claude/worktrees` |
| `knip.json` or `knip.jsonc` | `"**/.claude/worktrees/**"` in `ignore` |
| `tsconfig.json` whose `include` reaches the repository root | `"**/.claude/worktrees"` in `exclude` |

Look for each file; offer only for the files that exist. Biome is the confirmed failure, so lead with it where it is present. A tool set to read `.gitignore`, such as Biome with `vcs.useIgnoreFile`, is still offered its own line: whether it then skips a nested config in an ignored directory is not documented. Say so.

A tsconfig whose `include` names only `src` never reaches `.claude/`, so it is covered and needs nothing.

**A tsconfig `exclude` replaces the default.** With no `exclude`, TypeScript excludes `node_modules` and the `outDir` by default, and writing an `exclude` drops that default. Where the file has none, offer `["node_modules", "**/.claude/worktrees"]` and name the trade, rather than a one-element list.

## P2: set `worktree.baseRef` to `"head"`

**Covered when** the project's `.claude/settings.json` sets `worktree.baseRef` to either value. An explicit `"fresh"` is the owner's answer; offer nothing and say so.

Explain the trade-off before asking, in about these words:

> Claude Code branches every agent worktree from the repository's default branch on the remote unless `worktree.baseRef` is `"head"`. The default suits agents given tasks unrelated to what you are working on: each starts from a clean tree. It surprises anyone working on a feature branch: an agent asked to build on it starts from `main`, misses its commits, and its work comes back in conflict. `"head"` branches from your current `HEAD` instead, unpushed commits included.

Then offer the setting, merged into `.claude/settings.json`:

```json
{
	"worktree": {
		"baseRef": "head"
	}
}
```

The setting accepts only those two values, not a branch name. Write it in the project's `.claude/settings.json`, which is committed, so everyone who clones the repository gets the same base. Where the owner wants it for themselves only, name `.claude/settings.local.json` instead and write there on their approval.

## Writing

Edit each file in place, as the rule in the skill says: add the one line, element, or key, and leave every other byte as it was. Create `.gitignore` or `.claude/settings.json` when it is missing; that is still an approved write, so it is offered first like any other.

A decline writes nothing. `doctor` reports what is still missing as `worktrees-untracked`, `worktrees-scanned`, and `worktree-base-unset`, so the owner can come back to it.
