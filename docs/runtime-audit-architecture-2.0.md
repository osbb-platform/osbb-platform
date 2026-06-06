# Architecture 2.0 runtime audit

Date: 2026-06-02  
Branch: release/arch-2.0  
Block: D5

## Result

D5 is audit-confirmed as a code no-op.

The release runtime is detached from legacy `house_sections` for public house content pages and public feeds.

## Public house runtime

Public house pages read house identity through `getHouseBySlug` and section content through v2/domain services:

- announcements: `getPublishedHouseAnnouncements`
- board: `getPublishedHouseBoard`
- debtors: `getPublishedHouseDebtors`
- founding documents: `getPublicHouseFoundingDocuments`
- information posts/documents/FAQ: `getPublishedHouseInformationPosts`, `getPublicHouseInformationDocuments`, `getPublishedHouseFaq`
- meetings: `getPublishedHouseMeetings`
- plan: `getPublishedHousePlan`
- reports: `getPublishedHouseReports`
- requisites: `getPublishedHouseRequisites`
- specialists: `getPublishedHouseSpecialists`
- home dashboard: `getPublicHouseHomeDashboard`

## Legacy quarantine

Direct `house_sections` runtime usage remains quarantined in `src/legacy-v1`.

No live imports from `src/legacy-v1` are expected in `app` or `src/modules/houses`.

## Remaining `house_pages` references

The remaining live `house_pages` references are intentionally retained as compatibility/page-shell and cleanup helpers:

- `src/modules/houses/actions/deleteArchivedHouse.ts`
- `src/modules/houses/services/getAdminDashboardBatchData.ts`
- `src/modules/houses/services/getHouseHomePageByHouseId.ts`
- `src/modules/houses/services/getAdminHousePages.ts`
- `src/modules/houses/services/getPublishedHousePage.ts`
- `src/modules/houses/services/getHouseInformationPageByHouseId.ts`

These are not `house_sections` content runtime dependencies and should be removed only in a separate compatibility-removal migration.

## Acceptance checks

Expected:

- no direct `house_sections` calls outside `src/legacy-v1`, migrations, and docs;
- no live imports from `src/legacy-v1`;
- public house routes continue to use v2/domain services;
- `npm run verify` passes.
