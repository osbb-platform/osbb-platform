# Changelog

## 2.0.0 — Architecture 2.0 release consolidation

Date: 2026-06-02  
Branch: release/arch-2.0

### Added

- Content-engine v2 release consolidation documentation.
- Local verification gate: `npm run verify`.
- CI workflow for lint, typecheck, and build.
- Reports legacy backfill migration for stage/prod copies that may still contain legacy reports.
- Runtime audit documentation.
- Release readiness documentation.

### Changed

- Public house runtime is detached from legacy `house_sections`.
- House cover image upload moved from server actions to client-side Supabase Storage upload.
- Server actions now receive uploaded cover path/name instead of `File` payloads.
- Legacy v1 house-section code remains quarantined in `src/legacy-v1`.

### Documented caveats

- `next@16.2.2` rejects top-level `serverActions.bodySizeLimit`; current valid config remains `experimental.serverActions.bodySizeLimit`.
- Local Supabase migration history has old pre-existing drift and must be confirmed/repaired separately before shared environment application.
- No production push or deploy is included in this branch workflow.

### Not included

- No destructive drop of legacy tables.
- No compatibility-removal migration for remaining `house_pages` helpers.
- No production deploy.
