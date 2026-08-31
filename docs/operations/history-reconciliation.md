# House content history reconciliation

`house_content_history` is a non-blocking side effect of a successfully committed
Command Bus domain mutation. A history insert failure must **not** turn an already
committed save into a user-visible failure.

## Observability record

`writeHistory()` emits a structured server-side failure object containing:

- `warning.code = HISTORY_WRITE_FAILED`;
- house/entity/action identifiers;
- `reconciliationKey`;
- a versioned `reconciliation` record containing the exact history payload.

Capture the `reconciliation` object from server logs into a JSON file. Do not put
Supabase secrets into that file.

## dry-run first

The reconciliation operation is dry-run by default:

```bash
node scripts/reconcile-house-content-history.mjs ./history-reconciliation.json
```

Expected output includes:

```text
MODE=DRY_RUN
NO_DB_WRITES=TRUE
```

Review the entity, house, action and payload before any apply step.

## Apply

Only an operator with explicit environment access should run:

```bash
node scripts/reconcile-house-content-history.mjs \
  ./history-reconciliation.json \
  --apply
```

The script requires server-side Supabase URL + service-role credentials from the
authorized environment. Never paste or commit those secrets.

After apply, verify the corresponding `house_content_history` row and retain the
operation evidence with the incident/release evidence.

Production reconciliation is an operational data repair and still requires the
same owner authorization rules as other production mutations.
