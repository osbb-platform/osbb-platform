<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses Next.js 16 with breaking changes. Before changing framework-specific APIs, routing, metadata, middleware/proxy behavior, cookies, headers, server actions, or cache/revalidation logic, inspect the current code and the relevant local Next.js docs in `node_modules/next/dist/docs/`.

Do not rely on older Next.js assumptions from memory.
<!-- END:nextjs-agent-rules -->

# OSBB Platform — Agent Guide

This file is the working context for AI agents and developers using LLMs in this repository.

OSBB Platform is a Next.js platform for management companies of apartment buildings. It has an admin CMS and public house portals on subdomains. The main content model is `house_sections`, where each section has a `kind`, workflow `status`, and `content` JSON payload.

## Quick map

- `app/` — Next.js App Router routes, layouts, route groups, API routes.
- `proxy.ts` — production subdomain routing for root/admin/house domains.
- `src/modules/*/actions/` — server actions for mutations.
- `src/modules/*/services/` — server-side reads, orchestration, data access helpers.
- `src/modules/*/components/` — UI components and workspaces.
- `src/shared/permissions/` — RBAC source of truth, guards, resolved access.
- `src/shared/ui/` — shared UI primitives and admin design helpers.
- `src/shared/utils/` — validators and generic utilities.
- `src/integrations/supabase/` — Supabase clients and integration adapters.
- `supabase/migrations/` — database migrations.

## Key concepts

### `house_sections`

`house_sections` is the universal content table for house portal content. Section behavior depends on `kind`, while actual payload lives in `content jsonb`.

Known content kinds: `rich_text`, `faq`, `contacts`, `specialists`, `reports`, `plan`, `meetings`, `requisites`, `debtors`, `announcements`, `hero`, `custom`.

### Content Engine

The target architecture is a shared Content Engine with one common CRUD/workflow layer and per-kind handlers.

Until the engine migration is complete, existing legacy actions may still exist. Do not create new per-kind action files unless the current task explicitly requires it. Prefer designs that can move into `src/modules/content-engine/`.

### Архитектура 2.0 — переходный период

During the Architecture 2.0 migration, new content sections must follow the migration spec from `01_CORE_CONTEXT.md` and the active block task file.

New migrated sections must be implemented through `dispatchAdminCommand` and handlers in `src/modules/content-engine/handlers/`.

Do NOT:
- Do NOT add new legacy per-kind server action files in `src/modules/houses/actions/`.
- Do NOT create new `house_sections[kind=...]` content records for new Architecture 2.0 sections.
- Do NOT extend `src/modules/houses/actions/updateHouseSection.ts` with new `kind` branches.
- Do NOT use `house_pages` in new queries or new Architecture 2.0 data access.
- Do NOT migrate non-scoped sections opportunistically; follow the active N-block task order.

### RBAC

RBAC is centralized in `src/shared/permissions/rbac.config.ts`.

Use guards and helpers from `src/shared/permissions/rbac.guards.ts` instead of hardcoding role checks in components or actions.

Server-side permission checks are mandatory. Hiding a button in UI is not authorization.

### Audit history

Platform changes are logged through `src/modules/history/services/logPlatformChange.ts` into `platform_change_history`.

Never log secrets, access tokens, session tokens, service role keys, or private credentials in audit metadata or entity ids.

## Do NOT

- Do not assume older Next.js behavior. This is Next.js 16.
- Do not create new content action files outside the Content Engine direction unless explicitly scoped.
- Do not use `any` to silence TypeScript issues.
- Do not use native `window.alert` or `window.confirm`; use shared UI patterns instead.
- Do not use `secure: false` on cookies except behind an explicit development-only condition.
- Do not duplicate RBAC logic in random components.
- Do not move unrelated files in the same patch.
- Do not mix product features with cleanup/security/refactor tasks.
- Do not write secrets or session tokens to logs, history, metadata, or console output.
- Do not run destructive database resets unless the user explicitly approves.

## Server Actions rules

Server Actions must:

1. Start with authentication and authorization checks when the action changes protected data.
2. Use the centralized RBAC guards/resolved access.
3. Return a typed state/result object for expected production-path errors.
4. Avoid throwing for normal validation, permission, or user-facing errors.
5. Revalidate only the paths affected by the mutation.
6. Log meaningful platform changes without secrets.
7. Keep payload parsing and validation close to the domain logic.
8. Avoid broad catch-all changes that hide real errors.

Preferred result shape: `type Result<T> = { ok: true; data: T } | { ok: false; error: string };`

Existing legacy actions may use local state shapes such as `{ error: string | null }`. Do not rewrite signatures unless the task scope requires it.

## UI behavior rules

- Form validation errors should appear inline near the field when possible.
- System/server errors should use toast notifications once the shared toast system is available.
- Confirmation flows should use shared modal components, not native browser dialogs.
- Pending state should be visible and buttons should be disabled during mutations.
- Prefer one pending naming convention: `isPending`.

## Patch discipline

- Work from current code snapshots, not assumptions.
- One task should be one logical patch set.
- Keep changes small and reversible.
- After meaningful changes run `npm run lint` and `npm run build`.
- Do not commit automatically unless the user explicitly asks. The user may want to test dev first.

## Architecture 2.0 rules

Architecture 2.0 is the current house-content architecture.

Do NOT:

- create new ad-hoc server actions for house content that bypass content-engine v2 handlers;
- read `house_*` content tables directly from UI components;
- build new live runtime flows on `house_sections`;
- build new live runtime flows on `house_pages`;
- build new live runtime flows on `content_versions`;
- build new house content history on `platform_change_history`;
- import from `src/legacy-v1` in live `app`, `src/modules`, or `src/shared` code.

Use v2/domain services for public house runtime and content-engine v2 handlers for mutations.

Remaining `house_pages` references are compatibility/page-shell and archived-house cleanup helpers only.

