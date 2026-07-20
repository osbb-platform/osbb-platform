# A0 — Actions Inventory for «Управління домом»

**Branch baseline:** `feat/redesign-a0-baseline`  
**Baseline HEAD:** `42bf1631359e6d8348ce6b702238a427ee1dca13`  
**Purpose:** contract for Block A. The redesign may change presentation, composition, labels and components, but must not add, remove or alter user capabilities, command payloads, command order, optimistic locking or RBAC behavior.

## How to read this contract

- “Visible action” describes the current UI capability, not the desired redesign label.
- Payload keys are recorded from the current code. They must be preserved 1-for-1 in Block A.
- A lifecycle command may be selected through a local `commandType` variable or template literal. Such commands are listed here even when the canonical grep baseline does not count them.
- `lockVersion` must continue to come from the same current snapshot or the immediately preceding command result.
- File uploads remain the existing browser-storage flow followed by the same Command Bus command.

---

## 1. Оголошення

### Props from `page.tsx`

`houseId`, `houseSlug`, `housePageId`, `sections`, `duplicateTargets`.

No explicit `readOnlyMode` prop is passed to this workspace in the current page wiring.

| Record/status or context | Visible action | Command | Payload keys / sequence | Condition |
|---|---|---|---|---|
| Workspace | Create announcement / save draft | `announcements.create` | `title`, `body`, `level`, `isPinned`, `pdf` | Create form |
| Draft | Save changes | `announcements.update` | `id`, `lockVersion`, `title`, `body`, `level`, `isPinned`, `pdf`, `removePdf` | Edit draft |
| Published | Save changes | `announcements.update` | same as above | Edit published |
| Archived | Save changes | `announcements.update` | same as above | Edit archived |
| Draft | Publish | `announcements.publish` | `id`, `lockVersion` | Lifecycle action selected in edit form |
| Published | Archive | `announcements.archive` | `id`, `lockVersion` | Lifecycle action selected in edit form |
| Draft or archived, according to current form | Delete | `announcements.delete` | `id`, `lockVersion` | Existing confirm modal |
| Published or archived | Create local copy as draft | `announcements.duplicate` | `sourceId`, `targetHouseIds: [houseId]` | Existing content action buttons |
| Published or archived | Duplicate to other houses | `announcements.duplicate` | `sourceId`, selected `targetHouseIds` | Existing cross-house panel |
| Archive tab | Delete all archived | `announcements.deleteAllArchived` | empty payload | Only when archived items exist |
| Archived | Restore | **not currently exposed by this UI** | — | Existing handler command is reserved for B13 |

**Required sequence:** browser PDF upload, if selected, precedes `create`/`update`; the command keeps the existing PDF descriptor and `removePdf` semantics.

---

## 2. Звіти

### Props from `page.tsx`

`readOnlyMode={!access.houseWorkspaces.reports.edit}`, `houseId`, `reports`, `categories`, `duplicateTargets`.

| Record/status or context | Visible action | Command | Payload keys / sequence | Condition / RBAC |
|---|---|---|---|---|
| Workspace | Create report | `reports.create` | current `buildPayload`: report fields, `period`, legacy `periodType/month/year`, PDF metadata and display fields | Disabled by `readOnlyMode` |
| Create flow | Create and publish | `reports.create` → `reports.publish` | publish receives `id`, `lockVersion` from create result | Disabled by `readOnlyMode` |
| Existing report | Save | `reports.update` | `id`, snapshot `lockVersion`, full current `buildPayload` including `period` and legacy fields | Disabled by `readOnlyMode` |
| Draft | Save and publish | `reports.update` → `reports.publish` | lifecycle command gets `id`, `lockVersion` from update result | Disabled by `readOnlyMode` |
| Published | Save and archive | `reports.update` → `reports.archive` | lifecycle command gets `id`, `lockVersion` from update result | Disabled by `readOnlyMode` |
| Archived | Restore | `reports.restore` | `id`, snapshot `lockVersion` | Disabled by `readOnlyMode` |
| Draft or archived according to current UI | Delete | `reports.delete` | `id`, snapshot `lockVersion` | Disabled by `readOnlyMode` |
| Archive tab | Delete all archived | `reports.deleteAllArchived` | empty payload | Archived list non-empty and not read-only |
| Published or archived | Create local draft copy | `reports.duplicate` | `sourceId`, `targetHouseIds: [houseId]` | Disabled by `readOnlyMode` |
| Published or archived | Duplicate to other houses | `reports.duplicate` | `sourceId`, selected `targetHouseIds` | Existing cross-house panel |
| Workspace | Synchronize categories | `reports.categoriesUpsert` | `categories[{title, sortOrder}]` | Button remains in Block A |

**Required sequence:** upload PDF in browser → `reports.create` or `reports.update` → optional lifecycle command. The legacy period fields must not be removed or normalized away.

---

## 3. План робіт

### Props from `page.tsx`

`canChangeWorkflowStatus={access.houseWorkspaces.plan.changeWorkflowStatus}`, `houseId`, `houseSlug`, `plan`, `duplicateTargets`.

| Record/status or context | Visible action | Command | Payload keys / sequence | Condition / RBAC |
|---|---|---|---|---|
| Create | Save task | `plan.create` | current `taskPayload(draft)` | Existing create mode |
| Create into active placement | Create then publish | `plan.create` → `plan.publish` | publish: `id`, result `lockVersion`, `taskStatus` | Workflow meaning preserved |
| Create into archive placement | Create → publish → archive | `plan.create` → `plan.publish` → `plan.archive` | each command uses result `lockVersion` | Existing placement flow |
| Existing task | Save | `plan.update` | `id`, snapshot `lockVersion`, current `taskPayload(draft)` | Existing edit flow |
| Existing task with removed files | Remove files after update | `plan.removeFiles` | `id`, result `lockVersion`, `fieldKeys` | Only when removal list is non-empty |
| Existing task with uploads | Add files after update/upload | `plan.addFiles` | `id`, latest result `lockVersion`, `files` | Only when uploaded files exist |
| Draft | Publish | `plan.publish` | `id`, `lockVersion`, `taskStatus` where currently supplied | Existing confirm flow |
| Active/published | Archive | `plan.archive` | `id`, `lockVersion` | Existing confirm flow |
| Draft | Delete | `plan.delete` | `id`, `lockVersion` | Existing confirm flow |
| Published/archived | Duplicate | `plan.duplicate` | `sourceId`, target house IDs | Existing local/cross-house copy flow |
| Workflow status control | Save selected status through existing update/publish behavior | existing commands only | Keep current `taskStatus` payload | Status editing gated by `canChangeWorkflowStatus` |
| Archived | Restore | **not currently exposed** | — | Reserved for B13 |

---

## 4. Збори

### Props from `page.tsx`

`canChangeWorkflowStatus={access.houseWorkspaces.meetings.changeWorkflowStatus}`, `houseId`, `houseSlug`, `hasApartments`, mapped `apartments`, `meetings`.

| Record/status or context | Visible action | Command | Payload keys / sequence | Condition / RBAC |
|---|---|---|---|---|
| Create | Save meeting | `meetings.create` | current meeting payload including questions and `status` | Existing create flow |
| Existing | Save meeting | `meetings.update` | `id`, `lockVersion`, full meeting payload including `status` | Existing edit flow |
| Draft | Publish / confirm meeting | `meetings.publish` | `id`, `lockVersion`, current publish payload (`status: "scheduled"` where supplied) | Workflow action gated by current logic and `canChangeWorkflowStatus` |
| Published/active according to current UI | Archive | `meetings.archive` | `id`, `lockVersion` | Existing confirm flow |
| Draft | Delete | `meetings.delete` | `id`, `lockVersion` | Existing confirm flow |
| Voting | Save manual apartment vote | `meetings.recordManualVote` | current meeting/question/apartment vote payload | Available only with apartments and current voting UI conditions |
| Workflow status | Change status through save payload | `meetings.update` | existing `status` field remains in payload | Gated by `canChangeWorkflowStatus` |
| Archived | Restore | **not currently exposed** | — | Reserved for B13 |
| Questions replacement | Separate `meetings.replaceQuestions` command | **not currently called by this UI** | — | Do not invent or connect in Block A |

---

## 5. Боржники

### Props from `page.tsx`

`houseId`, `houseSlug`, `exportTitle`, `apartments`, `debtors`.

No dedicated RBAC prop is passed in current page wiring.

| Context | Visible action | Command | Payload keys / sequence | Condition |
|---|---|---|---|---|
| Import/preview | Save preview as draft | `debtors.saveDraftItems` | `items[{apartmentId, apartmentLabel, accountNumber, ownerName, area, amount, days}]` | Must remain after `openPreview` |
| Draft | Publish draft | `debtors.publishDraft` | empty payload | Existing publish confirmation |
| Draft | Delete draft | `debtors.deleteDraft` | empty payload | Existing delete confirmation |
| Payment settings | Save | `debtors.saveSettings` | settings `lockVersion`, `payment`, `calculator` | Existing settings panel |
| Calculator settings | Save | `debtors.saveSettings` | settings `lockVersion`, `payment`, updated `calculator` | Existing calculator panel |
| Table | Export | no command | Existing client export | Label is currently `Export`; A1 changes text only |

**Required sequence:** edit/import rows → `openPreview` → `debtors.saveDraftItems` → `debtors.publishDraft`. Thresholds, calculations, import/export and snapshot logic are outside redesign scope.

---

## 6. Спеціалісти

### Props from `page.tsx`

`houseId`, `specialistsData`, `requests`, `templates`, `duplicateTargets`.

No dedicated RBAC prop is passed in current page wiring.

| Record/status or context | Visible action | Command | Payload keys / sequence | Condition |
|---|---|---|---|---|
| Create | Save specialist | `specialists.create` | `title`, `category`, `phones`, `phoneTypes`, `email`, `description`, `sortOrder` | Create mode |
| Existing | Save changes | `specialists.update` | same fields plus `id`, `lockVersion` | Edit mode |
| Draft | Publish | `specialists.publish` | `id`, `lockVersion` | Dynamic command selected by current lifecycle action |
| Published | Archive | `specialists.archive` | `id`, `lockVersion` | Dynamic command |
| Archived | Restore to drafts | `specialists.restore` | `id`, `lockVersion` | Currently exposed by this UI |
| Applicable item | Delete | `specialists.delete` | `id`, `lockVersion` | Existing confirm flow |
| Published/archived | Copy or cross-house duplicate | `specialists.duplicate` | `sourceId`, target house IDs | Existing content action buttons |
| Templates | Apply one or more template slots | `specialists.applyTemplate` | `templateKey`, sequentially for each key | Stops on first failed command |
| Create form | Save as template | `templates.upsert` | `sectionKind`, `slotIndex`, `name`, `description`, template `payload` | Existing template slot logic |
| Specialist categories | Category synchronization | existing current command only if invoked by current UI | preserve payload exactly | Do not add a new call |
| Confirm | `specialists.confirm` | **not currently exposed** | — | Reserved for B13 pending product decision |

---

## 7. Інформація

### Props from `page.tsx`

`houseId`, `houseSlug`, `housePageId`, `posts`, information-scope `documents`, `faqs`, `faqTemplates`, `informationPostTemplates`, `duplicateTargets`.

### 7.1 Publications

| Status/context | Visible action | Command | Payload keys / sequence | Condition |
|---|---|---|---|---|
| Create | Save post | `information_posts.create` | `headline`, `category`, `body`, `isPinned`, `coverImage` | Create form |
| Existing | Save post | `information_posts.update` | `id`, `lockVersion`, same editable fields | Edit form |
| Draft | Publish | `information_posts.publish` | `id`, `lockVersion` | Dynamic lifecycle command |
| Published | Archive | `information_posts.archive` | `id`, `lockVersion` | Dynamic lifecycle command |
| Draft/archived according to current form | Delete | `information_posts.delete` | `id`, `lockVersion` | Existing confirm flow |
| Published/archived | Copy/duplicate | `information_posts.duplicate` | `sourceId`, target house IDs | Existing local/cross-house action |
| Templates | Apply template | `information_posts.applyTemplate` | `templateKey` sequentially | Stops on first failed command |
| Create form | Save template | `templates.upsert` | `sectionKind: "information_post"`, slot metadata, posts payload | Existing template logic |
| Archived | Restore | **not currently exposed** | — | Reserved for B13 |
| Archive | Delete all archived | **not currently exposed** | — | Reserved for B13 |

### 7.2 FAQ

| Status/context | Visible action | Command | Payload keys / sequence | Condition |
|---|---|---|---|---|
| Create | Save FAQ draft | `faq.create` | `items` | Create form |
| Existing | Save questions/answers | `faq.replaceItems` | `faqId`, `lockVersion`, `items` | Edit form |
| Draft | Save then publish | `faq.replaceItems` → `faq.publish` | publish receives `faqId`, lock version from save result | Current publish flow |
| Published | Archive | `faq.archive` | `faqId`, current `lockVersion` | Currently exposed in edit form |
| Archived | Restore | `faq.restore` | `faqId`, current `lockVersion` | Currently exposed in edit form |
| Applicable FAQ | Delete | `faq.delete` | `faqId`, current `lockVersion` | Currently exposed in edit form |
| Published/archived | Duplicate | `faq.duplicate` | `sourceId`, target house IDs | Existing local/cross-house flow |
| Templates | Apply | `faq.applyTemplate` | `templateKey` | Existing templates panel |
| Create/edit | Save template | `templates.upsert` | `sectionKind: "faq"`, slot metadata, items payload | Existing template logic |

### 7.3 Materials/documents

Uses `HouseDocumentsWorkspace` with `documentScope="information"` and the same document command behavior listed in section 8, but without the founding-document RBAC props passed by `page.tsx`.

---

## 8. Установчі документи

### Props from `page.tsx`

`houseId`, `documents`, `documentScope="founding"`, headings/texts,  
`canConfirm={access.houseWorkspaces.foundingDocuments.confirm}`,  
`canArchive={access.houseWorkspaces.foundingDocuments.archive}`,  
`canDelete={access.houseWorkspaces.foundingDocuments.delete}`,  
`duplicateTargets`.

| Record/status or context | Visible action | Command | Payload keys / sequence | Condition / RBAC |
|---|---|---|---|---|
| Create | Save document | `documents.create` | current document fields and PDF descriptor | Existing create flow |
| Existing | Save document | `documents.update` | `id`, `lockVersion`, document fields, current replace/remove-file fields | Existing edit flow |
| Draft | Publish/confirm | dynamic `documents.publish` | `id`, latest `lockVersion` | Only when `canConfirm` |
| Published | Archive | dynamic `documents.archive` | `id`, latest `lockVersion` | Only when `canArchive` |
| Draft or archived according to current UI | Delete | `documents.delete` | `id`, `lockVersion` | Only when `canDelete` |
| Archive tab | Delete all archived | `documents.deleteAllArchived` | scope-aware current payload | Only when archived items exist and `canDelete` |
| Published/archived | Duplicate | `documents.duplicate` | `sourceId`, target house IDs | Existing local/cross-house flow |
| Archived | Restore | **not currently exposed by this workspace** | — | Reserved for B13 |

**Required sequence:** existing browser PDF upload remains unchanged; create/update payload fields, bucket/path/original name/MIME/size and removal behavior remain unchanged.

---

## 9. Правління

### Props from `page.tsx`

`readOnlyMode={!access.houseWorkspaces.board.edit}`, `houseId`, `houseSlug`, `board`.

| Context | Visible action | Command | Payload keys / sequence | Condition / RBAC |
|---|---|---|---|---|
| Intro edit | Save intro | `board_intro.save` | `lockVersion`, `intro` | Not available in `readOnlyMode` |
| Existing member | Save member | `board_members.update` | `id`, `lockVersion`, `roleStatus`, `name`, `role`, `phone`, `email`, `officeHours`, `description`, existing `sortOrder` | Not read-only |
| New member | Create member | `board_members.create` | same editable fields plus `sortOrder: roles.length` | Not read-only |
| Existing member | Delete member | `board_members.delete` | `id`, `lockVersion` | Existing confirm modal; not read-only |
| Ordering | Reorder members | **not currently exposed** | — | Existing handler command `board_members.reorder` reserved for B13 |

**Current behavior:** intro and members are saved as separate user actions. A13.7 may consolidate the visual form only under the explicitly specified safe sequence; it must not invent `board_members.replaceItems`.

---

## 10. Реквізити

### Props from `page.tsx`

`readOnlyMode={!access.houseWorkspaces.requisites.edit}`, `houseId`, `requisites`.

| Context | Visible action | Command | Payload keys | Condition / RBAC |
|---|---|---|---|---|
| View mode | Enter edit mode | no command | — | Hidden in `readOnlyMode` |
| Edit mode | Save | `requisites.save` | `lockVersion`, `recipient`, `iban`, `edrpou`, `bank`, `purposeTemplate`, `paymentUrl`, `paymentButtonLabel` | Not read-only; existing IBAN validation |
| Edit mode | Cancel | no command | Restores initial snapshot | Existing view/edit behavior |

---

## Shared content actions and templates

| Component/action | Command | Contract |
|---|---|---|
| `ContentWorkspaceActionButtons` local copy | section’s existing `*.duplicate` | `sourceId`, `targetHouseIds: [houseId]` |
| `CrossHouseDuplicatePanel` | section’s existing `*.duplicate` | `sourceId`, selected target house IDs |
| `ContentTemplateSlotsPanel` delete | `templates.delete` | existing section kind / template key payload |
| Create/edit template slots | `templates.upsert` | existing slot metadata and payload shape |

---

## Dynamic command literals not represented by the canonical `type: "..."` grep count

The following current UI commands are selected via a variable or template literal and therefore must be reviewed manually in every Block A patch:

- `announcements.publish`, `announcements.archive`, `announcements.delete`
- `reports.archive`
- `documents.publish`, `documents.archive`
- `information_posts.publish`, `information_posts.archive`, `information_posts.delete`
- `faq.archive`, `faq.restore`, `faq.delete`
- `specialists.publish`, `specialists.archive`, `specialists.restore`, `specialists.delete`
- meeting create/update paths and any locally constructed meeting lifecycle command found in the current workspace
- shared duplicate commands passed as `commandType` props

A green TypeScript build does not prove these runtime command names or payloads are correct. They must be compared against handler maps and this inventory.

---

## Commands that exist in handlers but must not be newly connected during Block A

- `announcements.restore`
- `documents.restore`
- `information_posts.restore`
- `information_posts.deleteAllArchived`
- `meetings.restore`
- `plan.restore`
- `board_members.reorder`
- `specialists.confirm`
- standalone `announcements.replacePdf` / `announcements.removePdf`
- standalone `reports.replacePdf` / `reports.removePdf`

FAQ lifecycle commands are already connected in the current edit form and therefore remain part of the current capability set.

---

## Block A review rule

After every Block A step:

1. regenerate the canonical grep output and diff it against `COMMANDS_BASELINE.txt`;
2. inspect dynamic command literals and `commandType` props manually against this file;
3. verify payload keys and command order for every touched flow;
4. verify all current RBAC props still hide or disable the same actions;
5. do not connect any handler-only command listed above.
