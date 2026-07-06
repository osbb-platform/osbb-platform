# OSBB Platform — обязательный project gate

| Параметр | Значение |
|---|---|
| Задача | S0.T4 — определение gate |
| Пакетный менеджер | npm |
| Текущий полный gate | lint → typecheck → test → build |
| Канонический скрипт | npm run verify |
| Автоматические тесты | Vitest 4.1.9, Node environment |

## 1. Назначение

Gate — минимальный набор проверок, который обязан пройти каждый согласованный
патч перед коммитом и закрытием задачи.

Успешное открытие одной страницы не заменяет полный gate.

## 2. Канонический текущий gate

В package.json определён скрипт:

```bash
npm run verify
```

На текущем HEAD он эквивалентен:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Порядок является обязательным:

1. lint;
2. TypeScript typecheck;
3. Vitest test suite;
4. production build.

## 3. Gate чистого checkout

Для нового checkout или проверки воспроизводимости:

```bash
npm ci
npm run verify
```

npm ci не обязательно повторять после каждого изменения, если package.json и
package-lock.json не менялись и node_modules соответствует lock-файлу.

При изменении package.json или package-lock.json clean-install проверка
обязательна.

## 4. Полный порядок закрытия задачи

### 4.1. Preflight

До изменений проверить:

```bash
git branch --show-current
git rev-parse HEAD
git status --short --branch
```

Нужно подтвердить:

- ожидаемую ветку;
- ожидаемый исходный HEAD;
- отсутствие посторонних изменений.

### 4.2. Scope review

После патча проверить:

```bash
git status --short
git diff --stat
git diff
```

Изменяться должны только согласованные файлы.

Нельзя включать в commit:

- случайные форматирования;
- generated-файлы вне scope;
- секреты;
- локальные env-файлы;
- изменения lock-файла без задачи на зависимости;
- runtime-код в documentation-only задаче.

### 4.3. Проверка diff

Для tracked-файлов:

```bash
git diff --check
```

Для новых untracked-файлов дополнительно проверяются:

- отсутствие trailing whitespace;
- финальный перевод строки;
- кодировка UTF-8;
- отсутствие секретов и реальных env values.

После staging повторить:

```bash
git diff --cached --check
git diff --cached --stat
git diff --cached
```

### 4.4. Project gate

```bash
npm run verify
```

Задача не закрывается, если хотя бы один этап завершился ошибкой.

### 4.5. Targeted checks

| Тип изменения | Дополнительная проверка |
|---|---|
| Env/config | Нет реальных значений и server secrets в client bundle |
| Routing/proxy | Root, admin и house-host smoke |
| Auth/session | Positive и negative checks после появления test runner |
| API | Authorization, validation и error-response smoke |
| Database/RLS | Migration и role-matrix checks в изолированном environment |
| Storage | Access-boundary и cleanup checks |
| Документация | Команды соответствуют package.json и архитектуре |

Targeted check не заменяет npm run verify.

### 4.6. Финальный scope

Перед commit:

```bash
git status --short
git diff --cached --name-only
```

Staged scope должен точно совпадать с согласованным.

## 5. Тестовый этап

S1.T0 добавляет минимальный test-runner:

- Vitest 4.1.9;
- среда выполнения Node.js;
- тестовые файлы tests/**/*.test.ts;
- alias @/*, соответствующий корню проекта;
- helper для вызова функций в форме server action;
- helper для publishable/anon Supabase test client;
- smoke-тест без реального сетевого или database-запроса.

Команда:

```bash
npm run test
```

Она выполняет vitest run.

Полный gate после S1.T0:

```text
lint → typecheck → test → build
```

Текущий smoke подтверждает только работоспособность runner, alias и helpers. Он не заменяет security regression tests следующих задач S1.

## 6. Documentation-only задачи

Documentation-only изменение всё равно проходит полный project gate, если
план задачи требует lint, typecheck и build.

Это:

- подтверждает чистоту checkout;
- обнаруживает случайные изменения runtime-кода;
- сохраняет единый ритуал закрытия задач;
- исключает зависимость результата от субъективного smoke.

## 7. Запрещённые способы закрытия задачи

Задачу нельзя считать завершённой только потому, что:

- dev-сервер запустился;
- открылась одна страница;
- прошёл только lint;
- TypeScript не запускался;
- production build не запускался;
- ошибка не воспроизводится вручную;
- изменения не просмотрены через Git;
- staged scope содержит дополнительные файлы;
- gate запускался до последней правки, но не после неё.

## 8. Коммит

Одна задача должна иметь один отдельный commit.

До commit:

1. полный gate зелёный;
2. targeted checks зелёные;
3. staged diff просмотрен;
4. rollback определён;
5. push, deploy и migration не выполняются без отдельной команды.

После commit:

```bash
git status --short --branch
git log -1 --oneline
```

Рабочее дерево должно быть чистым.
