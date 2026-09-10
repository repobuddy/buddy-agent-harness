# How a run gets contaminated

Four ways this harness has produced a wrong answer. Three of them happened.

## Leaking a test case into the wording

**Happened.** A candidate was authored from a brief that described the over-delegation trap as
"e.g. a one-line typo fix". The writer put that phrase in the section. The backlog's T2 at the
time *was* a typo fix, so the candidate scored 6 of 6 on it — and 4 of 6 once T2 became a
`.gitignore` line. The measured advantage was an artifact of the brief.

When briefing a writer, state the *behavior* a clause must produce, never the task that tests it.
If a candidate's wording names something recognizably close to a backlog task, either change the
wording or change the task, and re-run both.

## Scoring against a rule chosen afterwards

Fix the bar before the runs. Anything else is a preference with a number attached. The rule in
`SKILL.md` exists so that a candidate that ties gets rejected by default: the incumbent has more
evidence behind it than a challenger with a one-run lead.

## Pooling runs across different backlogs

**Happened,** and reached a draft docs page before it was caught. A figure combining runs from
the typo backlog with runs from the `.gitignore` backlog is not a measurement of anything. Report
per backlog, and say which is which.

## Drifting the harness between candidates

Everything below the `end AGENTS.md` marker — the task list, the framing, the output format —
must be byte-identical across every run being compared. Diff it. A reworded task or a changed
output table silently rescales the scores.

# Reading a run

Each run returns an assignment table, a confidence line, and an unclear line.

The **assignment table** is the score. The **unclear line** is the diagnosis, and it is worth
more than the score when you are deciding what to change: it names the clause the runner could
not apply. A candidate scoring well while several runs report the same clause unusable is a
candidate with a defect that has not surfaced yet.

Watch for the **self-contradicting row** — a subagent named in the who-column beside a note
saying the work is cheaper to do directly. It has appeared under three different wordings. It
means the rule was understood and the assignment still came out wrong, which is a wording
problem the totals will hide.

Confidence has never discriminated. Every run reports medium. Ignore it.

# Scope, and generalizing this

This harness is deliberately specific to one section: one backlog, one key, one bar. That is what
lets it be precise enough to act on.

The general version — blind A/B of competing instruction wordings, scored against a fixed task
backlog — belongs in an eval framework rather than here, and is proposed upstream to ACED in
`cyberuni/cyberplace`. If that lands, this skill should become a thin backlog-and-key definition
on top of it rather than its own runner.

## Running the runners as subagents

**Happened,** and invalidated a full round of 24 runs before it was caught.

Subagents inherit every CLAUDE.md level, including `~/.claude/CLAUDE.md`. On a machine whose
global CLAUDE.md already carries a Delegation section — which is the normal state for anyone who
has adopted the section this skill exists to test — that section is in *every* runner's context,
in every arm, no matter what the prompt file says. The candidate arm then holds two competing
sections and the shipped arm holds the same one twice. Measured directly: a runner under the
normal HOME quotes the shipped section back; the same runner under a sandbox HOME has nothing
but the Agent tool description.

Telling the runner in its spawn brief to ignore other instructions does not fix this. The text is
still there.

Use `scripts/run.sh`. It runs each run as `claude -p` with HOME pointed at a sandbox holding
credentials and nothing else, and cwd an empty directory. Never spawn runners as subagents.

## Scoring without an empty control

**Happened.** The backlog ran for 54 runs with no arm that omits the section. A score of 29 of 30
was read as evidence the wording worked. Measured with a control: an AGENTS.md carrying no
Delegation section at all also scores 30 of 30 on routing. The tasks do not discriminate the
presence of the section, so no candidate's routing score ever meant what it appeared to mean.

Build the control with `build-prompts.mjs --no-section`. Run it in every round. A candidate that
does not beat the empty control has not been shown to do anything.
