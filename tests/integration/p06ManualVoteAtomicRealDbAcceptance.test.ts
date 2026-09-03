import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function container() {
  const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  const name = names.split("\n").map((v) => v.trim()).find((v) => v.startsWith("supabase_db_"));
  if (!name) throw new Error("LOCAL_SUPABASE_DB_CONTAINER_REQUIRED");
  return name;
}

function sql(query: string) {
  return execFileSync("docker", ["exec", container(), "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", query], { encoding: "utf8" }).trim();
}

describe("P06 atomic manual ballot real DB acceptance", () => {
  it("atomic RPC exists and is service_role only", () => {
    expect(sql("select to_regprocedure('public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)');")).toBe("record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)");
    expect(sql("select has_function_privilege('anon','public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)','execute');")).toBe("f");
    expect(sql("select has_function_privilege('authenticated','public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)','execute');")).toBe("f");
    expect(sql("select has_function_privilege('service_role','public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)','execute');")).toBe("t");
  });

  it("locks meeting before answer writes and bumps lock once", () => {
    const def = sql("select pg_get_functiondef('public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)'::regprocedure);");
    expect(def.toLowerCase()).toContain("for update");
    expect(def).toContain("v_meeting.lock_version <> p_expected_lock_version");
    expect(def).toContain("record_house_meeting_manual_vote");
    expect(def).toContain("lock_version = v_next_lock");
  });
});
