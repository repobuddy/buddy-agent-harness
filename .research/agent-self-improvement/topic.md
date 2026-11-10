# Agent self-improvement without hooks (November 2026)

## Question

How can an agent harness setup improve its own skills and instructions (AGENTS.md, skills, memory) from what happens
in use, when the harness offers no hooks, or hooks that differ per harness? Which mechanisms work across Claude Code,
Codex, Cursor, GitHub Copilot CLI, and Gemini CLI, and what of it fits `buddy-agent-harness:enhance` (which offers
vetted AGENTS.md additions one at a time, writing only what the owner approves) and `/skill enhance` (suggestions from
evidence of use)?

## Scope

In scope: how learning signals are captured (corrections, failures, workarounds, mis-triggers), when the improvement
step runs without hooks, how changes are proposed, gated, and verified, and what goes wrong (drift, bloat, overfitting,
self-reinforcing errors). Out of scope: model fine-tuning and training-time methods.

## Source angles

- A1. Harness and vendor features: built-in memory and self-update features, and which harnesses have hooks.
- A2. Research and builder write-ups: published methods for agents that improve their own context or skills, with
  results and failure reports.
- A4. claude-reflect read from its code, as the nearest reuse candidate.
- A3. Practice in the wild: open-source tools, plugins, and community patterns for self-improving agent setups, and
  their reported results and problems.

## Findings

### Hooks are not the mechanism

All five harnesses now have hooks with a session-end event (A1 per-harness summary), but event names, payloads and
transcript formats differ, Codex calls its transcript format unstable, and hook-based capture drops events under load
(A3-E contradictions 1). Every published method that worked runs after the fact, from a record of what happened (A2
L11). Transcripts are on disk for Claude Code (30 day retention), Codex, Copilot CLI and Gemini CLI; Cursor exposes
them only to hooks (A1 summary). Headless runs exist in all five.

### Learn from outcomes, not from anticipation

Self-written context helped when it learned from feedback during use (ACE +10.6%, Dynamic Cheatsheet), and did not
help or hurt when written up front (SkillsBench self-generated skills -1.3 points, curated +16.2; an AGENTS.md study
found no success gain and over 20% more cost) (A2 contradictions, L5).

### How changes go wrong, and the guards

Full rewrites collapse context (ACE: 18,282 tokens to 122, accuracy below baseline); use small itemized deltas (A2 L1).
One episode turns into an over-general rule; require repeat evidence (A2 L8). Wrong judges amplify errors; keep a human
approval step when the signal is noisy, and an eval gate for skills (A2 L3, L4). Instruction files grow +226% and regrow
after rewrites; keeping the reason beside each instruction cut excess growth from +211% to +1.4% in one preprint
(A3). Review before write is the norm among tools; the one tool that writes without approval shows duplicates and an
overwrite of a hand-written skill (A3 table).

### Vendor and tool designs closest to the goal

Gemini CLI Auto Memory mines past transcripts and puts drafted patches and skills in an inbox the user approves item by
item (experimental, off by default). Copilot Memory adds citations, voting and 90 day expiry. Claude Code and Codex
memory write to a private store without per-item approval and never touch AGENTS.md or skills (A1). Among tools,
transcript mining on demand (claude-reflect `--scan-history`, the Alderson method) is hook-free and reviewed (A3).

### Two sources, two triggers

Comparing the user's proposed learnings file with transcript reading: the file catches noticed mistakes cheaply on
every harness and can count recurrence, but depends on the agent following the rule and misses what nobody flagged.
Transcripts catch unflagged patterns, such as repeated manual steps that could become a skill, but depend on per
harness paths, formats, and retention. The file is an inbox, not instructions, to avoid the growth and cost findings
above. Capture needs an always-loaded line, since skill descriptions match requests, not corrections; the improvement
step is run by the user, offered at the end of another workflow, or scheduled. `buddy-agent-harness:enhance` installs
this feature; it is not the improvement step.

### Reuse versus build

The user wants a system that does not rely on hooks, built or reused. Harness memories and transcripts need no hooks
and are the sources to reuse. claude-reflect, read from its code (A4), is Claude Code only for reading, approves
through a Claude-only tool, and has no library or CLI contract, so it is a reference, not a base. No hook-free,
cross-harness system that promotes lessons into AGENTS.md or skills with approval was found.

## Contradictions

See the per-angle contradiction lists in `evidence.md`. The main ones: self-written context helps (ACE) versus hurts
(SkillsBench), explained by feedback during use versus writing up front; hooks claimed reliable versus shown lossy;
whether Cursor still has automatic memories; whether Gemini CLI consumer access has ended.

## Open questions

- Whether the reason-beside-instruction result (single-author preprint) holds outside controlled tasks.
- How a session miner should read Cursor sessions without a hook.
- Where the learnings file lives and what it is called (`LEARN.md` or `.agents/learnings.md`), and whether it is
  kept out of git.
- How many repeats of a correction should count as evidence enough to offer a rule.
