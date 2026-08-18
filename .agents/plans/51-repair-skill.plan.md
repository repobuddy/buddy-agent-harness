---
cr-ref: 51
source: https://github.com/repobuddy/buddy-agent-harness/issues/51
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Settle new-`fix`-skill vs `doctor --fix` with evidence
    status: completed
  - content: Register ACED as the SDD plugin for agent-config artifact types
    status: completed
  - content: Owner reshaped scope — doctor detects, repair repairs; named it repair not fix
    status: completed
  - content: Grow doctor detection past bridges — the five configuration classes
    status: completed
  - content: Draft spec nodes and suites for the detection growth and the repair skill
    status: completed
  - content: Spec gate
    status: completed
  - content: Write skills/repair/SKILL.md and its references
    status: completed
  - content: Regenerate the doctor skill and cross-reference repair from init and enhance
    status: completed
  - content: Impl gate
    status: completed
  - content: Docs pages under apps/web
    status: completed
  - content: Changeset and pnpm verify
    status: completed
  - content: Handoff — PR against main linking issue #51
    status: completed
---

# 51 — a `repair` skill for configuration that is wrong, not missing

CR against `packages/buddy-agent-harness`. Issue #51: PR #49 surfaced a class the shipped
skills have no home for — repository agent configuration that exists but is **wrong or
outdated**. `init` consolidates and invents nothing; `enhance` adds what is missing; `doctor`
diagnoses bridges read-only. Nothing corrects existing wrongness.

## Decisions already settled — do not relitigate

**A new `fix` skill. `doctor` stays read-only. No `--fix` flag.** Evidence:

- `skills/doctor/README.md` already carries a decided "Read-only by design" section: there is
  no `--fix` because every bridge repair is expressible with `init` flags and reimplementing
  them would drift, and because read-only is what makes `doctor` hook-safe.
- All nine entries in `src/diagnose-bridges/doctor-guidance.ts` are **bridge** repairs, and
  every one routes to an `init` flag or a hand reconcile. A `--fix` flag would duplicate
  `init` outright. The counter-argument resolves **against** `--fix`, not against a `fix` skill.
- The repo models one-verb-one-skill (`init` / `enhance` / `doctor`), and `doctor`'s report
  already routes repairs out **by naming a skill**, so a fourth verb is the shape the report
  is already written against.

**`fix` owns wrongness `init` deliberately refuses and `doctor` does not diagnose** — not
bridge resolution. Grounded classes:

- **Deprecated harness name still projected.** `harness-registry.ts` marks `windsurf`
  deprecated in favour of `devin-desktop`. `initializeHarnesses` *reports* the deprecation but
  never migrates it; `doctor`'s `buildReport` drops it entirely. Nothing migrates it.
- **An instruction bridge that exists but is wrong** — `CLAUDE.md` without an `@AGENTS.md`
  import, `.gemini/settings.json` missing `AGENTS.md` from `context.fileName`. `init` only
  *creates* these when absent ("never clobber an existing one"), so a wrong one stays wrong.
- **`AGENTS.local.md` present** — `init`'s rules forbid creating it and it cannot remove a
  user-authored file.
- **Bridges added to `.gitignore`** — `init` and `doctor` both state the rule; neither undoes it.
- **Canonical `SKILL.md` frontmatter that is invalid or uses silently-dropped harness fields.**
  `init` fixes frontmatter only for skills it *moves*; a skill already canonical is never touched.

**Scope.** Skill only. No CLI change and no new `doctor` finding — growing `doctor`'s finding
set is a separate CR against the command and its generated skill, recorded as a follow-up.

**Shape, inherited from `enhance`.** Detection decides every run; every correction is offered
with the before/after and written only on approval; report every run including a clean one.

## Lesson carried from CR 35

CR 35 failed the spec gate twice because the conductor authored inline without loading the
oracle, builder, and architect spec bars. Load every resolved governance before authoring a line.

## NEXT

Landed. `doctor` grew five configuration checks, the `repair` skill ships against them, both spec
nodes are registered in the project spec, and the PR is open against `main` closing issue #51.
No resume action remains.

## Owner reshape — supersedes the scope line above

Two decisions taken mid-mission, both the owner's:

1. **Detection has one home, and it is `doctor`.** The first draft had `repair` detecting for
   itself and recorded the doctor growth as a follow-up. The owner rejected that split:
   `doctor` detects everything wrong with the configuration, `repair` repairs it. `doctor` still
   never writes, so it stays hook-safe — the read-only property is untouched. This lands in **one
   CR**, not two, so there is no interim design to unwind.
2. **The skill is named `repair`, not `fix`.** The codebase's own noun for this concept is
   already repair — `doctor-guidance.ts` defines the `Repair` type, the `doctorRepairs` table,
   and the `repair()` / `skillRepair()` fields, and the shipped table's column header is
   `Repair`. `fix` would give one concept two words, and it collides with the most overloaded
   verb an agent hears. The seam now reads straight: doctor names the repair, `repair` applies it.

The five classes stand as the starting set; the mechanism is built so classes are cheap to add.

## Gate record

Three cold judgments, all acted on rather than waved through.

**Spec gate, unit 1 (`skills/repair/`) — ALIGNED false.** The blocking finding was that
`unbridged-instructions` is already `init`'s: `skills/init/SKILL.md` Phase 4 writes both of its
corrections, and writes the `CLAUDE.md` stub *without* approval where `repair` approves
everything. The node also contradicted itself, defining `bridge` to include `CLAUDE.md` while
handing bridges to `init`. Remedied by reclassifying the fault to the `init` table — it is still
detected, because it is a real silent failure, but `repair` hands it on. The remit stands at four
classes. Also fixed: `references/classes.md` carried detection prose that made the "detects
nothing" scenario false against its own artifact; the options scenario assumed an option set
`doctor` never produces; `unloadable-skill` had no scenarios and `deprecated-harness`'s deletion
shape was uncovered. The diff-reviewer actor was removed rather than half-served — a one-line
`.gitignore` edit cannot carry its own justification, and commit hygiene is not this node's.

**Spec gate, unit 2 (`cli/configuration-diagnosis/`) — ALIGNED false.** The judge proved
empirically that `diagnoseConfiguration`'s `harnesses` parameter could never change a finding:
every check requires a projection on disk, and a projection implies its harness's detection
directory, which selects that harness anyway. Removed the parameter rather than writing a better
scenario for inert surface. Also added the missing multi-family scenario behind the CFG's "each
check is independent" claim.

**Seam gate (both nodes together) — ALIGNED false, and worth the extra pass.** The prior two
rounds each graded one node, and the contract between them fell in the gap: `buildReport` stripped
each finding's `problem` name, so `repair` was specified to route on a field the report did not
carry. Fixed at the source by emitting `problem`, which also removes the need for `repair` to keep
a hand-copy of the fault split. Commission a seam pass whenever one CR touches two nodes; two
independent verdicts cannot see the contract between them.

## Follow-ups — filed, not left here

Both are tracked as issues rather than as notes in this brief, because a note in a brief that is
retired at the end of the mission is a record nobody reads again.

- **#57** — `doctor`'s `help` wraps every repair in `Run \`…\``, including the repairs that are
  prose instructions rather than commands. Pre-existing for `diverged-both`; far more visible now
  that four findings carry no runnable command at all.
- **#58** — backfill the spec for `doctor`'s bridge-resolution and instruction-bridge halves, and
  give the `doctor` → `repair` cross-surface flow a home. `cli/` stays a stub until then.

## Rebase onto a moved main

`main` advanced by twelve commits mid-mission, and one of them changed this CR's scope.

**#48 shipped instruction-bridge verification in `doctor` independently**, with an
`InstructionProblem` set covering `no-instructions`, `instructions-missing`,
`instructions-unbridged`, and `instructions-unreadable`. Its own comment reaches the conclusion
this CR reached separately: *"every repair here goes back to the `init` skill."* Two independent
routes to the same seam is the strongest evidence the split is right.

So `unbridged-instructions` was dropped entirely rather than merged — main's version is better
(registry-driven, per scope, and it handles an unreadable settings file). The four remaining
faults were re-derived against the restructured registry, where `skillsDirectory` now lives on a
per-scope `project` / `user` record, and Gemini's skills projection is gone (E-GEM-02).

The rebase was abandoned in favour of re-applying the delta onto the new `main`: five commits each
carrying semantic conflicts is a worse instrument than porting the work once, deliberately, against
the code that is actually there.

**Still novel after the rebase, and the reason the CR stands:** nothing on `main` repairs anything.
`doctor` gained a third finding family, and the `repair` skill is unchanged in purpose.
