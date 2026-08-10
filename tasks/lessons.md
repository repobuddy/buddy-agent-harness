# Lessons Learned

## Pattern

Initialized a package inside a monorepo after noticing its local `.agents` directory, instead of identifying the repository root as the consumer target.

## Rule

For harness initialization, use the Git repository root. A nested package is never a separate consumer root.

## Context

Applies to monorepos and repositories that contain publishable plugin packages with their own assets or test fixtures.

## Category

`architecture`

---

## Pattern

Stopped to ask for an implementation detail when the user was directing that the behavior itself belongs in the SDD contract.

## Rule

When a user states a product-policy correction during a spec backfill, capture the policy in the draft first; defer the storage or transport mechanism until implementation design requires it.

## Context

Applies to SDD contract authoring where a behavioral requirement is clear but its implementation mechanism is not yet selected.

## Category

`architecture`

---

## Pattern

Enabled harnesses from existing vendor directories instead of treating the active harness and explicit user preferences as the source of installation intent.

## Rule

Default to the active harness. Add other harnesses only through an explicit, durable user preference; do not infer consent from a directory's presence.

## Context

Applies to cross-harness initialization and installation workflows.

## Category

`architecture`

---

## Pattern

Treated a package inside a monorepo as a possible consumer root when documenting harness initialization.

## Rule

For harness initialization, the consumer root is always the Git repository root. A nested package is a project surface, never an independent consumer root.

## Context

Applies to repository-level agent configuration, including monorepos with publishable packages.

## Category

`architecture`

---

## Pattern

Placed a user-facing CLI under a generic tooling node during a mirror-source SDD scaffold.

## Rule

Model a CLI that delivers product behavior as its own capability; reserve `tooling/` for build, packaging, release, and other contributor-facing infrastructure.

## Context

Applies when placing nodes for a package whose CLI is an end-user surface rather than internal project tooling.

## Category

`architecture`

---

## Pattern

Assumed an agent plugin must always hoist its SDD spec, without checking whether its npm package excludes repository metadata from the published artifact.

## Rule

For a packaged plugin, inspect its npm packaging boundary before recommending spec placement; colocate when the package's published files exclude `.agents/`.

## Context

Applies when SDD project-spec placement depends on the difference between a plugin's distribution format and its npm package boundary.

## Category

`architecture`
