# OSBB P02 — handoff по веткам и завершению блока PDF-вложений в объявлениях

Дата: 2026-07-09 16:08:23

## 1. Финальный статус

P02 завершён локально.

Финальная ветка:

    feat/p02-t7-announcement-pdf-tests

Финальный HEAD:

    1008d7a

Working tree:

    clean

Push / merge не выполнялись.

Supabase migrations не применялись.

## 2. Цель P02

Добавить PDF-вложения к объявлениям дома.

Ключевые требования:

- одно опциональное PDF-вложение на объявление;
- загрузка PDF из админки при создании и редактировании объявления;
- public-доступ только для published объявлений;
- draft / archived доступны только admin через signed URL;
- duplicate объявления физически копирует PDF в новый путь;
- delete / replace / remove чистят storage и registry;
- хранение через house_content_files;
- без изменения схемы house_announcements.

## 3. Финальная модель хранения

    entity_type: house_announcement
    field_key: pdf
    bucket: house-announcements
    path: houses/{houseId}/announcements/{announcementId}/{uuid}.pdf
    registry: house_content_files

## 4. Цепочка P02

P02 выполнен поверх P01.

Базовая точка:

    6a98960 docs(p01): document quarterly reports rollout

Финальная цепочка коммитов:

    1008d7a (HEAD -> feat/p02-t7-announcement-pdf-tests) test(p02): cover announcement pdf integration contracts
    9c960c4 (feat/p02-t6-announcement-pdf-duplicate) fix(p02): copy duplicated announcement pdf under target path
    b6e5dd4 (feat/p02-t5-announcement-public-pdf) feat(p02): show announcement pdf on public page
    90e1f29 (feat/p02-t4-announcement-admin-upload) feat(p02): add announcement pdf admin uploader
    9a5ad76 (feat/p02-t3-announcement-access) fix(p02): secure announcement pdf signed access
    5bdb497 (feat/p02-t2-announcement-handler) feat(p02): add announcement pdf handler support
    b27a63c (feat/p02-announcement-pdf) feat(p02): add announcement pdf storage bucket
    6a98960 (feat/p01-quarterly-reports) docs(p01): document quarterly reports rollout
    a9ed98c fix(p01): make backfill policy migration executable
    deecf03 test(p01): cover report period filtering
    2718f2f feat(p01): update report public period filters
    617e45c feat(p01): update report period form
    718459c feat(p01): normalize report periods
    0482653 feat(p01): backfill report period model
    3f7011c feat(p01): add report period schema

## 5. Блоки P02

| Блок | Коммит | Что сделано |
|---|---|---|
| P02.T1 | b27a63c | Добавлен private bucket house-announcements и storage policies |
| P02.T2 | 5bdb497 | Handler support: pdf, removePdf, validation, filesToTrack, filesToDelete |
| P02.T3 | 9a5ad76 | Signed access policy для house_announcement/pdf |
| P02.T4 | 90e1f29 | Admin upload / replace / remove PDF |
| P02.T5 | b6e5dd4 | Public page показывает PDF-кнопку для published announcements |
| P02.T6 | 9c960c4 | Duplicate физически копирует PDF в target announcement path |
| P02.T7 | 1008d7a | Финальные integration / security tests |

## 6. Основные файлы

    supabase/migrations/202607091417_create_house_announcements_storage_bucket.sql

    src/modules/content-engine/v2/handlers/announcements/types.ts
    src/modules/content-engine/v2/handlers/announcements/commands/shared.ts
    src/modules/content-engine/v2/handlers/announcements/commands/create.ts
    src/modules/content-engine/v2/handlers/announcements/commands/update.ts
    src/modules/content-engine/v2/handlers/announcements/commands/replacePdf.ts
    src/modules/content-engine/v2/handlers/announcements/commands/removePdf.ts
    src/modules/content-engine/v2/handlers/announcements/commands/delete.ts
    src/modules/content-engine/v2/handlers/announcements/commands/deleteAllArchived.ts
    src/modules/content-engine/v2/handlers/announcements/commands/duplicate.ts
    src/modules/content-engine/v2/handlers/announcements/handler.ts

    src/modules/content-engine/v2/services/cloneService.ts
    src/modules/files/services/signedFileAccessPolicy.ts
    src/modules/files/services/resolveSignedFileUrl.ts
    app/api/reports/view/route.ts

    src/modules/houses/components/announcementPdfUpload.ts
    src/modules/houses/components/AnnouncementPdfUploadBlock.tsx
    src/modules/houses/components/CreateAnnouncementInlineForm.tsx
    src/modules/houses/components/EditAnnouncementSectionForm.tsx
    src/modules/houses/components/HouseAnnouncementsWorkspace.tsx
    src/modules/houses/services/getAdminHouseAnnouncements.ts
    src/modules/houses/services/getPublishedHouseAnnouncements.ts
    src/modules/houses/components/PublicReportPdfViewer.tsx

## 7. Что реализовано

### Storage

- Добавлен private bucket house-announcements.
- PDF limit: 15 MB.
- Storage policies ограничены admin-контуром.
- Схема house_announcements не менялась.

### Handler layer

Добавлено:

- pdf?: HouseAnnouncementFileInput | null;
- removePdf?: boolean;
- replacePdf;
- removePdf;
- strict validation bucket / path / MIME / size;
- filesToTrack;
- filesToDelete.

### Signed access

Правила:

- house_announcement разрешён только с bucket house-announcements;
- fieldKey только pdf;
- anonymous доступ только если lifecycle_status = published;
- draft / archived требуют admin;
- bucket / path / entity / field substitution закрыты;
- legacy generated {houseId}/announcement.pdf сохранён как admin-only контур.

### Admin UI

Реализовано:

- upload PDF при создании объявления;
- replace PDF при редактировании;
- remove PDF при редактировании;
- отображение текущего PDF;
- admin service подтягивает house_content_files по house_announcement/pdf.

### Public UI

Реализовано:

- public service подтягивает PDF только для опубликованных объявлений;
- public page показывает кнопку Переглянути PDF;
- viewer использует entityType=house_announcement, entityId, fieldKey=pdf.

### Duplicate

Реализовано:

- source PDF читается из house_content_files;
- physical file копируется;
- новая registry row создаётся под новым entity_id;
- путь копии: houses/{targetHouseId}/announcements/{newAnnouncementId}/...

## 8. Тесты

Добавлены / расширены:

    src/modules/content-engine/v2/handlers/announcements/commands/shared.test.ts
    src/modules/content-engine/v2/handlers/announcements/commands/duplicate.test.ts
    src/modules/content-engine/v2/handlers/announcements/commands/pdfLifecycle.test.ts
    src/modules/content-engine/v2/services/cloneService.test.ts
    src/modules/content-engine/v2/services/fileService.test.ts
    tests/security/reportFileAccess.test.ts
    tests/security/announcementPdfAccessPolicy.test.ts
    src/modules/houses/services/getPublishedHouseAnnouncements.test.ts

Покрыто:

- PDF validation;
- create with PDF;
- create without PDF;
- update replace PDF;
- update remove PDF;
- replacePdf / removePdf;
- delete cleanup;
- deleteAllArchived cleanup;
- file registry insert;
- physical storage cleanup;
- signed access policy;
- public published announcements PDF join;
- duplicate physical copy contract.

## 9. Финальный gate

Финальные артефакты:

    /Users/zakharov/Desktop/OSBB_P02_FINAL_GATE_RETRY_20260709-154832.txt
    /Users/zakharov/Desktop/OSBB_P02_FINAL_REPORT_20260709-154832.md

Результаты:

- P02 targeted tests: passed;
- All Vitest tests: passed;
- npm run verify: passed;
- git diff --check: passed;
- working tree: clean;
- strict file policy mapping check: passed;
- no house_announcements schema change: passed.

## 10. Что не делали

Не выполнялось:

    git push
    git merge
    supabase db push
    vercel deploy

Не меняли:

    house_announcements schema

## 11. Handoff для следующего потока

Актуальное состояние:

    Repo: /Users/zakharov/osbb-platform
    Branch: feat/p02-t7-announcement-pdf-tests
    HEAD: 1008d7a
    Working tree: clean
    P02 final gate: passed
    Push / merge: not done
    Supabase migration apply: not done

Главное правило:

    Не делать push / merge / Supabase db push / deploy без явного подтверждения пользователя.

Перед будущим merge в main повторить:

    npm run verify
    npx vitest run
    git diff --check
    git status --short
