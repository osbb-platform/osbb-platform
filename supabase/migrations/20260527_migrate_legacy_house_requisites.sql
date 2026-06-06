insert into public.house_requisites (
  house_id,
  recipient,
  iban,
  edrpou,
  bank,
  purpose_template,
  payment_url,
  payment_button_label,
  lock_version,
  created_at,
  updated_at
)
select
  hp.house_id,
  coalesce(hs.content->>'recipient', '') as recipient,
  coalesce(hs.content->>'iban', '') as iban,
  coalesce(hs.content->>'edrpou', '') as edrpou,
  coalesce(hs.content->>'bank', '') as bank,
  coalesce(hs.content->>'purposeTemplate', '') as purpose_template,
  coalesce(hs.content->>'paymentUrl', '') as payment_url,
  coalesce(nullif(trim(hs.content->>'paymentButtonLabel'), ''), 'Перейти до оплати') as payment_button_label,
  1 as lock_version,
  coalesce(hs.created_at, now()) as created_at,
  coalesce(hs.updated_at, hs.created_at, now()) as updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind::text = 'requisites'
on conflict (house_id) do update
  set
    recipient = excluded.recipient,
    iban = excluded.iban,
    edrpou = excluded.edrpou,
    bank = excluded.bank,
    purpose_template = excluded.purpose_template,
    payment_url = excluded.payment_url,
    payment_button_label = excluded.payment_button_label,
    updated_at = excluded.updated_at;
