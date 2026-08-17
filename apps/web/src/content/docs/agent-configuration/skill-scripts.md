---
title: Bundling Scripts with a Skill
description: How a skill runs code that ships beside it, and why the download fallback stays.
---

A skill that needs to do real work can ship the code that does it. The script travels in the skill's own directory, so an installed skill has everything it needs on disk.

The hard part is not finding the code. It is naming where the code lives, from a shell whose working directory is somewhere else entirely.

## The script goes beside the skill

Put one script per command under the skill's `scripts/` directory:

```text
skills/
└── doctor/
    ├── SKILL.md
    └── scripts/
        └── doctor.mjs
```

Name it for the command it runs, not `run.mjs`. The name is what shows up in a stack trace, in a process list, and in the shell history a person reads back later. A generic name tells them nothing, and it collides the moment the skill ships a second script.

## Resolve from the script, never the working directory

An agent runs a skill's script from the repository it is working on. The working directory is that repository, not the skill. So a script that resolves anything relative to the process's working directory finds the wrong thing, or nothing.

Resolve from the script's own location instead:

```js
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
```

This is ordinary Node resolution, not a harness feature. `import.meta.url` is the script's own URL, and a bare `import 'some-package'` from that file resolves through the `node_modules` above it. Both behave the same under every harness, and under no harness at all.

That is what lets a script reach the package it shipped in. The working directory stays the repository under inspection, which is exactly what the command needs to read.

## Name the skill directory with a placeholder

The script still has to be invoked, and the invocation needs a path. Relative paths are useless here, because the working directory is the repository.

Write the skill's own directory as a placeholder and let the agent substitute it:

```sh
node "<skill>/scripts/doctor.mjs"
```

State in the body that `<skill>` is the skill's own directory. An agent knows where it read the file from, so this resolves in practice without any harness-specific variable.

Resist the temptation to use `${CLAUDE_SKILL_DIR}` instead. It expands on Claude Code and stays on the page everywhere else, which is the same trap as a literal `$ARGUMENTS`. See [Writing Portable Skills](/agent-configuration/portable-skills/#arguments-do-not-survive-the-trip).

## Dependencies decide how you distribute

A script that imports only Node built-ins runs wherever it lands. Distribute it however you like.

A script that imports a package is a different matter, and the decision is yours to make at authoring time. Installing a plugin from npm installs its dependency tree with it. Installing the same plugin from a git source copies the repository, which leaves `node_modules` to whatever the checkout happened to contain. The script is identical in both cases. Only its imports resolve.

So the rule is a fork in the road, not a risk to manage:

- **Built-ins only.** Any distribution works. This is the simplest skill to ship and the easiest to reason about.
- **Imports a package, or shares code with the rest of your project.** Publish as an npm package and let the install bring the tree.

Choosing the npm route for a script with dependencies is what makes the script reliable. A plugin that needs `node_modules` and ships by git is the one broken combination, and it is one you control.

Document a fallback anyway, for a skill that might be installed either way:

```sh
npx -y <package>@^<version> <command>
```

Pin it. An unpinned `npx` resolves whatever the registry calls latest, and a skill describes the flags and output of the version it shipped with. `npx` also checks the local `node_modules` and any global install before it reaches the network, so the pinned form still runs a local copy when one satisfies the range.

The cleanest way to avoid the whole question is to write scripts against Node built-ins only. Then there is no dependency to miss and the fallback is a formality.

:::note[Single-sourced]
That an npm-sourced plugin has its dependencies installed while a git-sourced one does not is observed behavior, not documented behavior, and is recorded in [Sources & Confidence](/sources/) at low confidence. It does not change the advice above: a script with dependencies wants the npm route regardless, because that is the route that carries a dependency tree at all. The Node resolution the rest of this page relies on is not in question.
:::
