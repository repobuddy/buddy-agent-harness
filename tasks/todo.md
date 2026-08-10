# Task Plan

## Approach

Add the Buddy Codecov-style Astro documentation site and Pages deployment workflow, then apply the detected GitHub repository settings and default-branch ruleset.

## Scope

- **In**: Astro documentation, GitHub Pages deployment, merge settings, Dependabot security updates, and a protected default-branch ruleset.
- **Out**: changes to the harness initialization contract.

## Action Items

- [x] Inspect the current GitHub configuration and Buddy Codecov's documentation implementation.
- [x] Add the Astro site and Pages deployment workflow.
- [x] Install site dependencies and build the documentation.
- [x] Apply and verify GitHub merge, security, Pages, and branch-ruleset settings.
- [x] Review, verify, and commit the change.

## Open Questions

- None; the user authorized both the Pages site and GitHub settings changes.

---

## Review Section

_Complete after implementation._

### Summary

Added the Buddy Codecov-style Starlight documentation site and GitHub Pages workflow. Configured GitHub Actions Pages deployment, the protected default-branch ruleset, merge controls, and Dependabot security updates.

### Verification

- [x] Tests pass (`pnpm verify`)
- [x] Linter clean (`pnpm check`)
- [x] Build succeeds (`pnpm verify`, `pnpm --filter website build`)
- [x] Diff reviewed (`git diff --check`)

### Lessons Captured

- [x] No user corrections occurred.
