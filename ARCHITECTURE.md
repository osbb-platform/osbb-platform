# OSBB Platform Architecture 2.0

Date: 2026-06-02  
Branch: release/arch-2.0

## Purpose

Architecture 2.0 consolidates OSBB Platform house content around content-engine v2 and removes live public runtime dependency on legacy `house_sections`.

The legacy v1 house-section code is quarantined in `src/legacy-v1` and must not be imported by live runtime code.

## Core principles

- UI components do not write content directly to database tables.
- Admin content mutations go through content-engine v2 handlers/actions.
- Public house routes read through domain/v2 services, not raw legacy sections.
- Files are represented through `house_content_files` where a v2 entity needs attached files.
- Legacy tables are not dropped in this release. They remain for compatibility, backfill, and audit only.

## Command flow

Content mutations should follow this flow:

1. UI form submits typed form payload.
2. Server action validates access and input.
3. Action dispatches a content command.
4. Handler normalizes payload.
5. Handler writes to the target v2 table(s).
6. Handler writes files/history/revalidation side effects where needed.

Do not create direct ad-hoc server actions that bypass the handler layer for house content sections.

## Handler registry

Content-engine v2 handlers live under:

- `src/modules/content-engine/v2/handlers`

Each section owns its handler folder and types. New handlers should follow the existing handler pattern and the local template conventions.

Current migrated house content runtime covers:

- announcements
- hero/home widgets
- information posts
- FAQ
- documents/materials
- board
- specialists
- requisites
- reports
- plan
- meetings
- debtors

## Public runtime

Public house routes must read:

- house identity through `getHouseBySlug`;
- section content through v2/domain services.

Examples:

- `getPublishedHouseAnnouncements`
- `getPublishedHouseBoard`
- `getPublishedHouseDebtors`
- `getPublicHouseFoundingDocuments`
- `getPublishedHouseInformationPosts`
- `getPublicHouseInformationDocuments`
- `getPublishedHouseFaq`
- `getPublishedHouseMeetings`
- `getPublishedHousePlan`
- `getPublishedHouseReports`
- `getPublishedHouseRequisites`
- `getPublishedHouseSpecialists`
- `getPublicHouseHomeDashboard`

## Legacy boundaries

Allowed legacy references:

- `src/legacy-v1`
- migration files
- audit/release documentation

Disallowed in live runtime:

- importing from `src/legacy-v1`;
- direct reads/writes to `house_sections`;
- direct UI reads from legacy `content` JSON;
- new content behavior built on `house_pages`/`house_sections`/`content_versions`.

## Remaining compatibility

`house_pages` still exists for page-shell compatibility and archived-house cleanup. These references are not public content runtime dependencies and should be removed only through a dedicated compatibility-removal migration.

## Verification

Final release gate:

- `npm run verify`

Known release caveat:

- installed `next@16.2.2` rejects top-level `serverActions.bodySizeLimit`, so the valid config remains `experimental.serverActions.bodySizeLimit`.
