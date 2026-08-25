<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Skills bridge findings

| Finding | What it means | Repair |
| --- | --- | --- |
| `no-canonical` | the canonical skill directory does not exist, so no bridge can resolve | run `/buddy-agent-harness:init`, which creates `.agents/skills` and the bridges |
| `missing` | no bridge at this path — the harness sees zero project skills | run `/buddy-agent-harness:init` |
| `degraded` | expected a directory but found a regular file — checkout without core.symlinks | run `/buddy-agent-harness:init --copy --force <path>` |
| `stale` | symlink does not resolve to .agents/skills | run `/buddy-agent-harness:init --force <path>` |
| `diverged-bridge` | only the bridge changed since the two last agreed — an agent wrote through the copy | replace .agents/skills with <path> to keep the newer edit, then run `/buddy-agent-harness:init --force <path>` |
| `diverged-canonical` | only .agents/skills changed since the two last agreed — the copy is stale | run `/buddy-agent-harness:init --copy --force <path>` |
| `diverged-both` | both sides changed since they last agreed — rebuilding would discard one of them | run `git diff --no-index .agents/skills <path>` and reconcile by hand |
| `diverged-unknown` | contents differ and no commit where they agreed was found — which side moved is unknown | run `git diff --no-index .agents/skills <path>` and reconcile by hand |
| `unpinned-copy` | tracked copy without the skip-worktree bit — the tree is dirty with content that must not be committed | run `git ls-files -z <path> \| xargs -0 git update-index --skip-worktree` |

Substitute the reported bridge path for `<path>`.

## The Windows case

The common failure is `degraded`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with `core.symlinks`, which its installer leaves off. With `core.symlinks=false` git does not error — it writes the symlink out as a regular file whose contents are the target path. `/buddy-agent-harness:init --copy --force` rebuilds every bridge as a real directory on that machine; name one bridge to rebuild only that one.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into `.agents/skills`. That is what the `diverged` findings catch.
