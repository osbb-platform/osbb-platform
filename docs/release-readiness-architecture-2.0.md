# Architecture 2.0 release readiness

Date: 2026-06-02  
Branch: release/arch-2.0

## Summary

Architecture 2.0 release consolidation is ready for manual review.

No production push or deploy was performed from this branch.

## Completed dobivka blocks

| Block | Status | Commit / note |
|---|---|---|
| D1 Verification gate | Done | `8965606 Add release verification gate` |
| D2 Reports backfill | Done | `6a8d7e5 Backfill legacy house reports` |
| D3 Server Actions body limit | Blocked / no commit | `next@16.2.2` rejects top-level `serverActions` |
| D4 Client-side house cover upload | Done | `54624da Move house cover uploads to client` |
| D5 Runtime audit | Done | `54e36fc Document architecture runtime audit` |
| D6 Readiness note | Done | this document |

## Final verification gate

Run before merge/deploy:

- `npm run verify`

Latest D6 run passed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Runtime state

Public house runtime is detached from legacy `house_sections`.

Direct `house_sections` runtime calls remain quarantined in `src/legacy-v1`. Live imports from `src/legacy-v1` are not expected.

Remaining `house_pages` references are compatibility/page-shell and archived-house cleanup helpers, not live `house_sections` content runtime.

## D3 caveat

The dobivka task expected `serverActions.bodySizeLimit` to move to top-level config. In this repository with installed `next@16.2.2`, that placement fails with:

- unrecognized key `serverActions`;
- TypeScript error that `serverActions` does not exist in `NextConfig`.

The valid current config remains `experimental.serverActions.bodySizeLimit`.

This means the build still prints `Experiments: serverActions`, but the alternative requested by the task breaks the release gate.

## Supabase caveat

Local `npx supabase db push --local` is blocked by pre-existing migration history drift for old versions:

- `20260404`
- `20260408`
- `20260526`

The D2 reports migration was validated directly through `psql -f` and is idempotent. Confirm or repair the shared migration ledger before applying to shared environments.

## Not included

- No production push.
- No production deploy.
- No destructive cleanup/drop of legacy tables.
- No compatibility-removal migration for remaining `house_pages` helpers.
