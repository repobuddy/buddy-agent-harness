---
'buddy-agent-harness': minor
---

Moves to clibuilder 12 and `@cyberuni/agent-harness` 0.7. The package no longer uses `@clibuilder/axi`, and its skill scripts and `dist/cli.mjs` no longer carry clibuilder's runtime plugin and config loader: the three skill scripts shrink from 693 KB to 386 KB and `dist/cli.mjs` from 1.1 MB to 689 KB.

Command interfaces and documented output are unchanged. What a caller can see:

- A usage error (an unknown option or command, an unsupported `--format`) is now a coded report on stdout (`error`, `code`, and `help` lines in the chosen format) with exit code `2`. It was prose and help on stderr.
- `--format` is clibuilder's global option, so every command, including `mcp` and `reference`, lists it in `--help` the same way. `reference show|create|delete` and `governance show` still default to `text`, and every other command to `toon`; the default is chosen from the command named in argv.
- `initCommand`, `doctorCommand`, `governanceCommand`, `referenceCommand`, `harnessCommand`, and `activate` are clibuilder 12 command objects. A host that mounts them needs `clibuilder` `^12.0.0`; `^11` no longer works.
