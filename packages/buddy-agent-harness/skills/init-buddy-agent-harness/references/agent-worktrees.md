# Agent worktrees

Claude Code runs a session started with `--worktree`, and a subagent isolated with `isolation: "worktree"`, in a git worktree under `.claude/worktrees/<name>/` at the repository root, on a branch named `worktree-<name>`. No setting moves that place.

Each worktree is a whole checkout inside the repository, config files included. That costs three ways:

- **`git status` lists `.claude/worktrees/` as untracked.** Claude Code does not ignore the directory itself; its documentation tells users to.
- **A tool exclusion meant for nested worktrees matches the worktree itself.** An agent worktree carries the same `biome.json`, so inside it an exclusion of `**/.claude/worktrees` matches every file: Biome prints "No files were processed" and exits 1, and the pre-commit hook blocks every commit the agent makes. Without the exclusion, Biome in the main checkout stops on the worktree's nested root configuration instead. Neither config fixes it; keeping the worktrees out of the repository does.
- **Agent worktrees branch from the default branch.** Unless `worktree.baseRef` is `"head"`, a subagent asked to build on a feature branch starts from `main` without that branch's commits, and its work comes back as merge conflicts.

Keeping worktrees out of the repository is guidance, not a setting: the `enhance-buddy-agent-harness` skill's Agent worktrees addition tells agents to create them in a sibling `<repo>.worktrees/` directory. The offers here cover what is left. Make them only where Claude Code is in use: a `.claude/` directory exists, or the owner named Claude Code in this run. Claude Code is enabled by default, and that alone does not count. Each is offered on its own, and the owner's answer to one decides nothing about another.

## P1: ignore the worktree directory in git

**Covered when** `git check-ignore -q .claude/worktrees/` succeeds. A rule on a parent directory counts. Where that rule is `.claude/` whole, it also ignores `.claude/skills`, which `doctor` reports as `ignored-bridge`; that is `repair-buddy-agent-harness`'s, not this offer's.

Offer the line for `.gitignore`, naming the file and showing it: `.claude/worktrees/`. Offer it even where `AGENTS.md` carries the Agent worktrees guidance: a session started with `--worktree`, or an agent that skips the guidance, still lands there.

Offer no exclusion for a tree-scanning tool: inside an agent worktree it matches every file, as above.

## P4: remove the tool exclusions an earlier run added

Earlier versions of this skill offered a `.claude/worktrees` exclusion for each tree-scanning tool. Where the repository has one, offer to remove it, each file as its own item, naming the file and showing the line:

| File | Line to remove |
| --- | --- |
| `biome.json` or `biome.jsonc` | `"!**/.claude/worktrees"` in `files.includes` |
| `.eslintignore` | `**/.claude/worktrees` |
| `eslint.config.*` (flat config) | `"**/.claude/worktrees/**"` in a global `ignores` entry |
| `.prettierignore` | `**/.claude/worktrees` |
| `knip.json` or `knip.jsonc` | `"**/.claude/worktrees/**"` in `ignore` |
| `tsconfig.json` | `"**/.claude/worktrees"` in `exclude` |

Lead with Biome: its exclusion is the confirmed failure, and `doctor` reports it as `worktrees-self-ignored`. For Biome, offer a replacement rather than a bare removal: remove the element and set `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }`, merging into a `vcs` key the file already has. With the P1 line in `.gitignore`, Biome then skips the worktrees from the main checkout, and the rule, relative to the repository root, matches nothing inside a worktree. A bare removal trades one failure for another: with a worktree present, Biome in the main checkout stops on the nested root configuration. Say so, and say the replacement needs P1. Where `vcs.useIgnoreFile` is already on, the removal alone is the offer. For the other tools, remove only that element or line. Where removing it leaves `files.includes` as `["**"]`, or a tsconfig `exclude` as the `["node_modules"]` this skill wrote beside it, leave the rest as it is; the owner may have written it.

**Covered when** none of those files mentions `.claude/worktrees`.

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

Edit each file in place, as the rule in the skill says: add or remove the one line, element, or key, and leave every other byte as it was. Create `.gitignore` or `.claude/settings.json` when it is missing; that is still an approved write, so it is offered first like any other.

A decline writes nothing. `doctor` reports what is still open as `worktrees-untracked`, `worktrees-self-ignored`, and `worktree-base-unset`, so the owner can come back to it.
