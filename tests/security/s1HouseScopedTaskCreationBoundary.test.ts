import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const legacyDraft = read("src/modules/tasks/services/ensureDraftApprovalTask.ts");
const documentDraft = read("src/modules/tasks/services/ensureDocumentDraftApprovalTask.ts");
const residentRequest = read("src/modules/tasks/services/ensureResidentRequestTask.ts");
const specialistRequest = read("src/modules/tasks/services/ensureSpecialistRequestTask.ts");
const createManual = read("src/modules/tasks/actions/createPlatformTask.ts");
const chairman = read("src/modules/houses/chairman/createChairmanAnnouncement.ts");
const migration = read(
  "supabase/migrations/202608311250_create_house_scoped_platform_task_atomic.sql",
);

describe("S1-T6 house-scoped task creation boundary", () => {
  it("routes legacy house_section and house_document draft tasks through atomic RPC", () => {
    for (const source of [legacyDraft, documentDraft]) {
      expect(source).toContain('"create_house_scoped_platform_task"');
      expect(source).not.toMatch(/\.from\(["']platform_tasks["']\)[\s\S]*?\.insert\(/);
      expect(source).not.toMatch(/\.from\(["']platform_task_houses["']\)[\s\S]*?\.insert\(/);
      expect(source).not.toMatch(/\.from\(["']platform_task_links["']\)[\s\S]*?\.insert\(/);
      expect(source).not.toMatch(/\.from\(["']platform_task_events["']\)[\s\S]*?\.insert\(/);
    }
  });

  it("routes resident and specialist requests through server-only atomic service-role RPC", () => {
    for (const source of [residentRequest, specialistRequest]) {
      expect(source).toContain('import "server-only"');
      expect(source).toContain("createSupabaseAdminClient");
      expect(source).toContain('"create_house_scoped_platform_task"');
      expect(source).not.toMatch(/\.from\(["']platform_tasks["']\)[\s\S]*?\.insert\(/);
    }

    expect(residentRequest).toContain('p_link_type: "resident_request"');
    expect(specialistRequest).toContain('p_link_type: "specialist_request"');
    expect(specialistRequest).not.toContain('link_type: "request"');
  });

  it("uses the atomic RPC only for house-scoped manual tasks and preserves the no-house S2 boundary", () => {
    expect(createManual).toContain("if (houseId)");
    expect(createManual).toContain('"create_house_scoped_platform_task"');
    expect(createManual).toContain(
      "// No-house task semantics are intentionally deferred to S2-T5.",
    );
    expect(createManual).toMatch(
      /else\s*\{[\s\S]*?\.from\(["']platform_tasks["']\)[\s\S]*?\.insert\(/,
    );
    expect(createManual).not.toMatch(
      /if\s*\(houseId\)[\s\S]*?platform_task_houses[\s\S]*?\.insert/,
    );
  });

  it("routes chairman manager task through valid system task semantics", () => {
    expect(chairman).toContain("createSupabaseAdminClient");
    expect(chairman).toContain('"create_house_scoped_platform_task"');
    expect(chairman).toContain('p_task_type: "system"');
    expect(chairman).toContain('p_priority: "medium"');
    expect(chairman).toContain('p_link_type: "system_event"');
    expect(chairman).not.toContain('status: "open"');
    expect(chairman).not.toContain('priority: "normal"');
    expect(chairman).not.toMatch(/\.from\(["']platform_tasks["']\)[\s\S]*?\.insert\(/);
  });

  it("defines a narrow SECURITY DEFINER RPC without anon execute", () => {
    expect(migration).toContain(
      "create or replace function public.create_house_scoped_platform_task",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("public.admin_has_house_access(p_house_id)");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("from anon");
    expect(migration).not.toContain("using (true)");
  });

  it("validates supported entity/task/link combinations and creates the graph atomically", () => {
    expect(migration).toContain("'house_section','house_document'");
    expect(migration).toContain("p_link_type <> 'resident_request'");
    expect(migration).toContain("p_link_type <> 'specialist_request'");
    expect(migration).toContain("p_link_type <> 'system_event'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("insert into public.platform_tasks");
    expect(migration).toContain("insert into public.platform_task_houses");
    expect(migration).toContain("insert into public.platform_task_links");
    expect(migration).toContain("insert into public.platform_task_events");
  });
});
