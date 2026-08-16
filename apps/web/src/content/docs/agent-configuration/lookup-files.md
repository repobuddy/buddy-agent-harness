---
title: Lookup Files
description: 'A convention for giving a portable skill the project-specific pointers it needs: where to look for content of a given kind, without paying for it every session.'
---

A portable skill states a method. It cannot state where anything lives in your repository, because it does not know. A **lookup file** supplies that half.

`LOOKUP.<SET>.md` answers one question: **where do I look for content of a given kind?** A skill reads it by name when it needs the answer, and works without it when the project has none.

This is a convention of this project, not part of the [Agent Skills](https://agentskills.io/specification) or [AGENTS.md](https://agents.md/) standards. Nothing registers these files: the skill that names one reads it by path.

## Why not the instruction file

Repository layout used to go in `AGENTS.md` or `CLAUDE.md`, under a heading like Project Structure or Key Directories. That is [Reference](/agent-configuration/instruction-purpose/), and an instruction file loads on every session. So the project pays for the map on every turn, including the ones that never touch a document.

A lookup file costs nothing until a skill reads it.

## Why not a skill

A skill is a procedure the agent is selected to run. A lookup file is reference data the agent is told to read. Packaging the second as the first forces a [Direct Invocation skill](/agent-configuration/skills/direct-skill/) with a deliberately unmatchable description. Needing to suppress selection entirely is the signal that the thing is not selected at all.

Those solve a different problem: a caller naming a role that any package may supply. Repository layout is not that shape, because no external package will ever supply your directory map.

## Naming

The head is fixed. The segment names the artifact set, so the family sorts together and `LOOKUP.*.md` enumerates what a project defines. This repository has one, `LOOKUP.DOC.md`.

Draw the segment from the artifact sets the project actually has, not from a taxonomy invented in advance. Write the second when something needs it.

The fixed head is doing work: it fences the content. A writing rule in a file called `LOOKUP` is visibly out of place, and that is the point. These files attract unrelated material otherwise.

## Location

The repository root, or `.agents/`. A skill checks the root first.

Root suits a file contributors read. `.agents/` suits one written for agents, and keeps the root clear.

## What goes in

Pointers, and nothing else:

- Where the authority for a kind of claim lives.
- Which source file a generated table must match.
- Which page owns a fact that other pages link to.

What does not:

- Rules, style, or procedure. Those belong in the skill that reads the file.
- Anything derivable by looking. A path an agent finds in one `ls` is not worth stating, and it goes stale.

That last exclusion decides whether a project needs one at all. A flat repository's locations are guessable, so the file earns its place only where the tree is large enough that they are not.

## Staleness

A lookup file is a cache of where things currently are. It can drift, and nothing validates it.

Keep it short enough to re-read in full during a move, and treat a wrong pointer as the same defect class as a broken link.
