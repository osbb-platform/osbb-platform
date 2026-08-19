import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const migration=readFileSync("supabase/migrations/202607231700_add_plan_automation_commands.sql","utf8");
const handler=readFileSync("src/modules/content-engine/v2/handlers/plan/handler.ts","utf8");
const pause=readFileSync("src/modules/content-engine/v2/handlers/plan/commands/pauseAutomation.ts","utf8");
const resume=readFileSync("src/modules/content-engine/v2/handlers/plan/commands/resumeAutomation.ts","utf8");
const transition=readFileSync("src/modules/content-engine/v2/handlers/plan/commands/transitionStatus.ts","utf8");
describe("P05 T5.2b-2 atomic automation commands",()=>{
 it("creates protected RPCs",()=>{ expect(migration).toContain("pause_house_plan_automation"); expect(migration).toContain("resume_house_plan_automation"); expect(migration).toContain("transition_house_plan_status_manual"); expect(migration.match(/security definer/g)).toHaveLength(3); expect(migration.match(/set search_path = public, pg_temp/g)).toHaveLength(3); });
 it("uses admin, house and lock boundaries",()=>{ expect(migration.match(/is_authenticated_admin/g)).toHaveLength(3); expect((migration.match(/house_id=p_house_id/g) ?? []).length).toBeGreaterThanOrEqual(3); expect((migration.match(/lock_version=p_lock_version/g) ?? []).length).toBeGreaterThanOrEqual(3); expect(migration.match(/lock_version=lock_version\+1/g)).toHaveLength(3); });
 it("pauses without disabling",()=>{ expect(migration).toContain("automation_paused_at=v_now"); expect(migration).toContain("automation_anchor_at=null"); expect(migration).toContain("automation_next_due_at=null"); expect(migration).not.toContain("automation_enabled=false"); });
 it("resumes with full interval",()=>{ expect(migration).toContain("automation_anchor_at=v_now"); expect(migration).toContain("v_now+make_interval(days=>automation_interval_days)"); });
 it("journals manual transition atomically",()=>{ expect(migration).toContain("insert into public.house_plan_status_transitions"); expect(migration).toContain("'manual'"); expect(migration).toContain("auth.uid()"); expect(transition).not.toContain("resetPlanAutomationInterval"); });
 it("rejects archived target",()=>{ expect(migration).toContain("p_to_status not in ('planned','in_progress','completed')"); });
 it("registers commands",()=>{ expect(handler).toContain("pauseAutomation: pauseAutomationCommand"); expect(handler).toContain("resumeAutomation: resumeAutomationCommand"); expect(handler).toContain("transitionStatus: transitionStatusCommand"); expect(pause).toContain("p_lock_version:payload.lockVersion"); expect(resume).toContain("p_lock_version:payload.lockVersion"); });
});
