# Legacy v1 quarantine inventory

Date: 2026-06-02  
Branch: release/arch-2.0

This directory contains legacy v1 modules that were detached from the live OSBB house runtime during the Architecture 2.0 release consolidation.

## Rule

Do not import from `src/legacy-v1` in live `app/` or `src/modules/` code.

These files are kept only as a temporary audit/quarantine reference before a later database and code removal phase. Legacy database tables are not dropped in this release.

## Quarantined modules

### Legacy house section actions

- `actions/archiveHouseAnnouncementSection.ts`
- `actions/archiveHouseInformationSection.ts`
- `actions/createHouseAnnouncementSection.ts`
- `actions/createHouseInformationFaqSection.ts`
- `actions/createHouseInformationSection.ts`
- `actions/deleteArchivedHouseAnnouncements.ts`
- `actions/deleteHouseSection.ts`
- `actions/getOrCreateHomeWidgetsSection.ts`
- `actions/insertHouseSectionVersion.ts`
- `actions/publishHouseAnnouncementSection.ts`
- `actions/publishHouseInformationSection.ts`
- `actions/submitHouseMeetingVote.ts`
- `actions/updateHouseAnnouncementSection.ts`
- `actions/updateHouseSection.ts`

### Legacy house section ensure/read services

- `services/ensureHouseBoardSection.ts`
- `services/ensureHouseDebtorsSection.ts`
- `services/ensureHouseHomeDashboardSection.ts`
- `services/ensureHouseHomePage.ts`
- `services/ensureHouseInformationPage.ts`
- `services/ensureHouseMeetingsSection.ts`
- `services/ensureHousePlanSection.ts`
- `services/ensureHouseRequisitesSection.ts`
- `services/ensureHouseSpecialistsSection.ts`
- `services/getAdminHouseSectionById.ts`
- `services/getAdminHouseSections.ts`

## Replacements

Live house runtime now uses content-engine v2 handlers and dedicated v2 tables/services for house content sections:

- announcements
- board
- debtors
- faq
- founding/information documents
- hero
- home widgets
- information posts
- meetings
- plan
- reports
- requisites
- specialists

## Remaining legacy database references outside `src/legacy-v1`

### `house_sections`

No live references outside `src/legacy-v1`.

### `house_pages`

Still referenced by compatibility page-shell services and archived-house cleanup:

- `src/modules/houses/actions/deleteArchivedHouse.ts`
- `src/modules/houses/services/getAdminDashboardBatchData.ts`
- `src/modules/houses/services/getHouseHomePageByHouseId.ts`
- `src/modules/houses/services/getAdminHousePages.ts`
- `src/modules/houses/services/getPublishedHousePage.ts`
- `src/modules/houses/services/getHouseInformationPageByHouseId.ts`

These are temporarily kept until a separate migration removes page-shell compatibility.

### `content_versions`

House-section content versioning was quarantined with legacy actions.

Remaining live references are in `src/modules/company/*`, which is a separate legacy subsystem and not part of the 13 house content sections migrated in this block.

## Database tables marked legacy

- `house_sections`
- `house_pages`
- `content_versions`
- `platform_change_history`

Do not drop these tables in this release. They are candidates for removal only after production observation and a dedicated cleanup migration.
