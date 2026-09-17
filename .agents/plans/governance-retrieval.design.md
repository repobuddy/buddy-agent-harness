# Governance retrieval: where the command lives and how a skill reads a governance

Design material, not a spec node. It proposes a direction across four repositories and needs the
owner's decision before any of them changes. Open an issue and add its number to this file's name
when the work is scheduled.

## Terms

- **Governance**: a version-pinned Markdown rule set that a skill or an author loads, for example
  `skill-design` or `agent-tool-output`. It describes *what* to do; decision records hold *why*.
- **Retrieval**: turning a governance name into its text at the moment an agent needs it.

## Current state

Three packages each ship their own copy of the retrieval command, and callers use all three.

| Package | Command | Documents it ships |
| --- | --- | --- |
| `cyberplace` | `cyberplace governance list\|show <name>` | `skill-design`, `skill-repo-structure`, `agent-tool-output`, `cli-resolution`, `universal-plugin` |
| `universal-plugin` | `universal-plugin governance show [<plugin>/]<name>` | `plugin-design`, `slash-invocation` |
| `cyber-skills` (legacy) | `cyber-skills governance show <name>` | older copies of the above |

Skills call these with `npx`, most often `npx cyberplace@<version> governance show skill-design`.
A search of the owner's `cyberuni` and `repobuddy` checkouts on 2026-09-16 counted about 470
occurrences.

Two further facts shape the choice:

- `cyberplace` is the cyberuni marketplace. Retrieval is not marketplace work.
- `universal-plugin` describes itself as a plugin build tool. It already carries run-time
  features: `governance`, `config` (writes `.agents/universal-plugin.json`), `sync`, `prepare`,
  and an asset store under `~/.agents/.universal-plugin/`. Its governance resolver is layered
  (managed, project `governances/`, local `.agents/governances/`, user `~/.agents/governances/`,
  package) and can resolve `<plugin>/<name>` from installed plugin assets.

## Proposal

Split the work by when it happens. No plugin needs a CLI at run time to read a governance.

| When | Owner | Job |
| --- | --- | --- |
| Authoring | the package that owns the subject | Publishes the governance as a plain Markdown file. |
| Build | `universal-plugin` | A plugin declares the governances its skills use. `plugin build` copies each one to `<skill>/references/governances/<name>.md` in the skill folders that reference it, from the owning package installed as a dev dependency, and its check mode fails when a copy is stale. |
| Run | nobody | The skill reads its own copy. |
| Local override | `buddy-agent-harness` | Manages `.agents/governances/` at project, user, and managed scope: `init` creates it, `doctor` reports it, and `governance list\|show` resolves a name for people and for agents working outside a skill. |

The run-time rule, stated once in `skill-design`: read `.agents/governances/<name>.md` when it
exists, otherwise `references/governances/<name>.md` inside the skill folder. An agent follows that
with two file checks.

The copies sit in their own `governances/` subfolder so they never collide with a skill's
hand-written references, read as generated at a glance, and mirror the override path.

### What each package ends up with

- **`universal-plugin`** stays a build tool. It gains the copy step and loses `governance show`.
  Its other run-time commands (`config`, `sync`, `prepare`, the asset store) are candidates to move
  to `buddy-agent-harness` later; that is a separate decision.
- **`buddy-agent-harness`** owns the override layers and the human-facing `governance` command,
  using the layered resolver moved from `universal-plugin` rather than written again.
- **`cyberplace`** loses `governance`. For one release the command prints the replacement and
  exits non-zero.
- **`cyber-skills`** is retired.
- **The documents** move to their owners. `skill-design` and `skill-repo-structure` go to ACED,
  which authors skills. `universal-plugin` keeps `plugin-design`, `slash-invocation`, and takes
  `universal-plugin`. The owner of `agent-tool-output` and `cli-resolution` is open.

### Why a copy rather than a run-time call

- A plugin author depends on `universal-plugin` at build time only. A user installs nothing extra.
- The skill reads the governance version it was tested with. The pinned `npx` call gives the same
  guarantee today, at the price of a registry lookup on every read.
- Nothing runs from the network while a skill works.

### Costs

- A governance fix reaches a skill only when its plugin is rebuilt and released. This matches
  the pinned `npx` calls it replaces.
- An override works only if the skill follows the two-file rule. `doctor` can report a skill that
  names a governance without the local lookup.
- Every skill that uses a governance carries its own copy. The copy costs disk, not context,
  until an agent opens it.
- The caller migration is repository by repository.

## Conflict to resolve first: where a skill's script lives

This repository and the rule just added to `skill-design` disagree.

- [Skill Scripts](../../apps/web/src/content/docs/agent-configuration/skill-scripts.md) and this
  package's generated launchers resolve the package root from the script
  (`skills/<skill>/scripts/doctor.mjs` goes four levels up to `dist/cli.mjs`), and document a
  pinned `npx` fallback for installs where that path is missing.
- `skill-design` (cyberplace branch `docs/skill-script-bundling`) says a skill's scripts stay
  inside the skill folder, run with plain `node`, and never reach a path outside it. Shared logic
  is authored in the package source and bundled into each skill's `scripts/`, with a drift check.
  `repobuddy` now builds its `min-release-age` and `init-buddy` scripts this way.

The launcher approach keeps one copy of the code and relies on the plugin layout plus the `npx`
fallback. The bundle approach keeps each skill folder complete, so `skills add --skill <name>`,
a copied folder, and a plugin install behave the same, at the cost of a bundle per skill.

Governance copies follow the same reasoning as script bundles, so this design assumes the bundle
approach. If the launcher approach stays, the governance copy step should target the plugin root
instead, and `skill-design` needs to change back.

## Migration order

1. Settle the script-placement conflict above and align `skill-design` and Skill Scripts.
2. Add the run-time lookup rule to `skill-design`.
3. Add the governance copy step and its check to `universal-plugin plugin build`.
4. Move the layered resolver to `buddy-agent-harness`; add `governance list|show` and the
   `.agents/governances/` handling to `init` and `doctor`.
5. Move each document to its owner.
6. Replace `cyberplace governance` and `universal-plugin governance` with notices naming the new
   command; retire `cyber-skills`.
7. Migrate the callers, one repository per change.

## Open questions

- Which package owns `agent-tool-output` and `cli-resolution`?
- Should a plugin declare its governances in `plugin.json` (an extension key) or should the build
  scan skill bodies for references?
- Does the managed override scope stay, and does `doctor` report a managed override that shadows
  a plugin's copy?
