# Task Plan

## Approach

Restore the repository's advanced CodeQL workflow and disable GitHub's conflicting default setup, matching the established Buddy Codecov configuration.

## Scope

- **In**: Restoring the advanced CodeQL workflow, disabling the conflicting default setup, and validating the CI repair.
- **Out**: Changes to the harness initialization contract.

## Action Items

- [x] Inspect the failed CodeQL job and confirm the default-setup conflict.
- [x] Compare the configuration with Buddy Codecov.
- [x] Restore the advanced CodeQL workflow.
- [x] Disable GitHub's CodeQL default setup.
- [x] Run repository verification and update the pull request.

## Open Questions

- None; Buddy Codecov confirms that advanced CodeQL is the intended configuration when default setup is disabled.

---

## Review Section

_Complete after implementation._

### Summary

Restored the advanced CodeQL workflow and disabled GitHub's conflicting default setup. This matches Buddy Codecov's configuration and leaves the repository with one intended scanner.

### Verification

- [x] Tests pass (`pnpm verify`)
- [x] Linter clean (`pnpm check`)
- [x] Build succeeds (`pnpm verify`)
- [x] Diff reviewed (`git diff --check`)

### Lessons Captured

- [x] No user corrections occurred.
