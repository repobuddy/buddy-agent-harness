# Addition: Session scope

## Covered when

The merged view already tells the agent **when the work in front of it belongs in a new session rather
than this one**. Any of these counts:

- guidance on what belongs in one session and what starts a new one, under any heading
- a rule about switching subjects mid-session, paired with any sense of what to carry over
- an explicit statement that this repository works in one long session

Naming a session command — compacting, clearing, resuming — is not coverage, and neither is a rule to
compact at some interval, which says nothing about when the subject has changed. Neither is a rule
that appears only in a skill body — this addition is for the always-loaded file.

## Stale when

Compare the `## Session scope` section already in the file against `session-scope.history.md` by the
procedure in step 3 of the skill, with the text below as the current text.

`session-scope.history.md` holds no retired wording yet. Until it does, a section that is not already
current is compared against the text below, standing in for a retired wording: both answers yes is
this text edited, and gets the replacement offer; both no is the owner's own; a disagreement you
cannot tell. The paragraphs a replacement would remove are the ones the text below does not contain.

A section about planning — phases, a todo list, breaking work into subtasks — is not thereby this
wording. How to sequence work is a different subject from what one session holds, and anyone can
write about the first without having seen this text.

Where you cannot tell, the third answer needs a harness that scores this addition's wording, and none
does: `eval-delegation` scores Delegation's and `eval-list-identifiers` scores List identifiers', and
neither covers this one. Put two answers, not three, and say settling it by measurement would need a
harness that does not exist yet.

## Offer this text verbatim

```markdown
## Session scope

Keep one session to one subject. Deciding how something should work and building it are two subjects: finish the first, write down what it settled, and start the second in a new session from what you wrote.

When the user turns to unrelated work, do not carry the old subject into it. Name what you were working on, offer to continue it in its own session, and start this one from what the user just asked.

A session that has run long on mixed work carries context you can no longer account for, and every later answer is drawn from it. Stop adding to it: record where the work stands and continue in a new session.
```

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

The text says how to scope a session, which holds in every repository the owner opens, so the global
file, `~/.agents/AGENTS.md`, is its one home.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

A global placement is **handed over, not made**: give the text and the path, say it goes at the end
of that file, and stop there.

## Do not edit it

The wording is fixed. In particular, do not name a harness's session commands, and do not name a file
or a directory the record should go in — the section has to hold in whatever harness loads it and
whatever repository it is read in, and naming either breaks that. Offer it as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `session-scope.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** and pass the gate against the new pair.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
