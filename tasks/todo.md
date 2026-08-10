# Task Plan

## Approach

Remove the advanced CodeQL workflow that conflicts with GitHub's enabled default setup, then validate the focused CI fix and open a pull request.

## Scope

- **In**: Removing the duplicate CodeQL workflow and validating the repository after the CI repair.
- **Out**: Changes to the harness initialization contract or GitHub's enabled default CodeQL setup.

## Action Items

- [x] Inspect the failed CodeQL job and confirm the default-setup conflict.
- [x] Remove the duplicate advanced CodeQL workflow.
- [x] Run repository verification and review the focused diff.
- [x] Commit, push, and open the fix pull request.

## Open Questions

- None; the job log identifies the exact incompatible CodeQL configuration.

---

## Review Section

_Complete after implementation._

### Summary

Removed the advanced CodeQL workflow. GitHub's enabled default CodeQL setup performs the scan; GitHub rejects SARIF uploads from an advanced workflow while that setup is active.

### Verification

- [x] Tests pass (`pnpm verify`)
- [x] Linter clean (`pnpm check`)
- [x] Build succeeds (`pnpm verify`)
- [x] Diff reviewed (`git diff --check`)

### Lessons Captured

- [x] No user corrections occurred.
