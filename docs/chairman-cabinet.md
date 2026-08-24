# P08 — Міні-кабінет голови ОСББ

## Призначення

P08 додає мінімальний захищений кабінет голови ОСББ у межах уже існуючого кабінету будинку.

URL:

```text
/house/{slug}/chairman
```

У версії v1 голова має одну дію: створити оголошення, яке одразу публікується для мешканців.

Подальше редагування, архівація, видалення та інше керування оголошенням виконує менеджер у CMS.

## Продуктове рішення v1

Окремого акаунта, користувача, таблиці або коду доступу для голови немає.

Кабінет голови використовує ту саму валідну house-session, що й звичайний кабінет мешканця.

Це свідомо прийнятий продуктовий ризик v1:

> Спільний 6-значний код будинку підтверджує доступ до будинку, але сам по собі не доводить особу голови ОСББ.

Якщо в майбутньому буде потрібен окремий фактор ідентифікації голови, він має бути доданий у:

```text
src/modules/houses/chairman/guard.ts
```

Так chairman-actions не повинні змінювати свій authorization contract.

## Security boundary

Усі записи голови проходять через:

```text
assertChairmanContext()
```

Guard повторно використовує існуючий:

```text
withResidentSession()
```

Отже, chairman write успадковує чинні перевірки:

- same-origin;
- валідну house-session cookie;
- server-side визначення будинку за `slug`;
- rate limit;
- неможливість розширити house capability через клієнтський `houseId`.

Заборонено обходити цей guard або створювати паралельний chairman command bus.

## Rate limit

Для публікації головою діє окрема policy:

```text
scope: chairman_publish
window: 1 hour
maxAttempts: 5
```

Тобто не більше 5 спроб публікації на годину в межах чинного server rate-limit механізму.

## Публікація оголошення

Server action:

```text
src/modules/houses/chairman/createChairmanAnnouncement.ts
```

Дозволений клієнтський input:

- `slug`;
- `title`;
- `body`;
- `level`.

Системні поля не приймаються як capability:

- `houseId`;
- `lifecycle_status`;
- `status`;
- `published_at`;
- `created_by`;
- PDF/file payload.

Server-side інваріанти:

```text
house_id = chairman guard context
lifecycle_status = published
published_at = now
created_by = null
```

Оголошення голови завжди публікується одразу.

## PDF

PDF у chairman flow v1 не підтримується.

У формі немає file input або Announcement PDF component.

Додавати PDF до chairman flow без окремого продуктового рішення не можна.

## History / audit

Публікація записується як дія голови, а не адміністратора.

Очікувані audit values:

```text
actor_admin_id = null
actor_name = "Голова ОСББ"
actor_role = "chairman"
metadata.source = "chairman_cabinet"
metadata.slug = <house slug>
```

Це важливо: система не повинна приписувати chairman write менеджеру або адміністратору.

## Manager follow-up task

Після публікації створюється задача:

```text
Перевірити оголошення голови
```

Її призначення — дати менеджеру CMS видимий follow-up після самостійної публікації головою.

## UI

Маршрут:

```text
/house/{slug}/chairman
```

У v1 він доступний тільки за прямим URL.

Посилання «Кабінет голови» не додається до загальної public house navigation, тому що загальний house-session не доводить, що поточний користувач є головою.

Форма містить тільки:

- заголовок;
- рівень;
- текст;
- кнопку публікації.

Після успіху:

```text
Оголошення опубліковано; подальше керування — менеджер.
```

У chairman UI немає:

- edit;
- archive;
- delete;
- restore;
- PDF upload.

## Login / redirect-back

`loginToHouse` не змінювався.

Існуючий common house login після успішного входу як і раніше робить:

```text
redirect("/")
```

Для прямого chairman URL використовується вузький client-side return bridge:

1. `HousePasswordGate` зберігає chairman return path у `sessionStorage`;
2. після існуючого redirect на `/` компонент `ChairmanReturnRedirect` читає marker;
3. дозволяється тільки path формату `/house/{slug}/chairman`;
4. marker одразу видаляється;
5. виконується `router.replace(returnPath)`;
6. chairman route повторно проходить server-side house-session gate у спільному layout.

Цей bridge не є authorization mechanism і не замінює server-side session validation.

## Незмінені критичні контури

P08 не змінює:

```text
src/modules/houses/actions/loginToHouse.ts
src/modules/houses/actions/changeHousePassword.ts
```

Admin announcement flow також залишається окремим:

```text
src/modules/content-engine/v2/handlers/announcements/commands/create.ts
```

У CMS admin create як і раніше створює draft і використовує admin user identity.

## Міграції

Для P08 міграції БД не потрібні.

T1 підтвердив production coverage чинного `house_access`:

```text
HOUSES_TOTAL=55
HOUSE_ACCESS_ROWS=55
HOUSES_WITH_ACCESS=55
HOUSES_MISSING_ACCESS=0
HOUSE_ACCESS_NON_1_TO_1=0
```

## Автоматизоване acceptance coverage

P08 має окремі security / acceptance suites:

```text
tests/security/p08ChairmanGuard.test.ts
tests/security/p08ChairmanAnnouncementAction.test.ts
tests/security/p08ChairmanCabinetUi.test.ts
tests/security/p08ChairmanFinalAcceptance.test.ts
```

Покривається:

- chairman rate limit;
- guard delegation;
- no-session / guard rejection;
- server-owned house;
- lifecycle tamper;
- foreign `houseId` tamper;
- `status` tamper;
- PDF capability absence;
- honest history actor;
- manager task;
- direct URL only;
- resident/admin regressions.

## Manual release smoke

Після deploy перевірити на реальному тестовому будинку:

1. Відкрити `/house/{slug}/chairman` без house-session.
2. Побачити існуючий common house login.
3. Увести валідний 6-значний код.
4. Після успішного login повернутися до `/house/{slug}/chairman`.
5. Побачити тільки форму публікації оголошення.
6. Опублікувати тестове оголошення.
7. Переконатися, що воно одразу видно на `/house/{slug}/announcements`.
8. Перевірити `/admin/history`:
   - actor = `Голова ОСББ`;
   - actor_role = `chairman`;
   - actor_admin_id = null;
   - source = `chairman_cabinet`.
9. Перевірити `/admin/tasks`:
   - є задача `Перевірити оголошення голови`.
10. У CMS менеджером відредагувати та архівувати це оголошення.
11. Змінити код доступу будинку та переконатися, що стара house-session більше не дає chairman access.
12. Перевірити rate-limit chairman publish.
13. Переконатися, що у chairman UI немає PDF/edit/archive/delete.
14. Переконатися, що загальна public navigation не містить посилання на chairman cabinet.

## Release rule

Push, merge, deploy та будь-які production changes виконуються тільки після окремого явного дозволу.
