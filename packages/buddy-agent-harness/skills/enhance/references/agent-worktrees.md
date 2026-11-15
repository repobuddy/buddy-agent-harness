# Addition: Agent worktrees

## Covered when

The merged view already tells the agent **to create a git worktree outside the repository, rather
than letting it land inside one**. Any of these counts:

- a rule naming where worktrees go, when that place is outside the repository, under any heading
- a rule not to use a harness's built-in worktree isolation that creates the worktree inside the
  repository, paired with where to create one instead

A rule that only ignores `.claude/worktrees/` in `.gitignore` or in a tool's config is not coverage:
it accounts for worktrees inside the repository without moving them. Neither is a rule that appears
only in a skill body — this addition is for the always-loaded file.

## Stale when

Compare the `## Agent worktrees` section already in the file against `agent-worktrees.history.md` by
the procedure in step 3 of the skill, with the text below as the current text.

`agent-worktrees.history.md` holds no retired wording yet. Until it does, a section that is not
already current is compared against the text below, standing in for a retired wording: both answers
yes is this text edited, and gets the replacement offer; both no is the owner's own; a disagreement
you cannot tell. The paragraphs a replacement would remove are the ones the text below does not
contain.

A section that names a different sibling directory, or a different base than `HEAD`, is still this
text edited when its sentences survive: the path and the base are part of the wording, not the
owner's own content.

Where you cannot tell, the third answer needs a harness that scores this addition's wording, and none
does: `eval-delegation` scores Delegation's and `eval-list-identifiers` scores List identifiers', and
neither covers this one. Put two answers, not three, and say settling it by measurement would need a
harness that does not exist yet.

## Offer this text verbatim

```markdown
## Agent worktrees

Create a git worktree outside the repository, in a sibling directory named after it: `git worktree add -b <branch> ../<repo>.worktrees/<name> HEAD`, where `<repo>` is the repository's directory name. Branch from `HEAD` unless told to start elsewhere, so the work builds on the commit in front of you.

Do not use a built-in worktree isolation that creates the worktree inside the repository, such as Claude Code's `isolation: "worktree"`, which uses `.claude/worktrees/`. A worktree inside the repository carries the repository's own config, so a tool exclusion meant to skip nested worktrees matches every file in it, and its pre-commit hook fails.

To isolate a subagent, create its worktree this way first and tell it to work in that path.
```

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

The text says how the agent places a worktree, which holds in every repository the owner opens, so
the global file, `~/.agents/AGENTS.md`, is its one home.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

Ask which of the two the owner wants, leading with the global file. Where they pick it, write the
text at the end of `~/.agents/AGENTS.md` on that yes, as step 5 of the skill says; never without it.

## Do not edit it

The wording is fixed. In particular, do not change the sibling path to fit one repository: `doctor`
names the same `<repo>.worktrees/` directory when it reports a worktree inside the repository, and a
second convention would leave the two disagreeing. Offer it as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `agent-worktrees.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** and pass the gate against the new pair.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
