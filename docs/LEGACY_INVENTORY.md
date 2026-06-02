# Legacy inventory before Architecture 2.0 prod

Generated during D2 on local database.

Local `house_sections` inventory:

| kind | count |
|---|---:|
| — | 0 |

Result: local DB has no legacy `house_sections` rows to migrate for `reports`, `specialists`, `plan`, `meetings`, `debtors`, or `documents`.

Important: D2 still adds `migrate_legacy_house_reports` because stage/prod copies may contain legacy `kind='reports'` rows from before the local consolidation.
