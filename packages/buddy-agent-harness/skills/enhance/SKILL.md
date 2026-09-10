---
name: enhance
description: Use this skill when a repository already has an AGENTS.md and you want to add guidance it is missing, or to refresh a vetted section it carries in an outdated form — offering each one at a time and writing only what the user approves. Runs on its own or straight after init.
argument-hint: '[--root <dir>]'
---

# Harness Enhance

`init` consolidates what a repository already has. `enhance` proposes what it does not.

The split matters: initialization has to run everywhere and invent nothing, so it carries no opinions. An addition is opinionated by construction, and worth having only where its subject is missing. Keeping them apart is what lets `init` stay safe to run on any repository.

Every addition is **offered, never written on sight**. An addition asserts something about how the repository is worked in — it stays true whether or not this tool ever ran — so it is material under the rule in `../init/references/agents-md.md`, and material content needs approval. Nothing here goes inside the `buddy-agent-harness` managed region; that region is for the tool's own bookkeeping.

One addition ships today: `references/delegation.md`. Each addition's reference file carries the text to offer, a `## Covered when` criterion for the subject already being present, and a `## Stale when` criterion for the file already carrying an **earlier form of that text**.

## 1. Find the instruction file

Locate the Git repository root. The target is the root `AGENTS.md`.

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

Then ask the second question **of text that read as covered, and only of that text**: is it a recognizable **earlier form of this addition's own text**? The reference file states the criterion under `## Stale when`.

Never ask it of text that read as uncovered, and never ask it first. A section covering the subject in the owner's own words is settled at the first question and is not weighed against this package's wording.

**Semantic closeness is coverage, never staleness.** Doubt resolves the same direction here as it does for coverage — toward leaving the file alone. A section is an earlier form **exactly when** it matches the `## Stale when` criterion — the criterion is the whole test, and you do not add a wording comparison on top of it. Where a condition of the criterion cannot be told to hold, it does not hold, the section is the owner's, and the report says you made that call.

Each addition ends this step in one of three states:

- **absent** — offer it as an addition.
- **stale, in the root `AGENTS.md`** — offer the canonical text as a replacement.
- **covered** — offer nothing, and name what covers it.

A section matching `## Stale when` in a file that is **not** the root `AGENTS.md` — a `CLAUDE.md`, a `.cursorrules` — is reported by name and offered nothing. This skill writes one file; replacing the root copy while an older copy stays in a harness file leaves the repository holding two versions instead of one. Recommend `init` and carry on.

## 4. Offer

Where an addition is **absent**, show its text **verbatim** — the whole thing, not a summary — say where it would go, and ask.

Where an addition is **stale**, show the section as it stands in `AGENTS.md`, then the canonical text **verbatim**, say that it would replace that section and nothing else, and ask.

Do not argue for it past one sentence. The user is reading the actual text; that is the argument.

## 5. Write what was approved

On approval of an **addition**, append the section to the root `AGENTS.md`, outside the managed region, preserving the surrounding file exactly.

On approval of a **replacement**, replace that one section in place — from its heading through to the next heading of the same or higher level — and leave every other byte of the file as it was. Do not relocate it, do not reformat around it, and do not touch the managed region.

Strip the fence when you write. The ``` markers around the addition in its reference file are there so you can see where the text begins and ends; the section goes into `AGENTS.md` as prose, not as a code block.

On a decline, write nothing. A declined replacement leaves the stale section exactly where it stands.

## 6. Report

Report every run, whichever way it went: what you read, the verdict for each addition and why — absent, covered, or an earlier form — what you offered, and what was written. A run that offers nothing still reports — that is the only way the user can tell "already covered" from "did not look".

## Rules

- **Detection decides every run.** There is no first-run path and no memory of a previous decline; run the same way every time. A section the user deleted reads as absent and is offered again, because absence is the whole state. If that becomes annoying, the fix is the user declining `init`'s offer to run this skill, not a flag here.
- **Never write without approval.** The offer is the whole point.
- **Never silently overwrite.** A replacement is an offer like any other; the same gate that governs an addition governs it, word for word.
- **Never edit an addition to fit a repository.** The wording is fixed. Offer it as written or not at all.
- **Never touch the managed region**, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Local agent configuration only. Do not change workflows, repository settings, or unrelated project files.
