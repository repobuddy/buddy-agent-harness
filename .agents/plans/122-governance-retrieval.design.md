# Governance retrieval: where the command lives and how a skill reads a governance

Design material, not a spec node. Tracked in #122; the owner decided the open questions on
2026-09-17 (see Decisions).

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
| Build | `universal-plugin` | A plugin declares the governances its skills use. The build copies each one to `<skill>/references/governances/<name>.md` in the skill folders that reference it, from the owning package installed as a dev dependency. The copies are committed, with a check that fails when a copy differs from its source. |
| Run | the skill | Resolves the governance in the order below; its own copy is the default. |
| Local override | `buddy-agent-harness` | Manages `.agents/governances/` at project, user, and managed scope: `init` creates it, `doctor` reports it, and `governance list\|show` resolves a name for people and for agents working outside a skill. |

### Lookup order at run time

Stated once in `skill-design`. The skill stops at the first hit.

1. `.agents/governances/<name>.md`, the project override. A file check.
2. `buddy-agent-harness governance show <name> --overrides-only`, run only from an installed copy:
   `upx --local-only buddy-agent-harness@^<major> governance show <name> --overrides-only` when `upx`
   is on `PATH`, otherwise the bare command when `command -v buddy-agent-harness` finds it. The
   command reads the user layer (`~/.agents/governances/`) and then the managed layer (the
   machine-wide directory), never returns the governance
   its own package ships, and exits non-zero when there is no override. `upx --local-only` exits 127
   when no installed copy satisfies the range. Either way, the skill moves to step 3. A skill that
   reads several governances resolves the runner once.
3. `references/governances/<name>.md` inside the skill, the default.

Step 2 returns overrides only: the skill was tested against its own copy, and a newer or older CLI
must not replace that copy unless someone set an override. It never runs through `npx`, which would
pay a registry lookup, and on a cold machine a download, on a step that usually finds nothing.
`upx --local-only` (`@repobuddy/upx` branch `feat/local-only`) finds repo-local and global installs
and checks the version range, so a stale global copy without `--overrides-only` is skipped;
`command -v` covers machines without `upx` but sees neither repo-local installs nor versions.

### Where the copies go

`<skill>/references/governances/<name>.md`. The Agent Skills specification allows any directories
in a skill; the subfolder keeps copies apart from hand-written references, reads as generated, and
has the same shape as the override path.

The copies are committed. They are small text, and a git-sourced install needs its default to work
offline. This is the exception to keeping build output out of git, which applies to script bundles.

### Keeping references one level deep

The specification asks that `SKILL.md` reference every file directly, without chains. Governances
reference each other, so the copy step:

- copies every governance a copied governance references, transitively;
- rewrites each `governance show <other>` pointer inside a copy to "load
  `references/governances/<other>.md` if it is not already loaded";
- requires `SKILL.md` to list every copy under References, and its check fails when one is
  missing.

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
  `universal-plugin`. `agent-tool-output` and `cli-resolution` also go to ACED; `cli-resolution` is
  rewritten there around `upx --local-only` and the bundle-per-skill rule.

### Why a copy rather than a run-time call

- A plugin author depends on `universal-plugin` at build time only. A user installs nothing extra.
- The skill reads the governance version it was tested with. The pinned `npx` call gives the same
  guarantee today, at the price of a registry lookup on every read.
- Nothing runs from the network while a skill works.

### Costs

- A governance fix reaches a skill only when its plugin is rebuilt and released. This matches
  the pinned `npx` calls it replaces.
- An override works only if the skill follows the lookup order. `doctor` can report a skill that
  names a governance without the local lookup.
- Every skill that uses a governance carries its own copy. The copy costs disk, not context,
  until an agent opens it.
- The caller migration is repository by repository.

## Settled: where a skill's script lives

The owner chose the bundle approach, shipped through npm:

- A skill's script is a self-contained, minified bundle inside the skill folder, built from the
  package source in `prepack`. It is gitignored and ships only in the npm package.
- A CI check packs the package and runs each bundle from the unpacked skill folder.
- Each skill documents a pinned `npx -y <package>@^<version> <command>` fallback for installs that
  have no built `scripts/`, which is every git-sourced install.
- The plugin is distributed from npm where the harness supports it. Claude Code and Codex document
  an npm plugin source; Copilot CLI and Cursor document only local paths, and Claude Code
  organization-distributed marketplaces exclude npm, so those installs use the fallback.

`skill-design` states this (cyberplace branch `docs/skill-script-bundling`), `repobuddy` builds its
`min-release-age` and `init-buddy` scripts this way, and this repository's launchers are being
replaced on branch `fix/bundle-skill-scripts`, which also rewrites the Skill Scripts page.

Governance copies differ from script bundles: they are committed (see Where the copies go).

## Migration order

1. Add the lookup order and the copy layout to `skill-design`.
2. Add the governance copy step to `universal-plugin plugin build`, with transitive copies, pointer
   rewriting, the `SKILL.md` listing check, and a check mode for committed copies.
3. Move the layered resolver to `buddy-agent-harness`; add `governance list|show`,
   `--overrides-only`, and the `.agents/governances/` handling to `init` and `doctor`.
4. Move each document to its owner.
5. Replace `cyberplace governance` and `universal-plugin governance` with notices naming the new
   command; retire `cyber-skills`.
6. Migrate the callers, one repository per change.

## Decisions

- **Owners.** `skill-design`, `skill-repo-structure`, `agent-tool-output`, and `cli-resolution` move
  to ACED. `universal-plugin` keeps `plugin-design` and `slash-invocation` and takes
  `universal-plugin`.
- **Declaration.** The files in `<skill>/references/governances/` declare which governances a skill
  uses. To use one, an author adds its file there; the build refreshes every file in that folder
  from its owner, adds the governances those files reference, and fails when a file names no known
  governance or when `SKILL.md` does not list a copy. Nothing is declared in `plugin.json`.
- **Managed layer.** It stays, at the position the lookup order gives it: after the project
  override and after the user layer, as a machine-wide default. It does not enforce; a project or
  user override wins over it.

## Open questions

- Should `doctor` report a project or user override that shadows a managed governance?
