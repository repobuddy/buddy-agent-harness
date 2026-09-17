---
title: Skill Scripts
description: How a skill runs a script that ships beside it, and why the download fallback stays.
---

A skill can ship a script and tell the agent to run it. The script travels in the skill's own directory, so an installed skill already has it on disk.

Finding the code is not the hard part. Naming where it lives is, because the shell that runs it sits in a different directory entirely.

## The script goes beside the skill

Put one script per command under the skill's `scripts/` directory:

```text
skills/
└── doctor/
    ├── SKILL.md
    └── scripts/
        └── doctor.mjs
```

Name it for the command it runs, not `run.mjs`. That name is what appears in a stack trace, a process list, and the shell history someone reads back later. A generic name tells them nothing there, and it collides the moment the skill ships a second script.

## Resolve from the script, never the working directory

An agent runs a skill's script from the repository it is working on, so the working directory is that repository rather than the skill. A script that resolves anything from the working directory finds the wrong thing, or nothing.

Resolve from the script's own location instead, for anything the script ships beside — a data file, a template, another script in the same `scripts/` directory:

```js
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
```

This is ordinary Node resolution rather than a harness feature. `import.meta.url` is the script's own URL. It does not depend on which harness invoked the script, or on any harness at all.

What it no longer buys you is a path *up* to a package root. An installer such as `skills add --skill <name>` copies only the one skill folder an agent reads `SKILL.md` from — there is no `../../dist` or `node_modules` above it to walk up to. If the script needs code or a dependency tree beyond the walking-up trick, bundle that in (below) rather than assuming a package sits above the skill.

So the script reaches whatever it ships beside, while the working directory stays the repository under inspection. Both halves matter, and they are separate.

## Write the path as the skill sees it

Name the script relative to the skill directory:

```sh
node scripts/doctor.mjs
```

An agent knows which directory it read the `SKILL.md` from, and resolves the path against it. Say so in the body, since the working directory is the repository rather than the skill.

Keep `node` in front. A bundle written by a build step ships without an executable bit, and a shebang does nothing on Windows, so naming the file alone would not run it.

This step has a limit worth stating. Resolving the path is model behavior rather than a guarantee like `import.meta.url`, and it varies by harness and by model. That is one of the two failures the `npx` fallback below covers.

Do not reach for `${CLAUDE_SKILL_DIR}`. It expands on Claude Code and stays literal on the page everywhere else, the same trap as a bare `$ARGUMENTS`. See [Writing Portable Skills](/agent-configuration/portable-skills/#arguments-do-not-survive-the-trip).

## Bundle the script per skill, at build time

A script that imports only Node built-ins runs wherever it lands. Distribute it however you like.

A script that imports a package, or shares code with the rest of your project, cannot rely on a `node_modules` above it — the skill folder is the unit an installer copies, and nothing outside it travels along. `skills add --skill <name>` copies only that one folder; a symlinked or otherwise partial install has even less beside it.

Bundle instead of depending on an install carrying the tree: write the script's source once in your package, and build one self-contained bundle per skill that runs it — every runtime dependency inlined, Node builtins external. The source stays a few lines (compose the arguments, call your library's entry point); the bundler does the rest. Commit nothing the build produces; regenerate it and check that regeneration against what actually shipped, the same way you'd check any other generated artifact.

Then ship the bundle **through the same channel that ships the rest of your code**. A package published to npm can carry the bundle in its tarball; a plugin distributed only from a git checkout cannot, because nothing in that install path runs your build. That is the one distinction that matters — not whether the script happens to import a package, but whether the install that shipped it also built and packed one:

- **npm-sourced.** The install can carry the built bundle; a `prepack` step is what puts it there before publish.
- **git-sourced.** The checkout is the source, not a build output — nothing under a skill folder can assume a bundle sits beside it. Fall back to `npx` instead.

Vendors are not uniform about which sources they even support. Claude Code documents both an npm and a git plugin source, and Codex documents npm sources but downloads the package without running lifecycle scripts — so a bundle it uses must already be in the published tarball, not produced by a post-install hook. Copilot CLI and Cursor document only local-path plugin sources, which is a git install in every case that matters here. Check your target harnesses' plugin documentation before assuming either path is available.

Document a fallback for the git-sourced case, and for a harness that cannot resolve or run the script path at all:

```sh
npx -y <package>@^<version> <command>
```

Pin it. An unpinned `npx` resolves whatever the registry calls latest, while the skill describes the flags and output of the version it shipped with. Pinning costs little: `npx` checks the local `node_modules` before it reaches the network, so the pinned form still runs a local copy that satisfies the range. It will not use a global install, which is one reason a runner such as `upx` exists.

Regenerate the pin at release, or it rots. A skill generated at one version keeps naming that version until something rewrites it, and the fallback then documents a CLI nobody ships any more.

For the runner words themselves, and what each costs per call, see [`@repobuddy/upx`](https://github.com/repobuddy/upx) for the local-first runner and [npx and upx](https://cyberuni.github.io/universal-plugin/concepts/npx-and-upx/) for picking between them.
