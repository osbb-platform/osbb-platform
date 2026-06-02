# Architecture 2.0 release consolidation

Date: 2026-06-02
Branch: release/arch-2.0

## Scope

This release consolidates the OSBB Platform house content runtime around content-engine v2 and removes live dependencies on the legacy house_sections runtime.

No production push is performed from this branch.

## Completed blocks

### Block 0 — Release safety boundaries

Commit: b78b8c2 Stabilize release safety boundaries

- Established release branch boundaries.
- Confirmed no production deployment/push as part of the consolidation workflow.

### Block 1 — Lint gate cleanup

Commit: d85535c Clean release lint gate

- Cleaned lint baseline for the release branch.
- Verified the branch can pass release quality gates.

### Block 2 — Reports/history backfill audit

Status: audit-confirmed no-op

- Reports/history backfill was not required.
- Legacy refs for reports were not found.
- History already writes through the content-engine pipeline.

### Block 3 — Public runtime detach

Commit: fcb9bca Detach public runtime from legacy house sections

- Detached public house pages and public feeds from legacy house_sections.
- Public runtime now reads house identity through getHouseBySlug and content through v2 services.
- Removed obsolete legacy public readers.

### Block 4 — Legacy v1 quarantine

Commits:

- 2fd5e19 Detach house bootstrap from legacy sections
- f3b6b8e Detach admin house page from legacy page ensures
- b49d540 Quarantine unused legacy house section modules
- f921857 Detach admin dashboard from legacy house sections
- a0c02fd Document legacy v1 quarantine

Result:

- No live house_sections references remain outside src/legacy-v1.
- No live imports from src/legacy-v1 remain.
- Legacy v1 modules are quarantined and excluded from lint/typecheck.
- Legacy DB tables are documented with comments, not dropped.

### Block 5 — Maturity tails

Commits:

- f800378 Remove stale in_review house statuses
- 286af2a Replace stale task modal cms tokens
- 9aa272c Replace hardcoded district admin colors
- 169c788 Finish district admin color token cleanup
- 47b2df8 Replace hardcoded apartment admin colors
- 0735a23 Finish apartment admin color token cleanup

Result:

- House-scope in_review status was removed.
- CreateTaskModal no longer uses stale CMS tokens.
- Target district/apartment admin components use CMS tokens instead of hardcoded status colors.
- Remaining in_review is isolated to the company legacy subsystem.

### Block 6 — Repository hygiene

Commit:

- 2149eee Ignore local audit artifacts

Result:

- Local audit/temp artifacts are ignored.
- Local generated trash was removed.
- Merged local architecture branches were deleted.
- Unmerged hotfix/main branches were preserved for manual review.

## Remaining known legacy references

### house_pages

Still used by page-shell compatibility services and archived-house cleanup.

These references are intentionally retained until a separate compatibility removal migration.

### content_versions

House-section versioning was quarantined with legacy actions.

Remaining live references are in src/modules/company/*, which is a separate legacy subsystem and outside the 13 house content sections migrated in this release.
