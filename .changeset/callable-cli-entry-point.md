---
'buddy-agent-harness': minor
---

Give the CLI a callable entry point, so `bin` owns the process and skills stop mutating `argv`.

`src/cli.ts` exported `main()`, which built the app, read `process.argv` and wrote
`process.exitCode`. Nothing could invoke a command without going through the process, and the cost
showed up in generated code: every skill launcher spliced the subcommand into global `process.argv`
and then side-effect-imported the executable.

The two boundaries are now separate. `bin/buddy-agent-harness.mjs` is the **process** boundary, the
only place that reads `process.argv` or writes `process.exitCode`. `src/cli.ts` is the
**application** boundary: it takes an argv and returns an exit code.

New export `run(argv: string[]): Promise<number>`. The `clibuilder` application stays internal —
exporting it would make `clibuilder`'s builder shape part of this package's public API, so a
`clibuilder` major would become a major here. The generated launchers now compose an argv and call
`run`, mutating nothing:

```js
const code = await run([...process.argv.slice(0, 2), 'doctor', ...process.argv.slice(2)])
if (code !== 0) process.exitCode = code
```

The code is applied only when non-zero because `clibuilder` reports an unknown option or unknown
command by writing `process.exitCode` itself and returning nothing, so `run` reports `0` on a path
where the process must still exit `2`.

`doctor` and `init` now **return** their exit codes rather than writing `process.exitCode`. A
command that writes the code reports its failure past the caller instead of to it, so `run` would
have returned `0` for the commonest failure there is. Nothing changes for a shell caller.

New export `buildDoctorReport`, with its `DoctorReport` type. `doctor`'s assembled report — the
`bin` line, the healthy-answer sentence, the deduped `help` section — was reachable only by running
the CLI and re-parsing its own TOON. Three layers are now each reachable on their own:
`diagnoseBridges` and its siblings return the raw diagnosis, `buildDoctorReport` returns the report
as a value, and `run` returns that report serialized plus an exit code.

Two fixes in the lines this touched:

- **Errors went to stdout.** `doctor`'s default output is TOON that agents parse, and the error line
  landed in the stream they were parsing. It goes to `stderr`.
- **`--version` was wrong.** It reported `0.1.0` while the package was at `0.6.0`, five minors
  behind. It is read from the manifest.

Also fixed: `skills/repair/`'s launcher was labelled generated but was not on the generator's list,
so nothing rewrote it and nothing caught it going stale. The generator now keys each launcher by the
subcommand it runs, and a test asserts every shipped launcher is a target it checks.
