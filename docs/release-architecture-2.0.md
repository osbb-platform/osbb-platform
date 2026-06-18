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

## Dobivka before prod

### D1 — Verification gate

Commit:

- 8965606 Add release verification gate

Result:

- Added `typecheck` and `verify` scripts.
- Added GitHub CI workflow for lint, typecheck, and build.
- Local `npm run verify` passes.

### D2 — Reports backfill

Commit:

- 6a8d7e5 Backfill legacy house reports

Result:

- Added idempotent `migrate_legacy_house_reports` migration.
- Added local legacy inventory note.
- Local database has no legacy `house_sections` rows, so local migration smoke inserts zero rows.
- Migration is intentionally retained for stage/prod copies that may still contain legacy `kind='reports'` rows.

### D3 — Server Actions body limit

Status: blocked / no commit

Result:

- The requested top-level `serverActions.bodySizeLimit` placement is not accepted by installed `next@16.2.2`.
- Build/typecheck fails with top-level `serverActions`.
- The valid local configuration remains `experimental.serverActions.bodySizeLimit`.
- This block is documented as a requirement mismatch, not a code change.

### D4 — Client-side house cover upload

Commit:

- 54624da Move house cover uploads to client

Result:

- Removed `File` payload handling from house create/update server actions.
- Removed server-side `.upload()` for house cover images.
- Added client-side Supabase upload in create/edit house forms.
- Server actions retain storage cleanup through `.remove()` for failed submits/replacements.

### D5 — Runtime audit

Commit:

- 54e36fc Document architecture runtime audit

Result:

- Confirmed no direct `house_sections` runtime calls outside `src/legacy-v1`.
- Confirmed no live imports from `src/legacy-v1`.
- Confirmed public house routes use v2/domain services.
- Documented remaining `house_pages` references as compatibility/page-shell and cleanup helpers.

### D6 — Release readiness note

Status: this document

Result:

- Consolidates release readiness state.
- Confirms no production push/deploy was performed from this branch.
- Confirms final gate command is `npm run verify`.

## Release readiness

Current status: ready for manual review with one documented D3 caveat.

Required final local gate before merge/deploy:

- `npm run verify`

Known caveats:

- `next@16.2.2` still prints `Experiments: serverActions` because this project only accepts `experimental.serverActions.bodySizeLimit`. Moving it to top-level `serverActions` breaks config validation and TypeScript.
- Local Supabase migration history has pre-existing drift for old versions: `20260404`, `20260408`, `20260526`. D2 SQL was validated directly with `psql -f`. Resolve/confirm migration ledger separately before applying to shared environments.
- No prod push/deploy is included in this release branch workflow.

## Remaining known legacy references

### house_pages

Still used by page-shell compatibility services and archived-house cleanup.

These references are intentionally retained until a separate compatibility removal migration.

### content_versions

House-section versioning was quarantined with legacy actions.

Remaining live references are in src/modules/company/*, which is a separate legacy subsystem and outside the 13 house content sections migrated in this release.

## Hotfix — Public runtime request reduction / Vercel 403 mitigation

Date: 2026-06-18  
Branch: release/summer-2026-main-integration-20260615142407

### Scope

This hotfix reduces excessive public/root requests that could lead to Vercel 403 / rate-limit symptoms on public house pages.

### Runtime changes

- `proxy.ts` now exits early for `/api/*` before any Supabase/auth work.
- Supabase middleware auth lookup is limited to the admin host only.
- Root domain and public house subdomains no longer create middleware Supabase clients and no longer call `auth.getUser()`.
- Added a cookie-free public Supabase server client for cacheable public reads.
- Public house read services now use `unstable_cache` with house-level and section-level tags.
- Content mutations now invalidate public cache tags through `revalidateTag(..., "max")` plus existing public paths.
- Public read services return safe empty/null snapshots on read errors instead of throwing into public runtime.
- `validateHouseSession` remains intentionally cookie/server based and is not moved into public cache.

### Bell feed optimization

- Replaced public bell feed fan-out from 11 public service calls with a single Supabase RPC:
  - `public.get_house_bell_feed(target_house_id uuid, window_days int default 7)`
- Local migration file:
  - `supabase/migrations/202606180001_create_house_bell_feed_rpc.sql`
- Production migration note:
  - Apply this SQL manually through Supabase SQL Editor before/with production deployment.
  - Do not rely on CLI migration push for production in this hotfix workflow.

### Analytics request batching

- `/api/analytics/track` accepts both legacy single-event payloads and new `events[]` batch payloads.
- Public house tracker sends `site_visit` + `section_view` in one beacon/fetch payload per route.
- PDF viewer sends `document_open` using the same batch-compatible payload shape.
- Server ingest inserts analytics rows in one batch insert, capped at 20 events per request.

### Observability checks after production deploy

Check Vercel logs and browser Network for the following:

- Public/root requests must not trigger Supabase auth middleware calls.
- `/api/*` requests should bypass proxy auth work.
- Public house first load should not show repeated service fan-out for the bell feed.
- Bell feed should call `/rest/v1/rpc/get_house_bell_feed` once per cache miss.
- Analytics tracker should send one `/api/analytics/track` request containing `events[]` for page visit + section view.
- No new public 403 spikes on 10-house smoke test.
- Public pages should continue rendering safe empty states if a content read fails.

### Validation

- `npm run build` passed after proxy/cache/bell-feed/analytics changes.
- `npm run lint` passed with one pre-existing warning:
  - `src/modules/houses/components/HouseDebtorsWorkspace.tsx` — unused `draftDebtorsCount`.
