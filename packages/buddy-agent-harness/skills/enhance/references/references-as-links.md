# Addition: References as links

## Covered when

The merged view already tells the agent **to write an issue, pull request, or commit it mentions as
a link the user can follow, not as a bare number**. Any of these counts:

- a rule to write references to issues, pull requests, or commits as Markdown links or full URLs, under any heading
- a rule that a reference the agent puts to the user names its repository and links to the item's page

A convention for commit messages or pull request bodies — "close the issue with `Closes #12`" — is
not coverage: it governs text GitHub renders, not what the agent puts to the user. Neither is a rule
to qualify a number with its repository alone, such as `owner/repo#12`, which still leads nowhere
in a terminal. Neither is a rule that appears only in a skill body — this addition is for the
always-loaded file.

## Stale when

Compare the `## References as links` section already in the file against
`references-as-links.history.md` by the procedure in step 3 of the skill, with the text below as the
current text.

`references-as-links.history.md` holds no retired wording yet. Until it does, a section that is not
already current is compared against the text below, standing in for a retired wording: both answers
yes is this text edited, and gets the replacement offer; both no is the owner's own; a disagreement
you cannot tell. The paragraphs a replacement would remove are the ones the text below does not
contain.

A section whose example link names a different repository or item is still this text edited when
its sentences survive: the example is part of the wording, not the owner's own content.

Where you cannot tell, the third answer needs a harness that scores this addition's wording, and none
does: `eval-delegation` scores Delegation's and `eval-list-identifiers` scores List identifiers', and
neither covers this one. Put two answers, not three, and say settling it by measurement would need a
harness that does not exist yet.

## Offer this text verbatim

```markdown
## References as links

Write each issue, pull request, or commit you mention as a Markdown link to its page, such as
[cyber-agentkit#222](https://github.com/cyber-uni/cyber-agentkit/pull/222), not a bare `#222`. A bare
number is a link only on GitHub itself; in a terminal or a chat it leads nowhere, and across
repositories it names the wrong one.
```

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

The text says how to present a reference to the user, which holds in every repository the owner
opens, so the global file, `~/.agents/AGENTS.md`, is its one home.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

A global placement is **handed over, not made**: give the text and the path, say it goes at the end
of that file, and stop there.

## Do not edit it

The wording is fixed. In particular, do not swap the example link for one in this repository — the
section has to hold in every repository it is read in, and an example naming one of them reads as a
rule about that one. Offer it as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `references-as-links.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** and pass the gate against the new pair.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
