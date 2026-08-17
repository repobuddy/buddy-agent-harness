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

Resolve from the script's own location instead:

```js
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
```

This is ordinary Node resolution rather than a harness feature. `import.meta.url` is the script's own URL, and a bare `import 'some-package'` from that file resolves through the `node_modules` above it. Neither depends on which harness invoked the script, or on any harness at all.

So the script reaches the package it shipped in, while the working directory stays the repository under inspection. Both halves matter, and they are separate.

## Write the path as the skill sees it

Name the script relative to the skill directory:

```sh
node scripts/doctor.mjs
```

An agent knows which directory it read the `SKILL.md` from, and resolves the path against it. Say so in the body, since the working directory is the repository rather than the skill.

Keep `node` in front. A launcher written by a build step ships without an executable bit, and a shebang does nothing on Windows, so naming the file alone would not run it.

This step has a limit worth stating. Resolving the path is model behavior rather than a guarantee like `import.meta.url`, and it varies by harness and by model. That is one of the two failures the `npx` fallback below covers.

Do not reach for `${CLAUDE_SKILL_DIR}`. It expands on Claude Code and stays literal on the page everywhere else, the same trap as a bare `$ARGUMENTS`. See [Writing Portable Skills](/agent-configuration/portable-skills/#arguments-do-not-survive-the-trip).

## Dependencies decide how you distribute

A script that imports only Node built-ins runs wherever it lands. Distribute it however you like.

A script that imports a package is different, and you settle the question when you choose how to publish. Installing a plugin from npm installs its dependency tree with it. Installing the same plugin from a git source copies the repository and leaves `node_modules` to whatever the checkout happened to contain. The script is identical either way. Only its imports resolve differently.

So choose deliberately:

- **Built-ins only.** Any distribution works, and this is the simplest skill to ship.
- **Imports a package, or shares code with the rest of your project.** Publish to npm and let the install carry the tree.

A plugin that needs `node_modules` and ships from git is the one combination that breaks, and it is one you control.

Document a fallback anyway, for a skill that might be installed either way or invoked where the placeholder does not resolve:

```sh
npx -y <package>@^<version> <command>
```

Pin it. An unpinned `npx` resolves whatever the registry calls latest, while the skill describes the flags and output of the version it shipped with. Pinning costs nothing: `npx` checks the local `node_modules` and any global install before it reaches the network, so the pinned form still runs a local copy that satisfies the range.

:::note[Single-sourced]
That an npm-sourced plugin has its dependencies installed while a git-sourced one does not is observed behavior, recorded in [Sources & Confidence](/sources/) at low confidence. The advice stands either way: a script with dependencies wants the npm route, because that is the route carrying a dependency tree at all. The Node resolution this page relies on is not in question.
:::
