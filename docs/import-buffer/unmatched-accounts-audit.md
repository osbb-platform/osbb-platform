# P10 T1 — Unmatched accounts production audit

Date: 2026-08-10
Scope: P10 debtors finalization
Mode: production read-only diagnostics

## 1. Проспект Соборний 186

Production registry is not empty.

Active apartments:

- `ОСББ " Проспект Соборний 186"` — 131 active apartments.

Therefore the previous hypothesis that the house has an empty
`house_apartments` registry is rejected.

The unmatched production rows are ordinary residential accounts, for example:

- `609740004` — `Кв. 4`, area `52.47`
- `609740005` — `Кв. 5`, area `46.85`
- `609740006` — `Кв. 6`, area `54.58`
- `609740007` — `Кв. 7`, area `53.02`
- `609740010` — `Кв. 10`, area `53.71`

These rows have normal apartment labels, resident names and non-zero areas.
They are therefore NOT service/technical accounts.

The affected rows occur repeatedly in import-buffer history (`разів = 3`),
which confirms that the issue is persistent rather than an isolated upload.

### Decision

Do not introduce a parser or matching exception for Sobornyi 186 in P10.

The house registry / account data must be corrected operationally by the
manager. After the registry is corrected, the month must be imported again.

P10 must retain visibility of unmatched rows and must reject an import only
when zero data rows can be matched, as specified by T3.

No schema migration is required.

## 2. Перемоги 87 — account 609352199

Production evidence:

- account: `609352199`
- apartment label: `Кв. 999`
- owner: `незясовані 999`
- area: `0.00`
- match status: unmatched

This row is a technical/service account.

Important: its account number does NOT end in `999`.

Therefore account-number suffix is not a valid technical-account
classification rule.

## 3. Technical/service account classification rule

The rule must be based on row semantics rather than account-number format.

A row is classified as a technical/service row only when the fixture/data
confirms the following combination:

1. normalized apartment label identifies apartment `999`;
2. area is zero;
3. owner/service description also identifies the synthetic `999` account
   rather than a real resident.

Confirmed evidence includes:

- real `Соборний,186.xls` fixture:
  `Кв. 999` / `Квартира` / area `0.00`;
- production `Перемоги 87`:
  `Кв. 999` / `незясовані 999` / area `0.00`.

The account-number suffix MUST NOT participate in this rule.

This rule is intentionally conservative: an ordinary unmatched residential
row with a real apartment number, resident name and non-zero area remains
`data + unmatched` and must never be silently skipped.

## 4. P10 implementation consequences

T2:
- classify only confirmed technical rows as `skip_service`;
- do not change account matching;
- do not classify by `endsWith("999")`.

T3:
- ordinary unmatched rows remain visible;
- unmatched rows do not block partial import;
- zero matched data rows reject transfer explicitly.

Sobornyi 186:
- no P10 code exception;
- manager repairs the house registry/data;
- repeat import after correction.

## 5. Additional preflight observation

`house_debtors_items` is still referenced by
`getHouseSectionCounters.ts` in addition to the admin debtors read model.

This is recorded for T8 regression review only and is not changed in T1.
