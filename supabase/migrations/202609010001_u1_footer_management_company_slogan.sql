-- U1-T2: update footer slogan only for the two approved
-- "Бухгалтер онлайн" management companies.
--
-- Forward-fix note:
-- update existing rows only; do not create missing companies
-- and do not modify any other management company.

update public.management_companies
set slogan = 'Сучасні технології в бухгалтерії — облік, якому можна довіряти.'
where trim(name) in (
  'ТОВ Бухгалтер онлайн',
  'ТОВ "Бухгалтер онлайн"',
  'ТОВ «Бухгалтер онлайн»',
  'ТОВ Бухгалтер онлайн-ЗП',
  'ТОВ "Бухгалтер онлайн-ЗП"',
  'ТОВ «Бухгалтер онлайн-ЗП»'
)
and slogan is distinct from
  'Сучасні технології в бухгалтерії — облік, якому можна довіряти.';
