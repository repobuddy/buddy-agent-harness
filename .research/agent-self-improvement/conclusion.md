# Conclusion: agent self-improvement without hooks

## Last updated

November 2026

## Question

How can an agent setup improve its own instructions and skills from what happens in use, without relying on hooks,
and what of that fits `buddy-agent-harness:enhance` and `/skill enhance`?

## Verdict

1. **Hooks are not needed, and should not be the mechanism.** Every method with measured gains runs after the fact,
   from a record of what happened. All five harnesses (Claude Code, Codex, Cursor, Copilot CLI, Gemini CLI) now have
   session-end hooks, but their events and transcript formats differ and hook capture is reported to drop events.
   Treat a hook as an optional way to queue signals sooner, never as the only path.
2. **The hook-free pattern is: mine sessions on demand, propose, approve item by item.** Read the session record
   (the current session, or past transcripts where the harness keeps them), extract corrections, failures,
   workarounds and mis-triggers, and offer each proposed change on its own with the evidence cited. Gemini CLI's Auto
   Memory inbox, claude-reflect's history scan, and the Alderson transcript method all work this way.
3. **Learn from outcomes, not anticipation.** Context the agent writes from feedback in use helped (ACE +10.6%);
   context written up front did not (self-generated skills -1.3 points on SkillsBench, curated +16.2).
4. **Guard every change.** Small itemized edits, never a full rewrite (a rewrite collapsed ACE's context to 122 tokens
   and below baseline). Repeat evidence before a one-off correction becomes a rule. Human approval when the signal is
   noisy, an eval gate for skills. The reason kept beside each instruction, which one study found stops most file
   growth. A version history so a bad edit can be reverted.
5. **Reuse what harnesses already record; build only the improvement step.** Built-in memories (Claude Code,
   Codex, Copilot) and session transcripts (Claude Code, Codex, Copilot CLI, Gemini CLI) are written by the harness
   with no hooks, and already hold the corrections a learnings file would. Writing a separate `LEARN.md` would keep a
   second copy that can disagree. Keep a learnings file, written by an AGENTS.md rule and used as an inbox never
   loaded as instructions, only as a fallback for a harness with neither readable memory nor transcripts (possibly
   Cursor). Transcripts are also the only source for what nobody flagged, such as manual steps repeated across
   sessions that could become a skill.
6. **Capture and improvement need different triggers.** Capture is done by the harness itself (memory and
   transcripts), or by one always-loaded AGENTS.md line where the fallback file is used; a skill description cannot
   fire on a correction, because a correction is not a request. The improvement step has no event
   without hooks: the user runs it, another workflow's end offers it (such as `checkpoint create`), or a schedule runs
   it over transcripts.
7. **What `buddy-agent-harness:enhance` would install.** `enhance` adds the self-improvement feature to a repo; it does
   not improve anything itself. The feature is an improvement step (plus the capture line and inbox only where the fallback is needed) that
   offers each ready entry, or each transcript pattern, as a change to its proper home (AGENTS.md or a skill), one at a
   time, with the evidence and its reason kept beside each accepted line. `/skill enhance` uses the same sources and
   keeps a skill change only when `test` shows no criterion got worse.
8. **A shared session reader belongs in `cyber-agentkit`.** Reading each harness's past sessions and memory store the
   same way is a harness-agnostic feature, so `buddy-agent-harness` and `/skill enhance` can share one reader. It needs its own
   research: paths and formats are confirmed for only some harnesses.

9. **No existing hook-free system can be the base.** The nearest, claude-reflect (MIT, Python, Claude plugin, about
   1,900 stars), reads only Claude Code history in its hook-free mode, has no reader for other harnesses, approves
   through a Claude-only tool, keeps no reason beside a written line, counts no recurrence, and offers no library or
   CLI for another tool to depend on. Use it as a reference: its review cards, its marked AGENTS.md block, its minimum
   count before a tool error becomes a lesson, and its dedupe and organize passes. Copy Gemini CLI's inbox design
   (proposals wait for approval, never applied directly) rather than depending on it.

## Reference material

| Harness | Hooks with session end | Headless run | Past transcripts readable without a hook |
| --- | --- | --- | --- |
| Claude Code | yes | `claude -p` | yes, `~/.claude/projects/`, 30 day default retention |
| Codex CLI | yes | `codex exec` | yes, `~/.codex/sessions/`, format not stable |
| Cursor | yes | `cursor-agent -p` | no documented path |
| Copilot CLI | yes | `copilot -p` | yes, session-state folder (path unverified today) |
| Gemini CLI | yes | `gemini -p` | yes, `~/.gemini/tmp/<project>/chats/` |

| | Learnings file (written in session) | Transcripts (read afterwards) |
| --- | --- | --- |
| Catches | noticed mistakes: corrections, failures with a found fix | everything, including unflagged repeated steps, friction, mis-triggers |
| Depends on | the agent following the capture rule, which it sometimes skips | nothing during the session |
| Signal | high, written with the context of the moment | raw, needs mining |
| Harnesses | all | not Cursor without a hook; formats differ, Codex unstable |
| Lifetime | until promoted or removed; counts recurrence | the harness's retention (Claude Code 30 days) |
| Cost | small write per lesson, cheap to read | large to read, one parser per harness |
| Risk | becomes a rules file if loaded as instructions | may hold secrets the miner must not copy out |

| Trigger | Reliability | Role |
| --- | --- | --- |
| User runs an improve command | high | improvement step |
| Skill description matching corrections | low to medium; a correction is not a request; keyword matching gave false positives | backup for explicit asks ("remember this") |
| One AGENTS.md line, in context every turn | medium to high, all harnesses; sometimes skipped | capture |
| End of another workflow (checkpoint, commit) | high | improvement step, offered |
| Scheduled headless run over transcripts | high where transcripts exist | batch improvement |

| Guard | Failure it prevents | Source |
| --- | --- | --- |
| Small itemized deltas, no full rewrite | context collapse, brevity bias | ACE |
| Repeat evidence before promoting a rule | one episode becomes an over-general rule | OEP, Dynamic Cheatsheet |
| Approval per item, evidence cited | wrong lessons, duplicates, overwritten work | claude-reflect, autoharness issues, Gemini inbox |
| Eval gate on skills | changes that feel better but score worse | GEPA, DGM, skill-creator |
| Reason kept beside each instruction | file growth and regrowth | Chakrabarti preprint |
| Expiry or helpful and harmful counts | stale learnings | Copilot Memory, ACE |

## Confidence

Medium. The direction (after the fact, outcome-driven, reviewed, small deltas) is consistent across all three angles.
Effect sizes come from a few benchmarks and one preprint.

## Strongest supporting evidence

- ACE's ablations on delta edits versus rewrites, with measured collapse (A2-E01, A2-E02).
- SkillsBench self-generated versus curated skills (A2-E13).
- Gemini CLI Auto Memory and Copilot Memory as shipped vendor designs (A1).
- Reported failures of the one tool that writes without approval (A3 table).

## Strongest weakening or contradictory evidence

- ACE and Dynamic Cheatsheet show self-written context helping, SkillsBench and the AGENTS.md study show it not
  helping. The difference matches "feedback in use" versus "written up front", but no study tests that split directly.
- Hook-based tools (ECC, claude-mem) are far more popular than hook-free ones, so popularity favours hooks even where
  reliability does not.

## What is not supported

- Letting an agent rewrite AGENTS.md or a skill without approval or an eval gate.
- Keyword-based detection of corrections (false positives reported).
- Any claim that hooks capture reliably across harnesses.

## Where evidence is thin

- The reason-beside-instruction result is one author's preprint on controlled tasks.
- The AGENTS.md study and several Claude Code issues were read through search summaries only.
- No independent reports compare reviewed and unreviewed learning tools on quality.
- Cursor transcript access without a hook, and Gemini CLI's consumer availability.

## What should be checked again later

- Whether Gemini CLI Auto Memory leaves experimental status, or a similar inbox ships in another harness.
- Whether Cursor documents a transcript path.
- Whether `claude plugin eval` or another harness tool adds a "learn from sessions" mode.
- Copilot CLI and Cursor transcript paths, before a shared reader is designed.
