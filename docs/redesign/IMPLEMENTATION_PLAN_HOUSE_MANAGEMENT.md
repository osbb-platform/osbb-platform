# План реализации редизайна «Управління домом» — пошаговое ТЗ для LLM

**Версия:** 1.0 (17.07.2026)
**Основано на:** `TZ_HOUSE_MANAGEMENT_REDESIGN_v2.md` (спека), `OSBB-House-Management-DS.html` (визуальный эталон), `UX_AUDIT_HOUSE_MANAGEMENT.md` (аудит), аудит реального кода из zip-слепка.
**Что это:** рабочий план внедрения. ТЗ v2 отвечает на вопрос «как должно выглядеть», этот документ — «в каком порядке это делать, чтобы ничего не сломать».

Работа разделена на два блока:

- **БЛОК A — ЗАМЕНА.** Меняем внешний вид, компоновку и компоненты. Набор возможностей пользователя остаётся **ровно тем же**. Ни одной новой команды, ни одного нового вызова. После блока A — приёмка заказчиком.
- **БЛОК B — НОВЫЕ ФИЧИ.** Только после приёмки блока A. Каждая фича — отдельный шаг, включается по одной.

---

# 0. Как работать по этому документу

1. **Один шаг = один чат с LLM = один коммит.** Никаких «заодно поправлю».
2. В каждый чат грузим: этот файл + `TZ_HOUSE_MANAGEMENT_REDESIGN_v2.md` + `OSBB-House-Management-DS.html` + файлы из «📎 Файлы» шага.
3. Промпт-шаблон:
   > Работаем по `IMPLEMENTATION_PLAN_HOUSE_MANAGEMENT.md`. Визуальный эталон — `OSBB-House-Management-DS.html`, спека — ТЗ v2. Выполняем **шаг {A3}**. Сначала выполни «Инвентарь» шага и покажи его мне. Затем — план правок и патчи. Ничего за пределами scope шага не трогай. Соблюдай раздел 1 «Инварианты безопасности».
4. Порядок шагов в блоке A **строгий** (каждый следующий опирается на предыдущий). В блоке B — свободный, кроме указанных зависимостей.
5. Ветки: `feat/redesign-a{N}-{slug}` → PR в `release/house-redesign`. На прод — только после приёмки всего блока A.
6. После каждого шага: `npm run lint && npx tsc --noEmit && npm run build` + смоук из шага + чек-лист типа раздела из `02_LINKAGE_AND_REGRESSION.md`.

---

# 1. Инварианты безопасности (читать перед каждым шагом)

## 1.1 🔴 Главная ловушка: TypeScript НЕ ловит несуществующие команды

```ts
// src/modules/content-engine/v2/types/commands.ts
export type AdminCommand = {
  type: `${HandlerKey}.${string}`;   // ← template literal!
  payload: Record<string, unknown>;  // ← payload не типизирован!
  houseId: string;
};
```

Это значит: `dispatch({ type: "board_members.replaceItems", ... })` **скомпилируется** и упадёт только в рантайме (`COMMAND_NOT_FOUND`), у пользователя, в проде. Точно так же не проверяется структура payload.

**Правила из этого:**
- Единственный источник истины о командах — карта `commands: {...}` в `src/modules/content-engine/v2/handlers/<key>/handler.ts` (см. реестр в приложении 1).
- **Запрещено** придумывать команды. Если нужной команды нет в реестре — остановиться и спросить заказчика.
- **Запрещено** менять состав payload. Payload переносится из текущего кода **1-в-1**, включая legacy-поля, которые выглядят лишними (в reports это `periodType/month/year` рядом с `period` — они нужны, не «оптимизировать»).
- `tsc` зелёный ≠ команды целы. Проверка — только grep-диффом (см. 1.3).

## 1.2 Что нельзя трогать

1. Серверные экшены, handler-ы, pipeline, миграции, RLS, публичная часть (`app/(public)`, `Pub*`) — не открывать.
2. Сервисы чтения `getAdmin*` — не менять (в блоке B разрешён **один новый** read-only сервис счётчиков, шаг B2).
3. Порядок и количество вызовов в существующих флоу. Примеры, которые обязаны остаться как есть:
   - reports: upload PDF (browser client) → `reports.create` → опционально `reports.publish`;
   - reports edit: `reports.update` → опционально `reports.publish` / `reports.archive`;
   - meetings: `meetings.create`/`meetings.update` с `status` в payload → отдельно `meetings.publish` / `meetings.archive`;
   - debtors: правки таблицы → `openPreview` (превью) → `debtors.saveDraftItems` → `debtors.publishDraft`;
   - announcements/plan/documents: upload файла → команда с `{bucket, path, originalName, size}` в payload.
4. Optimistic locking: `lockVersion` передаётся там же и оттуда же, откуда сейчас (из снапшота записи / из результата предыдущей команды).
5. RBAC-пропсы (`readOnlyMode`, `canConfirm`, `canArchive`, `canDelete`, `canChangeWorkflowStatus`) продолжают скрывать/дизейблить **те же** действия.
6. Цвета/радиусы/тени — только токены `--cms-*` / `--r-*` из `app/globals.css`.

## 1.3 Обязательная проверка «команды целы» (выполняется на каждом шаге)

Baseline снимается один раз в шаге A0 и сравнивается после каждого шага:

```bash
# слепок всех dispatch-вызовов раздела
grep -rn "type: \"" src/modules/houses/components/ src/modules/content-engine/v2/client/ \
  | grep -oE '"(announcements|reports|plan|meetings|specialists|documents|faq|information_posts|debtors|board_intro|board_members|requisites|home_widgets|templates)\.[a-zA-Z]+"' \
  | sort | uniq -c | sort -k2 > /tmp/commands_after.txt

diff docs/redesign/COMMANDS_BASELINE.txt /tmp/commands_after.txt
```

- **Блок A:** diff обязан быть **пустым** (тот же набор типов и то же количество вызовов; изменение количества допустимо только при явном обосновании — например, форма разбита на две панели, но тогда это фиксируется в шаге).
- **Блок B:** diff показывает только новые вызовы, явно перечисленные в шаге.
- Динамические типы (`const commandType = kind === "publish" ? "x.publish" : ...`) grep поймает — они записаны строками. Если в шаге появляется конструирование типа из переменной — так делать нельзя, тип должен быть литералом.

## 1.4 Поправки к макету (в макете есть ошибки — не копировать вслепую)

| Что в макете | Проблема | Как правильно |
|---|---|---|
| «Один Зберегти → `board_intro.save` + `board_members.replaceItems`» | **`board_members.replaceItems` не существует.** Реальные команды: `create`, `update`, `delete`, `reorder` | См. шаг A13.7 — сохранение диффом через существующие команды |
| Архівна картка → кнопка «Відновити» | В announcements/documents/faq/information_posts/meetings/plan команда `restore` **сейчас не вызывается UI** — это новая возможность | В блоке A набор действий не меняем. Подключение `restore` — шаг **B13** |
| Стрілки ▲▼ порядку в правлінні | `board_members.reorder` **сейчас не подключён** к UI | Шаг **B13** |
| Удаление кнопки «Синхронізувати категорії» с авто-вызовом при сохранении | Меняет последовательность команд | Блок A: кнопку **оставить**, только переоформить. Авто-вызов — опциональный шаг **B14** |
| `.cms-root` + `[data-theme="light"]` | В макете свой скоуп тем | В проекте: `.cms-theme-root` + `html[data-admin-theme="light"]`, тему переключает существующий `AdminThemeSwitch` |
| Инлайн-CSS макета | Макет самодостаточный | В проекте: Tailwind-классы + `adminStyles.ts`. CSS из макета не копировать, копировать **визуал** |
| Meetings: кнопка «На перевірку» | Это workflow-статус | `meetings.update` с `status` в payload (как сейчас), под флагом `canChangeWorkflowStatus` |

---

# 2. Процедура одного шага

1. **Инвентарь** (LLM делает первым, до кода, и показывает заказчику):
   - какие `dispatch`-вызовы есть в затрагиваемых файлах: тип + ключи payload + условие вызова;
   - какие кнопки/действия показываются при каком статусе и при каких RBAC-флагах;
   - какие пропсы приходят в компонент из `page.tsx`.
2. **План правок** — список файлов и что в каждом меняется.
3. **Патчи.**
4. **Проверка:** `npm run lint && npx tsc --noEmit && npm run build` + grep-дифф команд (1.3).
5. **Смоук** из шага (на dev, на реальном доме).
6. **Коммит** с сообщением `redesign(A3): унификация табов` / `redesign(B10): undo в тостах`.

---

# БЛОК A — ЗАМЕНА (без новых возможностей)

**Критерий блока A:** после него ни один пользователь не может сделать ничего нового; всё, что он мог, он делает так же, но интерфейс другой. Любая правка, дающая новую возможность, — стоп и перенос в блок B.

## A0. Baseline и подготовка

**📎 Файлы:** весь `src/modules/houses/components/`, `app/(admin)/admin/(protected)/houses/[id]/page.tsx`
**Что сделать:**
1. Ветка `release/house-redesign` от актуального main.
2. Создать `docs/redesign/COMMANDS_BASELINE.txt` — вывод grep из п. 1.3.
3. Создать `docs/redesign/ACTIONS_INVENTORY.md` — таблица по всем 10 разделам: `раздел | статус записи | какие кнопки/действия видит пользователь | какая команда за каждой | RBAC-флаг`. Заполнять **только по коду**, без догадок. Этот файл — контракт: в блоке A таблица не меняется, меняется только внешний вид.
**Приёмка:** оба файла в репо, заказчик прочитал ACTIONS_INVENTORY и подтвердил, что там всё, чем пользуются.

## A1. Даты, локаль, тексты

**📎 Файлы:** `HouseAnnouncementsWorkspace.tsx`, `EditAnnouncementSectionForm.tsx`, `HouseDebtorsWorkspace.tsx`, `HouseReportsWorkspace.tsx`, `HouseInformationWorkspace.tsx`, `src/shared/utils/`
**Что сделать:**
- Новый `src/shared/utils/format/formatAdminDate.ts`: `formatAdminDate(value)` → `16 лип. 2026`; `formatAdminDateTime(value)` → `16 липня 2026, 14:30`; невалидное/пусто → `«Не опубліковано»` / переданный fallback. Локаль только `uk-UA`.
- Заменить **все** локальные `formatDate`/`formatDateTime` и убрать `toLocaleString("ru-RU")`.
- `Export` → `Експорт` (debtors). Тексты `HouseTechnicalPlaceholder` переписать по-человечески.
**Не делать:** не трогать `normalizeReportCategory` (это данные), не трогать кнопку синхронизации категорий.
**Смоук:** даты во всех разделах в едином формате; ни одного `ru-RU` в grep.

## A2. Статусы: единая карта тонов

**📎 Файлы:** `src/shared/ui/admin/AdminStatusBadge.tsx`, все `House*Workspace.tsx`
**Что сделать:**
- Исправить `statusToneFor`: `archived → neutral` (сейчас danger).
- Карта (ТЗ v2 Ф1.2): draft=«Чернетка»/warning, published=«Опубліковано»/success, archived=«Архів»/neutral; workflow плана: planned/info, in_progress/warning, completed/success; этапы зборов: active=«Голосування»/info, review=«На перевірці»/warning, completed=«Завершені»/success.
- Удалить локальные `getStatusTone`, `getStatusBadgeClasses`, `getStatusLabel`, рукописные span-баджи → везде `AdminStatusBadge`.
**Важно:** меняются **подписи и цвета**, не поведение. Кнопки действий пока не трогаем (это A5).
**Смоук:** один статус выглядит одинаково во всех разделах; в reports бадж без двойного padding.

## A3. Табы-фильтры: одна реализация

**📎 Файлы:** `AdminSegmentedTabs.tsx`, `HouseReportsWorkspace.tsx`, `HousePlanWorkspace.tsx`, `HouseDebtorsWorkspace.tsx`, `HouseSpecialistsWorkspace.tsx`
**Что сделать:** 4 рукописные копии pill-табов → `AdminSegmentedTabs`. В компонент добавить roving tabindex + стрелки ←/→. Счётчики сохранить везде, где были.
**Не делать:** не менять состав вкладок и логику фильтрации (в reports вкладки остаются «Поточний рік / Минулі роки / Чернетки / Архів» — переход на lifecycle-модель это шаг A13.2, отдельно).
**Смоук:** вкладки во всех разделах одинаковые; фильтрация не поехала; счётчики совпадают с прежними.

## A4. Тосты 2.0

**📎 Файлы:** `src/shared/ui/toast/ToastProvider.tsx`, `useAdminContentCommand.ts`, `errorMessages.ts`, все workspace-ы
**Что сделать:**
- Переписать `ToastProvider` по ТЗ v2 Ф1.4: снизу-справа, стек до 3, иконка тона, title + description, ×, опциональный `action: { label, onClick }`; success — 3.5с с паузой на hover; error — **без автозакрытия**; info — 5с. API `toast({ tone, title, description })` остаётся совместимым.
- В `useAdminContentCommand`: спец-обработка `result.code === "STALE_CONTENT"` → тост «Дані застаріли» + action «Оновити дані» → `router.refresh()`.
- Из всех workspace-ов удалить инлайн-блоки `{workspaceError ?? lastError}` (двойной показ). Локальные `useState`-ошибки, которые нужны для валидации полей, остаются.
**Не делать:** не менять сигнатуру `dispatch`, не трогать `refreshOnSuccess`.
**Смоук:** ошибка команды — один тост, висит до закрытия; успех — 3.5с; STALE_CONTENT (открыть запись в двух вкладках, сохранить в обеих) → тост с «Оновити дані», кнопка обновляет данные.

## A5. Кнопки и канонический футер (без изменения набора действий)

**📎 Файлы:** `adminStyles.ts`, `Button.tsx`, `IconButton.tsx`, все формы (`Edit*Form.tsx`, `Create*Form.tsx`), все workspace-ы, `docs/redesign/ACTIONS_INVENTORY.md`
**Что сделать:**
- Все кнопки — через `Button`/`adminButtonClasses`/`IconButton`. Убрать рукописные классы кнопок и гигантские размеры (в `EditAnnouncementSectionForm` сейчас `min-h-16 px-10 py-5 text-2xl` — привести к `size="md"`).
- Единые лейблы: «Зберегти», «Опублікувати» (вместо «Підтвердити»), «В архів» (вместо «Архівувати»), «Відновити», «Видалити».
- Единые тон и порядок: `Зберегти` (primary) → lifecycle-действие → спейсер → `Видалити` (danger, справа). Publish — success, archive/restore — secondary.
- Убрать `overflow-x-auto` с панелей кнопок.
- Все опасные действия — через существующий `PlatformConfirmModal`, тексты конфирмов сохранить.
**🔴 Ключевое ограничение:** **набор** кнопок по статусам = ровно как в `ACTIONS_INVENTORY.md`. Пример: у архивного объявления сейчас есть только «Зберегти» и «Видалити» — кнопку «Відновити» **не добавлять** (это B13). Меняются вид, размер, цвет, порядок, подпись — не состав.
**Смоук:** пройти по `ACTIONS_INVENTORY.md` и убедиться, что каждая строка на месте.

## A6. FileDropzone 2.0

**📎 Файлы:** `src/shared/ui/admin/FileDropzone.tsx`, `HouseReportsWorkspace.tsx`, `AnnouncementPdfUploadBlock.tsx` + `announcementPdfUpload.ts`, `HousePlanWorkspace.tsx`, `HouseDocumentsWorkspace.tsx`, `src/shared/utils/validators/pdfUpload.ts`
**Что сделать:** заменить нативные `<input type=file>` на `FileDropzone` во всех состояниях по макету (пусто/drag / загрузка / выбранный файл / текущий файл + Замінити/Видалити / помечен на замену-удаление с отменой / ошибка валидации). Раздельные фазы: «Завантаження файлу…» → «Збереження…».
**🔴 Не трогать:** саму загрузку (`createSupabaseBrowserClient().storage.from(bucket).upload(...)`), имена бакетов, схему пути файла, поля payload (`pdf: {bucket, path, originalName, mimeType, size}`, `removePdf`), валидаторы.
**Смоук:** загрузка/замена/удаление PDF в reports и announcements, множественная загрузка в plan; файл в storage там же, где раньше (проверить путь).

## A7. EmptyState

**📎 Файлы:** `EmptyState.tsx`, все workspace-ы
**Что сделать:** все пустые списки → `EmptyState` (иконка, заголовок, описание, CTA «Створити …» → открывает существующий create-флоу; CTA скрыт при `readOnlyMode` и на вкладке «Архів»). Удалить рукописные dashed-блоки.
**Смоук:** пустая вкладка в каждом разделе выглядит одинаково; CTA открывает то же, что кнопка в шапке.

## A8. Компактная sticky-шапка дома

**📎 Файлы:** `app/(admin)/admin/(protected)/houses/[id]/page.tsx`
**Что сделать:** по макету «A · Компактна sticky-шапка» и «Sticky-шапка у згорнутому стані», **но без свитчера домов (B1) и без строки состояния (B3)**: breadcrumb «Будинки / {имя дома}» (имя пока обычный текст), название + адрес + баджи (slug, район с `theme_color`, УК, «Архів») в компактной раскладке, справа icon-кнопки «Відкрити сайт будинку» (тот же `publicPreviewHref`) и «Назад до реєстру». Бадж «Розділ: X» удалить. Блок sticky, при скролле схлопывается в одну строку.
**Смоук:** шапка не прыгает при скролле, ссылка на публичную страницу ведёт на текущий раздел.

## A9. Табова навигация вместо `<select>`

**📎 Файлы:** `HouseBlockSelector.tsx` (удаляется), новый `HouseSectionTabs.tsx`, `page.tsx`
**Что сделать:**
- Новый компонент навигации: 10 разделов, порядок `Оголошення · Звіти · План робіт · Збори · Боржники · Спеціалісти · Інформація · Правління · Реквізити · Установчі документи`, активный подсвечен, переход через `router.push('?block=...')`.
- Overflow: ResizeObserver → невлезающие в «Ще ▾»; активный из «Ще» показывается подписью «Ще: Реквізити ▾».
- `HouseBlockSelector` удалить, экспорт `houseNavigationBlocks`/`getHouseBlockLabel` перенести в новый файл.
**Не делать:** пиннинг/настройку вкладок (B4), индикаторы-счётчики (B2).
**Смоук:** все 10 разделов открываются; на 1024px табы уходят в «Ще ▾»; глубокая ссылка `?block=meetings` работает.

## A10. Скелетон перехода

**📎 Файлы:** `HouseBlockNavigationFrame.tsx` (удаляется), `HouseSectionTabs.tsx`, `Skeleton.tsx`, `page.tsx`
**Что сделать:** `useTransition` вокруг `router.push` → при `isPending` контент-зона рендерит скелетон раздела (по макету «D · Скелетон переходу»), активный таб подсвечивается мгновенно. Мёртвую связку `HouseBlockNavigationFrame` + `PlatformSectionLoader` для навигации удалить. `PlatformSectionLoader` оставить в проекте (нужен в B11/B12).
**Смоук:** переход между разделами — сразу подсветка + скелетон, без «зависания».

## A11. Чистка UI-легаси

**📎 Файлы:** `page.tsx`, `app/(admin)/admin/(protected)/houses/[id]/announcements/page.tsx`, `EditHeroSectionForm.tsx`
**Что сделать:** убрать `"hero"` из `allowedBlocks` и из карты `publicPreviewHref`; `EditHeroSectionForm.tsx` не удалять физически — добавить шапку-комментарий `// LEGACY v1: не використовується, кандидат на видалення разом із карантином legacy`. Дублирующий роут `/houses/[id]/announcements` заменить на `redirect('/admin/houses/{id}?block=announcements')`.
**Смоук:** `?block=hero` → раздел по умолчанию, без пустого экрана; старая ссылка на `/announcements` редиректит.

## A12. Эталон: Оголошення (панель + row-card + dirty-guard)

**📎 Файлы:** `HouseAnnouncementsWorkspace.tsx`, `EditAnnouncementSectionForm.tsx`, `CreateAnnouncementInlineForm.tsx`, `AdminSidePanel.tsx`, `ContentWorkspaceActionButtons.tsx`
**Что сделать:**
- Create и Edit переезжают в `AdminSidePanel` (`max-w-2xl`): sticky-шапка (заголовок + `AdminStatusBadge` + «Оновлено {дата}» + блок copy/duplicate для published/archived + ×), скроллируемое тело, sticky-футер (A5). Инлайн-формы в потоке страницы удалить.
- Список → row-card по макету: строка баджей (статус + уровень), заголовок, превью 1 строка, мета-строка. Карточка — `<div>` (текст выделяется), клик по строке открывает панель. Нумерацию «Оголошення #N» убрать.
- Новый хук `src/shared/hooks/useDirtyGuard.ts`: snapshot формы ↔ текущее состояние; при закрытии панели (× / Esc / оверлей) и при смене вкладки/раздела/дома с dirty → `PlatformConfirmModal` «Є незбережені зміни» (`[Закрити без збереження]` danger / `[Повернутись]`); плюс `beforeunload`.
- После любого успеха панель закрывается + тост (как сейчас `onSuccess: () => onClose?.()`).
**Не делать:** quick actions на карточке (B8), поиск/сортировку (B6), грид (B7), «Показати ще» (B6), хоткеи (B9).
**🔴 Проверка:** dispatch-вызовы формы — 1-в-1: `announcements.update` с тем же payload (`id, lockVersion, title, body, level, isPinned, pdf, removePdf`), `announcements.create`, publish/archive/delete через тот же `runMutation`, `announcements.deleteAllArchived`, `announcements.duplicate`.
**Смоук:** полный цикл create → publish → archive → delete; клик по карточке в конце длинного списка открывает панель; несохранённые правки не теряются молча; параллельное редактирование → STALE_CONTENT-тост.

## A13. Тираж паттерна по разделам (по одному шагу на раздел)

Для каждого: сначала «Инвентарь» (п. 2), затем — тот же паттерн, что A12, плюс специфика из ТЗ v2 (раздел 6) и макета «Ключові екрани». **Набор действий и все dispatch-вызовы переносятся 1-в-1.**

- **A13.1 Установчі документи** (`HouseDocumentsWorkspace`, scope founding) — самый простой list+PDF. Панель 2xl. Сохранить RBAC-пропсы `canConfirm/canArchive/canDelete`.
- **A13.2 Звіти** (`HouseReportsWorkspace`) — панель 2xl; блок периода (тип → условные поля) и секция «Відображення» по макету; **вкладки переводятся на lifecycle** (Опубліковані / Чернетки / Архів), «Поточний рік / Минулі роки / Без періоду» и категория — чипы-фильтры внутри «Опубліковані». Фильтрация — клиентская, поверх тех же данных. Поиск и сортировка в этом разделе **уже есть** — сохранить. Кнопку «Синхронізувати категорії» сохранить (переоформить как secondary рядом с «Новий звіт»). Payload периода (`period` + legacy `periodType/month/year`) — 1-в-1.
- **A13.3 План робіт** (`HousePlanWorkspace`) — панель 2xl; мультизагрузка фото+PDF через FileDropzone (`plan.addFiles`/`removeFiles` как сейчас); workflow-статус под `canChangeWorkflowStatus`; вкладки active/draft/archive + чипы этапов; год архива — селект как сейчас.
- **A13.4 Збори** (`HouseMeetingsWorkspace`) — панель **4xl**, секции-аккордеоны «Основне / Порядок денний / Голоси» по макету. Статус: селект «Статус після збереження» заменяется кнопками/чипами того же смысла → payload `status` в `meetings.update` тот же; `meetings.publish` (`status: "scheduled"`), `meetings.archive`, `meetings.delete`, `meetings.recordManualVote` — 1-в-1. Пустое состояние «немає квартир» → EmptyState со ссылкой на «Квартири».
- **A13.5 Спеціалісти** (`HouseSpecialistsWorkspace`) — панель 2xl; карточки-визитки (грид оставить как есть до B7); блок заявок мешканців сохранить; панель шаблонов (`ContentTemplateSlotsPanel`) перерисовать в новых примитивах; динамический `commandType` (publish/archive/restore/delete) сохранить, **`specialists.confirm` не подключать** (не используется сейчас).
- **A13.6 Інформація** (`HouseInformationWorkspace` + `Edit/CreateInformationPostForm` + FAQ-формы) — двухуровневая модель по макету: underline-табы «Публікації / FAQ / Матеріали» + lifecycle-вкладки внутри; «Матеріали» = встроенный documents-workspace (scope information) в новом стиле; панель постов 4xl, FAQ — 2xl со списком питання/відповідь; команды `information_posts.*`, `faq.*`, `documents.*` — 1-в-1.
- **A13.7 Правління** (`EditBoardSectionForm`) — режим просмотра (карточка «Вступ» + read-only row-card'ы членов + «Редагувати розділ») → одна панель **4xl** с секциями «Вступ» + «Члени правління».
  **🔴 Сохранение диффом (в макете указана несуществующая команда — игнорировать):** один «Зберегти» выполняет последовательность существующих команд: `board_intro.save` → для новых членов `board_members.create` → для изменённых `board_members.update` → для удалённых `board_members.delete`. Каждый вызов — с payload как в текущем коде. При ошибке на любом шаге: остановиться, показать error-тост, вызвать `router.refresh()` (чтобы UI показал фактическое состояние), не продолжать. Порядок членов (`board_members.reorder`) в блоке A **не подключаем** — B13.
  Если такая последовательность на ревью покажется рискованной — fallback: панель на члена (create/update/delete по одному), как сейчас по смыслу. Решение принимает заказчик после «Инвентаря».
- **A13.8 Реквізити** (`HouseRequisitesWorkspace`) — без боковой панели: раздел = одна форма. Сохранить текущий паттерн view → «Редагувати» → isDirty → «Зберегти», IBAN-валидацию, `requisites.save` 1-в-1; перевести на `FormField`/`Input` и канонические кнопки.
- **A13.9 Боржники** (`HouseDebtorsWorkspace`) — **только косметика**: `AdminSegmentedTabs`, канонические кнопки, «Експорт», sticky-заголовок таблицы, единые тосты/конфирмы, поиск в общем стиле. **Не трогать:** структуру вкладок, превью-флоу (`openPreview` → `debtors.saveDraftItems` → `debtors.publishDraft`), импорт/экспорт, пороги, расчёты.

## A14. Приёмка блока A

**Что сделать:**
1. grep-дифф команд против `COMMANDS_BASELINE.txt` → **пусто**.
2. `ACTIONS_INVENTORY.md` пройден вручную построчно (каждое действие на месте, за ним та же команда).
3. Регрессионные чек-листы S/L/I/C из `02_LINKAGE_AND_REGRESSION.md` по 2–3 реальным домам.
4. Обе темы, 1024px, `lint && tsc && build`.
5. Демо заказчику. **Стоп-точка: блок B начинается только после «ок».**

---

# БЛОК B — НОВЫЕ ФИЧИ (после приёмки блока A)

Каждый шаг самостоятелен. В каждом явно указано, какие **новые** dispatch-вызовы допускаются (для grep-диффа).

## B1. Свитчер домов в шапке
**Новых команд:** нет (использует уже загружаемый `getAdminHouses`).
Имя дома в breadcrumb → комбобокс: поиск по имени/адресу/slug, секция «Нещодавні» (5, localStorage `osbb.recentHouses.v1`), цвет-маркер района из `theme_color`, выбор → переход на тот же `?block=`. Клавиатура: стрелки/Enter/Esc. Макет: «B · Свитчер домів».
**Смоук:** переход из «Звіти» дома X в «Звіти» дома Y одним действием.

## B2. Счётчики-индикаторы на табах разделов ⚙
**Новых команд:** нет. **Новый read-сервис** — единственное разрешённое исключение.
`src/modules/houses/services/getHouseSectionCounters.ts` — по образцу существующих `getAdmin*`: `noStore()`, только `select(..., { count: 'exact', head: true })` по `house_id` + `lifecycle_status='draft'` для announcements / information_posts / faq / documents (по scope) / specialists / reports / plan / meetings + debtors draft + непрочитанные заявки специалистов. Вызов — в `page.tsx`, результат → в табы (warning-счётчик черновиков; на «Спеціалісти» второй индикатор заявок info-тоном). Ноль не показывается.
**🔴 Проверка на ревью:** в файле нет `insert/update/delete/upsert/rpc`.
**Смоук:** создать черновик → счётчик на табе вырос; опубликовать → уменьшился.

## B3. Строка состояния дома
**Зависит от:** B2. **Новых команд:** нет.
`● 5 чернеток · ● 2 заявки · ● 1 задача` под названием; черновики → поповер «в яких розділах» с переходами; заявки → «Спеціалісти»; счётчик задач — только если доступен без новых зависимостей. При нуле строка скрыта. Скрывается при схлопывании шапки.

## B4. Настройка и пиннинг табов
**Новых команд:** нет. localStorage `osbb.houseTabs.v1`.
В «Ще ▾» → «Налаштувати вкладки…» → модал: drag-сортировка + пин «завжди на панелі» + «Скинути до стандартних».

## B5. Память вкладок и фильтров
**Новых команд:** нет. localStorage `osbb.ws.<section>.v1`: активная lifecycle-вкладка, чипы, сортировка, вид. Восстановление при возврате в раздел; «сбросить фильтры» очищает.

## B6. Поиск, сортировка, «Показати ще»
**Новых команд:** нет.
Единое поле поиска + селект сортировки (Новіші / Старіші / Назва А-Я) во всех списковых разделах, где их сейчас нет (announcements, plan, meetings, specialists, documents, information). Фильтрация/сортировка — по **полному** набору, клиентски. Рендер порциями по 20 + «Показати ще 20» + «Показано 20 з 137» (в reports/debtors поиск уже есть — унифицировать вид, не ломая).

## B7. Переключатель «рядки / сітка»
**Новых команд:** нет. Два icon-toggle в панели списка, дефолт — рядки (специалисты — сітка), выбор в localStorage (B5).

## B8. Быстрые действия на карточках
**Зависит от:** B13 (если хотим «Відновити» в архиве). **Новых вызовов:** те же команды, что уже вызывает раздел, но **из списка**, не из панели.
По макету: draft → `Опублікувати` · `Видалити`; published → `В архів` · `Створити на основі` (= существующий `*.duplicate` в текущий дом); archived → `Видалити` (+ `Відновити` только после B13). Все — через `PlatformConfirmModal`; `stopPropagation`, чтобы не открывалась панель. Действия скрыты по RBAC-флагам так же, как в панели.
**🔴 Ограничение:** в разделе, где команды `duplicate` нет (debtors, requisites, board) — кнопки нет.
**Смоук:** grep-дифф показывает только рост количества вызовов существующих типов.

## B9. Хоткеи
**Новых команд:** нет. `N` — создать; `/` — поиск; `Esc` — закрыть (есть); `Ctrl+Enter` — «Зберегти» в открытой панели. Игнорировать в инпутах (кроме Ctrl+Enter/Esc). Подсказки в tooltip.

## B10. Undo в тостах
**Новых вызовов:** обратные команды (`archive`↔`restore`, `publish`↔`archive`) — только те, что есть в реестре раздела.
Success-тост lifecycle-действия получает action «Скасувати» → диспатчит обратную команду с `lockVersion` **из результата** прошлой команды. Delete — без Undo. Окно = время жизни тоста.
**Смоук:** опубликовать → «Скасувати» → запись вернулась в прежний статус; повторный клик по исчезнувшему тосту невозможен.

## B11. Duplicate → «Опублікувати одразу»
**Новых вызовов:** существующие `*.duplicate` + `*.publish` (цикл).
Чекбокс в `CrossHouseDuplicatePanel`; последовательное выполнение с прогрессом «Опубліковано 34 з 100»; панель заблокирована во время выполнения; итог: успехи + список домов с ошибками + «Повторити для домів з помилками». Макет: «Ф5.2».
**🔴 Требование:** строго последовательно (не `Promise.all`) — чтобы не ловить лимиты и не терять ошибки. Ошибка одного дома не прерывает остальные, но фиксируется в отчёте.

## B12. Bulk-режим списка
**Новых вызовов:** цикл существующих команд раздела.
Режим «Вибрати» → чекбоксы + «вибрати всі на вкладці» → плавающая панель «Вибрано N» с действиями по вкладке (Чернетки → «Опублікувати всі» / «Видалити»; Опубліковані → «В архів»; Архів → «Відновити»(после B13) / «Видалити»). Один конфирм перед стартом, прогресс-оверлей (`PlatformSectionLoader`), итоговый тост «Опубліковано 12, помилок: 1».

## B13. Выравнивание набора действий (подключение существующих, но неиспользуемых команд)
**🔴 Требует поштучного подтверждения заказчика — это меняет то, что может пользователь.**
Команды существуют в handler-ах, но UI их никогда не вызывал (проверено grep-ом):

| Раздел | Команда | Что даёт | Подтверждено? |
|---|---|---|---|
| announcements | `restore` | архів → чернетка (сейчас архивное можно только удалить или пересохранить) | ☐ |
| documents | `restore` | архів → чернетка | ☐ |
| information_posts | `restore` | архів → чернетка | ☐ |
| information_posts | `deleteAllArchived` | «Видалити все» в архиве (есть в announcements/documents/reports) | ☐ |
| faq | `archive`, `restore`, `delete` | полный lifecycle FAQ (сейчас только create/replaceItems/publish) | ☐ |
| meetings | `restore` | архів → чернетка | ☐ |
| plan | `restore` | архів → чернетка | ☐ |
| board_members | `reorder` | порядок членов правления стрелками ▲▼ (сейчас изменить порядок нельзя вообще) | ☐ |
| specialists | `confirm` | отдельное «підтвердити» (назначение уточнить у заказчика — возможно, легаси) | ☐ |
| announcements/reports | `replacePdf`, `removePdf` | сейчас PDF меняется внутри `update` — трогать не нужно | ☒ не подключать |

Каждая подтверждённая позиция — отдельный подшаг с собственным смоуком (создать → архивировать → восстановить → убедиться, что запись в `house_content_history` появилась, публичная страница не сломалась).

## B14. Reports: авто-синхронизация категорий (опционально)
**Новых вызовов:** нет (тот же `reports.categoriesUpsert`, но внутри флоу сохранения). Убирает техническую кнопку из UI. Делать только если заказчик подтвердит изменение последовательности вызовов.

---

# Приложение 1. Реестр команд (источник истины, проверено по handler.ts)

Легенда: **жирным** — вызывается текущим UI; обычным — существует, но UI не вызывает (см. B13).

| Handler | Команды |
|---|---|
| announcements | **create, update, publish, archive, delete, deleteAllArchived, duplicate**, restore, replacePdf, removePdf |
| board_intro | **save** |
| board_members | **create, update, delete**, reorder |
| debtors | **saveSettings, saveDraftItems, publishDraft, deleteDraft** |
| documents | **create, update, publish, archive, delete, deleteAllArchived, duplicate**, restore, replacePdf |
| faq | **create, replaceItems, publish, duplicate, applyTemplate**, upsert, archive, restore, delete |
| hero | save *(легаси, UI отключён)* |
| home_widgets | **save** *(вне раздела «Управління домом»)* |
| information_posts | **create, update, publish, archive, delete, duplicate, applyTemplate**, restore, deleteAllArchived |
| meetings | **create, update, publish, archive, delete, recordManualVote**, restore, replaceQuestions |
| plan | **create, update, publish, archive, delete, addFiles, removeFiles, duplicate**, restore |
| reports | **create, update, publish, archive, restore, delete, deleteAllArchived, categoriesUpsert, duplicate**, replacePdf, removePdf |
| requisites | **save** |
| specialists | **create, update, publish, archive, restore, delete, duplicate, applyTemplate**, confirm, categoriesUpsert |
| templates | **upsert** |

**Несуществующие команды, которые легко придумать по ошибке:** `board_members.replaceItems`, `announcements.replaceItems`, `meetings.saveQuestions`, `debtors.publish`, `reports.publishAll`. Их нет. Проверять по этой таблице и по handler-ам.

# Приложение 2. Файловая карта

| Что | Путь |
|---|---|
| Страница дома | `app/(admin)/admin/(protected)/houses/[id]/page.tsx` |
| Навигация (A9/A10 заменяют) | `HouseBlockSelector.tsx`, `HouseBlockNavigationFrame.tsx` |
| Workspace-ы | `src/modules/houses/components/House*Workspace.tsx`, `EditBoardSectionForm.tsx`, `Edit/Create*Form.tsx` |
| Duplicate/шаблоны | `ContentWorkspaceActionButtons.tsx`, `CrossHouseDuplicatePanel.tsx`, `ContentTemplateSlotsPanel.tsx` |
| Хук команд | `src/modules/content-engine/v2/client/useAdminContentCommand.ts`, `errorMessages.ts` |
| Реестр команд (истина) | `src/modules/content-engine/v2/handlers/*/handler.ts` |
| Примитивы | `src/shared/ui/admin/*`, `src/shared/ui/toast/ToastProvider.tsx`, `src/shared/ui/icons/AdminInlineIcons.tsx` |
| Токены | `app/globals.css` (`.cms-theme-root`, `html[data-admin-theme="light"]`) |
| Конфирм/лоадер | `src/modules/cms/components/PlatformConfirmModal.tsx`, `PlatformSectionLoader.tsx` |

# Приложение 3. Чек-лист ревью каждого патча (для заказчика)

- [ ] В патче нет новых типов команд (сверить с приложением 1).
- [ ] Payload'ы не изменились (включая «странные» legacy-поля).
- [ ] Нет прямых обращений к supabase, кроме существующего upload файлов.
- [ ] Нет новых server actions, нет правок в `handlers/`, `pipeline`, `services/getAdmin*` (кроме B2).
- [ ] RBAC-флаги по-прежнему скрывают те же кнопки.
- [ ] Цвета — только токены.
- [ ] `lint && tsc && build` зелёные, grep-дифф команд соответствует блоку.
