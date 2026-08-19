---
cr-ref: 61
source: https://github.com/repobuddy/buddy-agent-harness/issues/61
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Intake — read issue #61, settle scope with operator, scaffold this brief
    status: completed
  - content: Draft cli/entry-point spec node and suite; register it in both indexes
    status: completed
  - content: Spec gate
    status: completed
  - content: Rebase onto main once PR #60 (issue #57) and bah-58-spec have landed
    status: completed
  - content: Implement run(argv), the app factory, the manifest version, stderr on the catch
    status: completed
  - content: Return exit codes from the doctor and init commands instead of writing process.exitCode
    status: completed
  - content: Export the report builder so the report is reachable as data
    status: completed
  - content: Regenerate the skill launchers to call run() instead of splicing argv
    status: completed
  - content: Cover the repair skill's launcher in the generator, which never checked it
    status: completed
  - content: Impl gate
    status: completed
  - content: Changeset and pnpm verify (coverage gate is 100%)
    status: completed
  - content: Handoff — PR against main linking issue #61, then merge it
    status: pending
---

# 61 — a callable CLI entry point, so `bin` owns the process

CR against `packages/buddy-agent-harness`. Issue #61: `src/cli.ts` exports `main()`, which
builds the app, reads `process.argv` and writes `process.exitCode`. Nothing can invoke a
command without going through the process, and the cost is visible in generated code — every
skill launcher does `process.argv.splice(2, 0, 'doctor')` and then side-effect-imports
`bin/buddy-agent-harness.mjs`.

## Decisions already settled — do not relitigate

**The two boundaries.** `bin/buddy-agent-harness.mjs` is the **process** boundary, the only
place reading `process.argv` or writing `process.exitCode`. `src/cli.ts` is the **app**
boundary: registers the commands, takes argv, returns an exit code.

**`run(argv: string[]): Promise<number>`**, re-exported from `index.ts`. The clibuilder app
stays **internal** — exporting it would make clibuilder's builder shape this package's public
API, so a clibuilder major becomes a major here. The app becomes a **factory**, not a
module-level const, since `cli()` builds state.

**Three layers, each with a real consumer** (operator ruling, confirmed with `bah-58-spec`):

| Layer | Returns |
| --- | --- |
| `diagnoseBridges` / `diagnoseInstructions` / `initializeHarnesses` | raw diagnosis |
| the report builder | the report **as data** |
| `run(argv)` | that report serialized, plus an exit code |

Today the report shape is reachable only by running the CLI and re-parsing its own TOON.
`bah-58-spec` specifies that shape at `cli/diagnosis-report/` regardless, so it becomes a
contract either way — better exported deliberately than reconstructed by parsing.

**Three properties of the report that the extraction must not lose:**

1. `findings` is a **union** — rows of `{ path, problem, detail }` when anything is wrong, the
   healthy-answer sentence in their place when nothing is. Not an array plus an `ok` flag: the
   sentence exists so a caller never has to tell "nothing is wrong" from "I asked wrongly".
2. `divergence` and `help` are **absent**, not empty, when they do not apply. A caller branches
   on presence.
3. **Exit code is 0 with findings.** Only a failed diagnosis, an unsupported format, or an
   unknown harness is non-zero. Once `run()` returns the code, that rule is `run()`'s to keep.

**Two bugs in the same file, both in scope.** The catch path writes to **stdout**, where
`doctor`'s TOON lands in the stream agents parse — move it to stderr. And
`cli({ version: '0.1.0' })` while the package is at `0.6.0` — read it from the manifest.

**Do not serve two consumers with one function.** A caller wanting **data** keeps using the
object-returning exports. `run()` is for callers that want exactly what the command prints.

**The commands return their exit codes too.** `doctor` and `init` each write `process.exitCode = 1`
from their own catch block today. A command that writes the code reports its failure *past* the
caller instead of *to* it, so `run()` would return 0 for the commonest failure there is. Both
commands return the code instead. This widens the blast radius past `cli.ts` — added to it after
the spec judge found the scope did not cover the suite's own claim.

**One `process` read stays, and is stated.** `doctor` reports the path it was invoked as, and
`clibuilder` gives a command no way to learn that except `process.argv[1]`. That read remains, named
as an exception in the node rather than left as an unnoticed leak. What leaves the application
entirely is `process.exitCode`.

## Spec placement — settled with `bah-58-spec` through operator

Node is `.agents/spec/cli/entry-point/` (`README.md` + `entry-point.feature`), a sibling of
`configuration-diagnosis`, whose shape it mirrors. `bah-58-spec` owns the `cli/` index and has
**invited** the registration: add the row to `cli/README.md`'s node table **and** to
`spec.md`'s. It has already named the gap there, and absorbs the rebase if this lands first.

## Sequencing — settled

Order is **#60 (issue #57), then `bah-58-spec`, then this CR**. `#60` changes
`doctor-guidance.ts` (`Repair.repair` now returns `{ command, instruction }`, plus a new
`RepairAction` type) and therefore the `help` rows this CR would extract, but it does **not**
touch `renderSkillLauncher`, `launcherFor`, `launcherInvocation` or `commandInvocation`, so the
launcher half of the rebase is clean. Wait for `#60` to reach `main` and rebase onto `main` —
never onto its branch, which is itself about to be rebase-merged.

## NEXT

Landed. Both gates cleared: the spec gate on round 5 (`ALIGNED`, all three lenses) and the impl gate
on round 2 (`approve`, all 21 frozen scenarios verified). The suite is frozen. `pnpm verify` is green
with 254 tests at 100% coverage.

Two follow-ups were held out of scope and filed rather than fixed here: the command library reports
its own usage exits by writing the process exit code instead of returning it, which is why every
caller must apply a returned code only when non-zero; and the `repair` skill's suite carries two
scenarios missing from its scenario map, found by sweeping the rule that blocked this CR's own gate.
