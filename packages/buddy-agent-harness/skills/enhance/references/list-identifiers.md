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

Compare the `## List identifiers` section already in the file against each wording in
`list-identifiers.history.md`, the exact texts this addition used to offer, by the procedure in
step 3 of the skill, with the text below as the current text.

The text below shares no sentence with the wording it replaced. A section carrying none of its
sentences is not thereby the owner's own: compare it against the retired wording before judging it.

Where you cannot tell, the third answer needs a harness that scores this addition's wording, not
any harness: `eval-delegation` scores Delegation's only. In this package's own repository that
harness is `eval-list-identifiers`. Where the repository has none, put two answers, not three, and
say settling it by measurement would need a harness this repository does not have.

## Offer this text verbatim

```markdown
## List identifiers

Give each option, question, finding, or proposal you put to the user a label they can answer by, a letter for its kind and a number (O1, Q1, F1, P1); the points of a plain explanation need none. Keep each label through every revision: never renumber, never reuse a removed item's label, and give a new item the next number.
```

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

The text says how to present a list to the user, which holds in every repository the owner opens,
so the global file, `~/.agents/AGENTS.md`, is its one home.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

A global placement is **handed over, not made**: give the text and the path, say it goes at the end
of that file, and stop there.

## Do not edit it

The wording is fixed. Offer it as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `list-identifiers.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** and pass the gate against the new pair.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
