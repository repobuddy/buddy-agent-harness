---
name: enhance
description: Use this skill when a repository already has an AGENTS.md and you want to add guidance it is missing, or to refresh a vetted section it carries in an outdated form — offering each one at a time and writing only what the user approves. Runs on its own or straight after init.
argument-hint: '[--root <dir>]'
---

# Harness Enhance

`init` consolidates what a repository already has. `enhance` proposes what it does not.

The split matters: initialization has to run everywhere and invent nothing, so it carries no opinions. An addition is opinionated by construction, and worth having only where its subject is missing. Keeping them apart is what lets `init` stay safe to run on any repository.

Every addition is **offered, never written on sight**. An addition asserts something about how the repository is worked in — it stays true whether or not this tool ever ran — so it is material under the rule in `../init/references/agents-md.md`, and material content needs approval. Nothing here goes inside the `buddy-agent-harness` managed region; that region is for the tool's own bookkeeping.

One addition ships today: `references/delegation.md`. Each addition's reference file carries the text to offer, a `## Covered when` criterion for the subject already being present, and a `## Stale when` criterion for the file already carrying a **wording this addition has since retired**. The retired wordings themselves are kept beside it — for delegation, `references/delegation.history.md` — and are what a present section is compared against.

## 1. Find the instruction file

Where the invocation names `--root <dir>`, that directory is the repository: read and write inside it only. Otherwise locate the Git repository root. The target is the root `AGENTS.md`.

If there is no root `AGENTS.md`, stop and say so. This skill adds to an existing file; creating one is `init`'s job, so point there and write nothing.

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

Then ask the second question **of text that read as covered, and only of that text**: did that text come from this addition, at a version it used to ship? Never ask it of text that read as uncovered, and never ask it first.

Answer it against the addition's own texts, which its reference keeps beside it: the one it offers now, and the ones it has retired, in a sibling history file. The reference states how under `## Stale when`.

**First, is the section already current?** It is when it carries every sentence of the text you would offer, in order — the owner may have added paragraphs of their own around or between them — and asserts no sentence found only in a retired wording. Say so and stop. Resemblance is not enough; containment is the test.

**Otherwise, compare against the retired wordings, and never weigh a section against the current text to decide it is stale** — differing from the current wording tells you nothing, since differing is what a rewrite produces.

Each addition ends this step in one of five states:

- **already current** — the section carries the text you would offer. Offer nothing, and say that is why. Do **not** report it as the owner's own: they did not write it, this package did, and telling someone they authored your text is the same mistake as replacing what they did author.
- **absent** — offer it as an addition.
- **from a retired wording, in the root `AGENTS.md`** — offer the current text as a replacement.
- **the owner's own** — offer nothing, and name what covers it.
- **you cannot tell** — do not decide it either way. Put it to the owner (step 4).

A section from a retired wording in a file that is **not** the root `AGENTS.md` — a `CLAUDE.md`, a `.cursorrules` — is reported by name and offered nothing. This skill writes one file; replacing the root copy while an older copy stays in a harness file leaves the repository holding two versions instead of one. Recommend `init` and carry on.

## 4. Offer

Where an addition is **absent**, show its text **verbatim** — the whole thing, not a summary — say where it would go, and ask.

Where an addition came from a **retired wording**, show the section as it stands in `AGENTS.md`, then the current text **verbatim**, say that it would replace that section and nothing else, and ask.

**Name what the replacement would take with it.** A stale section often carries paragraphs the owner added to it — rules of their own, sitting under the same heading. Replacing the section removes those too. So before you ask, name every paragraph in that section that appears in no retired wording, say the replacement would remove it, and let the owner weigh that. An approval given for "refresh the wording" is not an approval to delete what they wrote.

Where you **cannot tell**, say that first, in those words. Then show three texts — the section as it stands, the retired wording it partly tracks, and the current text — and put three answers to the owner:

- **it is theirs** — you leave it alone.
- **it came from here** — you offer the replacement.
- **settle it by measurement instead** — score both wordings and go with what wins.

Put the third every time the repository can actually do it, because the owner may not remember either, and the question they care about is not where the section came from but **which wording serves them better**. Provenance is a stand-in for that; when the stand-in fails, ask the real question.

Measurement means running each wording against a set of real tasks and comparing how the agent behaves — whatever harness this repository has for that. In this package's own repository it is the `eval-delegation` skill; a consumer repository will have its own or none. **Look before you offer it.** Where the repository has no such harness, say the third answer would need one it does not have, and put the other two.

**Ask before running it, and never run it unasked** — it is many model runs, and the owner is the one paying for them.

Where the owner asks for it, run it over the section as it stands and the current text, and report both scores.

- The current text scores **better** — offer it as a replacement, on that basis and not on provenance. Say what it scored. The offer is an offer like any other: it still waits for a yes.
- The section scores **as well or better** — offer nothing, say so, and leave it alone. A wording that serves this repository better than ours is not something to replace, whatever its history.

Do not argue for any of it past one sentence. The user is reading the actual text; that is the argument.

## 5. Write what was approved

On approval of an **addition**, write the section into the root `AGENTS.md` at the end of the owner's prose, outside the managed region, preserving the surrounding file exactly.

On approval of a **replacement**, replace that one section in place — from its heading through to the next heading of the same or higher level — and leave every other byte of the file as it was. Do not relocate it, do not reformat around it, and do not touch the managed region.

Strip the fence when you write. The ``` markers around the addition in its reference file are there so you can see where the text begins and ends; the section goes into `AGENTS.md` as prose, not as a code block.

On a decline, write nothing. A declined replacement leaves the section exactly where it stands, and so does an unanswered question.

## 6. Report

Report every run, whichever way it went: what you read, the verdict for each addition and why — already current, absent, the owner's own, from a retired wording, or undecidable — what you offered, and what was written. A run that offers nothing still reports — that is the only way the user can tell "already covered" from "did not look".

## Rules

- **Detection decides every run.** There is no first-run path and no memory of a previous decline; run the same way every time. A section the user deleted reads as absent and is offered again, because absence is the whole state. If that becomes annoying, the fix is the user declining `init`'s offer to run this skill, not a flag here.
- **Never write without approval.** The offer is the whole point.
- **Never silently overwrite.** A replacement is an offer like any other; the same gate that governs an addition governs it, word for word.
- **Never guess whose words they are.** Where you cannot tell an edited copy of a retired wording from the owner's own prose, say so and ask. Deciding it silently in either direction is the one failure this path exists to avoid.
- **Never run an evaluation unasked.** It costs the owner many model runs. Offer it; wait.
- **Never edit an addition to fit a repository.** The wording is fixed. Offer it as written or not at all.
- **Never touch the managed region**, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Local agent configuration only. Do not change workflows, repository settings, or unrelated project files.
