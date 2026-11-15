---
"buddy-agent-harness": minor
---

A new `sync` command merges each skills copy bridge, such as a `.claude/skills` copy made where links are unavailable, with `.agents/skills` file by file, against the last commit where the two agreed.

- A file only one side changed takes that side's version on both sides, a removal included, so an edit made through the copy reaches `.agents/skills`.
- A file both sides changed, or every differing file when no last agreement exists, is left as it is and listed in `left`. Pass your picks with `--resolve <bridge>/<file>=<canonical|copy>,...`, such as `--resolve .claude/skills/review/SKILL.md=copy`.
- A pick for a file the sync does not leave for you, or with an unknown side, is refused before anything is written (`unneeded-resolution`, `invalid-resolution`, exit `2`). When `.agents/skills` is missing while a copy exists, nothing is written and the command fails with `canonical-missing`.
- The result reports `outcome` (`synced` or `files-left`), the files `written` with the side each took, the files `left`, and the copies `protected`. It defaults to TOON.

`init` now syncs an existing copy the same way instead of reporting it as a conflict, and reports the sync in two new result fields, `written` and `left`. `--force` naming the copy's path, or given alone, still replaces it.

Copies at a path git tracks are now kept out of commits: `init` and `sync` set skip-worktree on the copy's tracked entries and list the bridge path in the clone's own exclude file, never in `.gitignore`. `doctor` reports `unpinned-copy` while either part is missing, and its repair now puts both in place.

`doctor`'s repair for a diverged copy is now the sync, never a rebuild: `diverged-bridge` and `diverged-canonical` offer `buddy-agent-harness sync`, and `diverged-both` and `diverged-unknown` say to run it and pick a side for each file it leaves. The `doctor-buddy-agent-harness` skill hands every diverged and unprotected copy to the `repair` skill, and the `repair` and `init-buddy-agent-harness` skills run the sync from a bundled `scripts/sync.mjs`.

The library exports `syncSkillCopies`, `parseResolutions`, `SyncError`, `syncCommand`, and their types, and now exports the `DoctorFinding` and `UnloadableSkillCause` types too.
