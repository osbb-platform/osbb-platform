# OSBB Platform — System Map and Route Map

| Параметр | Значение |
|---|---|
| Task | S0.T2 — System Map и Route Map |
| Generated | `2026-07-06` |
| Baseline HEAD | `ec504ac424fd4e9ef38008dab62edc40a575afc7` |
| Branch | `main` |
| Tracked files inspected | `642` |
| Scope | Static map of the audited checkout |

## 1. Назначение и ограничения

Документ фиксирует фактические границы системы и все статически обнаруженные точки входа на указанном commit.

Он предназначен для быстрого архитектурного onboarding и для проверки scope следующих задач стабилизации.

Документ не является:

- снимком production-базы данных;
- доказательством фактических production RLS-политик;
- runtime trace;
- разрешением на deploy, миграции или production-изменения;
- заменой security review конкретного endpoint.

Все `UNKNOWN` и известные риски должны оставаться явно отмеченными, пока не будут проверены отдельной задачей.

## 2. Система в одном экране

```text
HTTP request
  → proxy.ts
    → apex / www       → company landing
    → admin subdomain  → /admin/**
    → house subdomain  → /house/{slug}/**
    → /api/**          → route handler without proxy auth refresh
```

```text
Admin workspace
  → useAdminContentCommand
  → dispatchAdminCommand
  → handler registry
  → buildHandlerContext
  → assertWorkspaceAction
  → validate
  → execute domain write
  → pipeline
  → Supabase / Next cache / history / tasks / storage
```

## 3. Продуктовые зоны

| Зона | Физический route tree | Внешний host/path | Граница доступа |
|---|---|---|---|
| Company/public landing | `app/(public)/page.tsx`, `app/(public)/[slug]/page.tsx` | `osbb-platform.com.ua`, company slug routes | Public |
| Admin auth/onboarding | `app/(admin)/admin/*` outside `(protected)` | `admin.osbb-platform.com.ua/*` | Public auth and registration entrypoints |
| Admin CMS | `app/(admin)/admin/(protected)/**` | `admin.osbb-platform.com.ua/*` | Supabase admin session + protected layout + RBAC |
| House public surface | `app/(public)/house/[slug]/**` | `{slug}.osbb-platform.com.ua/*` | House resolution plus public readers |
| Resident cabinet | Same `app/(public)/house/[slug]/**` tree | `{slug}.osbb-platform.com.ua/*` | Logical gated subzone in house layout; not a separate route tree |

### Resident-zone clarification

Public house pages and the resident cabinet share one physical `/house/[slug]/**` route tree. The layout reads the house-specific cookie, calls `validateHouseSession`, and renders `HousePasswordGate`. Therefore the cabinet is a logical gated subzone rather than a separate URL namespace.

## 4. Host and proxy routing matrix

| Request | proxy.ts behavior | Auth round-trip | Result |
|---|---|---|---|
| `/api/**` on any host | Immediate pass-through before host rewrites | No middleware Supabase client | API route must enforce its own authorization |
| `*.vercel.app` | Pass-through | No proxy auth refresh | Preview URL remains untouched |
| `www.osbb-platform.com.ua` | Permanent redirect | No | `308` to apex with path and query |
| `osbb-platform.com.ua` | Root pass-through | No | Company landing; direct `/admin` and `/house/*` return `404` |
| `admin.osbb-platform.com.ua` | Rewrite external path to internal `/admin/**` | `auth.getUser()` through middleware client | Admin CMS routing |
| `{slug}.osbb-platform.com.ua` | Rewrite external path to internal `/house/{slug}/**` | No middleware Supabase client | House routing |
| Reserved non-admin subdomain | No house rewrite | No | Pass-through |
| `localhost` | Root behavior | No | Local apex |
| `admin.localhost` | Admin rewrite | Yes | Local admin host |
| `{slug}.localhost` | House rewrite | No middleware auth refresh | Local house host |
| `osbb-chapivna-163.*` | Legacy hostname redirect | No | `307` to `osbb-charivna-163.*` |
| Duplicate internal house prefix on house host | Strip `/house/{slug}` from browser URL | No | `308` canonical redirect |
| Duplicate `/admin` prefix on admin host | Strip `/admin` from browser URL | Admin middleware client already created | `308` canonical redirect |

Source of truth: `proxy.ts` and `src/shared/config/app/domains.ts`.

## 5. Complete page route map

Detected page routes: **31**.

| Route | Source | Zone | Component | Runtime | Access boundary |
|---|---|---|---|---|---|
| / | app/(public)/page.tsx | Company/public landing | PublicHomePage | default Next.js behavior | Public |
| /[slug] | app/(public)/[slug]/page.tsx | Company/public landing | PublicCompanySlugPage | default Next.js behavior | Public |
| /admin | app/(admin)/admin/(protected)/page.tsx | Admin CMS — protected | AdminDashboardPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/analytics | app/(admin)/admin/(protected)/analytics/page.tsx | Admin CMS — protected | AdminAnalyticsPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/apartments | app/(admin)/admin/(protected)/apartments/page.tsx | Admin CMS — protected | AdminApartmentsPage | force-dynamic | Admin session + protected layout + RBAC |
| /admin/company-pages | app/(admin)/admin/(protected)/company-pages/page.tsx | Admin CMS — protected | AdminCompanyPagesPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/company-pages/[id] | app/(admin)/admin/(protected)/company-pages/[id]/page.tsx | Admin CMS — protected | AdminCompanyPageDetailPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/complete-registration | app/(admin)/admin/complete-registration/page.tsx | Admin auth/onboarding | AdminCompleteRegistrationPage | default Next.js behavior | Public admin auth/onboarding entry |
| /admin/districts | app/(admin)/admin/(protected)/districts/page.tsx | Admin CMS — protected | AdminDistrictsPage | force-dynamic | Admin session + protected layout + RBAC |
| /admin/employees | app/(admin)/admin/(protected)/employees/page.tsx | Admin CMS — protected | AdminEmployeesPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/forgot-password | app/(admin)/admin/forgot-password/page.tsx | Admin auth/onboarding | AdminForgotPasswordPage | default Next.js behavior | Public admin auth/onboarding entry |
| /admin/history | app/(admin)/admin/(protected)/history/page.tsx | Admin CMS — protected | AdminHistoryPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/houses | app/(admin)/admin/(protected)/houses/page.tsx | Admin CMS — protected | AdminHousesPage | force-dynamic | Admin session + protected layout + RBAC |
| /admin/houses/[id] | app/(admin)/admin/(protected)/houses/[id]/page.tsx | Admin CMS — protected | AdminHouseDetailPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/houses/[id]/announcements | app/(admin)/admin/(protected)/houses/[id]/announcements/page.tsx | Admin CMS — protected | AdminHouseAnnouncementsPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/login | app/(admin)/admin/login/page.tsx | Admin auth/onboarding | AdminLoginPage | default Next.js behavior | Public admin auth/onboarding entry |
| /admin/profile | app/(admin)/admin/(protected)/profile/page.tsx | Admin CMS — protected | AdminProfilePage | default Next.js behavior | Admin session + protected layout + RBAC |
| /admin/reset-password | app/(admin)/admin/reset-password/page.tsx | Admin auth/onboarding | AdminResetPasswordPage | default Next.js behavior | Public admin auth/onboarding entry |
| /admin/tasks | app/(admin)/admin/(protected)/tasks/page.tsx | Admin CMS — protected | AdminTasksPage | default Next.js behavior | Admin session + protected layout + RBAC |
| /house/[slug] | app/(public)/house/[slug]/page.tsx | House public + resident-gated zone | PublicHouseHomePage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/[...notFound] | app/(public)/house/[slug]/[...notFound]/page.tsx | House public + resident-gated zone | PublicHouseCatchAllNotFound | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/announcements | app/(public)/house/[slug]/announcements/page.tsx | House public + resident-gated zone | PublicHouseAnnouncementsPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/board | app/(public)/house/[slug]/board/page.tsx | House public + resident-gated zone | BoardPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/debtors | app/(public)/house/[slug]/debtors/page.tsx | House public + resident-gated zone | DebtorsPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/founding-documents | app/(public)/house/[slug]/founding-documents/page.tsx | House public + resident-gated zone | FoundingDocumentsPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/information | app/(public)/house/[slug]/information/page.tsx | House public + resident-gated zone | InformationPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/meetings | app/(public)/house/[slug]/meetings/page.tsx | House public + resident-gated zone | PublicMeetingsPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/plan | app/(public)/house/[slug]/plan/page.tsx | House public + resident-gated zone | PublicPlanPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/reports | app/(public)/house/[slug]/reports/page.tsx | House public + resident-gated zone | ReportsPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/requisites | app/(public)/house/[slug]/requisites/page.tsx | House public + resident-gated zone | RequisitesPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |
| /house/[slug]/specialists | app/(public)/house/[slug]/specialists/page.tsx | House public + resident-gated zone | SpecialistsPage | default Next.js behavior | House layout resolves slug and house-session; HousePasswordGate controls rendering |

### External URL note

Routes beginning with `/admin` and `/house/[slug]` are internal App Router paths. In normal production navigation, `proxy.ts` hides those prefixes behind the admin and house subdomains.

## 6. API route map

Detected API routes: **4**.

| Method | Route | Source | Runtime | Authorization boundary |
|---|---|---|---|---|
| POST | /api/analytics/track | app/api/analytics/track/route.ts | default Next.js behavior | Route handler is responsible for its own authorization |
| POST | /api/csp-report | app/api/csp-report/route.ts | force-dynamic | Bounded, sanitized browser CSP reporting endpoint; no database writes |
| GET | /api/company/search-houses | app/api/company/search-houses/route.ts | default Next.js behavior | Route handler is responsible for its own authorization |
| GET | /api/reports/view | app/api/reports/view/route.ts | force-dynamic | Route handler is responsible for its own authorization |

### API security notes

- `POST /api/analytics/track` accepts analytics batches and returns no-content responses; proxy auth is intentionally absent.
- `POST /api/csp-report` accepts bounded browser CSP violation reports, removes URL query/hash data, writes sanitized diagnostics to server logs and does not access the database.
- `GET /api/company/search-houses` performs public search and logs the search event.
- `GET /api/reports/view` uses the service-role client to create a signed Storage URL from caller-provided `bucket` and `path`. This is an existing high-priority security scope scheduled for S1.T2, not corrected by S0.T2.

## 7. Route support and error boundaries

- `app/(admin)/admin/(protected)/error.tsx` — scope `/admin`
- `app/(admin)/admin/(protected)/houses/[id]/error.tsx` — scope `/admin/houses/[id]`
- `app/(admin)/admin/(protected)/houses/[id]/layout.tsx` — scope `/admin/houses/[id]`
- `app/(admin)/admin/(protected)/layout.tsx` — scope `/admin`
- `app/(admin)/admin/(protected)/not-found.tsx` — scope `/admin`
- `app/(public)/error.tsx` — scope `/`
- `app/(public)/house/[slug]/error.tsx` — scope `/house/[slug]`
- `app/(public)/house/[slug]/layout.tsx` — scope `/house/[slug]`
- `app/(public)/house/[slug]/not-found.tsx` — scope `/house/[slug]`
- `app/global-error.tsx` — scope `/`
- `app/layout.tsx` — scope `/`

Metadata/static App Router entries:

- `app/apple-icon.png`
- `app/icon.svg`

The catch-all `app/(public)/house/[slug]/[...notFound]/page.tsx` is a real page entry and is included in the page map.

## 8. Server-action entrypoints

Files containing a top-level `"use server"`: **59**.

- Live module files: **46**
- Legacy quarantine files: **13**

### Group summary

| Group | Files |
|---|---|
| apartments | 4 |
| auth | 5 |
| company | 6 |
| content-engine | 1 |
| districts | 4 |
| employees | 3 |
| houses | 16 |
| legacy-v1 (quarantine) | 13 |
| tasks | 7 |

### Complete server-action inventory

#### apartments

- `src/modules/apartments/actions/archiveAllHouseApartments.ts` — `archiveAllHouseApartments`
- `src/modules/apartments/actions/archiveApartment.ts` — `archiveApartment`
- `src/modules/apartments/actions/createApartmentsMiniBulk.ts` — `createApartmentsMiniBulk`
- `src/modules/apartments/actions/replaceHouseApartmentsByImport.ts` — `replaceHouseApartmentsByImport`

#### auth

- `src/modules/auth/actions/finalizeAdminRegistration.ts` — `finalizeAdminRegistration`
- `src/modules/auth/actions/loginAdmin.ts` — `loginAdmin`
- `src/modules/auth/actions/logoutAdmin.ts` — `logoutAdmin`
- `src/modules/auth/actions/requestAdminPasswordReset.ts` — `requestAdminPasswordReset`
- `src/modules/auth/actions/updateCurrentAdminProfile.ts` — `updateCurrentAdminProfile`

#### company

- `src/modules/company/actions/createCompanyContactRequest.ts` — `createCompanyContactRequest`
- `src/modules/company/actions/createCompanyPage.ts` — `createCompanyPage`
- `src/modules/company/actions/logCompanySearchEvent.ts` — `logCompanySearchEvent`
- `src/modules/company/actions/markCompanyRequestsSeen.ts` — `markCompanyRequestsSeen`
- `src/modules/company/actions/updateCompanyPage.ts` — `updateCompanyPage`
- `src/modules/company/actions/updateCompanySection.ts` — `updateCompanySection`

#### content-engine

- `src/modules/content-engine/v2/dispatch.ts` — `dispatchAdminCommand`

#### districts

- `src/modules/districts/actions/bootstrapDefaultDistricts.ts` — `bootstrapDefaultDistricts`
- `src/modules/districts/actions/createDistrict.ts` — `createDistrict`
- `src/modules/districts/actions/deleteDistrict.ts` — `deleteDistrict`
- `src/modules/districts/actions/updateDistrict.ts` — `updateDistrict`

#### employees

- `src/modules/employees/actions/createEmployee.ts` — `createEmployee`
- `src/modules/employees/actions/deleteEmployee.ts` — `deleteEmployee`
- `src/modules/employees/actions/sendEmployeeInvite.ts` — `sendEmployeeInvite`

#### houses

- `src/modules/houses/actions/archiveHouse.ts` — `archiveHouse`
- `src/modules/houses/actions/changeHousePassword.ts` — `changeHousePassword`
- `src/modules/houses/actions/changeHouseTariff.ts` — `changeHouseTariff`
- `src/modules/houses/actions/createFooterHouseMessage.ts` — `createFooterHouseMessage`
- `src/modules/houses/actions/createHouse.ts` — `createHouse`
- `src/modules/houses/actions/createHouseDocument.ts` — `createHouseDocument`
- `src/modules/houses/actions/createSpecialistContactRequest.ts` — `createSpecialistContactRequest`
- `src/modules/houses/actions/deleteArchivedHouse.ts` — `deleteArchivedHouse`
- `src/modules/houses/actions/deleteArchivedHouseDocuments.ts` — `deleteArchivedHouseDocuments`
- `src/modules/houses/actions/deleteHouseDocument.ts` — `deleteHouseDocument`
- `src/modules/houses/actions/loginToHouse.ts` — `loginToHouse`
- `src/modules/houses/actions/markHouseMessagesSeen.ts` — `markHouseMessagesSeen`
- `src/modules/houses/actions/restoreHouse.ts` — `restoreHouse`
- `src/modules/houses/actions/updateHouse.ts` — `updateHouse`
- `src/modules/houses/actions/updateHouseDocument.ts` — `updateHouseDocument`
- `src/modules/houses/services/generateHouseAnnouncementPdf.ts` — `generateHouseAnnouncementPdf`

#### legacy-v1 (quarantine)

- `src/legacy-v1/actions/archiveHouseAnnouncementSection.ts` — `archiveHouseAnnouncementSection`
- `src/legacy-v1/actions/archiveHouseInformationSection.ts` — `archiveHouseInformationSection`
- `src/legacy-v1/actions/createHouseAnnouncementSection.ts` — `createHouseAnnouncementSection`
- `src/legacy-v1/actions/createHouseInformationFaqSection.ts` — `createHouseInformationFaqSection`
- `src/legacy-v1/actions/createHouseInformationSection.ts` — `createHouseInformationSection`
- `src/legacy-v1/actions/deleteArchivedHouseAnnouncements.ts` — `deleteArchivedHouseAnnouncements`
- `src/legacy-v1/actions/deleteHouseSection.ts` — `deleteHouseSection`
- `src/legacy-v1/actions/getOrCreateHomeWidgetsSection.ts` — `getOrCreateHomeWidgetsSection`
- `src/legacy-v1/actions/publishHouseAnnouncementSection.ts` — `publishHouseAnnouncementSection`
- `src/legacy-v1/actions/publishHouseInformationSection.ts` — `publishHouseInformationSection`
- `src/legacy-v1/actions/submitHouseMeetingVote.ts` — `submitHouseMeetingVote`
- `src/legacy-v1/actions/updateHouseAnnouncementSection.ts` — `updateHouseAnnouncementSection`
- `src/legacy-v1/actions/updateHouseSection.ts` — `updateHouseSection`

#### tasks

- `src/modules/tasks/actions/addPlatformTaskComment.ts` — `addPlatformTaskComment`
- `src/modules/tasks/actions/archivePlatformTask.ts` — `archivePlatformTask`
- `src/modules/tasks/actions/createPlatformTask.ts` — `createPlatformTask`
- `src/modules/tasks/actions/deletePlatformTask.ts` — `deletePlatformTask`
- `src/modules/tasks/actions/restorePlatformTask.ts` — `restorePlatformTask`
- `src/modules/tasks/actions/updatePlatformTask.ts` — `updatePlatformTask`
- `src/modules/tasks/actions/updatePlatformTaskStatus.ts` — `updatePlatformTaskStatus`

Legacy server actions are listed for inventory only. They are quarantined and must not be imported into live runtime code.

## 9. Command Bus v2

Root: `src/modules/content-engine/v2/`.

### Command flow

```text
UI workspace
  → useAdminContentCommand
  → dispatchAdminCommand(command)
    → derive handler key and command name
    → getHandler(handlerKey)
    → buildHandlerContext(command)
      → authenticated current admin
      → scoped house load
      → publishable-key Supabase server client
    → assertWorkspaceAction(role, workspace, actionKey)
    → optional spec.validate(payload, ctx)
    → spec.execute(payload, ctx)
    → runPipeline(handler, command, ctx, execResult)
```

`spec.execute` performs the domain write and returns an `ExecResult`. The post-execute pipeline does not perform the main domain write itself.

### Post-execute pipeline order

```text
1. cleanupFiles
2. trackFiles
3. applyTaskOps
4. revalidateForCommand
5. writeHistory
```

The order is a protected architecture contract. The steps are not wrapped in one cross-service transaction on this baseline; transactionality is deferred to S7.T1.

### Registered handlers

Runtime handlers registered by `registerAllHandlers()`: **15**.

| Handler key | Workspace | Command files | onBootstrap | Definition |
|---|---|---|---|---|
| announcements | announcements | archive, create, delete, deleteAllArchived, duplicate, publish, restore, update | no | src/modules/content-engine/v2/handlers/announcements/handler.ts |
| board_intro | board | save | yes | src/modules/content-engine/v2/handlers/board_intro/handler.ts |
| board_members | board | create, delete, reorder, update | no | src/modules/content-engine/v2/handlers/board_members/handler.ts |
| debtors | debtors | deleteDraft, publishDraft, saveDraftItems, saveSettings | yes | src/modules/content-engine/v2/handlers/debtors/handler.ts |
| documents | information | archive, create, delete, deleteAllArchived, duplicate, publish, replacePdf, restore, update | no | src/modules/content-engine/v2/handlers/documents/handler.ts |
| faq | information | applyTemplate, archive, create, delete, duplicate, publish, replaceItems, restore, upsert | yes | src/modules/content-engine/v2/handlers/faq/handler.ts |
| hero | announcements | save | yes | src/modules/content-engine/v2/handlers/hero/handler.ts |
| home_widgets | announcements | save | yes | src/modules/content-engine/v2/handlers/home_widgets/handler.ts |
| information_posts | information | applyTemplate, archive, create, delete, deleteAllArchived, duplicate, publish, restore, update | no | src/modules/content-engine/v2/handlers/information_posts/handler.ts |
| meetings | meetings | archive, create, delete, publish, recordManualVote, replaceQuestions, restore, update | no | src/modules/content-engine/v2/handlers/meetings/handler.ts |
| plan | plan | addFiles, archive, create, delete, duplicate, publish, removeFiles, restore, update | no | src/modules/content-engine/v2/handlers/plan/handler.ts |
| requisites | requisites | save | yes | src/modules/content-engine/v2/handlers/requisites/handler.ts |
| reports | reports | archive, categoriesUpsert, create, delete, deleteAllArchived, duplicate, publish, removePdf, replacePdf, restore, update | no | src/modules/content-engine/v2/handlers/reports/handler.ts |
| specialists | specialists | applyTemplate, archive, categoriesUpsert, create, delete, duplicate, publish, restore, update | no | src/modules/content-engine/v2/handlers/specialists/handler.ts |
| templates | information | delete, upsert | no | src/modules/content-engine/v2/handlers/templates/index.ts |

The direct `handlers/` directory also contains `_template` and the root `index.ts`; neither is an additional runtime handler.

## 10. Permissions and RBAC layer

Permission layer files:

- `src/shared/permissions/README.md`
- `src/shared/permissions/actionAccess.ts`
- `src/shared/permissions/rbac.config.ts`
- `src/shared/permissions/rbac.guards.ts`
- `src/shared/permissions/rbac.resolve.ts`
- `src/shared/permissions/rbac.types.ts`
- `src/shared/permissions/topLevelRouteAccess.ts`

Declared roles on this baseline:

- `superadmin`
- `admin`
- `manager`

Permission surfaces include:

- top-level CMS sections;
- registry actions;
- house shell and house workspaces;
- workspace actions such as create/edit/publish/archive/delete;
- security-sensitive actions;
- role-to-access resolution.

Primary Command Bus enforcement point:

- `src/modules/content-engine/v2/dispatch.ts` calls `assertWorkspaceAction` before validation and execution.

Detected permission callsites outside the permission package:

- `src/modules/content-engine/v2/dispatch.ts` — `assertWorkspaceAction`

### Configuration inconsistency recorded for later review

`analytics` exists in the broader RBAC model, but `TOP_LEVEL_ROUTE_ACCESS` does not contain an analytics route mapping. S0.T2 records this mismatch without changing runtime behavior.

Current application-level permission checks are not a substitute for tenant-scoped database RLS. Database house isolation remains a later stabilization scope.

## 11. Supabase client layer

| Client | Factory | File | Key class | Cookie behavior | Under RLS | Allowed scope |
|---|---|---|---|---|---|---|
| Browser | createSupabaseBrowserClient | src/integrations/supabase/client/browser.ts | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Browser client cookie integration | Yes | Client components |
| Action | createSupabaseActionClient | src/integrations/supabase/server/action.ts | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Reads/writes Next cookies | Yes | Server actions |
| Middleware | createSupabaseMiddlewareClient | src/integrations/supabase/server/middleware.ts | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Request/response cookie refresh | Yes | Admin subdomain in proxy.ts only |
| Public | createSupabasePublicClient | src/integrations/supabase/server/public.ts | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Cookie-free | Yes | Anonymous/public readers |
| Server SSR | createSupabaseServerClient | src/integrations/supabase/server/server.ts | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Reads/writes Next cookies | Yes | Server components and authenticated readers |
| Admin | createSupabaseAdminClient | src/integrations/supabase/server/admin.ts | SUPABASE_SERVICE_ROLE_KEY | None | No — service-role bypasses RLS | Explicit server-only allowlist |

Rules:

1. Publishable-key clients remain subject to RLS.
2. The public client is deliberately cookie-free.
3. Middleware client usage is restricted to the admin host path in `proxy.ts`.
4. The service-role client bypasses RLS and is an exception, not a default data-access mechanism.
5. Client components must never import the server admin factory.

## 12. Service-role usage map

Files containing `createSupabaseAdminClient` or `SUPABASE_SERVICE_ROLE_KEY`: **11**.

| Category | File | Current role / note |
|---|---|---|
| Runtime consumer | app/api/reports/view/route.ts | Known S1.T2 security scope: signs caller-provided bucket/path through service-role |
| Maintenance script | scripts/regenerate-house-announcements.mjs | Standalone maintenance execution; outside app runtime |
| Client factory | src/integrations/supabase/server/admin.ts | Creates the server-only service-role client |
| Runtime consumer | src/modules/apartments/services/public/getPublicHouseApartmentOptions.ts | Known resident/public data-risk scope |
| Runtime consumer | src/modules/auth/actions/finalizeAdminRegistration.ts | Existing audited allowlist consumer |
| Runtime consumer | src/modules/auth/actions/updateCurrentAdminProfile.ts | Existing audited allowlist consumer |
| Runtime consumer | src/modules/employees/actions/createEmployee.ts | Existing audited allowlist consumer |
| Runtime consumer | src/modules/employees/actions/deleteEmployee.ts | Existing audited allowlist consumer |
| Runtime consumer | src/modules/employees/actions/sendEmployeeInvite.ts | Existing audited allowlist consumer |
| Runtime consumer | src/modules/houses/services/bootstrapHouseContent.ts | Existing audited allowlist consumer |
| Runtime consumer | src/modules/houses/services/generateHouseAnnouncementPdf.ts | Existing audited allowlist consumer |

Adding a new service-role consumer requires explicit security justification. Existing consumers are inventory, not automatic approval of their current design.

## 13. House-session and resident access flow

```text
HousePasswordGate
  → loginToHouse server action
  → RPC create_house_session
  → house-specific cookie name from getHouseAccessCookieName(slug)
  → app/(public)/house/[slug]/layout.tsx reads cookie
  → validateHouseSession
  → RPC is_house_session_valid
  → gated rendering
```

Primary files:

- `src/modules/houses/components/HousePasswordGate.tsx`
- `src/modules/houses/actions/loginToHouse.ts`
- `src/modules/houses/services/validateHouseSession.ts`
- `src/shared/utils/security/getHouseAccessCookieName.ts`
- `src/shared/utils/security/sessionKeys.ts`
- `app/(public)/house/[slug]/layout.tsx`

Security boundary note: on this baseline, the layout gate controls rendering. It must not be treated as proof that every underlying anonymous data reader is protected at database level. The data boundary is corrected in later S1 tasks.

## 14. Legacy-v1 quarantine

Quarantine root: `src/legacy-v1/`.

Legacy `"use server"` files inventoried: **13**.

Static boundary check: **PASS** — no imports from `src/legacy-v1/**` were detected outside the quarantine.

Quarantine rules:

- do not import legacy modules into live code;
- do not restore legacy mutations as shortcuts;
- do not drop legacy/quarantine tables inside S0;
- use the inventory for deletion planning only after runtime and database evidence confirms zero consumers.

## 15. Critical architecture boundaries

1. House content mutations go through Command Bus v2.
2. `dispatchAdminCommand` is the shared workspace permission gate.
3. Main domain writes occur inside handler command `execute`.
4. Pipeline order must not be changed casually.
5. Service-role usage is restricted to an explicit audited map.
6. API routes bypass proxy auth refresh and must authorize themselves.
7. Public readers should use the cookie-free public client when authentication state is not required.
8. Resident rendering gate is not equivalent to database-level data protection.
9. `src/legacy-v1/**` remains quarantined.
10. Unknown production state must not be inferred from local code.

## 16. Known baseline risks referenced by this map

- `/api/reports/view` signs caller-controlled storage coordinates with service-role; remediation is S1.T2.
- Resident data protection is not guaranteed solely by the layout gate; remediation is in S1.
- Current RBAC application checks do not yet prove tenant isolation at RLS level.
- Command Bus post-write side effects are not one atomic transaction.
- Automated tests and CI are not present on this baseline.

This document records those boundaries but does not modify them.

## 17. Maintenance contract

Update `docs/SYSTEM_MAP.md` in the same change whenever any of the following changes:

- a page route, route handler, layout or error boundary;
- `proxy.ts` host-routing behavior;
- a server action or public mutation entrypoint;
- a Command Bus handler, command or pipeline step;
- a role or permission contract;
- a Supabase client factory;
- a service-role consumer;
- resident session flow;
- legacy quarantine status.

Required regeneration checks:

```text
page routes               = 31
API route handlers         = 4
use-server files           = 59
live use-server files      = 46
legacy use-server files    = 13
registered handlers        = 15
Supabase client factories  = 6
service-role signal files  = 11
live legacy imports        = 0
```

These counts describe HEAD `ec504ac424fd4e9ef38008dab62edc40a575afc7` and are not permanent product invariants.

## 18. Evidence

Generated from read-only inspection of:

- Git tracked tree at the baseline HEAD;
- `app/**`;
- `proxy.ts`;
- `src/modules/**`;
- `src/shared/permissions/**`;
- `src/integrations/supabase/**`;
- `src/legacy-v1/**`;
- `scripts/regenerate-house-announcements.mjs`.

Companion evidence snapshots:

- `FULL_PROJECT_FILE_TREE_S0_T2_20260706-094300.txt`;
- `OSBB_S0_T2_ARCHITECTURE_SNAPSHOT_20260706-094300.txt`.

No local `.env` file was read while generating this document. No secret value, production API call, database mutation, migration or deployment is part of S0.T2.

## 19. Acceptance and rollback

S0.T2 acceptance:

- all page and API routes are mapped;
- all static server-action entrypoints are inventoried;
- Command Bus flow and all registered handlers are mapped;
- permissions and Supabase client layers are documented;
- every service-role signal file is listed;
- house-session and legacy boundaries are explicit;
- only `docs/SYSTEM_MAP.md` changes;
- lint, typecheck and build pass before commit.

Before commit rollback:

```bash
rm docs/SYSTEM_MAP.md
```

After commit rollback:

```bash
git revert <S0.T2-commit>
```

Rollback does not touch production, Supabase, migrations or application runtime.
