# Task Plan

## Approach

Bring the repository to the same distributable-plugin baseline as `buddy-codecov`, while preserving the existing harness-init behavior and keeping a documentation site out of scope.

## Scope

- **In**: release automation, CI and security scanning, code-quality/editor configuration, Changesets, coverage and packaged-surface checks, and universal plugin manifests.
- **Out**: a documentation website and changes to the harness initialization contract.

## Action Items

- [x] Compare the current repository with `../buddy-codecov` and identify applicable gaps.
- [x] Add the repository, package, and portable-plugin configuration baseline.
- [x] Add coverage and built-package contract tests.
- [x] Install the declared tooling and regenerate generated plugin manifests.
- [x] Run the complete verification suite and review the diff. (Replanned after correcting the readonly public-surface assertion.)
- [x] Commit the verified, coherent change.

## Open Questions

- None; the reference repository establishes the required baseline.

---

## Review Section

_Complete after implementation._

### Summary

Aligned the CLI plugin repository with the applicable Buddy Codecov release and quality baseline, including Changesets, CI, security scanning, coverage, packaged-surface checks, editor settings, and published documentation.

### Verification

- [x] Tests pass (`pnpm verify`)
- [x] Linter clean (`pnpm check`)
- [x] Build succeeds (`pnpm verify`, `pnpm pack --dry-run`)
- [x] Diff reviewed (`git diff --check` and package contents)

### Lessons Captured

- [x] No user corrections occurred.
