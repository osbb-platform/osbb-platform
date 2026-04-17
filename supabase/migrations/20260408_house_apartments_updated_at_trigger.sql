create or replace function public.set_house_apartments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_house_apartments_updated_at_trigger on public.house_apartments;

create trigger set_house_apartments_updated_at_trigger
before update on public.house_apartments
for each row
execute function public.set_house_apartments_updated_at();
