# P04 — 1C Import Buffer Final Acceptance

## Delivered

- reusable import-buffer core;
- adapter registry;
- `debtors_1c` adapter;
- real legacy XLS fixture;
- staging tables and admin-only RLS;
- active registry matching;
- reconciliation warnings;
- unknown-account full blocker;
- missing-apartment warning;
- period detection and explicit confirmation;
- optimistic locking;
- discard lifecycle;
- P03 `importMonthDraft` transfer;
- compact `1С` entry in Debtors;
- shared `AdminSidePanel`;
- server-side file and hourly limits.

## Acceptance matrix

| Scenario | Expected |
|---|---|
| Valid legacy XLS fixture | Parsed |
| XLS/XLSX over 15 MB | Rejected |
| CSV/PDF/unsupported MIME | Rejected |
| Unknown source account | Entire transfer blocked |
| Registry account missing from file | Warning only |
| Apartment/FIO/area mismatch | Warning only |
| Stale lock version | Rejected |
| Period not confirmed | Transfer rejected |
| Confirmed fully matched buffer | P03 draft created |
| Repeat discard | Rejected |
| Direct write to P03 tables | Not used |
| Anonymous staging access | Denied |
| Production migration | Not applied |

## Operational notes

- Apply the T2 migration to local/preview before manual UI smoke.
- Production migration requires explicit owner approval.
- The parser currently accepts only fixture-proven month/layout variants.
- Additional 1C formats require new real fixtures and adapter tests.
- No push, deploy or production write is part of P04 task commits.
