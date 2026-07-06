# OSBB Platform — Baseline

| Параметр | Значение |
|---|---|
| Task | S0.T1 — зафиксировать baseline и окружение |
| Baseline date | `2026-07-06` |
| Snapshot timezone | WITA (`UTC+08:00`) |
| Repository | `osbb-platform` |
| Local checkout | `/Users/zakharov/osbb-platform` |

## 1. Назначение документа

Этот документ фиксирует воспроизводимое исходное состояние OSBB Platform
перед выполнением блоков стабилизации S1–S8.

Документ отражает состояние локального checkout и подтверждённые
конфигурационные сведения на указанном commit. Он не является снимком
production-базы данных, production-переменных или фактических настроек
внешних сервисов.

В рамках S0.T1:

- бизнес-код не изменяется;
- схема базы данных и RLS не изменяются;
- миграции не создаются и не применяются;
- production-настройки Supabase и Vercel не изменяются;
- значения секретов, ключей, токенов и паролей не фиксируются.

## 2. Git baseline

| Параметр | Значение |
|---|---|
| Ветка | `main` |
| Полный HEAD | `6341e916fe2d37bbc40d637010d663220e1b372e` |
| Короткий HEAD | `6341e91` |
| Последний commit | `fix(admin): stabilize houses registry hooks` |
| Дата последнего commit | `2026-06-30T20:17:33+08:00` |
| Upstream | `origin/main` |
| Состояние ветки | `main...origin/main` |
| Рабочее дерево на момент snapshot | чистое |
| Git remote | `https://github.com/osbb-platform/osbb-platform.git` |

Baseline HEAD совпадает с commit, использованным при техническом аудите
от 2026-07-05.

## 3. Локальное окружение

Это фактические версии на машине, где был собран baseline snapshot.
Они пока не являются полностью enforce-нутым runtime-контрактом проекта.

| Инструмент | Версия / состояние |
|---|---|
| macOS | `14.8.4` |
| Darwin kernel | `23.6.0` |
| Архитектура | `x86_64` |
| Shell, использованный для snapshot | `/bin/bash` |
| Git | `2.39.3 (Apple Git-146)` |
| Node.js | `20.20.1` |
| npm | `10.8.2` |
| pnpm | `9.0.0` |
| Corepack | `0.34.6` |
| Python | `3.9.6` |
| Supabase CLI | `2.95.4` |
| Vercel CLI | не установлен |
| Локальный Next.js | `16.2.2` |
| Локальный TypeScript | `5.9.3` |

В репозитории отсутствуют:

- поле `engines` в `package.json`;
- поле `packageManager` в `package.json`;
- `.nvmrc`;
- `.node-version`;
- `volta.json`;
- `.npmrc`;
- `pnpm-workspace.yaml`.

Поэтому Node.js `20.20.1` фиксируется как фактическая рабочая версия
baseline, но пока не закреплённая конфигурацией репозитория.

## 4. Выбор пакетного менеджера

**Выбранный пакетный менеджер baseline: npm.**

Обоснование:

1. В рабочем дереве присутствует только `package-lock.json`.
2. `package-lock.json` отслеживается Git.
3. `pnpm-lock.yaml`, `yarn.lock`, `bun.lock` и `bun.lockb` отсутствуют.
4. Существующий script `verify` уже использует команды `npm run`.
5. Выбор npm не требует изменения текущего dependency graph.

Команда воспроизводимой установки:

```bash
npm ci
```

Зафиксированные параметры lock-файла:

| Параметр | Значение |
|---|---|
| Файл | `package-lock.json` |
| Git status | tracked |
| Lockfile format | `lockfileVersion: 3` |
| Размер | `295269` bytes |
| SHA-256 | `eefcdbe8c84c7dec37508a09117717d77cb1bd9124d653d7087aa383dbd452be` |

pnpm `9.0.0` установлен на локальной машине, но не является выбранным
менеджером текущего baseline.

### Расхождение с audit-контекстом

Audit-контекст указывал pnpm 9 как фактически использовавшийся менеджер,
одновременно отмечая наличие npm lock-файла.

На HEAD `6341e91` конкурирующих lock-файлов нет: присутствует только
`package-lock.json`.

Поэтому S0.T1 фиксирует npm как источник истины. В S0.T5 необходимо
повторно проверить отсутствие альтернативных lock-файлов. Удаление
lock-файла не требуется, если состояние репозитория не изменится.

## 5. Application stack

| Компонент | Baseline |
|---|---|
| Next.js | `16.2.2` |
| React | `19.2.4` |
| React DOM | `19.2.4` |
| TypeScript | package range `^5`, локально `5.9.3` |
| Supabase JS | `^2.101.1` |
| Supabase SSR | `^0.10.0` |
| Tailwind CSS | `^4` |
| Puppeteer | `^24.41.0` |
| Spreadsheet parser | `xlsx ^0.18.5` |
| Hosting | Vercel |
| Database/Auth/Storage | Supabase |

Детальная архитектурная и маршрутная карта не входит в scope S0.T1.
Она создаётся отдельно в S0.T2.

## 6. Внешние сервисы

### 6.1. Supabase

| Параметр | Значение |
|---|---|
| Project ref | `nfmwpvshksxioxrmtdrr` |
| Project host | `nfmwpvshksxioxrmtdrr.supabase.co` |
| Использование | Postgres, Auth, RLS, Storage |
| Локальный `supabase/config.toml` | отсутствует |

Project ref и host являются публичными идентификаторами. Значения
publishable, anon, service-role и других ключей в baseline не включены.

### 6.2. Vercel

Vercel подтверждён как production hosting проекта.

В локальном checkout отсутствуют:

- `.vercel/project.json`;
- `vercel.json`;
- установленный Vercel CLI;
- непустое локальное значение `VERCEL_URL`.

Поэтому точное имя Vercel project и его локальная linkage-конфигурация
имеют статус:

**UNKNOWN — не подтверждено локальным snapshot.**

Это не должно восстанавливаться по памяти или предположению.

### 6.3. GitHub

Репозиторий:

```text
osbb-platform/osbb-platform
```

Remote:

```text
https://github.com/osbb-platform/osbb-platform.git
```

## 7. Домены и поддоменная топология

Источник конфигурации:

```text
src/shared/config/app/domains.ts
proxy.ts
```

| Назначение | Домен |
|---|---|
| Корневой production-домен | `osbb-platform.com.ua` |
| WWW | `www.osbb-platform.com.ua` |
| Admin CMS | `admin.osbb-platform.com.ua` |
| Кабинет/страница дома | `{slug}.osbb-platform.com.ua` |

`ROOT_DOMAIN` читается из:

```text
NEXT_PUBLIC_ROOT_DOMAIN
```

и имеет fallback:

```text
osbb-platform.com.ua
```

Отдельно используется:

```text
NEXT_PUBLIC_ADMIN_DOMAIN=admin.osbb-platform.com.ua
```

Зарезервированные поддомены:

- `www`;
- `admin`;
- `api`.

Подтверждённый legacy redirect:

```text
osbb-chapivna-163 -> osbb-charivna-163
```

Полная route map создаётся в S0.T2.

## 8. Supabase Storage inventory

Ниже перечислены bucket ID, подтверждённые миграциями или живым кодом.

Статус public/private отражает только доказательство из локальных
миграций. Фактические production-настройки Storage отдельно не
проверялись.

| Bucket | Использование | Видимость по локальным доказательствам |
|---|---|---|
| `house-announcements` | сгенерированные PDF объявлений | UNKNOWN |
| `house-cover-images` | обложки домов | public |
| `house-documents` | документы домов | UNKNOWN |
| `house-information-images` | изображения информационных публикаций | public |
| `house-plan-documents` | PDF и документы плана | private |
| `house-plan-media` | изображения и медиа плана | private |
| `house-reports` | PDF отчётов | UNKNOWN |

Подтверждённые migration-факты:

- `house-plan-media` создаётся с `public = false`;
- `house-plan-documents` создаётся с `public = false`;
- `house-cover-images` создаётся/обновляется с `public = true`;
- `house-information-images` создаётся/обновляется с `public = true`;
- для `house-documents`, `house-reports` и `house-plan-documents`
  миграция задаёт лимит PDF `15 MB` и MIME `application/pdf`.

Для bucket со статусом `UNKNOWN` запрещено утверждать public/private
без отдельной проверки production Storage settings или полной цепочки
миграций.

## 9. Существующие команды проекта

Команды из `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run typecheck
npm run verify
```

Текущий `verify`:

```bash
npm run lint && npm run typecheck && npm run build
```

На baseline отсутствуют:

- script `test`;
- test runner;
- тестовые файлы;
- GitHub Actions CI.

Минимальный полный gate блока S0:

```bash
npm run lint
npm run typecheck
npm run build
```

Test gate появится в следующих блоках плана.

## 10. Репозиторная гигиена на baseline

На HEAD `6341e91` Git не отслеживает:

- `.DS_Store`;
- `*.tsbuildinfo`.

В `.gitignore` уже присутствуют правила:

```gitignore
.DS_Store
*.tsbuildinfo
```

Поэтому часть finding P3-20 о наличии этих файлов в репозитории
не подтверждается текущим HEAD и должна быть повторно проверена в S0.T5.

В S0.T1 `.gitignore` не изменяется.

## 11. Известные ограничения baseline

1. Точное имя и ID Vercel project не подтверждены локально.
2. Фактическая production-видимость части Storage buckets не проверена.
3. `supabase/config.toml` отсутствует.
4. `.vercel/project.json` отсутствует.
5. Версии Node/npm не закреплены через `engines`, `.nvmrc` или
   `packageManager`.
6. Автоматические тесты отсутствуют.
7. CI отсутствует.
8. Snapshot не подтверждает drift между production-схемой и миграциями.
9. Snapshot не подтверждает фактические production env values, кроме
   явно разрешённых публичных идентификаторов.
10. Snapshot не является разрешением выполнять production-действия.

Неизвестные параметры должны оставаться `UNKNOWN`, пока не будут
подтверждены отдельным безопасным слепком.

## 12. Evidence

Baseline составлен по следующим read-only источникам:

- `OSBB_STABILIZATION_PLAN.md`, версия 1.0 от 2026-07-05;
- `01_CORE_CONTEXT.md`, составленный по commit `6341e91`;
- `OSBB_S0_T1_SNAPSHOT_20260706-092659.txt`;
- `OSBB_S0_T1_EXTERNALS_20260706-092929.txt`;
- tracked-файлы `package.json`, `package-lock.json`;
- `proxy.ts`;
- `src/shared/config/app/domains.ts`;
- локальные Supabase migrations и статические Storage references.

При сборе evidence:

- `.env` целиком не копировались;
- значения ключей не выводились;
- service-role key не выводился;
- auth-токены и пароли не выводились;
- production API не вызывались;
- production schema не изменялась.

## 13. Acceptance S0.T1

S0.T1 считается выполненной, когда:

- baseline commit и состояние Git зафиксированы;
- фактические версии окружения зафиксированы;
- выбран один package manager;
- расхождение audit-контекста и lock-файлов описано;
- внешние сервисы и домены перечислены;
- Storage inventory перечислен без недоказанных утверждений;
- документ не содержит секретов;
- изменён только `docs/BASELINE.md`;
- gate `lint + typecheck + build` проходит.

## 14. Rollback

Изменение добавляет только этот документ.

До коммита rollback:

```bash
rm docs/BASELINE.md
```

После коммита rollback выполняется отдельным revert commit:

```bash
git revert <S0.T1-commit>
```

Миграции, production-переменные, Supabase, Vercel и бизнес-код
при rollback не затрагиваются.
