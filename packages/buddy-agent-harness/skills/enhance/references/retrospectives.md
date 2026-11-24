# Addition: Retrospectives

## Covered when

The merged view already tells the agent **to turn to a retrospective step for what it learns in use,
rather than act on a lesson itself**. Any of these counts:

- a rule to check, when a task for the user ends, whether a retrospective is due, and to remind the
  user or offer one, under any heading
- a rule to leave each lesson or correction the agent notices for a retrospective or review step the
  user approves, rather than write it into an instruction file or skill

A rule to write each lesson or correction straight into an instruction file, such as `AGENTS.md`, or
into a learnings file, is not coverage: it is the loop this addition replaces, where every lesson is
written without being challenged or approved. Neither is a rule that appears only in a skill body —
this addition is for the always-loaded file.

## Stale when

Compare the `## Retrospectives` section already in the file against `retrospectives.history.md` by
the procedure in step 3 of the skill, with the text below as the current text.

`retrospectives.history.md` holds no retired wording yet. Until it does, a section that is not
already current is compared against the text below, standing in for a retired wording: both answers
yes is this text edited, and gets the replacement offer; both no is the owner's own; a disagreement
you cannot tell. The paragraphs a replacement would remove are the ones the text below does not
contain.

Where you cannot tell, the third answer needs a harness that scores this addition's wording, and none
does: `eval-delegation` scores Delegation's and `eval-list-identifiers` scores List identifiers', and
neither covers this one. Put two answers, not three, and say settling it by measurement would need a
harness that does not exist yet.

## Offer this text verbatim

```markdown
## Retrospectives

When you finish a task for the user, check through the `retro` skill of the self-improve plugin whether a retrospective is due, and when one is, do what that skill's setting says: say so, offer to start it, or nothing. Skip the check in a run with no user.

When you notice a lesson, such as a correction or a repeated mistake, leave it for a retrospective rather than write it into an instruction file or skill yourself, unless the user asks for that change.

Where that skill is not available, say so rather than run a retrospective of your own.
```

## The skill it names

The text sends the agent to the `retro` skill of the self-improve plugin,
<https://github.com/cyber-uni/self-improve>. This package does not ship it. Before you offer the
text, check whether that skill is installed for the harness you are running in: it is when it is
among the skills you can invoke. Where it is not, or you cannot tell, the offer names self-improve
as the plugin to install with this text, and says that until it is installed the agent will only
say the skill is not available. The text is offered unchanged either way.

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

The text says what the agent does when it finishes a task and where its lessons go, which holds in
every repository the owner opens, so the global file, `~/.agents/AGENTS.md`, is its one home.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

Ask which of the two the owner wants, leading with the global file. Where they pick it, write the
text at the end of `~/.agents/AGENTS.md` on that yes, as step 5 of the skill says; never without it.

## Do not edit it

The wording is fixed. In particular, do not name another retrospective skill or command in place of
self-improve's `retro`: whether one is due, and what the agent does then, is that skill's setting.
Offer it as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `retrospectives.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** and pass the gate against the new pair.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
