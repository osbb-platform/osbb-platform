begin;

create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'primary',
  organization_name text not null,
  legal_name text not null,
  primary_phone text not null,
  secondary_phone text null,
  email text not null,
  telegram_url text null,
  telegram_handle text null,
  whatsapp_url text null,
  office_address text null,
  working_hours text null,
  partner_name text null,
  partner_city text null,
  partner_experience text null,
  demo_house_name text not null,
  demo_house_address text not null,
  demo_house_code text not null,
  demo_house_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_settings_singleton_key_unique
    unique (singleton_key),

  constraint site_settings_singleton_key_check
    check (singleton_key = 'primary'),

  constraint site_settings_demo_house_code_check
    check (demo_house_code ~ '^[0-9]{6}$')
);

create table if not exists public.site_cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  name_locative text not null,
  status text not null default 'opening',
  houses_count_override integer null,
  map_x numeric(5,2) not null,
  map_y numeric(5,2) not null,
  sort_order integer not null default 100,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_cities_slug_unique
    unique (slug),

  constraint site_cities_slug_check
    check (slug ~ '^[a-z0-9-]+$'),

  constraint site_cities_status_check
    check (status in ('live', 'opening')),

  constraint site_cities_houses_count_override_check
    check (
      houses_count_override is null
      or houses_count_override >= 0
    ),

  constraint site_cities_map_x_check
    check (map_x >= 0 and map_x <= 100),

  constraint site_cities_map_y_check
    check (map_y >= 0 and map_y <= 100)
);

create table if not exists public.site_testimonials (
  id uuid primary key default gen_random_uuid(),
  public_key text not null,
  author_name text not null,
  author_role text not null,
  city text not null,
  quote text not null,
  sort_order integer not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_testimonials_public_key_unique
    unique (public_key),

  constraint site_testimonials_public_key_check
    check (public_key ~ '^[a-z0-9-]+$')
);

create table if not exists public.site_post_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  sort_order integer not null default 100,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_post_categories_slug_unique
    unique (slug),

  constraint site_post_categories_name_unique
    unique (name),

  constraint site_post_categories_slug_check
    check (slug ~ '^[a-z0-9-]+$')
);

create table if not exists public.site_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  category_id uuid null
    references public.site_post_categories(id)
    on delete set null,
  title text not null,
  excerpt text not null,
  body jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 100,
  published_at timestamptz null,
  seo_title text null,
  seo_description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_posts_slug_unique
    unique (slug),

  constraint site_posts_slug_check
    check (slug ~ '^[a-z0-9-]+$'),

  constraint site_posts_status_check
    check (status in ('draft', 'published', 'archived')),

  constraint site_posts_published_at_check
    check (
      status <> 'published'
      or published_at is not null
    )
);

create table if not exists public.site_releases (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  summary text not null,
  period_label text not null,
  status text not null default 'planned',
  status_label text not null,
  sort_order integer not null default 100,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_releases_slug_unique
    unique (slug),

  constraint site_releases_slug_check
    check (slug ~ '^[a-z0-9-]+$'),

  constraint site_releases_status_check
    check (status in ('released', 'planned'))
);

create index if not exists site_cities_visible_sort_idx
  on public.site_cities (is_visible, sort_order, name);

create index if not exists site_testimonials_published_sort_idx
  on public.site_testimonials (
    is_published,
    sort_order,
    created_at
  );

create index if not exists site_post_categories_visible_sort_idx
  on public.site_post_categories (
    is_visible,
    sort_order,
    name
  );

create index if not exists site_posts_publication_idx
  on public.site_posts (
    status,
    published_at desc,
    sort_order
  );

create index if not exists site_posts_category_idx
  on public.site_posts (
    category_id,
    status,
    published_at desc
  );

create index if not exists site_releases_visible_sort_idx
  on public.site_releases (
    is_visible,
    sort_order,
    created_at
  );

alter table public.site_settings enable row level security;
alter table public.site_cities enable row level security;
alter table public.site_testimonials enable row level security;
alter table public.site_post_categories enable row level security;
alter table public.site_posts enable row level security;
alter table public.site_releases enable row level security;

drop policy if exists "Public read site settings"
  on public.site_settings;

create policy "Public read site settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (singleton_key = 'primary');

drop policy if exists "Public read visible site cities"
  on public.site_cities;

create policy "Public read visible site cities"
  on public.site_cities
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Public read published testimonials"
  on public.site_testimonials;

create policy "Public read published testimonials"
  on public.site_testimonials
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Public read visible post categories"
  on public.site_post_categories;

create policy "Public read visible post categories"
  on public.site_post_categories
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Public read published site posts"
  on public.site_posts;

create policy "Public read published site posts"
  on public.site_posts
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

drop policy if exists "Public read visible site releases"
  on public.site_releases;

create policy "Public read visible site releases"
  on public.site_releases
  for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "Admins manage site settings"
  on public.site_settings;

create policy "Admins manage site settings"
  on public.site_settings
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Admins manage site cities"
  on public.site_cities;

create policy "Admins manage site cities"
  on public.site_cities
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Admins manage site testimonials"
  on public.site_testimonials;

create policy "Admins manage site testimonials"
  on public.site_testimonials
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Admins manage post categories"
  on public.site_post_categories;

create policy "Admins manage post categories"
  on public.site_post_categories
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Admins manage site posts"
  on public.site_posts;

create policy "Admins manage site posts"
  on public.site_posts
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

drop policy if exists "Admins manage site releases"
  on public.site_releases;

create policy "Admins manage site releases"
  on public.site_releases
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

insert into public.site_settings (
  singleton_key,
  organization_name,
  legal_name,
  primary_phone,
  secondary_phone,
  email,
  telegram_url,
  telegram_handle,
  whatsapp_url,
  office_address,
  working_hours,
  partner_name,
  partner_city,
  partner_experience,
  demo_house_name,
  demo_house_address,
  demo_house_code,
  demo_house_url
)
values (
  'primary',
  'OSBB Platform',
  'OSBB Platform',
  '+38 (067) 512-84-30',
  '+38 (061) 270-15-40',
  'hello@osbb-platform.com.ua',
  'https://t.me/osbb_platform',
  '@osbb_platform',
  'https://wa.me/380675128430',
  'Запоріжжя',
  'Пн–Пт, 9:00–18:00',
  'ТОВ «Бухгалтер онлайн»',
  'Запоріжжя',
  'понад 15 років',
  'ОСББ «Соборний 186»',
  'вул. Соборна, 186',
  '301545',
  'https://demo.osbb-platform.com.ua'
)
on conflict (singleton_key) do nothing;

insert into public.site_cities (
  slug,
  name,
  name_locative,
  status,
  houses_count_override,
  map_x,
  map_y,
  sort_order
)
values
  (
    'zaporizhzhia',
    'Запоріжжя',
    'у Запоріжжі',
    'live',
    null,
    75,
    58,
    10
  ),
  (
    'kyiv',
    'Київ',
    'у Києві',
    'opening',
    0,
    52,
    28,
    20
  ),
  (
    'odesa',
    'Одеса',
    'в Одесі',
    'opening',
    0,
    48,
    72,
    30
  )
on conflict (slug) do nothing;

insert into public.site_testimonials (
  public_key,
  author_name,
  author_role,
  city,
  quote,
  sort_order
)
values
  (
    'olena-tkachenko',
    'Олена Ткаченко',
    'голова ОСББ',
    'Запоріжжя',
    'Раніше телефон дзвонив і ввечері, і у вихідні. Тепер я кажу: подивіться в кабінеті — там усе є. За півроку дзвінків стало в кілька разів менше.',
    10
  ),
  (
    'serhii-romaniuk',
    'Сергій Романюк',
    'голова ОСББ',
    'Запоріжжя',
    'Найбільше цінують звіти. Люди перестали питати, куди йдуть гроші, бо бачать документи самі. На зборах стало значно спокійніше.',
    20
  ),
  (
    'iryna-didukh',
    'Ірина Дідух',
    'керує кількома будинками',
    'Запоріжжя',
    'У мене чотири будинки. Раніше кожен вимагав окремої уваги, тепер матеріали передаю одним пакетом і бачу результат у кабінетах.',
    30
  )
on conflict (public_key) do nothing;

insert into public.site_post_categories (
  slug,
  name,
  sort_order
)
values
  ('law-documents', 'Закон і документи', 10),
  ('chair-practice', 'Практика голови', 20),
  ('house-money', 'Гроші будинку', 30),
  ('platform-updates', 'Оновлення платформи', 40)
on conflict (slug) do nothing;

insert into public.site_posts (
  slug,
  category_id,
  title,
  excerpt,
  status,
  featured,
  sort_order,
  published_at
)
select
  source.slug,
  category.id,
  source.title,
  source.excerpt,
  'published',
  source.featured,
  source.sort_order,
  source.published_at
from (
  values
    (
      'kvorum-za-ploshcheyu-yak-ne-zirvaty-zbory',
      'law-documents',
      'Кворум за площею: як не зірвати збори',
      'Кворум рахується не за кількістю людей, а за площею. Розбираємо, як його порахувати заздалегідь і що робити, якщо частина співвласників не виходить на зв’язок.',
      true,
      10,
      '2026-08-01T00:00:00+03'::timestamptz
    ),
    (
      'yak-provesty-zbory-koly-spivvlasnyky-za-kordonom',
      'chair-practice',
      'Як провести збори, коли частина співвласників за кордоном',
      'Що врахувати при підготовці, як зібрати позиції і які документи знадобляться для протоколу.',
      false,
      20,
      '2026-07-28T00:00:00+03'::timestamptz
    ),
    (
      'shcho-robyty-z-borhamy-poryadok-diy',
      'house-money',
      'Що робити з боргами: порядок дій для правління',
      'Від першого нагадування до претензії: послідовність, яка не порушує прав співвласника.',
      false,
      30,
      '2026-07-21T00:00:00+03'::timestamptz
    ),
    (
      'yaki-dokumenty-osbb-mayut-buty-dostupni',
      'law-documents',
      'Які документи ОСББ мають бути доступні співвласникам',
      'Перелік документів, які правління зобов’язане надати на запит, і в які строки.',
      false,
      40,
      '2026-07-14T00:00:00+03'::timestamptz
    ),
    (
      'yak-peredaty-spravy-novomu-holovi',
      'chair-practice',
      'Як передати справи новому голові без втрати документів',
      'Опис, акт передачі та мінімальний набір, без якого новий голова не почне роботу.',
      false,
      50,
      '2026-07-07T00:00:00+03'::timestamptz
    ),
    (
      'protokol-zboriv-shcho-maye-buty',
      'law-documents',
      'Протокол зборів: що в ньому має бути обов’язково',
      'Структура протоколу, типові помилки і чому рішення інколи оскаржують.',
      false,
      60,
      '2026-06-30T00:00:00+03'::timestamptz
    ),
    (
      'koshtorys-na-rik',
      'house-money',
      'Кошторис на рік: із чого він складається',
      'Розбір статей кошторису і як пояснити його співвласникам простими словами.',
      false,
      70,
      '2026-06-23T00:00:00+03'::timestamptz
    ),
    (
      'plan-robit-na-sezon',
      'chair-practice',
      'План робіт на сезон: як не забути про дрібниці',
      'Що зазвичай випадає з плану і як вибудувати перелік робіт на рік.',
      false,
      80,
      '2026-06-16T00:00:00+03'::timestamptz
    ),
    (
      'statut-osbb-koly-i-yak-zminyuyut',
      'law-documents',
      'Статут ОСББ: коли і як його змінюють',
      'Підстави для змін, порядок ухвалення і реєстрації нової редакції.',
      false,
      90,
      '2026-06-09T00:00:00+03'::timestamptz
    ),
    (
      'online-voting-for-co-owner',
      'platform-updates',
      'Онлайн-голосування: як це працює для співвласника',
      'Чотири кроки в кабінеті, підтвердження особи і чому голос не змінюється.',
      false,
      100,
      '2026-06-02T00:00:00+03'::timestamptz
    )
) as source(
  slug,
  category_slug,
  title,
  excerpt,
  featured,
  sort_order,
  published_at
)
join public.site_post_categories category
  on category.slug = source.category_slug
on conflict (slug) do nothing;

insert into public.site_releases (
  slug,
  title,
  summary,
  period_label,
  status,
  status_label,
  sort_order
)
values
  (
    'online-voting-electronic-signature',
    'Онлайн-голосування з електронним підписом',
    'Співвласник відкриває активне голосування в кабінеті, обирає свою квартиру, вказує площу і підтверджує особу електронним підписом. Голос фіксується, результат видно одразу.',
    'Червень 2026',
    'released',
    'Випущено',
    10
  ),
  (
    'debtors-month-threshold',
    'Список боржників із порогом у місяцях',
    'Поріг боргу рахується не в гривнях, а в місяцях — однаково справедливо для однокімнатної і трикімнатної квартири. Мешканець може перевірити баланс своєї квартири через пошук.',
    'Травень 2026',
    'released',
    'Випущено',
    20
  ),
  (
    'accounting-program-integration',
    'Інтеграція з бухгалтерською програмою будинку',
    'Нарахування і баланси потрапляють у кабінет із бухгалтерської програми будинку. Дані в розділі «Нарахування та боржники» оновлюються без ручного перенесення.',
    'Березень 2026',
    'released',
    'Випущено',
    30
  ),
  (
    'work-plan-contractors',
    'План робіт із підрядниками',
    'Кожна робота має три статуси, дату початку, дедлайн і фактичне завершення, підрядника і відповідального. Фото «до / після» та документи прикріплюються до задачі.',
    'Лютий 2026',
    'released',
    'Випущено',
    40
  ),
  (
    'polls-section',
    'Розділ «Опитування»',
    'П’ять типів питань, відкритий або анонімний режим, одна відповідь від квартири. Результати можна показати одразу, після завершення або приховати.',
    'Грудень 2025',
    'released',
    'Випущено',
    50
  ),
  (
    'viber-telegram-bot',
    'Бот у Viber і Telegram',
    'Оновлення будинку приходять у месенджер — заходити в кабінет щоразу не обов’язково. Кожен сам обирає, про що отримувати сповіщення. Через бота можна буде подивитись стан свого рахунку і поставити запит. Підключення до бота — з кабінету свого будинку.',
    'Восени 2026',
    'planned',
    'Восени 2026',
    60
  ),
  (
    'mobile-home-screen-app',
    'Кабінет як застосунок на телефоні',
    'Іконка на екрані, без магазинів застосунків.',
    'Восени 2026',
    'planned',
    'Восени 2026',
    70
  )
on conflict (slug) do nothing;

commit;
