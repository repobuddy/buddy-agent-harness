# Conclusion: agent self-improvement loops for a repository

## Last updated

November 2026

## Question

What is the best way to add a self-improvement loop to a repository, so its agent setup (AGENTS.md, skills, checks,
standards, docs) improves from what happens in use, without relying on hooks? How do Matt Pocock's `/retro`, Every's
compound engineering, scheduled CI loops, review-bot learning, and SDD v1's doctrine loop compare, how is the loop
scheduled where nothing else schedules it, and what of it fits `buddy-agent-harness:enhance` and `/skill enhance`?

## Verdict

1. **Hooks are not needed, and should not be the mechanism.** Every method with measured gains, and every repo loop
   found in practice, runs after the fact from a record: a session log, merged PRs and their review threads, or a
   committed work log. Hook events and transcript formats differ by harness and hook capture is reported to drop
   events. Pocock reports being "burned by auto-hooks".
2. **The loop is a retro: read a record, propose, approve item by item.** Pocock's `/retro`, Every's `/ce-retro`, and
   SDD's doctrine loop all read after the fact and change nothing until a human picks. They differ in source: one
   session log, all sessions since the last run across harnesses, or each finished mission's committed log.
3. **Put each lesson in its cheapest durable form, and AGENTS.md last.** In order: a deterministic check (lint rule,
   test, CI job), a standard only the reviewer reads (`CODING_STANDARDS.md`), a pointer in a file the agent already
   reads, and only then an always-loaded line. `/retro` ("Default to building the check over writing the rule"),
   `/ce-compound` ("cheapest durable form"), and the ETH study (generated context files add over 20% cost for no gain)
   agree. The one loop that writes lessons straight into AGENTS.md and `agent_docs/` (UiPath) tripled those files in
   seven months. This replaces the earlier "promote into AGENTS.md or a skill".
4. **Learn from outcomes, not anticipation.** Context learned from feedback in use helped (ACE +10.6%); context
   written up front did not (SkillsBench self-generated skills -1.3 points, curated +16.2). Pocock: "A smooth session
   has little to teach."
5. **Challenge each candidate before showing it.** Check it against the current code and drop it if already resolved,
   already covered, or not needed; zero candidates is a complete retro. In one user's 17 retros, 15 were followed by the
   user demanding proof. SDD validates each candidate against current code and records a cut as a tombstone; `/ce-retro`
   applies "the narrowest check that could show a fix is unneeded".
6. **Keep a decision record, and grade what landed.** Each accepted change carries the signal a later run should see
   if it worked; each rejection carries its reason. The next run grades earlier changes (a failed one becomes a revert
   candidate), skips rejected friction unless newer evidence appears, and counts recurrence. `/ce-retro` keeps this
   locally and untracked; SDD keeps it in a git-tracked ledger with categorical fields only. Choose by what the record
   holds: transcript paraphrase stays local, publish-safe categories can be committed.
7. **Guard every change.** Small itemized edits, never a full rewrite (a rewrite collapsed ACE's context to 122 tokens).
   Repeat evidence before a one-off becomes a rule. Approval per item when the signal is noisy; an eval gate for
   skills; evidence from someone other than the proposer before adopting or dropping a rule (SDD). A reason kept beside
   each instruction. A narrow write scope that fails the run when exceeded (Spatie). A prune pass that deletes what a
   check now covers or the code no longer supports (`/ce-compound refresh`, SDD's PRUNE strategy).
8. **Run it by hand, at the end of a workflow, or due-checked; schedule only as an opt-in.** Built-in schedulers do
   not cover the case: Claude Code `/loop` lives in an open session and expires in 7 days, desktop and Codex
   automations need the app open and are set up per user, cloud tasks and Cursor Automations need a paid plan and see
   no local transcripts, Copilot CLI and Gemini CLI have none, and CI sees only repo data. The portable fallback is a
   due-check, as oh-my-zsh, Homebrew, update-notifier, and `git gc.auto` do: at session start or a workflow's end,
   compare a local `lastRun` with the configured interval and remind or offer. It needs no account, infrastructure, or
   hook, and keeps transcript access. How reliably an agent follows it is unmeasured.
9. **An unattended run only proposes.** With no user to answer, `/ce-retro` writes a candidates file and applies
   nothing; SDD files issues but ratifies nothing. Pocock's experimental `chief-of-staff` lets the agent apply its own
   picks on a fifth of subagent sessions, with no results, against his own "do not automate" advice. And skip a due
   run while earlier proposals wait: UiPath's runs all succeeded, but one PR has sat unreviewed for over a month and
   absorbed four weekly runs.
10. **Reuse what harnesses already record; build only the improvement step.** Built-in memories and transcripts are
    written with no hooks. A learnings file, written by an AGENTS.md rule and used as an inbox never loaded as
    instructions, is a fallback for a harness with neither (possibly Cursor). Where the project already keeps a work
    log (SDD's combat log, merged PRs and reviews), read that first: it survives merge and other machines, which
    transcripts do not.
11. **What `buddy-agent-harness:enhance` would install.** `enhance` adds the loop to a repo; it does not improve
    anything itself. The loop: a retro step that reads the record, challenges candidates, proposes each in its cheapest
    durable form with evidence and reason, writes only what the user approves, and logs every decision; a prune pass;
    and the due-check with the setting below. `/skill enhance` uses the same sources and keeps a skill change only when
    `test` shows no criterion got worse.
12. **Build on references, not a base.** claude-reflect is Claude-only and keeps no reasons or counts. `/retro` is the
    clearest statement of where lessons belong but keeps no record. `/ce-retro` has the fullest record and the widest
    session reader (Claude Code, Codex, Cursor, Pi) but no schedule and is bound to its plugin. SDD's doctrine loop has
    the strongest evidence gates but needs SDD's mission lifecycle. A shared session reader still belongs in
    `cyber-agentkit`.

## Reference material

### The loops compared

| Loop | Trigger | Reads | Writes to | Gate | Record | Results |
| --- | --- | --- | --- | --- | --- | --- |
| Pocock `/retro` | user only | one session log | checks, `CODING_STANDARDS.md`, pointers; trims AGENTS.md | user picks | none | none published; user reports of noise |
| Pocock `chief-of-staff` (experimental) | 1 in 5 subagent sessions | those sessions | as `/retro` | agent picks | none | none |
| Every `/ce-compound` | user, or `/lfg` | the solved problem | test or lint rule, `CODING_STANDARDS.md`, `docs/solutions/` | consent to touch instructions | doc frontmatter | none |
| Every `/ce-retro` | user | sessions since last run, 4 harnesses | environment fixes | user per item | local `decisions.jsonl` with signals | none |
| SDD doctrine loop | mission shipped or killed, recurrence, drift, waste, milestone | committed combat log; transcripts optional | ledger strategy, then issues | Council keep-or-cut | git-tracked ledger, `cause` counts, tombstones | none |
| UiPath `enhance-claude-docs` | weekly cron in CI | merged-PR review threads | CLAUDE.md, AGENTS.md, `agent_docs/` | normal PR review | PR history | 21 of 26 merged; docs tripled; review stalled |
| Spatie docs loop | weekly cron in CI | commits | docs folder only | draft PR, checkboxes | reverts as rejections | none |
| Cursor Bugbot, CodeRabbit | per PR | review reactions and chat | vendor store | none, or a delay that fails open | vendor dashboard | vendor figures only |

### Where a lesson goes

| Lesson | Form | Example |
| --- | --- | --- |
| A mechanical mistake | a check that fails | lint rule, test, CI job |
| A judgement call | a standard the reviewer reads | `CODING_STANDARDS.md` |
| A slow search or missing context | a pointer where the agent already looks | a link in an existing doc |
| A workflow repeated by hand | a skill or script | a new skill |
| Something every turn needs | an always-loaded line, with its reason | AGENTS.md |
| A rule a check now covers, or a false one | deletion | prune pass |

### Fallback scheduling: the setting the precedents suggest

| Field | Values | Default | Precedent |
| --- | --- | --- | --- |
| `mode` | `off`, `remind` (mention it is due), `offer` (start the retro, which still asks per item) | `remind` | oh-my-zsh `disabled`, `reminder`, `prompt` |
| `frequency` | days | 7 | oh-my-zsh 13 days, Homebrew and update-notifier 1 day |
| `lastRun` | timestamp, user-local state | none | git `maintenance.<task>.lastRun`, update-notifier configstore |
| opt-out | environment variable; skipped in CI and headless runs | none | `HOMEBREW_NO_AUTO_UPDATE`, `NO_UPDATE_NOTIFIER` |
| unattended | optional installer for cron, systemd, launchd, or schtasks running a headless CLI with a budget cap, writing proposals only | not installed | `git maintenance start` |

A checked-in file can carry the repo's default `mode` and `frequency`; the user-local value overrides it, and
`lastRun` is always local, because the transcripts it reads are. No mode applies changes. A due run is skipped while
earlier proposals are unreviewed.

| Scheduler | Runs with no user | Needs | Sees local transcripts | Declared in repo |
| --- | --- | --- | --- | --- |
| Due-check at session start or workflow end | no | nothing | yes | instruction yes, state local |
| Claude Code `/loop` | no, open session, 7 day expiry | nothing | yes | prompt only |
| Claude Code desktop task, Codex automation | while the app is open | the app | yes | no |
| Claude Code cloud task, Cursor Automations | yes | paid plan | no | no |
| CI `schedule:` (claude-code-action, gh-aw) | yes | API key secret, minutes | no | yes |
| OS scheduler plus headless CLI | yes, machine on | headless auth | yes | through an installer |

### Earlier reference (November 10)

| Harness | Hooks with session end | Headless run | Past transcripts readable without a hook |
| --- | --- | --- | --- |
| Claude Code | yes | `claude -p` | yes, `~/.claude/projects/`, 30 day default retention |
| Codex CLI | yes | `codex exec` | yes, `~/.codex/sessions/`, format not stable |
| Cursor | yes | `cursor-agent -p` | no documented path; `/ce-retro` reads `~/.cursor/projects` |
| Copilot CLI | yes | `copilot -p` | yes, session-state folder (path unverified) |
| Gemini CLI | yes | `gemini -p` | yes, `~/.gemini/tmp/<project>/chats/` |

| Guard | Failure it prevents | Source |
| --- | --- | --- |
| Small itemized deltas, no full rewrite | context collapse, brevity bias | ACE |
| Cheapest durable form, AGENTS.md last | instruction bloat and cost | `/retro`, `/ce-compound`, ETH study, UiPath growth |
| Challenge against current code before presenting | noise, stale or invented lessons | mattpocock/skills#1173, SDD, `/ce-retro` |
| Repeat evidence before promoting a rule | one episode becomes an over-general rule | OEP, Dynamic Cheatsheet, SDD `cause` counts |
| Approval per item, evidence cited | wrong lessons, duplicates, overwritten work | claude-reflect, Gemini inbox, all repo loops |
| Decision record with success signals | changes that never worked, re-raised rejections | `/ce-retro`, mattpocock/skills#1379, SDD tombstones |
| Non-author evidence for rule changes | a proposer proving its own rule | SDD |
| Eval gate on skills | changes that feel better but score worse | GEPA, DGM, skill-creator |
| Reason kept beside each instruction | file growth and regrowth | Chakrabarti preprint |
| Narrow write scope, run fails outside it | edits beyond the loop's remit | Spatie |
| Prune pass | stale and superseded lessons | `/ce-compound refresh`, SDD PRUNE |
| Skip while proposals wait | review fatigue, piled-up runs | UiPath |

## Confidence

Medium. The design (after the fact, outcome-driven, challenged, cheapest form, reviewed, recorded, pruned) is
consistent across research, vendor designs, and five repo loops. No repo loop publishes controlled results; effect
sizes come from a few benchmarks, one preprint, and self-reported issue data.

## Strongest supporting evidence

- ACE's ablations on delta edits versus rewrites (A2-E01, A2-E02); SkillsBench self-generated versus curated skills
  (A2-E13).
- `/retro`, `/ce-compound`, and SDD all routing lessons to checks and reviewed governance first (B1-E03, B2-E01,
  B5-E02), against UiPath's tripled docs from the opposite design (B2-E05) and the ETH study (B2-E11).
- User-reported retro noise and ungraded changes (B1-E06), answered by `/ce-retro`'s record (B2-E02) and SDD's
  validation gate (B5-E03).
- Scheduler capabilities from official docs (B3-E01 to B3-E04) and long-lived due-check precedents (B3-E05).

## Strongest weakening or contradictory evidence

- Self-written context helps (ACE) versus does not (SkillsBench, ETH); explained by feedback in use versus written up
  front, untested directly.
- Pocock warns against automating retros, then automated them for subagent sessions (B1-E04, B1-E05).
- Bugbot promotes rules with no human gate and reports large gains (B2-E07), though not attributed to the rules.
- The sources are not independent: `/ce-retro` postdates `/retro` and declines to cite it; the doctrine loop is the
  user's own design.

## What is not supported

- Letting an agent rewrite AGENTS.md or a skill without approval or an eval gate, or regenerating it on a schedule.
- Writing every lesson into AGENTS.md.
- Keyword-based detection of corrections.
- A scheduled or unattended run that applies changes.
- Any claim that hooks capture reliably across harnesses.

## Where evidence is thin

- No loop publishes results; the only numbers are self-reported (B1-E06), repository counts (B2-E05), and vendor
  figures (B2-E07).
- No measurement of how reliably an agent runs a due-check instruction.
- The reason-beside-instruction result is one author's preprint.
- Cursor and Copilot CLI transcript paths; Codex local transcript access from automations is inferred.
- Several pages were read through summarizing fetches or search snippets, as marked in `evidence.md`.

## What should be checked again later

- Whether `/ce-retro` ships a scheduled mode, and whether `chief-of-staff` leaves `in-progress` with results.
- Maintainer responses to mattpocock/skills#1173 and #1379.
- Whether UiPath's pending PR merges, and whether that repo adds a prune step.
- Whether a harness adds a repo-declared schedule that can read local sessions.
- Whether Gemini CLI Auto Memory leaves experimental status, and Cursor documents a transcript path.
