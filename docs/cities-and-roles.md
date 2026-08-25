# P09 — Cities and Roles

## 1. Purpose

P09 introduces city-aware administration and role separation for OSBB Platform while preserving the existing public house routing model.

Core hierarchy:

`city → district → house`

Important invariant:

- `houses` does **not** have `city_id`;
- house city is derived through `houses.district_id → districts.city_id`;
- public house slug routing stays unchanged;
- the admin city context must never influence public house routing.

P09 does not automatically launch Kyiv or any other city. New cities are created operationally by a superadmin.

---

## 2. City model

### 2.1 `cities`

The `cities` table is the canonical city registry.

Each city has:

- `id`;
- `name`;
- `slug`;
- active/inactive status.

Only a superadmin can create, edit, or delete cities.

Deletion is allowed only when the city is not the currently selected superadmin city and has no dependent districts or employee memberships.

### 2.2 District ownership

Every district belongs to exactly one city:

`districts.city_id NOT NULL`

District uniqueness is city-scoped:

- unique `(city_id, name)`;
- unique `(city_id, slug)`.

The old global uniqueness model is no longer the source of truth.

### 2.3 Houses

Houses remain attached to districts only.

Do not add `houses.city_id`.

A house belongs to a city through:

`house → district → city`

This is the only supported city derivation path for houses.

### 2.4 Empty cities

A city may exist with:

- zero districts;
- zero houses;
- zero employees.

This is a valid state.

Creating a city must not automatically:

- create a district;
- create a house;
- seed Kyiv-specific data;
- activate a public house.

---

## 3. Zaporizhzhia migration

P09 established Zaporizhzhia as the initial city scope for existing city-bound platform data.

Migration rules:

- existing districts without a city were assigned to Zaporizhzhia;
- existing city-scoped employee memberships without a city were assigned to Zaporizhzhia;
- superadmin memberships remain global with `city_id = null`;
- contractors were **not** backfilled;
- no Kyiv data was automatically created.

After verification:

`districts.city_id` became `NOT NULL`.

---

## 4. Admin city context

### 4.1 Ordinary city-scoped roles

For:

- `admin`;
- `manager`;
- `content_manager`;

the active city comes from the employee membership.

They cannot switch into another city by manipulating an admin cookie.

### 4.2 Superadmin

Superadmin is global and has no membership city.

Superadmin chooses an active operational city in the admin UI.

The selected city is stored in the server-side admin cookie:

`admin-active-city`

The protected admin shell requires a valid active city context before city-scoped work can continue.

Logout clears this cookie.

### 4.3 Public site independence

The public site must never depend on:

- `admin-active-city`;
- `getAdminCityContext()`;
- any superadmin city selector state.

Public house lookup continues to use the existing house slug/domain model.

---

## 5. Final role model

P09 final roles:

- `superadmin`;
- `admin`;
- `manager`;
- `content_manager`.

Legacy enum literals are not destructively deleted.

The old `manager` population was migrated to `content_manager` before the new `manager` semantics were activated.

### 5.1 `content_manager`

Purpose: content preparation without publication authority.

Can:

- work with allowed house CMS workspaces;
- create/edit/save drafts where enabled;
- work with operational tasks/history available to the role.

Cannot:

- publish;
- confirm publication;
- manage houses registry;
- manage districts;
- manage employees;
- manage cities;
- change house access codes.

### 5.2 `manager`

Purpose: operational city manager with publication authority.

Inherits content capabilities and additionally can:

- access houses;
- access districts;
- access apartments;
- publish/confirm/archive/restore allowed house content;
- perform the approved apartment import workflow;
- manage operational house content for the active city.

Cannot:

- manage employees;
- manage cities;
- change house access codes;
- manage admin credentials.

### 5.3 `admin`

Purpose: full city administrator.

Can:

- perform manager operations;
- manage employees inside the current city;
- perform extended apartment registry operations;
- manage company-side admin functions granted by RBAC;
- access house access-code information/actions approved for admin scope.

An admin remains pinned to the admin's own city.

### 5.4 `superadmin`

Purpose: global platform administrator.

Can:

- switch active city;
- create/edit/delete cities;
- create and manage employees across cities;
- perform all city admin operations in the selected city;
- manage global contractors where permitted.

Superadmin remains global:

`admin_memberships.city_id = null`

---

## 6. Employee city assignment

Employees are city-scoped.

Supported employee target roles:

- `admin`;
- `manager`;
- `content_manager`.

Rules:

- city admin can mutate employees only inside the admin's own city;
- superadmin can choose an active city for an employee;
- cross-city employee mutation must be rejected;
- manager and content_manager cannot access the Employees section;
- superadmin records are not treated as normal city employees.

Employee creation, update, invite, deactivate/delete paths must preserve city guards.

---

## 7. Contractor directory

Contractors use mixed global + city scope.

### 7.1 Existing/global contractors

Existing contractors remain:

`city_id = null`

They are global reference rows and are visible from every city.

Do not mass-backfill existing contractor rows to Zaporizhzhia.

### 7.2 New contractors

New contractors created through city work are assigned to the author's trusted active city.

The client must not choose arbitrary contractor scope.

### 7.3 Uniqueness

Global contractors:

unique `normalized_name` where `city_id IS NULL`.

City contractors:

unique `(city_id, normalized_name)` where `city_id IS NOT NULL`.

### 7.4 Deactivation

- city admin may deactivate a contractor belonging to that admin's city;
- superadmin may deactivate city contractors;
- global contractor deactivation is superadmin-only;
- manager/content_manager cannot deactivate contractor directory rows.

Historical tasks retain their stored contractor text/reference.

---

## 8. District operations

District CRUD is city-scoped.

For ordinary admins:

- district city is the current membership city;
- city cannot be arbitrarily switched.

For superadmin:

- district operations use the selected operational city.

Operational creation of a new city follows:

1. create the city;
2. select it as active superadmin city;
3. create districts manually;
4. create/assign houses only when the city is ready.

No automatic city rollout is performed.

---

## 9. Kyiv activation procedure

Kyiv is release-ready but must remain operationally empty until intentionally activated.

Approved sequence:

1. superadmin opens Cities;
2. creates `Київ`;
3. switches active city to Kyiv;
4. confirms house lists are empty;
5. manually creates the required Kyiv district(s);
6. creates/imports houses only after operational approval;
7. assigns Kyiv employees only when required;
8. verifies Zaporizhzhia data remains unchanged after switching back.

Creating Kyiv must not modify public routing for Zaporizhzhia.

---

## 10. Security and RLS model

P09 uses fail-closed city scope.

For city-bound entities, reads and writes must resolve through the trusted city context.

Cross-city access is forbidden.

Direct-query negative tests are required for every RLS group changed by P09.

Critical invariants include:

- city A admin cannot read/write city B apartments;
- city A admin cannot access city B house access records;
- city A admin cannot mutate city B house content;
- city A admin cannot access city B tasks/history/debtors;
- city A admin cannot mutate city B employees;
- contractor reads are `global + current city`;
- city admin cannot mutate another city's contractor;
- global contractor mutation is superadmin-only.

The public function:

`get_public_house_debtor_history(uuid)`

must remain publicly available according to the existing product contract.

---

## 11. Import buffer

`import_buffer_*` was already scope-aware before P09 finalization.

Do not rewrite the import-buffer security model without a concrete failing proof.

P09 acceptance preserves the existing import-buffer cross-city negative coverage.

---

## 12. Public house routing

P09 must not change the public routing contract.

Existing public routes remain slug-based, including the current house sections.

Admin city selection is an admin-only operating context and is not a public routing input.

Changing superadmin city must not change:

- public slug resolution;
- public resident access;
- public house URLs;
- public debtor history behavior.

---

## 13. House access codes

Final P09 decision:

**Manager house access-code management remains disabled.**

This is the conservative Q4 decision until the product owner explicitly changes it.

Do not silently grant manager:

- access-code viewing;
- access-code changing;
- admin credential management.

---

## 14. Production migration/release order

The production rollout must preserve the role-transition sequence.

Required order:

1. apply T3a enum migration adding `content_manager`;
2. deploy transitional runtime supporting both legacy `manager` and new `content_manager`;
3. apply transitional DB helper compatibility migration;
4. apply T3b data migration `manager → content_manager`;
5. verify legacy manager row count is zero;
6. deploy/activate final NEW `manager` semantics;
7. apply the remaining P09 city/scope migrations in their approved forward-only order;
8. deploy final P09 runtime;
9. execute post-release smoke and direct-query security checks.

Never activate the new manager semantics before the legacy manager population is migrated.

Production migrations are forward-only and timestamped.

---

## 15. Production smoke checklist

### Superadmin

- login succeeds;
- city selector is available;
- Zaporizhzhia can be selected;
- existing Zaporizhzhia houses remain visible;
- create Kyiv as an empty city;
- switch to Kyiv;
- empty house list is valid;
- create a Kyiv district manually;
- switch back to Zaporizhzhia;
- Zaporizhzhia houses/data remain intact.

### City admin

- Zaporizhzhia admin sees only Zaporizhzhia scope;
- Kyiv is not visible through city-scoped lists;
- direct cross-city REST/RLS attempts fail;
- employee mutation outside own city fails.

### Content manager

- draft/edit flow works;
- publication is forbidden;
- Employees section is unavailable.

### Manager

- publish flow works;
- Employees section is unavailable;
- house access-code mutation remains unavailable.

### Public

- existing public house links work;
- public routes do not depend on admin city cookie;
- resident access remains functional;
- public debtor history remains functional.

### Contractors

- global contractors are visible;
- current-city contractors are visible;
- another city's contractors are hidden;
- global contractor cannot be deactivated by city admin.

---

## 16. Rollback principles

P09 uses forward-only migrations.

Do not delete enum literals or destructively reverse role values in production.

If rollback is required:

- stop the release at the runtime layer first;
- restore a compatible runtime that understands the already-applied schema;
- preserve city assignments and migrated employee roles;
- use a new forward migration for database correction;
- do not mass-null city fields;
- do not backfill global contractors;
- do not reintroduce `houses.city_id`.

---

## 17. Release acceptance baseline

P09 is considered releasable only when:

- lint has zero errors and zero known warnings;
- TypeScript passes;
- full test suite passes;
- production build passes;
- T9 static acceptance passes;
- self-contained direct real-DB tenant isolation passes;
- contractor direct real-DB isolation passes;
- preserved legacy R0.2/R0.3/R0.4 suites remain in the repository;
- DB invariants remain valid;
- no unreviewed migration or unrelated file is staged.

Local Supabase helper files:

- `supabase/.gitignore`;
- `supabase/config.toml`;

must not be accidentally committed as part of P09.
