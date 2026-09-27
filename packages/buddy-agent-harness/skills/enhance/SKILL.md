---
name: enhance
description: Use this skill when a repository already has an AGENTS.md and you want to add guidance it is missing, or to refresh a vetted section it carries in an outdated form — offering each one at a time and writing only what the user approves. Runs on its own or straight after init.
argument-hint: '[--root <dir>]'
---

# Harness Enhance

`init` consolidates what a repository already has. `enhance` proposes what it does not.

The split matters: initialization has to run everywhere and invent nothing, so it carries no opinions. An addition is opinionated by construction, and worth having only where its subject is missing. Keeping them apart is what lets `init` stay safe to run on any repository.

Every addition is **offered, never written on sight**. An addition asserts something about how the repository is worked in — it stays true whether or not this tool ever ran — so it is material under the rule in `../init/references/agents-md.md`, and material content needs approval. Nothing here goes inside the `buddy-agent-harness` managed region; that region is for the tool's own bookkeeping.

Two additions ship today: `references/delegation.md` and `references/list-identifiers.md`. Classify, offer, and report each one on its own; the owner's answer to one decides nothing about the other. Each addition's reference file carries the text to offer, a `## Covered when` criterion for the subject already being present, a `## Stale when` section naming the history file its stale check reads and what else that check needs for this addition, and a `## Where it belongs` recommendation naming which instruction file the text should go in. The retired wordings themselves are kept beside it — `references/<addition>.history.md` — and are what a present section is compared against.

## 1. Find the instruction file

Where the invocation names `--root <dir>`, that directory is the repository: read and write inside it only. Otherwise locate the Git repository root. The target is the root `AGENTS.md`.

If there is no root `AGENTS.md`, stop and say so. This skill adds to an existing file; creating one is `init`'s job, so point there and write nothing. Still report in full as step 6 says — what you read, that nothing was written — with **not judged** as each addition's verdict.

A nested `AGENTS.md` is never a target. It governs its own subtree, and none of these additions are subtree-scoped.

## 2. Read the merged view

Read the root `AGENTS.md`. Then read any harness instruction file whose content still belongs in it — `CLAUDE.md` with a body of its own, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`. `../init/references/detection.md` lists them.

Judge against all of it together. That combined text is what an agent effectively reads, so guidance living in a Cursor always-on rule counts as present even though `AGENTS.md` does not carry it yet.

**Read those files; do not consolidate them.** Merging them into `AGENTS.md` is `init`'s work and belongs to `init` alone. If you find content that should be consolidated, say so and recommend `init` — then carry on with the coverage judgment.

## 3. Classify each addition

Ask the coverage question first: **does the merged view already tell the agent what this addition would tell it?**

Judge by meaning, not by heading or wording. A repository covering delegation under `## Working with subagents`, or in three sentences inside a longer section, is covered. A repository that mentions subagents only to name a tool is not.

When in doubt, treat it as covered and say why. A missing offer costs the user nothing; a duplicate section teaches every future agent that this file repeats itself.

**A heading inside a fenced code block is not a heading.** Text between ``` or ~~~ fences is an example of a file, not part of this one, and an addition quoted inside a fence is being shown rather than adopted. This is not hypothetical: every addition here is offered as a fenced block containing its own heading, so a repository documenting this tool — or an `AGENTS.md` that quotes one — carries the exact heading the addition would write, inside a fence, while remaining entirely uncovered. Judge only the prose the agent actually reads as instruction.

A text **carries the current text** of an addition when it holds every sentence of the text the addition offers now, in order — the owner may have added paragraphs of their own around or between them, and those are theirs to keep — **and** asserts no sentence found only in a retired wording. Containment, not resemblance: a text holding the current wording that still asserts a retired sentence does not carry it. This one test is used twice below, on two different texts.

**Before offering an uncovered addition, check your own instructions.** Where instructions you load from outside the repository — the owner's global file, however your harness reaches it — carry the current text, the addition is **already global**. You can check without opening a file; they are in front of you. Do not count the repository's own files, which the merged view already judged, nor another repository's that your harness loaded from the working directory.

Then ask the second question **of text that read as covered, and only of that text**: did that text come from this addition, at a version it used to ship? Never ask it of text that read as uncovered, and never ask it first.

Answer it against the addition's own texts: the one its reference offers now, and the ones it has retired, in the history file its `## Stale when` names. That section also carries what is specific to the addition; apply it with the procedure below.

**First, is the section already current?** It is when it carries the current text; then it is **already current**, and you compare it against no retired wording. A section that does not carry it goes on to the two questions.

**Otherwise, compare the section against each retired wording, and never weigh it against the current text to decide it is stale** — differing from the current wording is what a rewrite produces. The one exception: an addition whose history holds no retired wording yet has its current text stand in for one, and its reference says so.

Ask two questions about the section, and only these two:

1. **Do whole sentences of that wording survive verbatim in it?** Not a phrase — a whole sentence.
2. **Does that wording's structure survive?** Its sentences, in its order, each doing its job.

**Each answers yes or no, never neither** — where you cannot tell whether a sentence survives, or whether the structure does, the answer is **no**. **When the two answers agree, they decide. When they disagree, you cannot tell.**

| whole sentences | structure | |
| --- | --- | --- |
| yes | yes | **Stale.** It is that wording, edited. Offer the replacement. |
| no | no | **The owner's.** Written from scratch. Offer nothing. |
| yes | no | **You cannot tell.** A line of ours carried into prose they wrote — or a line they reached themselves. |
| no | yes | **You cannot tell.** Their words in our shape — a reword of ours, or the order the subject naturally takes. |

**Do not decide the two disagreeing cases.** Show the owner the three texts and ask (step 4).

Match a sentence literally. A shared idea is not a sentence surviving, a paraphrase of one is not that sentence, and no phrase, however memorable, answers question 1.

**A quoted sentence is not an asserted one, and does not count for question 1.** A sentence inside quotation marks, inside a fence, or in a sentence that disputes it is being shown, not followed. A section that quotes one in order to reject it is the owner's prose.

Once both answers are yes, offer the replacement. Do **not** then read the section's remaining sentences against the current text and reconsider. That applies to the section's other prose only; it changes nothing about how the two questions are answered.

**Do not shortcut any of this on the subject a section talks about.** Only the two questions decide, and they decide against the texts themselves.

Each addition ends this step in one of six states:

- **already global** — uncovered here, and your instructions from outside the repository carry the current text. Offer nothing. Say that a copy in the root `AGENTS.md` would add the team and nothing else, that the owner would then read the text twice, and that they can ask for it. Write that copy only if they do; the request is the approval.
- **already current** — the section carries the text you would offer. Offer nothing, and say that is why. Do **not** report it as the owner's own: they did not write it, this package did, and telling someone they authored your text is the same mistake as replacing what they did author.
- **absent** — uncovered, and not already global. Offer it as an addition.
- **from a retired wording, in the root `AGENTS.md`** — offer the current text as a replacement. For an addition with no retired wording yet, report it as an edited copy of the current text.
- **the owner's own** — offer nothing, and name what covers it.
- **you cannot tell** — do not decide it either way. Put it to the owner (step 4).

A section from a retired wording in a file that is **not** the root `AGENTS.md` — a `CLAUDE.md`, a `.cursorrules` — is reported by name and offered nothing. This skill writes one file; replacing the root copy while an older copy stays in a harness file leaves the repository holding two versions instead of one. Recommend `init` and carry on.

## 4. Offer

Where an addition is **absent**, show its text **verbatim** — the whole thing, not a summary — say where it would go, and ask.

**Where it goes is part of the offer, and the addition decides it.** Read its `## Where it belongs` and lead with what that section recommends. An addition whose subject is the repository belongs in the repository's `AGENTS.md`; one whose subject is how the agent works belongs in the owner's own global instruction file, because it holds in every repository they open and a copy per repository is a copy per repository to keep in step. Delegation and list identifiers are both the second kind, and their references recommend the global file.

The global file is `~/.agents/AGENTS.md`, the user-scope counterpart of the root `AGENTS.md`. Say that the harness in use reads it only where a user-scope instruction file of its own loads it. Where the harness documents that file, name it: on Claude Code it is `~/.claude/CLAUDE.md`.

Name both destinations and what each buys — the global file reaches every repository the owner opens and nobody else; the project file reaches everyone who clones it, at a copy per repository.

**A global placement is handed over, not written.** This skill writes the root `AGENTS.md` and nothing else, so give the text and the path and stop there. Do not offer to write outside the repository, and do not treat the hand-off as a decline — report it as what it is.

Where an addition came from a **retired wording**, show the section as it stands in `AGENTS.md`, then the current text **verbatim**, say that it would replace that section and nothing else, and ask.

**Name what the replacement would take with it.** A stale section often carries paragraphs the owner added to it — rules of their own, sitting under the same heading. Replacing the section removes those too. So before you ask, name every paragraph in that section that appears in no retired wording — or, for an addition with none yet, not in the current text — say the replacement would remove it, and let the owner weigh that. An approval given for "refresh the wording" is not an approval to delete what they wrote.

Where you **cannot tell**, say that first, in those words. Then show three texts — the section as it stands, the retired wording it partly tracks, and the current text — and put three answers to the owner:

- **it is theirs** — you leave it alone.
- **it came from here** — you offer the replacement.
- **settle it by measurement instead** — score both wordings and go with what wins.

Put the third every time the repository can actually do it, because the owner may not remember either, and the question they care about is not where the section came from but **which wording serves them better**. Provenance is a stand-in for that; when the stand-in fails, ask the real question.

Measurement means running each wording against a set of real tasks and comparing how the agent behaves — whatever harness this repository has for that addition's wording. In this package's own repository `eval-delegation` scores Delegation's and `eval-list-identifiers` scores List identifiers'; a consumer repository will have its own or none. **Look before you offer it.** Where the repository has no harness for that addition, say the third answer would need one it does not have, and put the other two.

**Ask before running it, and never run it unasked** — it is many model runs, and the owner is the one paying for them.

Where the owner asks for it, run it over the section as it stands and the current text, and report both scores.

- The current text scores **better** — offer it as a replacement, on that basis and not on provenance. Say what it scored. The offer is an offer like any other: it still waits for a yes.
- The section scores **as well or better** — offer nothing, say so, and leave it alone. A wording that serves this repository better than ours is not something to replace, whatever its history.

Do not argue for any of it past one sentence. The user is reading the actual text; that is the argument.

## 5. Write what was approved

On approval of an **addition** for the repository, or a request for the team copy of an **already global** one, write the section into the root `AGENTS.md` at the end of the owner's prose, outside the managed region, preserving the surrounding file exactly.

On approval of a **global placement**, write nothing. Give the text and `~/.agents/AGENTS.md`, and say it belongs at the end of that file. Nothing in a repository changes, and the run still reports.

On approval of a **replacement**, replace that one section in place — from its heading through to the next heading of the same or higher level — and leave every other byte of the file as it was. Do not relocate it, do not reformat around it, and do not touch the managed region.

Strip the fence when you write. The ``` markers around the addition in its reference file are there so you can see where the text begins and ends; the section goes into `AGENTS.md` as prose, not as a code block.

On a decline, write nothing. A declined replacement leaves the section exactly where it stands, and so does an unanswered question.

## 6. Report

Report every run, whichever way it went: what you read, the verdict for each addition and why — already global, already current, absent, the owner's own, from a retired wording, undecidable, or not judged — what you offered, which destination you recommended, and what was written. For an already-current addition your instructions from outside the repository also carry, say the owner reads it twice. A hand-off for the owner to place globally is an outcome, not a decline; say so. A run that offers nothing still reports — that is the only way the user can tell "already covered" from "did not look".

## Rules

- **Detection decides every run.** There is no first-run path and no memory of a previous decline; run the same way every time. A section the user deleted reads as absent and is offered again, because absence is the whole state. If that becomes annoying, the fix is the user declining `init`'s offer to run this skill, not a flag here.
- **Never write without approval.** The offer is the whole point.
- **Never silently overwrite.** A replacement is an offer like any other; the same gate that governs an addition governs it, word for word.
- **Never guess whose words they are.** Where you cannot tell an edited copy of a retired wording from the owner's own prose, say so and ask. Deciding it silently in either direction is the one failure this path exists to avoid.
- **Never run an evaluation unasked.** It costs the owner many model runs. Offer it; wait.
- **Never edit an addition to fit a repository.** The wording is fixed. Offer it as written or not at all.
- **Name `~/.agents/AGENTS.md` as the global file.** Name a harness's own user-scope file only where that harness documents it.
- **Never touch the managed region**, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Local agent configuration only. Do not change workflows, repository settings, or unrelated project files.
