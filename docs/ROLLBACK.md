# OSBB Platform — rollback и восстановление

| Параметр | Значение |
|---|---|
| Задача | S0.T4 — базовая rollback-процедура |
| Production hosting | Vercel |
| Database/Auth/Storage | Supabase |
| Основной Git rollback | новый git revert commit |
| Основной DB rollback | новая forward-fix migration |

## 1. Основные принципы

1. Сначала определить, что нужно откатить: локальный файл, Git commit,
   application deployment, database schema, данные или Storage side effect.
2. Rollback одного слоя не откатывает остальные слои автоматически.
3. Нельзя переписывать опубликованную Git-историю как стандартную процедуру.
4. Нельзя применять разрушительные database-команды без отдельного плана,
   backup readiness и разрешения владельца.
5. Любое production-действие выполняется только отдельной явной командой.
6. После восстановления причина инцидента исправляется обычным проверенным
   commit, а не остаётся только на уровне ручного rollback.

## 2. Незакоммиченные локальные изменения

Сначала проверить:

```bash
git status --short
git diff -- <tracked-file>
```

Для одного согласованного tracked-файла:

```bash
git restore -- <tracked-file>
```

Для нового untracked-файла текущей задачи:

```bash
rm -f <new-file>
```

Удалять новый файл можно только после подтверждения, что он создан текущей
задачей и не содержит нужной несохранённой работы.

Не использовать как стандартный rollback:

- git reset --hard;
- массовый git clean;
- reset всей ветки без просмотра status;
- удаление чужих незакоммиченных изменений.

## 3. Откат staging

Если файл был случайно staged, но рабочую копию нужно сохранить:

```bash
git restore --staged -- <file>
```

После этого:

```bash
git status --short
```

Команда снимает файл со staging и не удаляет рабочее содержимое.

## 4. Откат закоммиченного изменения

Для уже созданного commit используется новый revert commit:

```bash
git revert <commit>
```

После revert:

```bash
npm run verify
git status --short --branch
```

Преимущества git revert:

- история остаётся объяснимой;
- исходный commit не исчезает;
- rollback можно проверить и развернуть;
- не требуется force-push.

Force-push или удаление опубликованного commit из main не являются обычной
процедурой восстановления.

## 5. Application rollback в Vercel

### 5.1. Общая модель

Vercel Instant Rollback возвращает production traffic на ранее работавший
deployment без обязательной новой полной сборки.

Application rollback не откатывает автоматически:

- project environment variables;
- Supabase schema и данные;
- Storage objects;
- внешние API;
- внешние CMS;
- уже выполненные side effects.

Старый build может оказаться несовместимым с текущими environment variables
или текущей database schema.

### 5.2. Текущий baseline проекта

В локальном checkout не подтверждены:

- установленный Vercel CLI;
- linked Vercel project;
- .vercel/project.json;
- точный project ID;
- тариф и список доступных rollback deployments.

Поэтому каноническая аварийная процедура текущего baseline выполняется через
Vercel Dashboard, а не через локальную CLI-команду.

### 5.3. Dashboard-процедура

1. Подтвердить production-инцидент по логам и пользовательскому smoke.
2. Открыть правильную team и правильный Vercel project.
3. Открыть список Deployments.
4. Найти последний известный исправный production deployment.
5. Проверить commit SHA, время, environment и домены.
6. Запустить rollback на выбранный исправный deployment.
7. Перед подтверждением проверить список production-доменов.
8. Учесть, что environment variables останутся текущими.
9. Учесть текущее состояние Supabase, Storage и внешних API.
10. Подтвердить rollback.
11. Проверить root, admin и house smoke.
12. Проверить production errors после переключения.

После аварийного rollback нужно проверить состояние автоматического назначения
production-доменов новым deployments перед возвратом к обычному release flow.

### 5.4. После восстановления сервиса

1. Определить плохой commit или deployment.
2. Создать git revert или минимальный исправляющий commit.
3. Пройти полный project gate.
4. Проверить preview.
5. Выполнить новый production rollout отдельной командой.
6. Подтвердить нормальное назначение production-доменов.
7. Задокументировать инцидент и rollback.

## 6. Database migration rollback в Supabase

### 6.1. Основная политика

Для migration, уже применённой к production:

```text
production migrations roll forward
```

Нельзя:

- редактировать уже применённый migration-файл задним числом;
- удалять migration history;
- выполнять reset production database;
- считать автоматически созданный down SQL безопасным;
- применять новую migration без отдельного разрешения.

### 6.2. Forward-fix процедура

1. Определить применённую migration и её последствия.
2. Оценить, были ли после неё записаны новые production-данные.
3. Зафиксировать желаемое безопасное состояние схемы.
4. Создать новую forward-fix migration.
5. Проверить SQL на DROP, data loss, lock и долгие table rewrite.
6. Учесть RLS policies, grants, functions, triggers и Storage metadata.
7. Проверить migration в изолированном environment.
8. Выполнить application gate и targeted DB checks.
9. Подготовить smoke и incident rollback.
10. Получить отдельное разрешение на production.
11. Применить migration контролируемо.
12. Проверить схему, данные, Auth/RLS и приложение.

Если изменение необратимо без потери данных, это отдельная recovery-операция,
а не обычный rollback.

## 7. Backup и restore

Статус backup/PITR текущего Supabase project не подтверждён Git checkout.

До restore нужно определить:

- доступные backup points;
- доступность PITR;
- предполагаемый объём потери данных;
- ожидаемый downtime;
- состояние subscriptions и replication;
- ответственного за подтверждение операции.

Database restore может временно сделать project недоступным.

Database backup восстанавливает базу и Storage metadata, но не гарантирует
восстановление удалённых физических объектов Supabase Storage. Для Storage
нужен отдельный recovery plan.

Реальный restore drill относится к S7.T3 и не считается выполненным этим
документом.

## 8. Storage и внешние side effects

Git revert, Vercel rollback и database schema forward-fix не отменяют:

- уже отправленные email-приглашения;
- созданные signed URLs;
- удалённые или загруженные Storage-файлы;
- сгенерированные PDF;
- внешние webhook/API вызовы;
- аналитические события;
- уже выполненные пользовательские мутации.

Для таких эффектов нужен отдельный список компенсационных действий.

Перед удалением или восстановлением Storage-файла необходимо подтвердить:

- bucket;
- object path;
- house/entity ownership;
- наличие копии;
- влияние на связанные записи;
- доступность связанных данных.

## 9. Матрица выбора rollback

| Ситуация | Основное действие |
|---|---|
| Ошибка в одном незакоммиченном tracked-файле | git restore конкретного файла |
| Новый ошибочный файл текущей задачи | удалить конкретный файл |
| Ошибочно staged-файл | git restore --staged |
| Плохой локальный commit | git revert |
| Плохой application deployment | Vercel rollback + Git fix |
| Уже применённая ошибочная DB migration | новая forward-fix migration |
| Потеря production-данных | backup/PITR recovery по incident plan |
| Потеря Storage object | отдельное Storage recovery |
| Выполненный внешний side effect | компенсационное действие |

## 10. Rollback задачи S0.T4

До commit удалить только файлы, созданные S0.T4:

```bash
rm -f \
  docs/LOCAL_DEVELOPMENT.md \
  docs/GATE.md \
  docs/ROLLBACK.md
```

После commit:

```bash
git revert <S0.T4-commit>
```

S0.T4 не изменяет production, Supabase, Vercel, runtime-код или зависимости.

## 11. Неизвестные параметры

На текущем baseline требуют внешнего подтверждения:

- имя и ID Vercel project;
- Vercel plan и доступные rollback deployments;
- production backup points;
- статус Supabase PITR;
- подтверждённые RTO и RPO;
- владелец production rollback procedure;
- recovery-процедура физических Storage objects.

Неизвестный параметр нельзя заменять предположением.
