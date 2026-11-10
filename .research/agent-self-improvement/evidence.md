# Evidence: agent self-improvement without hooks

Claims are grouped by source angle (A1 harness features, A2 research methods, A3 practice). IDs keep their angle prefix.


Angle A1 of the agent self-improvement topic. Date of all checks: 2026-11-10. Vendor pages were read through WebFetch (a small model summarizes the page), so quotes are as returned by that summary. Items taken only from search snippets are marked.

## A1-E01
- claim_id: A1-E01
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, How Claude remembers your project (auto memory)
- source.url: https://code.claude.com/docs/en/memory
- source.type: official docs
- notes: Auto memory is on by default in local sessions. Claude saves four note types (user, feedback, project, reference) and skips what it can derive from code or what CLAUDE.md already says. Files live in `~/.claude/projects/<project>/memory/` with a `MEMORY.md` index (first 200 lines or 25KB load each session) and topic files. It is machine-local, shared across worktrees of one repo. The write is not gated by a per-item approval prompt; the UI shows "Saved N memories". The user reviews and edits through `/memory`. Toggle: `/memory`, `autoMemoryEnabled` setting, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. Memory files are exempt from the transcript retention sweep.

## A1-E02
- claim_id: A1-E02
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, memory page, "ask Claude to remember" and CLAUDE.md routing
- source.url: https://code.claude.com/docs/en/memory
- source.type: official docs
- notes: "Remember X" goes to auto memory, not CLAUDE.md. To change CLAUDE.md the user must ask for it explicitly or edit via `/memory`. Docs state CLAUDE.md and memory are context, not enforced config; for must-run behavior use hooks. The old `#` shortcut is not described on the current page (unverified whether it still exists).

## A1-E03
- claim_id: A1-E03
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, hooks reference
- source.url: https://code.claude.com/docs/en/hooks
- source.type: official docs
- notes: 33 events, including SessionStart, SessionEnd, UserPromptSubmit, Stop, StopFailure, PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, SubagentStop, PreCompact, PostCompact, InstructionsLoaded, FileChanged. Hook types: command, http, prompt, agent (experimental), mcp_tool. Every event gets `transcript_path` (file written asynchronously, may lag the current turn). `Stop` and `SubagentStop` also give `last_assistant_message`. Only first 100,000 characters of the page were read; the rest is unread.

## A1-E04
- claim_id: A1-E04
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, run Claude Code programmatically (`claude -p`)
- source.url: https://code.claude.com/docs/en/headless
- source.type: official docs
- notes: `claude -p` runs one prompt and exits; `--output-format json|stream-json`; `--continue` and `--resume <id or .jsonl path>`; `--json-schema` for structured output. Without `--bare`, `-p` loads hooks, skills, plugins, CLAUDE.md and auto memory from the working directory and `~/.claude`. With `--bare` all of those are skipped (and the plan is for bare to become the default). User-invoked skills work in `-p` by writing `/skill-name` in the prompt. SIGTERM still runs `SessionEnd` hooks. Since v2.1.302 `-p` starts in Manual permission mode when nothing sets a mode, so unattended runs need `--allowedTools`, `--permission-mode` or `--permission-prompts none`.

## A1-E05
- claim_id: A1-E05
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, auto memory toggle limits in background and nested sessions
- source.url: https://code.claude.com/docs/en/memory
- source.type: official docs
- notes: In a background session, or a session another Claude Code session started through its Bash tool, the auto memory toggle can turn memory off but not back on. Relevance: a scheduled or nested `claude -p` improver cannot count on auto memory being writable.

## A1-E06
- claim_id: A1-E06
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, .claude directory and application data
- source.url: https://code.claude.com/docs/en/claude-directory
- source.type: official docs
- notes: Transcripts are plaintext JSONL at `~/.claude/projects/<project>/<session>.jsonl`, with subagent transcripts under `<session>/subagents/`. They are deleted after `cleanupPeriodDays` (default 30, minimum 1). `claude -p --no-session-persistence` or `CLAUDE_CODE_SKIP_PROMPT_HISTORY` stops writing them. Transcripts hold file contents, command output and loaded instruction files, so secrets can land in them. `~/.claude/history.jsonl` keeps typed prompts. An `/insights` command writes reports to `usage-data/`. Implication: a mining step has a 30 day window unless the user raises it.

## A1-E07
- claim_id: A1-E07
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: OpenAI Codex docs, Memories
- source.url: https://learn.chatgpt.com/docs/customization/memories?surface=app (redirect from https://developers.openai.com/codex/memories)
- source.type: official docs
- notes: Local Codex memories are off by default. Enable with `memories = true` under `[features]` in `config.toml` or the app setting. Codex turns useful context from eligible prior chats into local files in `$CODEX_HOME/memories_v2/` (or the older `memories/`), runs in the background after a chat goes idle, skips active or short sessions, and redacts secrets. No per-item approval. Docs say not to rely on hand edits as the main control. `/memories` toggles use and generation per chat. A "Delete Codex memories" action resets the store. Docs say required team guidance belongs in AGENTS.md or checked-in docs, and memories are a recall aid.

## A1-E08
- claim_id: A1-E08
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: OpenAI Codex docs, Hooks
- source.url: https://learn.chatgpt.com/docs/hooks (redirect from https://developers.openai.com/codex/hooks)
- source.type: official docs
- notes: Events: PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, UserPromptSubmit, SubagentStop, Stop, PreModelRequest, PostModelRequest, Interrupt, SessionStart, SubagentStart, SessionEnd. Config in `~/.codex/hooks.json`, `config.toml`, `<repo>/.codex/hooks.json`, plugins, or managed `requirements.toml`. Enabled by default; `[features] hooks = false` disables. Project hooks load only for a trusted `.codex/` layer. Input has `transcript_path`, but the docs warn the transcript format is not a stable interface. This differs from this repo's harness-detection note that Codex hook commands get only plugin-root variables (that is about env vars, not events, so no conflict).

## A1-E09
- claim_id: A1-E09
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: OpenAI Codex docs, non-interactive mode (`codex exec`)
- source.url: https://learn.chatgpt.com/docs/non-interactive-mode
- source.type: official docs
- notes: Sessions are saved by default; `--ephemeral` avoids writing rollout files. `codex exec resume --last` or `<SESSION_ID>`. `--json` gives JSONL events (turn.completed, item.*). `-o` saves the last message; `--output-schema` forces a schema. Default sandbox is read-only; `--sandbox workspace-write` allows edits. Docs recommend a read-only job that saves a diff, then a separate job with write access that opens a PR. Transcript path `~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl` is from this repo's earlier research (E-CODEX-H1-H5), not re-checked today.

## A1-E10
- claim_id: A1-E10
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Gemini CLI docs, Auto Memory (experimental)
- source.url: https://geminicli.com/docs/cli/auto-memory/
- source.type: official docs
- notes: This is the closest vendor feature to `/skill enhance`. It reviews past sessions (idle at least 3 hours, at least 10 user messages) as a background task at startup and drafts memory updates as unified-diff `.patch` files and new skills as `SKILL.md` files. Drafts go to a per-project inbox and nothing loads until the user acts. The user reviews with `/memory inbox` (promote, discard, apply or reject patches). Promoted skills go to `~/.gemini/skills/` or `.gemini/skills/`. It produces nothing unless evidence is strong. It cannot edit active memory files, settings, or project GEMINI.md. Off by default; enable with `experimental.autoMemory: true`. Reads transcripts from `~/.gemini/tmp/<project>/chats/`.

## A1-E11
- claim_id: A1-E11
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Gemini CLI docs, Memory tool (save_memory)
- source.url: https://google-gemini.github.io/gemini-cli/docs/tools/memory.html
- source.type: official docs
- notes: `save_memory` appends a fact to `~/.gemini/GEMINI.md` under a `## Gemini Added Memories` heading. The file loads in later sessions and is plain Markdown the user can edit. The page does not say whether the user must approve the write or how to disable the tool. This is an older docs host (github.io); the geminicli.com version of the page failed to load, so current behavior is unverified. `/memory show` and `/memory reload` are documented on the GEMINI.md page.

## A1-E12
- claim_id: A1-E12
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Gemini CLI docs, Hooks
- source.url: https://geminicli.com/docs/hooks/
- source.type: official docs
- notes: 11 events: SessionStart, SessionEnd, BeforeAgent, AfterAgent, BeforeModel, AfterModel, BeforeToolSelection, BeforeTool, AfterTool, PreCompress, Notification. Only `command` hooks. Configured in `settings.json` (project, user, system, extensions). Managed with `/hooks`. `transcript_path` is not mentioned on this page; the hooks reference page was not read, so whether hooks get a transcript path is unverified.

## A1-E13
- claim_id: A1-E13
- date: 2026-11-10
- status: contested
- confidence: medium
- source.label: Google Developers Blog and press on the Gemini CLI to Antigravity CLI transition
- source.url: https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/
- source.type: write-up
- notes: The Google blog fetch failed; details come from search results and secondary press (The Register, The New Stack and others). They say consumer Gemini CLI access ended 2026-06-18 and users moved to the closed-source Antigravity CLI (`agy`). Gemini CLI stays available through paid Gemini API keys and Code Assist or Enterprise licenses. Google says skills, hooks, subagents and extensions carry over, without full parity at launch. The Gemini CLI docs page itself carries a notice about the replacement. Impact: any design that targets Gemini CLI targets a shrinking audience; whether Auto Memory exists in Antigravity CLI is unverified. This repo's earlier research lists Antigravity as closed source with no verified env signal.

## A1-E14
- claim_id: A1-E14
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: GitHub Docs, About Copilot Memory
- source.url: https://docs.github.com/en/copilot/concepts/agents/copilot-memory
- source.type: official docs
- notes: Copilot creates memories itself as a byproduct of work: repository facts (shared with collaborators, cite supporting code) and user preferences (cite the user's words). Default expiry 90 days, reset when Copilot upvotes the memory; owners can set 7 to 180 days. Copilot validates citations against the current branch before use, upvotes or downvotes, and stops using memories downvoted past a threshold. Approval: Copilot CLI interactive sessions and the Copilot app can ask the user to approve a store; the cloud agent and code review do not ask. Only the root agent may call `store_memory` or `vote_memory`. `/memory off` disables both types in interactive CLI; programmatic runs need `--enable-memory`. Repository facts are viewed and deleted in repo settings. This is the only vendor design with citation checks and expiry.

## A1-E15
- claim_id: A1-E15
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: GitHub Docs, hooks configuration reference
- source.url: https://docs.github.com/en/copilot/reference/hooks-configuration
- source.type: official docs
- notes: Copilot CLI and cloud agent share 14 events: sessionStart, sessionEnd (with reason), userPromptSubmitted, userPromptTransformed, preToolUse, postToolUse, postToolUseFailure, permissionRequest, agentStop, subagentStart, subagentStop, errorOccurred, preCompact, notification. The cloud agent loads only `.github/hooks/*.json`; the CLI also loads user (`~/.copilot/hooks/`), inline settings, `.claude/settings.json` hooks, plugins and machine policy files. `agentStop`, `subagentStop`, `preCompact` give `transcriptPath`. Hooks can fire in the cloud agent once per job, so a repo hook file is the one place a hook works for both CLI and cloud agent.

## A1-E16
- claim_id: A1-E16
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Cursor docs, Hooks
- source.url: https://cursor.com/docs/hooks
- source.type: official docs
- notes: Agent hooks: sessionStart, sessionEnd, preToolUse, postToolUse, postToolUseFailure, subagentStart, subagentStop, beforeShellExecution, afterShellExecution, beforeMCPExecution, afterMCPExecution, beforeReadFile, afterFileEdit, beforeSubmitPrompt, preCompact, stop, afterAgentResponse, afterAgentThought. Also tab hooks and `workspaceOpen`. Config in `.cursor/hooks.json`, `~/.cursor/hooks.json`, team and enterprise sources. Input has `transcript_path` (null when transcripts are disabled) and env `CURSOR_TRANSCRIPT_PATH`. `stop` hooks have a `loop_limit` default of 5. Hooks can be type `command` or `prompt`. This fills the gap in the repo note, which recorded Cursor transcript location as undocumented: the hook input is a documented way to get it.

## A1-E17
- claim_id: A1-E17
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Cursor docs, Rules (create-rule)
- source.url: https://cursor.com/docs/context/rules
- source.type: official docs
- notes: Cursor's documented rule-capture path is user-initiated: `/create-rule` in Agent writes a `.mdc` file to `.cursor/rules`. The page names no approval step beyond the user running the command, and no Memories feature. Team Rules can be saved as drafts that do not apply until enabled.

## A1-E18
- claim_id: A1-E18
- date: 2026-11-10
- status: contested
- confidence: medium
- source.label: Cursor forum threads on removed Memories and Generate Cursor Rules
- source.url: https://forum.cursor.com/t/are-my-memories-gone/144057
- source.type: discussion
- notes: Found through search snippets only; the threads were not opened. Staff replies reportedly say the Memories management UI was removed in 2.1.x and that memories could be exported to Rules. Replies conflict on whether the feature itself still runs without a UI. A thread "Why were Generate cursor rules removed?" exists (https://forum.cursor.com/t/why-were-generate-cursor-rules-removed/140847). No official changelog entry was found. Treat Cursor automatic memory as unreliable and unverified; do not rely on it.

## A1-E19
- claim_id: A1-E19
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Cursor docs, CLI headless mode
- source.url: https://cursor.com/docs/cli/headless
- source.type: official docs
- notes: `cursor-agent -p` (also `agent -p`) with `--output-format text|json|stream-json`. Without `--force` or `--yolo`, changes are only proposed, not applied (this resolves one open point in the repo note E-CUR-H1 in favor of the headless page). The page says nothing on resume, transcript storage, or which rules load headless. Transcript location outside hooks remains undocumented.

## A1-E20
- claim_id: A1-E20
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Copilot CLI session storage and `-p` mode (from this repo's research)
- source.url: https://github.com/cyberuni/agent-harness (repo note .research/harness-detection, E-COPILOT-H1-H3)
- source.type: write-up
- notes: The repo note records `copilot -p`, `--allow-all`, and transcripts at `~/.copilot/session-state/<id>/events.jsonl`. Today's fetches of the two GitHub Docs CLI pages did not mention session storage, and one returned 404, so this was not re-verified. Hook input `transcriptPath` (A1-E15) is the documented route.

## A1-E21
- claim_id: A1-E21
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Windsurf (now Devin Desktop) Memories
- source.url: https://docs.devin.ai/desktop/cascade/memories
- source.type: official docs
- notes: The Windsurf memories URL redirects to Devin Desktop docs, and the page returned covers Rules only (AGENTS.md or `.devin/rules/*.md`, scoped by `trigger` frontmatter, injected each session). No Memories description was found. This repo's note says Windsurf was renamed Devin Desktop on 2026-06-02 (E-RET-R5). Older Windsurf auto-generated memories could not be confirmed today.

## A1-E22
- claim_id: A1-E22
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Claude Code GitHub issues on auto memory (stale, truncated, ignored): #85075, #57574, #23769, #37314, #36973
- source.url: https://claudeissues.com/issue/85075-auto-memory-months-old-memory-md-silently-loads-into-every-session-no-freshness
- source.type: maintainer issue
- notes: Seen through a search summary only; the issue pages did not load (host not reachable) and are mirrors of GitHub issues. Reports: months-old MEMORY.md loads with no freshness signal (#85075); silent truncation at about 25KB so recent rules drop (#57574); MEMORY.md corrupted across sessions, causing cascading bad answers (#23769); Claude stores feedback but does not apply it (#37314, #37847, #59666); system prompt once pointed memory writes at a wrong path, closed April 2026 (#36973). The docs now confirm the 200 line and 25KB limit and the modified timestamp (A1-E01), which answer the truncation and freshness reports in part. Whether each issue is open is unverified.

## A1-E23
- claim_id: A1-E23
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Gloaguen et al., Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (ICLR 2026)
- source.url: https://arxiv.org/abs/2602.11988
- source.type: benchmark
- notes: Read through a search summary, not the paper. Tested Claude Code, Codex and Qwen Code on SWE-bench Lite and a new AGENTbench. Context files did not generally raise success and raised cost by over 20 percent, for both LLM-generated and developer-written files. Agents followed the files closely, which added searching and testing. Authors say such files suit non-standard practices and should hold minimal requirements, and any self-generated context should be evaluated first. Exact effect sizes in the summary were not checked against the paper. This is A2 territory, noted here because it is the main evidence on bloat from vendor-agent runs.

## A1-E24
- claim_id: A1-E24
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Codex memory over-personalisation write-up (cites OP-Bench, arXiv Jan 2026)
- source.url: https://codex.danielvaughan.com/2026/06/12/codex-cli-memory-over-personalisation-sycophancy-risk-configuration-defence/
- source.type: write-up
- notes: Third-party blog. Claims memory-augmented agents lean toward stored preferences over facts (OP-Bench: 26.2 to 61.1 percent relative drops) and that Codex consolidation is global by default, so preferences leak across projects. It names config keys (`disable_on_external_context`, `max_rollout_age_days`, `min_rollout_idle_hours`) that were not checked against OpenAI docs. Use only as a lead.

## A1-E25
- claim_id: A1-E25
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Claude Code docs, memory page on instruction conflicts and hooks
- source.url: https://code.claude.com/docs/en/memory
- source.type: official docs
- notes: Vendor guidance on drift and conflict: if two CLAUDE.md files give different guidance for one behavior, Claude may pick one arbitrarily; specific and concise instructions are followed more consistently; the memory index reminds Claude to merge or drop stale entries when near its limit. Codex docs (A1-E07) say required rules belong in AGENTS.md, not memories. Copilot (A1-E14) is the only vendor with an expiry and citation check. No vendor page found that tells agents to edit their own AGENTS.md or skills; every vendor auto feature writes to a separate memory store, not to the instruction file the team commits.

## A1-E26
- claim_id: A1-E26
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Claude Code docs, skills in `-p` and slash commands
- source.url: https://code.claude.com/docs/en/headless
- source.type: official docs
- notes: A user-run skill is a hook-free trigger: the user types `/skill-name` at the end of a session, or a scheduler runs `claude -p "/skill-name"`. Same pattern exists elsewhere (Codex `$skill` or `codex exec`, Gemini `/memory inbox`, Copilot `/skill`), per this repo's R4 table. Only Claude Code's `-p` handling of `/skill` was confirmed today.

### Contradictions (A1)

1. Cursor Memories: staff replies conflict on whether the feature was removed or only its UI (A1-E18). Docs mention no Memories feature (A1-E17).
2. Gemini CLI: the docs describe Auto Memory, hooks and `save_memory`, but press and Google say consumer access ended 2026-06-18 (A1-E13). Both can be true for paid-key users.
3. Cursor headless: the repo note called "writes files without --force" contested; today's headless page says it does not write without `--force` (A1-E19). Help text not rechecked.
4. Codex memory config: one third-party source puts the setting under `[memories]`; the OpenAI page says `[features] memories = true` (A1-E07).
5. Claude Code memory limits: issue #57574 reports silent truncation, while the docs describe a warning and error when the index passes the limit (A1-E01, A1-E22). The docs may reflect a later fix; unverified.
6. Codex hooks: this repo note says Codex has no identifying env for hook commands; the vendor page documents a full event list. These are different questions, not a true conflict.

### Per-harness summary (A1)

| Harness | Memory or self-update feature | User approval | Hooks (events relevant to self-improvement) | Headless mode | Transcript access |
| --- | --- | --- | --- | --- | --- |
| Claude Code | Auto memory (4 note types) in `~/.claude/projects/<project>/memory/`; off via `/memory`, setting, or env | No per-item approval; user audits and edits files | Yes. SessionEnd, Stop, PostToolUse, PostToolUseFailure, UserPromptSubmit, PreCompact, 33 events; types command, http, prompt, agent, mcp_tool | `claude -p`, `--bare` skips hooks and memory, `/skill` works in `-p` | JSONL in `~/.claude/projects/`, 30 day default retention; `transcript_path` in every hook |
| Codex CLI | Memories, off by default, `$CODEX_HOME/memories_v2/`; `/memories` per chat | None per item; global toggle and delete | Yes, on by default. SessionEnd, Stop, PostToolUse, UserPromptSubmit, PreCompact, Interrupt, 14 events | `codex exec`, `--ephemeral`, `--json`, resume | `~/.codex/sessions/.../rollout-*.jsonl` (repo note); `transcript_path` in hooks, format not stable |
| Cursor | Documented: `/create-rule` writes `.cursor/rules`; Memories UI removed, status contested | Rule file is written on user command; memory unverified | Yes. sessionEnd, stop, postToolUse, afterAgentResponse, preCompact, beforeSubmitPrompt and more | `cursor-agent -p`, needs `--force` to write | Only via hook `transcript_path` or `CURSOR_TRANSCRIPT_PATH`; otherwise undocumented |
| Copilot CLI and coding agent | Copilot Memory: repo facts and user prefs, citations, 90 day expiry, voting | CLI interactive can ask; cloud agent and code review do not | Yes. sessionEnd, agentStop, postToolUse, userPromptSubmitted, preCompact, 14 events; repo `.github/hooks/*.json` also works in cloud agent | `copilot -p`; memory needs `--enable-memory` when programmatic | `~/.copilot/session-state/<id>/events.jsonl` (repo note, unverified today); `transcriptPath` in some hooks |
| Gemini CLI | Auto Memory (experimental, off) drafts patches and skills to an inbox; `save_memory` appends to `~/.gemini/GEMINI.md` | Auto Memory: yes, per item via `/memory inbox`. `save_memory`: not documented | Yes. SessionEnd, AfterAgent, AfterTool, PreCompress, 11 events; command type only | `gemini -p` | `~/.gemini/tmp/<project>/chats/` (read by Auto Memory); hook transcript field unverified |
| Windsurf (Devin Desktop) | Rules via AGENTS.md or `.devin/rules`; Memories not confirmed | Unverified | Not checked | Not checked | Not checked |


Angle A2. Gathered 2026-11-10. Sources were read as arXiv abstract or HTML pages. Numbers come from the paper text unless a field says otherwise.

## A2-E01
- claim_id: A2-E01
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: ACE, Agentic Context Engineering (arXiv 2510.04618), HTML
- source.url: https://arxiv.org/html/2510.04618
- source.type: paper
- notes: Signal is natural execution feedback, with or without ground-truth labels. Updates run offline (system prompt) or online (memory). Representation is itemized bullets, each with an ID and helpful/harmful counters. A Reflector extracts insights. A Curator emits small delta entries. Non-LLM code merges the deltas. Dedup uses embeddings, run per delta or only when the window fills. Reported gains: +10.6% on agent tasks, +8.6% on finance. AppWorld ablation (ReAct baseline 42.4): full ACE offline with labels 59.4, online without labels 56.1, online with offline warmup 59.5, no Reflector or multi-epoch 55.1. Cost: latency down 82.3% and rollouts down 75.1% vs GEPA offline. Latency down 91.5% and token cost down 83.6% vs Dynamic Cheatsheet online.

## A2-E02
- claim_id: A2-E02
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: ACE paper, context collapse and brevity bias section
- source.url: https://arxiv.org/html/2510.04618
- source.type: paper
- notes: Brevity bias means optimizers drift to short generic prompts that drop domain detail. Context collapse means a full LLM rewrite of the accumulated context shrinks it sharply. Measured on AppWorld: at step 60 the context was about 18,282 tokens at 66.7 accuracy. At the next step it was about 122 tokens at 57.1 accuracy. That is below the 63.7 no-adaptation baseline. The fix is incremental delta edits, not full rewrites.

## A2-E03
- claim_id: A2-E03
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: ACE paper, limitations on feedback quality
- source.url: https://arxiv.org/html/2510.04618
- source.type: paper
- notes: ACE needs a reasonably strong Reflector. A weak one makes the context noisy or harmful. On finance, online ACE without ground-truth labels cut FiNER accuracy by 3.4 points to 67.3, while Formula rose 11.0. The authors say results depend on a trustworthy feedback signal. Some tasks need only a short instruction, so a long playbook adds nothing there.

## A2-E04
- claim_id: A2-E04
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Dynamic Cheatsheet (arXiv 2504.07952)
- source.url: https://arxiv.org/html/2504.07952
- source.type: paper
- notes: Signal is the model's own attempts, no labels or human feedback. Update runs inline after each query (test time). Representation is free-text memory of strategies, code snippets and insights. A curator model rewrites it. Gains: Claude 3.5 Sonnet AIME more than doubled. GPT-4o Game of 24 went 10% to 99% by reusing a Python solution. Claude +9% GPQA-Diamond, +8% MMLU-Pro. No gate exists beyond the curator's own judgment.

## A2-E05
- claim_id: A2-E05
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Dynamic Cheatsheet, limitations and failure cases
- source.url: https://arxiv.org/html/2504.07952
- source.type: paper
- notes: Errors cluster in embedding space, so a faulty heuristic that enters memory gets amplified. The curator sometimes writes "Previous content [...] preserved" instead of the content, which degrades stored notes over time. Weak models gain less or lose: GPT-4o-mini AIME 2024 fell from 16.7% to 13.3%. Retrieval noise can hurt. Reasoning models (R1, o1) gained little. Full-history append raises token cost: Claude AIME 2024 used about 370 tokens baseline and 1,831 under DC-Cu.

## A2-E06
- claim_id: A2-E06
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Reflexion (arXiv 2303.11366), HTML
- source.url: https://arxiv.org/html/2303.11366
- source.type: paper
- notes: Signal is a scalar or language outcome, from tests or the environment, turned into a verbal self-reflection. Update runs after each failed trial. Representation is free-text reflections in an episodic buffer, capped at 1 to 3 entries (last 3 on AlfWorld). Reported 91% pass@1 on HumanEval vs 80% for GPT-4. Reflection beat episodic memory alone by 8% on HotPotQA. No formal success guarantee. Failure: on WebShop the runs were stopped after four trials with no improvement, because the agent rarely wrote helpful reflections. The authors say it cannot solve tasks that need much exploration. It can settle in local minima. Test-driven loops struggle with nondeterministic or impure code.

## A2-E07
- claim_id: A2-E07
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Voyager (arXiv 2305.16291), HTML
- source.url: https://arxiv.org/html/2305.16291
- source.type: paper
- notes: Skills are executable JavaScript code in a library, indexed by description. A skill is stored only after self-verification by a critic passes. Update runs inline per task. Headline: 3.3x more unique items, 15.3x faster tech-tree milestones. Ablations: no self-verification cuts items found by 73% (the most important feedback type). Random curriculum cuts 93%. No skill library leads to a plateau (no figure). Failures: verifier can be wrong (spider string taken as proof of a kill). Hallucinated tasks and hallucinated code or API calls. GPT-4 is about 15x the cost of GPT-3.5. Environment is Minecraft, so transfer to repo instructions is indirect.

## A2-E08
- claim_id: A2-E08
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: SkillWeaver (arXiv 2504.07079), via search summary, not read in full
- source.url: https://arxiv.org/abs/2504.07079
- source.type: paper
- notes: Agent proposes skills to practice, turns trajectories into Python functions (Playwright wrappers), then hones them by testing and debugging. Summary reports WebArena success up 25% to 38% relative after 160 iterations, with weaker agents gaining 40% to 130%. Skills from a strong agent lifted weaker agents by up to 54.3%. The summary source disagrees with the abstract headline (31.8% vs 25% to 38%). Check the PDF before quoting one number. Gate is test-and-debug of the function. No failure study was read.

## A2-E09
- claim_id: A2-E09
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: GEPA (arXiv 2507.19457), abstract only
- source.url: https://arxiv.org/abs/2507.19457
- source.type: paper
- notes: Signal is natural-language reflection on sampled trajectories plus a metric score. Update runs in batch as an offline optimizer. Representation is the rewritten prompt. Candidates are kept on a Pareto frontier of per-example scores, so a change must win on some examples. Reported: up to 6% better than GRPO on average (up to 20% on single tasks) with up to 35x fewer rollouts. Over 10% better than MIPROv2, +12% on AIME-2025. Limitations and cost detail not read (abstract only). ACE reports GEPA needed 4x the rollouts and about 5.7x the latency of ACE on AppWorld (see A2-E01), which is ACE's own comparison.

## A2-E10
- claim_id: A2-E10
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Darwin Godel Machine (arXiv 2505.22954), HTML
- source.url: https://arxiv.org/html/2505.22954
- source.type: paper
- notes: The agent edits its own code. Signal is coding benchmark score. Gate is empirical: a child agent joins the archive only if it compiles and can still edit code. Staged eval: on SWE-bench it must beat 40% on 60 tasks and rank top two in the archive to run 200 tasks. Parent choice favors high score and few children. Result: SWE-bench 20.0% to 50.0%, Polyglot 14.2% to 30.7%. Ablations: no self-improvement tapers fast. No archive makes one bad edit block later progress. Cost: about USD 22,000 for one SWE-bench run, about two weeks. Safety: sandbox, time limits, human monitoring.

## A2-E11
- claim_id: A2-E11
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Darwin Godel Machine, Appendix H on hallucination and objective hacking
- source.url: https://arxiv.org/html/2505.22954
- source.type: paper
- notes: The paper points to an Appendix H case study on hallucinated tool use and reward gaming. I could not read that text (page truncated). I recall from the paper that DGM can fake tool-use logs, but I did not confirm it here. Mark unverified until the appendix is read.

## A2-E12
- claim_id: A2-E12
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: A Self-Improving Coding Agent, SICA (arXiv 2504.15228v2), HTML
- source.url: https://arxiv.org/html/2504.15228v2
- source.type: paper
- notes: Agent edits its own code, benchmark score picks the next meta-agent. Utility is 0.5*score + 0.25*cost term + 0.25*time term. All agents stay in an archive. Gains: SWE-Bench Verified 50-task subset 17% to 51% (text says 53%, which is iteration 14), LiveCodeBench 0.65 to 0.71, file editing 0.82 to 0.91. Cost: about USD 7,000 for 15 iterations. Failures: path dependence (a poor early idea shaped later ones), poor idea taste, no gain on reasoning tasks (AIME, GPQA below o3-mini alone), timeouts. The paper does not discuss reward hacking.

## A2-E13
- claim_id: A2-E13
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: SkillsBench (arXiv 2602.12670v1), HTML
- source.url: https://arxiv.org/html/2602.12670v1
- source.type: benchmark
- notes: 84 tasks, deterministic verifiers, three conditions. Curated skills raised pass rate by 16.2 points on average over 7 agent-model setups (+4.5 in software engineering, +51.9 in healthcare). 16 of 84 tasks got worse. Self-generated skills, written by the agent before the task, averaged -1.3 points: Opus 4.5 -0.4, Opus 4.6 +1.4, Sonnet 4.5 -2.1, Haiku 4.5 0.0, GPT-5.2 Codex -5.6. Failure causes: imprecise procedures ("use pandas"), and models not noticing they need specialist skills. Two or three skills were best (+18.6). Four or more fell to +5.9. Comprehensive skills scored -2.9, while detailed and compact ones helped. Haiku 4.5 with skills (27.7%) beat Opus 4.5 without (22.0%). Caveat: self-generation here is pre-task, not learned from observed failures, so it does not test the evidence-of-use route.

## A2-E14
- claim_id: A2-E14
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Evaluating AGENTS.md (arXiv 2602.11988), abstract and search summary
- source.url: https://arxiv.org/abs/2602.11988
- source.type: paper
- notes: Context files did not generally raise task success, for LLM-generated and developer-written files alike. Cost rose by over 20% on average. Agents follow the files (more tests, more exploration). Repository overviews did not help. Files help most for non-standard practices. Authors say to evaluate any context file before deployment. Per-type figures (LLM-written -0.5 to -2%, developer-written about +4%) came from a search summary, not the abstract: treat as unverified. Tested Claude Code (Sonnet 4.5), Codex (GPT-5.2, 5.1 mini), Qwen Code. No independent replication found.

## A2-E15
- claim_id: A2-E15
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: How Memory Management Impacts LLM Agents (arXiv 2505.16067), abstract
- source.url: https://arxiv.org/abs/2505.16067
- source.type: paper
- notes: Names three effects. Experience-following: the agent copies outputs of similar stored memories. Error propagation: bad stored outputs get reused and compound. Misaligned replay: runs that look correct can mislead when reused. Controlled experiments show memory quality control matters. Future task outcomes can serve as free quality labels for stored memories, which supports counters like ACE's helpful/harmful. No numbers in the abstract.

## A2-E16
- claim_id: A2-E16
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Your Agent May Misevolve (arXiv 2509.26354), abstract
- source.url: https://arxiv.org/abs/2509.26354
- source.type: paper
- notes: Self-evolving agents can drift from intended behavior across model, memory, tool and workflow paths, even on top LLMs (Gemini-2.5-Pro cited). Safety alignment can degrade after memory accumulation. Tools the agent creates can add vulnerabilities. Abstract has no numbers.

## A2-E17
- claim_id: A2-E17
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: OEP, Obsessive Experience Poisoning (arXiv 2605.18930), abstract
- source.url: https://arxiv.org/abs/2605.18930
- source.type: paper
- notes: Reflective memory agents over-trust their own reflections. Locally correct but non-transferable experiences get consolidated into high-priority, over-general rules that cause later failures. Attack success rate above 50% on GPT-4o agents in three domains. It beats existing attacks even with an LLM auditing defense. This is an attack paper, so it shows the risk, not the rate in normal use.

## A2-E18
- claim_id: A2-E18
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Anthropic, Equipping agents for the real world with Agent Skills
- source.url: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- source.type: write-up
- notes: Advice, not measured results. Ask Claude to capture successful approaches and common mistakes into a skill. When a skill goes off track, ask it to self-reflect on what went wrong. Start with evaluation on representative tasks to find gaps. Watch real use and look for unexpected trajectories, and tune name and description since they drive triggering. Split large files. Authors hope agents will one day create, edit and evaluate skills on their own, which means this is not yet shipped. This is a human-in-the-loop, manual route and needs no hooks.

## A2-E19
- claim_id: A2-E19
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Anthropic, Effective context engineering for AI agents (read only via search snippets)
- source.url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- source.type: write-up
- notes: Search results only showed the intro and secondary summaries. They list compaction, structured note-taking and sub-agents as long-horizon techniques. I did not read the post. A claim that Claude agents write their own skills is also unverified: no Anthropic page confirming it was found.

## A2-E20
- claim_id: A2-E20
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Large Language Model Agents Are Not Always Faithful Self-Evolvers (arXiv 2601.22436), secondary summary
- source.url: https://arxiv.org/abs/2601.22436
- source.type: paper
- notes: A secondary summary says agents depend on raw experience but largely ignore condensed experience. If true, summarized lessons may have less effect than the writer expects. I did not read the primary paper.

### Contradictions (A2)

- ACE (A2-E01) and Dynamic Cheatsheet (A2-E04) report large gains from self-written context. SkillsBench (A2-E13) and AGENTS.md study (A2-E14) report zero or negative effect for self-written context. Likely reason: the first two learn from outcome feedback during use, the last two write context up front without evidence.
- ACE says growing detailed playbooks help (A2-E02). SkillsBench says comprehensive skills hurt (-2.9) and 4+ skills help less (A2-E13). Likely reason: ACE retrieves and curates bullets with counters, SkillsBench loads whole documents.
- DC-Cu and DC-RS each win on different tasks (A2-E05), so no single update style is best.
- DGM and SICA gain strongly on coding benchmarks (A2-E10, A2-E12) but SICA gains nothing on reasoning tasks and DC gains little on reasoning models (A2-E05). Gains depend on task type.
- Dollar cost: ACE claims low cost (A2-E01) while DGM and SICA cost thousands of dollars (A2-E10, A2-E12). They differ in scope (edit context vs edit agent code).
- SkillWeaver headline gain differs between sources (A2-E08).

### Design lessons (A2)

- L1. Edit by small deltas on itemized entries, never by full rewrite, to avoid collapse and brevity bias. A2-E01, A2-E02, A2-E05.
- L2. Keep a helpful/harmful counter per entry, fed by later outcomes, and prune on it. A2-E01, A2-E15.
- L3. Keep a change only when an outcome check passes: evals, tests, or a verifier. Unchecked self-critique both helps and hurts. A2-E03, A2-E07, A2-E09, A2-E10.
- L4. A weak or wrong judge makes the context worse, so keep a human approval step when the signal is noisy. A2-E03, A2-E07, A2-E17.
- L5. Learn from observed failures and corrections, not from the agent guessing what it will need. A2-E13, A2-E18.
- L6. Keep skills and AGENTS.md short and focused, since more or broader content can score below none. A2-E13, A2-E14.
- L7. Record non-standard rules the agent cannot infer. Skip repo overviews. A2-E14.
- L8. A lesson from one episode can become an over-general rule. Require repeat evidence before promoting it. A2-E17, A2-E15, A2-E06.
- L9. Judge each change on a held-out or Pareto set, not only the episode that produced it, to limit overfitting and path dependence. A2-E09, A2-E10, A2-E12.
- L10. Keep an archive or history of versions so a bad edit can be reverted. A2-E10, A2-E12.
- L11. Every approach here runs after the fact (batch or inline in the loop), so none needs hooks. A session transcript or a user-run command is enough to trigger the update. A2-E01, A2-E09, A2-E18.
- L12. Budget for cost: context files add over 20% inference cost, and full self-modification costs thousands of dollars. A2-E14, A2-E10, A2-E12.
- L13. Gains shrink for weak models and for reasoning-heavy tasks, so test per target model. A2-E05, A2-E12, A2-E13.


Angle: open-source tools, plugins, community patterns for self-improving agent setups. Stars and push dates read with `gh api` on 2026-11-10.

## A3-E01
- claim_id: A3-E01
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: claude-reflect README (BayramAnnakov)
- source.url: https://github.com/BayramAnnakov/claude-reflect
- source.type: docs
- notes: Captures user corrections ("no, use X"). A hook queues them; `/reflect` shows the queue and adds approved items to CLAUDE.md or AGENTS.md. Human review is the write gate. Runs on Claude Code; Codex and Cursor users get it through AGENTS.md. Without hooks, `/reflect --scan-history` scans all past sessions for missed learnings, and `/reflect-skills` mines history for repeated tasks. Also has `--dedupe`, and a confidence and decay view (`--review`). 1,935 stars, last push 2026-10-03, 13 open issues. A newer "mod" variant (Claude Code 2.1.286+) runs a small model check on every short prompt and shows a Save/Edit/Skip band; nothing is written without a press. The README says to install the mod or the plugin, not both, or every correction is captured twice.

## A3-E02
- claim_id: A3-E02
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: claude-reflect issues #12, #43, #30
- source.url: https://github.com/BayramAnnakov/claude-reflect/issues
- source.type: issue thread
- notes: Reported problems. #12: a user asked for a CLAUDE.md size warning because the tool only appends and the file may bloat (closed; suggested a `--prune` for stale entries). #43 (open): the keyword guardrail check runs before the false-positive filter, so "leave it alone" and questions are queued as 0.85-confidence learnings. This shows keyword capture gives false positives. #30 is a vendor comment (vexp.dev) saying cleaner context makes reflection better; it is self-promotion, low value. Issues #2 and #3 asked to replace hardcoded keywords with model judgement; the mod does that.

## A3-E03
- claim_id: A3-E03
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: autoharness README and issues (tigerless-labs)
- source.url: https://github.com/tigerless-labs/autoharness
- source.type: docs
- notes: Claude Code only. Hook-driven capture (a Stop hook counts tool calls; past a threshold it forks a reflector). Reflector proposes add, merge, patch, or delete for skills in `.claude/skills/`. No per-change approval: it writes in the background and touches only skills it created. `/learn` distills on demand. Lifecycle: skills are scored by load rate, with a probation period, then archived (moved, never deleted) if never loaded or viewed. 10,913 stars, pushed 2026-11-10, 19 open issues. The README claims a 42% to 78% CORE-Bench result for "same model, different harness". That figure is about harness choice in general (HAL paper), not autoharness itself. Treat as not evidence for this tool.

## A3-E04
- claim_id: A3-E04
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: autoharness issues #184, #283, #295, #299, #301, #284, #181
- source.url: https://github.com/tigerless-labs/autoharness/issues
- source.type: issue thread
- notes: Real failure modes of an autonomous skill writer. #184: two overlapping passes created duplicate skills. #283 (closed): a `create` silently overwrote a hand-written skill and relabelled it agent-made. #301 (closed): consolidation reset use counts so merged skills were archived. #299 (open): the dedupe index misses plugin skills and CLAUDE.md, so duplicates of other sources are possible. #295 (open): the session-start index repeats Claude Code's native skill list and gets truncated at about 2KB with many skills. #284 (closed): the reflector child could run Bash because the hook only denied Write and Edit. #181: "Is this project dead" (a maintainer replied it is not). Many issues are filed by AI-assisted users; severity is self-reported.

## A3-E05
- claim_id: A3-E05
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: ECC continuous-learning-v2 and v1 SKILL.md
- source.url: https://github.com/affaan-m/ECC
- source.type: code
- notes: v1 used a Stop hook to extract skills from a session (`auto_approve: false` default, saved to `~/.claude/skills/learned/`). v1 was deprecated 2026-04-28 for v2. v2 uses PreToolUse and PostToolUse hooks to log observations, then a background Haiku observer writes "instincts" (one trigger, one action, confidence 0.3 to 0.9, project-scoped; promoted to global when seen in 2+ projects). Instincts can be evolved into skills or commands. Strongly hook-based. Other harnesses (Cursor, Gemini, Copilot) get "capability-limited adapters"; the README says check the support matrix before assuming parity. 300,588 stars, pushed 2026-11-09, 248 open issues. Manual `/learn` command exists for mid-session extraction. I did not find user reports on instinct quality; unverified.

## A3-E06
- claim_id: A3-E06
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: claude-mem README and issues
- source.url: https://github.com/thedotmack/claude-mem
- source.type: docs
- notes: Memory, not instruction editing. Hooks (SessionStart, UserPromptSubmit, PostToolUse, Stop and others) send every tool call to a local worker; an observer model compresses them; the next session gets an index and a 3-step search (index, timeline, details). Claims about 10x token savings from filtering first (vendor claim, unverified). No approval step; it does not write AGENTS.md. Works with Claude Code, Codex, Cursor, OpenCode and others; Copilot CLI, Goose, Roo Code and Warp can search memory but their sessions are not recorded (no hooks, so no capture). Where no host hooks exist (Grok Bot) it watches chat log files instead. 115,688 stars, pushed 2026-11-10, 106 open issues. Issues show operational cost: #5676 hook 250 ms deadline silently drops capture under load, #5681 stale plugin folders using 16 GB, #5675 memory work silently runs on the user's Anthropic subscription, #5665 a stale hook blocked 100% of tool calls after upgrade. Hosted paid tier ("Pro") exists, so the README is partly commercial.

## A3-E07
- claim_id: A3-E07
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Hermes Agent README (Nous Research)
- source.url: https://github.com/NousResearch/hermes-agent
- source.type: docs
- notes: A separate agent runtime, not a plugin. README: creates skills after complex tasks, improves skills during use, "nudges itself" to persist memory, searches past sessions. Its own loop, so no host hooks needed. Imports settings, memories and skills from Claude Code, Codex and Cursor. 262,315 stars, pushed 2026-11-10. The GitHub open-issue count (53,875) looks wrong for a repo this age; unverified, may include PRs or spam. I did not find independent results for the learning loop; unverified.

## A3-E08
- claim_id: A3-E08
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Cline docs, Memory Bank
- source.url: https://docs.cline.bot/prompting/cline-memory-bank
- source.type: docs
- notes: A convention, not a tool: markdown files (projectbrief, activeContext, progress and others) that custom instructions tell the agent to read before and write after tasks. Commands: "initialize memory bank", "update memory bank" (full review of all files). Capture is by the agent's own judgement plus an explicit user command. No hooks needed; it is prompt-driven, so it works on any harness that follows instructions. No approval step described; files are plain markdown the user can edit. Cline itself has 71,496 stars (repo stat, not memory-bank-specific).

## A3-E09
- claim_id: A3-E09
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: kangax, "Memory bank and the many failures of GenAI engineering"
- source.url: https://kangax.substack.com/p/memory-bank-and-the-many-failures
- source.type: write-up
- notes: One developer's report. Reading the memory bank costs tokens on every small task (per-file figures of about $0.015 to $0.037 on Claude). Compliance depends on the model: one model skipped reading it and nearly restored a removed column. The author still found it worthwhile. Search summaries from vendor blogs (fast.io, MemoryLake) say a stale bank is worse than none and that manual upkeep is where people fail; those sources sell competing products, so low confidence. A vendor claim of "up to 40% token savings" conflicts with this report and is unverified.

## A3-E10
- claim_id: A3-E10
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Alderson, "Self-improving CLAUDE.md files"
- source.url: https://martinalderson.com/posts/self-improving-claude-md-files/
- source.type: write-up
- notes: Hook-free transcript mining. The agent reads past session logs (`~/.claude/projects` for Claude Code, `~/.codex/sessions` for Codex, both JSONL), compares them with the current CLAUDE.md, and flags user frustration and repeated requests. Run on demand, about once per project; a schedule is only suggested. The author curates the suggestions by hand. Problem: the agent wrote very complex jq pipelines and took minutes, so he built a CLI that cut it to seconds. No measured quality gain is given. This is the closest match to a hook-free `/skill enhance`.

## A3-E11
- claim_id: A3-E11
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Chakrabarti, "Why Does CLAUDE.md Keep Growing? Catastrophic Remembering in Agentic Coding" (arXiv:2608.11095), and a Codex-focused summary
- source.url: https://arxiv.org/abs/2608.11095
- source.type: write-up
- notes: Measures bloat in the wild: 247,694 instruction lifetimes in 1,867 public repos; instruction count grows +226% over file lifetime (about +4.9 net per commit); older instructions are deleted less often; after a wholesale rewrite files regrow to 91.5% of prior size within 10 commits. Proposed fix: an HTML comment beside each instruction with the failure that caused it, the hypothesis, and whether it worked. In a controlled test excess growth fell from +211.3% to +1.4% with task satisfaction unchanged; comments with no real reasoning did nothing. Single author, one preprint, controlled tasks built from IFEval variants, not a field trial. The Codex summary (codex.danielvaughan.com) says Codex CLI strips such comments before they reach the model; I did not verify that in Codex docs. Needs no hooks. Relevant to enhance: store the evidence with each approved addition.

## A3-E12
- claim_id: A3-E12
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: Rajiv, "I cut my agent's always-loaded instructions by 62%"
- source.url: https://rajiv.com/blog/2026/08/22/i-cut-my-agents-always-loaded-instructions-by-62-and-weakened-no-rule/
- source.type: write-up
- notes: A personal case. Always-loaded file went from 54,825 to 21,026 bytes (62 rules sorted into kernel, skills, hook-backed one-liners, on-demand references). Cause of bloat: each incident added a rule with its story, example and rationale, and rules were never removed. He verified with a migration matrix of rule, destination and proof. Self-reported, one setup.

## A3-E13
- claim_id: A3-E13
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Search summaries of Reddit and dev.to posts on lessons-learned logs
- source.url: https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/
- source.type: write-up
- notes: Search results said: a Reddit thread where Claude logs its own mistakes in CLAUDE.md and replies advise a separate file; the alexop.dev post says developers add every lesson to CLAUDE.md and files reach 2000 lines, with the fix being progressive disclosure; a dev.to post (joozio) says deleting 87% of instructions improved performance. I read only search summaries, not the pages. The 87% claim is a teaser and unverified.

## A3-E14
- claim_id: A3-E14
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: anthropics/skills skill-creator (SKILL.md and scripts)
- source.url: https://github.com/anthropics/skills/tree/main/skills/skill-creator
- source.type: code
- notes: Improve loop for skills. Signal is evals the user writes, user review of outputs in a viewer (`feedback.json`), and with/without-skill or old-versus-snapshot runs. Description tuning uses `run_loop.py` and `improve_description.py` with a train/test split stratified by should-trigger, to avoid overfitting. Runs on demand, no hooks; needs subagents (the instructions note headless fallbacks). The user reviews outputs between iterations. The instructions warn against "fiddly overfitty changes" and heavy MUSTs. Repo has 191,929 stars (whole repo, not this skill). This is eval-driven, not evidence-of-use driven: the test cases are authored, not mined from real sessions. I found no user reports on its results; unverified.

## A3-E15
- claim_id: A3-E15
- date: 2026-11-10
- status: confirmed
- confidence: medium
- source.label: aced `improve` and `skillify` SKILL.md (installed plugin 0.5.3)
- source.url: file:///home/unional/.claude/plugins/cache/cyberplace/aced/0.5.3/skills/improve/SKILL.md
- source.type: docs
- notes: `improve` diagnoses failing ACED eval results for a tracked config, or does a general review against bars when no eval suite exists, and proposes concrete before/after edits. `skillify` generalizes what the current session did into a SKILL.md on explicit command. Both are on demand, need no hooks, and propose before writing. Capture is explicit command or authored evals, not passive mining. No adoption data (private plugin marketplace); I did not read the full bodies, so approval details are unverified.

## A3-E16
- claim_id: A3-E16
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Search for user reports of turning off claude-reflect, continuous-learning, autoharness
- source.url: https://agentskills.so/skills/bayramannakov-claude-reflect-claude-reflect
- source.type: discussion
- notes: A web search for Reddit or forum reports of people disabling these tools or finding wrong learnings returned only directory and mirror pages. I found no independent user report. The only problem evidence is in GitHub issues (E02, E04, E06). Absence of reports is not evidence of absence; the search tool cannot query Reddit directly.

## A3-E17
- claim_id: A3-E17
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Second brain stars (autoharness, claude-mem, ECC, hermes-agent, mem0, beads, EverOS)
- source.url: file:///home/unional/code/unional/second-brain/stars/stars.jsonl
- source.type: docs
- notes: The user starred autoharness, claude-mem, ECC, hermes-agent, beads, mem0, EverOS, MemPalace. I used the star list only to pick candidates. I did not read mem0, beads, EverOS or MemPalace in depth; they are memory stores, not instruction improvers. Not checked: Cursor rule generators, CI-scheduled retrospective jobs, other transcript-mining CLIs. I searched `gh` for them and found nothing clear; gap.

### Contradictions (A3)

1. Hook reliability. ECC v2 moved from a Stop hook to Pre/PostToolUse hooks because the Stop hook missed things ("100% reliable" is its own claim). claude-mem issue #5676 says its hook drops capture silently under load. Hooks are claimed reliable and shown lossy.
2. Memory bank cost. A vendor says up to 40% token savings; the one independent user reports added per-task cost.
3. Auto-write versus review. autoharness writes skills with no per-change approval and keeps a ledger and archive; claude-reflect and the Alderson method require review. Reports on which gives fewer bad learnings: none found.
4. Pruning. Issue #12 on claude-reflect asks for pruning, but the Chakrabarti data says files regrow after rewrites, so pruning alone may not hold.
5. Keywords versus model judgement. claude-reflect used keyword patterns (false positives, #43) and moved to a per-prompt model check (costs one small call per prompt).

### Summary table (A3)

| Tool or pattern | Capture | Trigger | Needs hooks | Approval | Harnesses | Adoption | Main reported problem |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-reflect | User corrections, tool errors, history scan | Hook queue, then manual `/reflect`; `--scan-history` without hooks | Optional (history scan works without) | Yes, review before write | Claude Code; Codex and Cursor via AGENTS.md | 1,935 stars, pushed 2026-10-03 | False positives from keywords; CLAUDE.md bloat |
| autoharness | Session episodes distilled to skills | Stop hook after enough tool calls; `/learn` | Yes | No per-change; own skills only, archive not delete | Claude Code | 10,913 stars, active | Duplicates, overwrite, index truncation |
| ECC continuous-learning-v2 | Tool-use observations to instincts | Pre/PostToolUse hooks plus background agent | Yes | Review and promote steps; v1 `auto_approve: false` | Claude Code; limited adapters elsewhere | 300,588 stars, active | No quality reports found (unverified) |
| claude-mem | Every tool call compressed to memory | Hooks every event | Yes (no capture where no hooks) | None; does not edit instructions | Claude Code, Codex, Cursor, others | 115,688 stars, active | Dropped capture, disk use, cost on subscription |
| Hermes Agent | Skills and memory from tasks | Agent's own nudges | No (own runtime) | Unverified | Own runtime; imports from others | 262,315 stars, active | No independent results found |
| Cline memory bank | Agent notes plus user command | Per task, by instructions | No | Not described; files editable | Any harness that reads docs | Cline 71,496 stars | Per-task token cost; staleness; model skips it |
| Transcript mining (Alderson) | JSONL logs of Claude Code and Codex | On demand per project | No | Human curates | Claude Code, Codex | One blog, no stars | Slow parsing without a CLI |
| Prompt comments (Chakrabarti) | Rationale kept per instruction | At edit time | No | n/a | Any (Codex strips comments, unverified) | Preprint | Single author, controlled tasks |
| skill-creator | Authored evals and user review | On demand | No | Yes, user reviews each iteration | Claude, any with subagents | Repo 191,929 stars | Not evidence-of-use; no user reports found |
| aced improve and skillify | Eval failures, or the current session | On demand | No | Propose before write (details unverified) | Any agentskills harness | Private | No data |



Repo checked: BayramAnnakov/claude-reflect (1,935 stars, pushed 2026-10-03, MIT). Matches the numbers in the brief. Read through gh api only; nothing cloned or run.

## A4-E01
- claim_id: A4-E01
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Identity and numbers
- source.url: https://github.com/BayramAnnakov/claude-reflect
- source.type: code
- notes: 1,935 stars, last push 2026-10-03, created 2026-01-03, MIT, Python, 13 open issues. Version 3.3.1.

## A4-E02
- claim_id: A4-E02
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: --scan-history is an instruction file for the agent, not code
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect.md#L525-L600
- source.type: code
- notes: The scan is prose in a slash command. The agent finds ~/.claude/projects/<encoded-cwd>/*.jsonl (via scripts/project_paths.py), including agent-*.jsonl, and uses jq or grep for user messages (type user, isMeta not true) that match phrases like "remember:", "no, use", "don't use", "actually". It also reads tool rejections ("user said:" in toolUseResult). The prompt says "use your judgment on the best extraction method". Only Claude Code transcripts. Default window is 30 days. Output is a working list with a proposed imperative learning and a global or project scope.

## A4-E03
- claim_id: A4-E03
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: No Codex, Cursor, Copilot or Gemini transcript or memory reader exists
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/scripts/lib/reflect_utils.py
- source.type: code
- notes: Searched the whole 75 KB utils file and both command files for .codex, .cursor, rollout, copilot, gemini paths. The only hits are model-name strings ("gemini-") in a keyword list. Every session and memory path is ~/.claude/projects/. Built-in Claude auto memory is read (read_auto_memory, ~/.claude/projects/<project>/memory/*.md). Other harnesses' memories are not read.

## A4-E04
- claim_id: A4-E04
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Codex and Cursor support means writing AGENTS.md, nothing more
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect.md#L1384-L1412
- source.type: code
- notes: If ./AGENTS.md exists, the same learnings are written into a marked block ("## Claude-Reflect Learnings" between HTML comments). The block is replaced whole on each run. That is the full extent of Codex and Cursor support. The tool itself only runs inside Claude Code. Copilot CLI and Gemini CLI have no code path. README line 17 and 109 say the same ("Codex/Cursor via AGENTS.md").

## A4-E05
- claim_id: A4-E05
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Capture needs four hooks
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/hooks/hooks.json
- source.type: code
- notes: UserPromptSubmit runs capture_learning.py (regex queue to a JSON file). PreCompact backs up the queue. PostToolUse on Bash gives a post-commit reminder. SessionStart gives a reminder. Without hooks the queue is empty, and the scan-history path still works. Rules in reflect.md say never drop queue items, so the queue is a bonus, not a requirement. Hook-free parts: --scan-history, --dedupe, --organize, --targets, /reflect-skills.

## A4-E06
- claim_id: A4-E06
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Semantic filter shells out to claude -p
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/scripts/lib/semantic_detector.py#L1-L90
- source.type: code
- notes: Each message is classified by running "claude -p --output-format json" (default model sonnet, 30 s timeout). Output fields: is_learning, type, confidence, reasoning, extracted_learning. If the CLI fails, it falls back to regex or agent judgment. This ties the filter to the Claude CLI. A different harness would need a different runner.

## A4-E07
- claim_id: A4-E07
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Approval flow is one prompt per batch or per item through AskUserQuestion
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect.md#L640-L690
- source.type: code
- notes: The agent must show raw matches and let the user pick (AskUserQuestion). Rule: never conclude "0 learnings" without showing matches. There is a "review details first" card view (L1188-L1202). Tool allow-list includes AskUserQuestion, which is a Claude Code tool name. Writes use Edit. Targets: ~/.claude/CLAUDE.md, ./CLAUDE.md, subfolder CLAUDE.md, rule files, auto-memory topic files, AGENTS.md, and referenced docs.

## A4-E08
- claim_id: A4-E08
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Dedup is exact removal plus model-judged similarity; no recurrence count
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect.md#L638-L645
- source.type: code
- notes: Step 0.5e removes exact duplicates and keeps the most recent of similar ones. Later steps ask the user to consolidate similar learnings. --dedupe finds similar bullets and contradictions in existing files and asks per group. No code counts how many sessions a lesson recurred in. The only counted signal is tool errors with 2 or more occurrences (extract_tool_errors.py --min-count 2). /reflect-skills does find repeating patterns, but by agent reasoning over transcripts, and its output is a command file.

## A4-E09
- claim_id: A4-E09
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: No evidence or reason is stored beside a written line
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect.md#L1448-L1456
- source.type: code
- notes: Format rule: single bullets, max 2 lines, actionable, optional example. The AGENTS.md block says "Do not edit this section manually". No date, source session, quote, or reason is written beside each bullet. Reasoning exists only in the semantic result, in the queue, and in the review card, and is not kept in the target file.

## A4-E10
- claim_id: A4-E10
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Pruning is size warnings, dedupe and organize; no staleness pruning of written lines
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect.md#L80-L90
- source.type: code
- notes: Decay applies to queue items only, not to lines in CLAUDE.md. A 150-line warning and --dedupe and --organize are the remedies. Issue #12 asked for /reflect --prune and is closed. The closure addressed size awareness. A true prune command was not found in the command file. Treat prune as not implemented.

## A4-E11
- claim_id: A4-E11
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: /reflect-skills writes Claude Code command files
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/commands/reflect-skills.md#L222-L290
- source.type: code
- notes: The prompt says "DO NOT use hardcoded patterns". The agent reasons over sessions (default 14 days, ~/.claude/projects/), finds workflow, misunderstanding, and prompt-sequence patterns, asks the user to approve, then writes .claude/commands/<name>.md (or ~/.claude/commands/). It does not write Agent Skills SKILL.md folders. Not portable as is.

## A4-E12
- claim_id: A4-E12
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Packaging: Claude plugin with Python scripts; no library, no CLI contract
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/.claude-plugin/plugin.json
- source.type: code
- notes: Installed as a Claude Code plugin (marketplace.json, plugin.json). Python 3 scripts in scripts/ (reflect_utils.py, 75 KB). A v3.3.0 "reflect-mod" in mod/ is TypeScript/TSX for Claude Code mods only. No pyproject.toml, no setup.py, no npm package, no pip package in the tree. Scripts are called as "python3 ${CLAUDE_PLUGIN_ROOT}/scripts/x.py", and a few print JSON (project_paths.py, extract_tool_errors.py --json). The core logic is in the markdown commands, which are for an agent to follow. Another tool cannot depend on it as a library. Importing the Python helpers by path is possible but unsupported.

## A4-E13
- claim_id: A4-E13
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Correctness issues
- source.url: https://github.com/BayramAnnakov/claude-reflect/issues/43
- source.type: issue thread
- notes: Issue #43 (open since 2026-09-20): detect_patterns checks guardrail patterns before the false-positive filter, so questions and "leave it alone" are queued at 0.85. This is the hook-side regex path. The semantic filter (E06) is the fix path, but it is per message and costs one claude -p call each. Other open issues are mod and Windows items (#48, #49, #54, #57, #60).

## A4-E14
- claim_id: A4-E14
- date: 2026-11-10
- status: confirmed
- confidence: high
- source.label: Health
- source.url: https://github.com/BayramAnnakov/claude-reflect/commits/main
- source.type: code
- notes: Active: v3.2.0 on 2026-09-20 and v3.3.0 and v3.3.1 on 2026-10-03. 8 contributors, but 88 of about 96 commits are from the author. A large test suite exists (tests/, about 170 KB of Python tests). No push in the five weeks to 2026-11-10 (unverified whether work continues elsewhere).

## A4-E15
- claim_id: A4-E15
- date: 2026-11-10
- status: unverified
- confidence: low
- source.label: Whether Codex or Cursor users actually run /reflect
- source.url: https://github.com/BayramAnnakov/claude-reflect/blob/main/README.md#L17
- source.type: docs
- notes: The README says Codex and Cursor users use the Python plugin. Code shows only that AGENTS.md is a write target. The tool needs Claude Code and its transcripts to find anything. No issue or test shows a Codex or Cursor run. Treat the claim as false for reading and true only for the written file.

### Verdict (A4)
- Reference, not base.
- Reusable ideas: read transcripts without hooks, agent-led review with AskUserQuestion, marked AGENTS.md block, tool-error min-count, --dedupe and --organize passes.
- Not reusable: logic lives in Claude-only prompts, reads only ~/.claude/projects, shells out to claude -p, no library or CLI, no reasons stored, no recurrence counting, no prune, skills as .claude/commands.
- Cross-harness readers, recurrence counting, per-line reasons, and Agent Skills output would all be new code.
- Adoption cost would exceed a rewrite. License is MIT, so borrowing prompts and heuristics is allowed.
