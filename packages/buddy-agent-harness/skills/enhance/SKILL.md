---
name: enhance
description: Use this skill when a repository already has an AGENTS.md and you want to add guidance it is missing — offering vetted sections one at a time and writing only what the user approves. Runs on its own or straight after init.
argument-hint: '[--root <dir>]'
---

# Harness Enhance

`init` consolidates what a repository already has. `enhance` proposes what it does not.

The split matters: initialization has to run everywhere and invent nothing, so it carries no opinions. An addition is opinionated by construction, and worth having only where its subject is missing. Keeping them apart is what lets `init` stay safe to run on any repository.

Every addition is **offered, never written on sight**. An addition asserts something about how the repository is worked in — it stays true whether or not this tool ever ran — so it is material under the rule in `../init/references/agents-md.md`, and material content needs approval. Nothing here goes inside the `buddy-agent-harness` managed region; that region is for the tool's own bookkeeping.

One addition ships today: `references/delegation.md`.

## 1. Find the instruction file

Locate the Git repository root. The target is the root `AGENTS.md`.

If there is no root `AGENTS.md`, stop and say so. This skill adds to an existing file; creating one is `init`'s job, so point there and write nothing.

A nested `AGENTS.md` is never a target. It governs its own subtree, and none of these additions are subtree-scoped.

## 2. Read the merged view

Read the root `AGENTS.md`. Then read any harness instruction file whose content still belongs in it — `CLAUDE.md` with a body of its own, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`. `../init/references/detection.md` lists them.

Judge against all of it together. That combined text is what an agent effectively reads, so guidance living in a Cursor always-on rule counts as present even though `AGENTS.md` does not carry it yet.

**Read those files; do not consolidate them.** Merging them into `AGENTS.md` is `init`'s work and belongs to `init` alone. If you find content that should be consolidated, say so and recommend `init` — then carry on with the coverage judgment.

## 3. Judge coverage

For each addition, ask: **does the merged view already tell the agent what this addition would tell it?**

Judge by meaning, not by heading or wording. A repository covering delegation under `## Working with subagents`, or in three sentences inside a longer section, is covered. A repository that mentions subagents only to name a tool is not.

When in doubt, treat it as covered and say why. A missing offer costs the user nothing; a duplicate section teaches every future agent that this file repeats itself.

## 4. Offer

Where an addition is uncovered, show its text **verbatim** — the whole thing, not a summary — say where it would go, and ask.

Do not argue for it past one sentence. The user is reading the actual text; that is the argument.

## 5. Write what was approved

On approval, append the section to the root `AGENTS.md`, outside the managed region, preserving the surrounding file exactly.

On a decline, write nothing.

## 6. Report

Report every run, whichever way it went: what you read, what you judged covered and why, what you offered, and what was written. A run that offers nothing still reports — that is the only way the user can tell "already covered" from "did not look".

## Rules

- **Detection decides every run.** There is no first-run path and no memory of a previous decline; run the same way every time. A section the user deleted reads as absent and is offered again, because absence is the whole state. If that becomes annoying, the fix is the user declining `init`'s offer to run this skill, not a flag here.
- **Never write without approval.** The offer is the whole point.
- **Never edit an addition to fit a repository.** The wording is fixed. Offer it as written or not at all.
- **Never touch the managed region**, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Local agent configuration only. Do not change workflows, repository settings, or unrelated project files.
