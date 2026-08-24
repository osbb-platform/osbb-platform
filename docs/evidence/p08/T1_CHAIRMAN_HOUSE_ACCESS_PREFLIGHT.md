# P08 — T1 Chairman access preflight

Generated: 2026-08-24 14:18:38 +0800

## Repository
- Branch: `feat/p08-chairman-cabinet`
- Base HEAD: `7421d26b9898911d6bf57eb59c797e7c9c2642e8`
- Production Supabase project ref: `nfmwpvshksxioxrmtdrr`

## Code premise
`createHouse.ts` sets `current_access_code` and calls the existing RPC `upsert_house_access`.

## Source-index drift
- `src/modules/houses/services/readHouseSessionToken.ts` is absent in the current tree; current `withResidentSession.ts` reads the house-session cookie directly.
- The historical exact RPC-lock migration filename listed in the package is absent in the current migration tree. This is recorded as package/source-index drift.

## Production read-only coverage
```text
HOUSES_TOTAL=55
HOUSE_ACCESS_ROWS=55
HOUSES_WITH_ACCESS=55
HOUSES_MISSING_ACCESS=0
HOUSE_ACCESS_NON_1_TO_1=0
T1_COVERAGE=PASS
```

## Decision
**T1 PASS.** Every current house has exactly one `house_access` row. No backfill, password migration, or production write is required for P08 T1.
