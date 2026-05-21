do $$
begin
  if to_regclass('public.houses') is not null then
    alter table public.houses
      add column if not exists tariff_amount numeric;
  end if;
end $$;
