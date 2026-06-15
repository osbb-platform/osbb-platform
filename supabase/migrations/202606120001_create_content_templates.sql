create extension if not exists pgcrypto;

create table if not exists public.content_templates (
  id uuid primary key default gen_random_uuid(),
  section_key text not null check (
    section_key in ('faq', 'specialists', 'information_posts')
  ),
  template_key text not null,
  title text not null,
  description text not null default '',
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_key, template_key)
);

alter table public.content_templates enable row level security;

drop policy if exists "content_templates_select_active_authenticated" on public.content_templates;

create policy "content_templates_select_active_authenticated"
on public.content_templates
for select
to authenticated
using (is_active = true);

insert into public.content_templates (
  section_key,
  template_key,
  title,
  description,
  payload,
  sort_order,
  is_active
)
values
(
  'faq',
  'base_osbb_faq',
  'Базовий FAQ ОСББ',
  'Стартовий набір питань і відповідей для інформаційного розділу будинку.',
  jsonb_build_object(
    'items',
    jsonb_build_array(
      jsonb_build_object(
        'question', 'Як передати показники лічильників?',
        'answer', 'Передайте показники у строки, визначені вашим ОСББ або керуючою компанією. Якщо у будинку використовується онлайн-кабінет, скористайтеся відповідним розділом платформи.'
      ),
      jsonb_build_object(
        'question', 'Де знайти реквізити для оплати?',
        'answer', 'Актуальні реквізити розміщені у розділі «Реквізити» на сторінці вашого будинку.'
      ),
      jsonb_build_object(
        'question', 'Куди звертатися з аварійних питань?',
        'answer', 'Контакти відповідальних спеціалістів і аварійних служб розміщені у розділі «Спеціалісти».'
      )
    )
  ),
  10,
  true
),
(
  'specialists',
  'base_house_contacts',
  'Базові контакти будинку',
  'Шаблон категорій і контактів для розділу спеціалістів.',
  jsonb_build_object(
    'categories',
    jsonb_build_array(
      jsonb_build_object('title', 'Правління'),
      jsonb_build_object('title', 'Бухгалтерія'),
      jsonb_build_object('title', 'Аварійні служби')
    ),
    'specialists',
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Голова правління',
        'category', 'Правління',
        'phones', jsonb_build_array(),
        'email', '',
        'description', 'Контактна особа з організаційних питань будинку.'
      ),
      jsonb_build_object(
        'title', 'Бухгалтерія',
        'category', 'Бухгалтерія',
        'phones', jsonb_build_array(),
        'email', '',
        'description', 'Контакти для питань оплат, нарахувань і довідок.'
      ),
      jsonb_build_object(
        'title', 'Аварійна служба',
        'category', 'Аварійні служби',
        'phones', jsonb_build_array(),
        'email', '',
        'description', 'Контакт для термінових технічних звернень.'
      )
    )
  ),
  20,
  true
),
(
  'information_posts',
  'base_information_posts',
  'Базові інформаційні матеріали',
  'Стартові чернетки інформаційних матеріалів для сторінки будинку.',
  jsonb_build_object(
    'posts',
    jsonb_build_array(
      jsonb_build_object(
        'headline', 'Як користуватися особистим кабінетом',
        'body', 'У цьому матеріалі можна описати, як мешканцям користуватися сторінкою будинку, де переглядати оголошення, документи, реквізити та іншу корисну інформацію.',
        'category', 'materials',
        'isPinned', true
      ),
      jsonb_build_object(
        'headline', 'Корисна інформація для мешканців',
        'body', 'Додайте сюди правила комунікації, графік прийому, контакти відповідальних осіб або іншу важливу інформацію для співвласників.',
        'category', 'posts',
        'isPinned', false
      )
    )
  ),
  30,
  true
)
on conflict (section_key, template_key)
do update set
  title = excluded.title,
  description = excluded.description,
  payload = excluded.payload,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
