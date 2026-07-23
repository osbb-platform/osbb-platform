import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607231410_create_contractors_directory.sql",
  "utf8",
);

describe("P05 contractors directory migration", () => {
  it("creates the global city-compatible contractor directory", () => {
    expect(migration).toContain("create table if not exists public.contractors");
    expect(migration).toContain("city_id uuid null");
    expect(migration).not.toMatch(/city_id\s+uuid[^,\n]*references/i);
    expect(migration).toContain("is_active boolean not null default true");
    expect(migration).toContain("created_by uuid null references public.profiles(id)");
  });

  it("normalizes duplicates without rewriting the approved display spelling", () => {
    expect(migration).toContain("create or replace function public.normalize_contractor_name");
    expect(migration).toContain("regexp_replace(value, '\\s+', ' ', 'g')");
    expect(migration).toContain("lower(");
    expect(migration).toContain("contractors_global_normalized_name_uq");
    expect(migration).toContain("where city_id is null");
  });

  it("enables RLS and gives plan editors create/update access", () => {
    expect(migration).toContain("alter table public.contractors enable row level security");
    expect(migration).toContain("contractors_authenticated_select");
    expect(migration).toContain("contractors_plan_editor_insert");
    expect(migration).toContain("contractors_plan_editor_update");
    expect(migration).toContain("'superadmin', 'admin', 'manager'");
  });

  it("does not define physical delete access", () => {
    expect(migration).not.toMatch(/create policy[\s\S]*for delete/i);
    expect(migration).toContain("No DELETE policy by design");
  });

  it("seeds exactly the 20 owner-approved names", () => {
    const approvedNames = [
      "ТОВ УЮТНИЙ ДОМ КК",
      "ФОП Резнік О.П.",
      'ТОВ "БК ЄМАЙБУТНЄ"',
      "ФОП Шпорт Г.О.",
      "ТОВ Сансет Ліфтсервіс Запоріжжя",
      "ФОП Строкач С.С",
      "ФОП Фісун О.Г.",
      "ТОВ Ремонтник-96",
      "ТОВ ЕСКО ЗАПОРІЖЖЯ",
      "ФОП Мамаєвський Д. В.",
      "ФОП Нагалюк А.Г.",
      "ФОП Свергун В.В.",
      "ФОП Назін В.В.",
      "ФОП Прігладь Я.В.",
      'ТОВ "Євродім Запоріжжя"',
      "ТОВ КОМІНСАЙТ",
      "ФОП Скочій В.М.",
      "ФОП Живоглядова С.В.",
      "ФОП Баллієт А.Ю.",
      "ФОП Хохлов О.І.",
    ];

    for (const name of approvedNames) {
      expect(migration).toContain(`'${name.replaceAll("'", "''")}'`);
    }

    const seedRows = migration.match(
      /\('(?:[^']|'')+', public\.normalize_contractor_name\('(?:[^']|'')+'\)\)/g,
    );
    expect(seedRows).toHaveLength(20);
  });

  it("keeps the migration additive and idempotent", () => {
    expect(migration).toContain("if not exists public.contractors");
    expect(migration).toContain("create unique index if not exists");
    expect(migration).toContain("on conflict (normalized_name) where city_id is null");
    expect(migration).not.toMatch(/\bdrop table\b/i);
  });
});
