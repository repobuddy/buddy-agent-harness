# Addition: List identifiers

## Covered when

The merged view already tells the agent **to label the items of a list it presents, so the user can
answer an item by its label**. Any of these counts:

- a rule to number or letter options, questions, findings, or proposals put to the user, under any heading
- a rule that items keep their labels when a list the agent presented is revised

Formatting rules for files the agent writes are not coverage: "use numbered lists for sequential
steps" in a docs style guide governs documents, not what the agent puts to the user. Neither is an
identifier scheme for tracked records — issue numbers, ADR numbers, requirement IDs. Neither is a
rule that appears only in a skill body — this addition is for the always-loaded file.

## Stale when

Apply the procedure under `## Stale when` in `delegation.md` exactly — the already-current check
first, then the two questions and their table — reading it with this addition's heading
`## List identifiers`, the text below, and `list-identifiers.history.md` in place of Delegation's.

`list-identifiers.history.md` holds no retired wording yet. Until it does, a section that is not
already current is compared against the text below, standing in for a retired wording: both answers
yes is this text edited, and gets the replacement offer; both no is the owner's own; a disagreement
you cannot tell. The paragraphs a replacement would remove are the ones the text below does not contain.

Where you cannot tell, the third answer needs a harness that scores this addition's wording, not
any harness: `eval-delegation` scores Delegation's only. In this package's own repository that
harness is `eval-list-identifiers`. Where the repository has none, put two answers, not three, and
say settling it by measurement would need a harness this repository does not have.

## Offer this text verbatim

```markdown
## List identifiers

Label every list you present so the user can answer each item by its label. Letter a plain list (A, B, C) or number it (1, 2, 3). Where every item is one kind of thing, prefix the number with a letter naming the kind: P1 for a proposal, Q1 for a question, S1 for a scenario.

Keep a label once you have given it. When you revise the list, each item keeps its label, a removed item's label is not reused, and a new item takes the next one in the sequence.
```

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

The text says how to present a list to the user, which holds in every repository the owner opens,
so the global file is its one home. On Claude Code that file is `~/.claude/CLAUDE.md`. Where the
harness in use documents no such file, say so and let the owner place the text. Never guess a path.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

**Say when your own always-loaded instructions already carry this text.** Where they do, the
repository copy adds nothing but the team. State it and leave the choice alone.

A global placement is **handed over, not made**: give the text and the path, say it goes at the end
of that file, and stop there.

## Do not edit it

The wording is fixed. Offer it as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `list-identifiers.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** and pass the gate against the new pair.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
