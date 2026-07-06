# OSBB Platform — локальная разработка

| Параметр | Значение |
|---|---|
| Задача | S0.T4 — инструкция локального запуска |
| Пакетный менеджер | npm |
| Проверенная версия Node.js | 20.20.1 |
| Проверенная версия npm | 10.8.2 |
| Основной lock-файл | package-lock.json |
| Локальный dev-сервер | Next.js |
| Основной порт | 3000 |

## 1. Назначение

Этот документ описывает воспроизводимый локальный запуск текущего checkout
OSBB Platform.

Он не является инструкцией по изменению production, применению миграций,
настройке Supabase Auth, RLS, Storage или Vercel.

## 2. Проверенный baseline окружения

На текущем baseline проект успешно проходит полный gate с:

- Node.js 20.20.1;
- npm 10.8.2;
- Next.js 16.2.2;
- TypeScript 5.9.3;
- package-lock.json формата lockfileVersion 3.

Node.js 20.20.1 является проверенной рабочей версией, но пока не закреплена
через package.json, .nvmrc или .node-version.

До отдельной задачи нельзя считать другой диапазон Node.js официально
поддерживаемым.

## 3. Пакетный менеджер

Единственный пакетный менеджер текущего baseline — npm.

Основания:

1. В Git отслеживается package-lock.json.
2. pnpm-lock.yaml, yarn.lock и Bun lock-файлы отсутствуют.
3. Скрипт verify использует npm run.
4. Выбор npm зафиксирован в docs/BASELINE.md.

Наличие установленного pnpm не делает его пакетным менеджером проекта.

Не следует запускать pnpm install, yarn install или bun install: это может
создать конкурирующий lock-файл и изменить dependency graph.

## 4. Установка зависимостей

Перейти в checkout проекта:

```bash
cd <path-to-osbb-platform>
```

Для воспроизводимой установки выполнить:

```bash
npm ci
```

npm ci:

- использует существующий package-lock.json;
- не предназначен для изменения списка зависимостей;
- завершается ошибкой при расхождении package.json и lock-файла;
- подходит для чистого checkout и CI.

npm install используется только в отдельной задаче, которая намеренно меняет
зависимости и package-lock.json.

## 5. Настройка переменных окружения

Создать локальный файл из безопасного шаблона:

```bash
cp .env.example .env.local
```

После этого заполнить .env.local значениями из согласованного защищённого
источника.

Нельзя:

- переносить реальные значения обратно в .env.example;
- коммитить .env.local;
- публиковать ключи, токены или пароли в логах и документации;
- помещать service-role secret в NEXT_PUBLIC-переменную;
- использовать legacy aliases для нового окружения без отдельного решения.

Любая NEXT_PUBLIC-переменная считается доступной browser bundle.

SUPABASE_SERVICE_ROLE_KEY является server-only secret, обходит RLS и должен
использоваться только в существующих явно разрешённых server-side местах.

## 6. Supabase environment

Текущий репозиторий использует внешний Supabase environment через переменные
из .env.local.

В репозитории отсутствуют:

- supabase/config.toml;
- воспроизводимая конфигурация local Supabase stack;
- tracked seed для локальной базы;
- Docker или Compose-конфигурация local Supabase.

Поэтому local Supabase stack не является частью подтверждённой процедуры
запуска S0.T4.

Обычный локальный запуск не включает:

- reset базы данных;
- применение миграций;
- изменение remote migration history;
- изменение Auth, RLS или Storage;
- подключение проекта через Supabase CLI.

Наличие действующих ключей в .env.local не является разрешением на изменение
данных или конфигурации соответствующего Supabase environment.

По данным Git checkout нельзя доказать, относятся выданные значения к
development, preview или production. Это подтверждается владельцем проекта
до любых мутаций.

## 7. Запуск dev-сервера

```bash
npm run dev
```

Основной ожидаемый адрес:

```text
http://localhost:3000
```

Если порт 3000 занят и Next.js выбрал другой порт, источником истины является
адрес, напечатанный dev-сервером в терминале.

## 8. Локальная host-маршрутизация

proxy.ts поддерживает следующие browser hosts:

| Зона | Локальный адрес |
|---|---|
| Корневой лендинг | http://localhost:3000 |
| Admin | http://admin.localhost:3000 |
| Дом | http://<house-slug>.localhost:3000 |

Основные browser URL не должны содержать внутренние префиксы /admin и
/house/<slug>.

Примеры:

```text
http://admin.localhost:3000/login
http://<house-slug>.localhost:3000/announcements
```

Внутренние App Router пути используются после rewrite:

```text
/admin/**
/house/<slug>/**
```

Для smoke используется известный существующий slug из согласованного
тестового environment. Реальный production slug в документе не закрепляется.

## 9. Минимальный read-only smoke

После запуска проверить без изменения данных:

1. http://localhost:3000 открывает корневую страницу.
2. http://admin.localhost:3000/login открывает admin login.
3. Известный http://<house-slug>.localhost:3000 разрешается через house route.
4. CSS, изображения и JavaScript загружаются.
5. Терминал dev-сервера не показывает немедленный runtime crash.
6. Browser console не показывает бесконечный redirect или refresh loop.

Smoke локального запуска не включает:

- создание или редактирование дома;
- отправку приглашения;
- публикацию контента;
- изменение пароля дома;
- импорт квартир;
- применение миграций;
- другие операции, изменяющие данные.

## 10. Проверка production build

Собрать production bundle:

```bash
npm run build
```

После успешной сборки при необходимости запустить локально:

```bash
npm run start
```

npm run start не заменяет npm run build и не выполняется до успешной сборки.

Основной project gate описан в docs/GATE.md.

## 11. Известные ограничения

На текущем baseline:

- package.json не содержит engines;
- package.json не содержит packageManager;
- .nvmrc и .node-version отсутствуют;
- Vercel CLI не установлен;
- локальная Vercel linkage не подтверждена;
- local Supabase stack не описан;
- test runner и npm test отсутствуют;
- CI отсутствует;
- точный внешний Supabase environment нельзя доказать только по Git checkout.

Эти ограничения фиксируются документально и не исправляются заодно внутри
S0.T4.
