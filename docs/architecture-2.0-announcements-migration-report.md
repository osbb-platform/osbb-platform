# Architecture 2.0 — Announcements migration report

## Scope

N3 migrated only the house announcements vertical from legacy `house_sections` to the Architecture 2.0 content-engine flow.

Other house content sections remain on legacy `house_sections` until their own dedicated migration tasks.

## Completed work

### Database

- Created `public.house_announcements`.
- Added lifecycle statuses: `draft`, `published`, `archived`.
- Added optimistic locking via `lock_version`.
- Added admin RLS policy.
- Added indexes for house/status and published ordering.
- Added copy-only idempotent migration from legacy `house_sections[kind=announcements]`.
- Legacy records are not deleted.
- Original ids are preserved.
- Legacy `in_review` and other non-published/non-archived statuses are mapped to `draft`.

### Content engine

- Added announcement domain types.
- Added announcements handler.
- Added commands:
  - create
  - update
  - publish
  - archive
  - restore
  - delete
  - deleteAllArchived
- Registered the announcements handler in the v2 registry.

### Admin flow

- Added `getAdminHouseAnnouncements`.
- Reconnected admin announcements UI to `useAdminContentCommand`.
- Reconnected the main admin house page announcements block.
- Reconnected the dedicated admin announcements page.
- No intentional admin UI/UX changes were made.

### Public flow

- Added `getPublishedHouseAnnouncements`.
- Reconnected `/house/[slug]/announcements` to `house_announcements`.
- No intentional public UI/UX changes were made.
- Existing filters, counters, layout, classes and copy were preserved.

## Verification

- Local migration applied.
- Local legacy announcement count was zero, so no rows were copied locally.
- Targeted eslint passed during step checks.
- Final production build passed during N3.T8 audit.
- Final audit confirmed the migrated public announcements page no longer reads announcements from legacy `house_sections`.

## Known follow-up

The final audit still shows `house_sections` usage in non-migrated areas. This is expected for N3.

Known remaining places include:

- information forms and services;
- bootstrap/ensure services;
- generic house section services;
- `getPublicHouseHomeDashboard`;
- `getPublicHouseBellFeed`.

`getPublicHouseHomeDashboard` and `getPublicHouseBellFeed` may still derive announcement-related cards/feed items from legacy `house_sections`. They were not migrated in N3 because this block only covered the announcements vertical page/admin flow. Move them in a separate explicit follow-up task if required.

## Commit chain

- `9f469fe` — Create house announcements table
- `451929e` — Add announcement domain types
- `0d3dbb1` — Add announcements content handler
- `211d0fe` — Add house announcements read services
- `dbe9cc8` — Connect announcements admin UI to content commands
- `c1cfe18` — Migrate legacy house announcements
- `502ebef` — Connect public announcements page to new table

Supporting fix:

- `23ee1c9` — Fix house content history row typing

## Result

N3 is complete for the announcements vertical.

Final migrated flow:

house_announcements
→ content-engine v2 announcements handler
→ admin command bus
→ admin announcements UI
→ public announcements read service
→ /house/[slug]/announcements

No intentional UI/UX changes were made in this migration.
