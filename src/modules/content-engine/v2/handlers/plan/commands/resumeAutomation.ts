import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePlanTask, PlanAutomationCommandPayload } from "../types";
import { getPlanTask, HOUSE_PLAN_TASK_ENTITY_TYPE, planHistoryMetadata, publicPlanPaths, readIdAndLock } from "./shared";
export const resumeAutomationCommand: CommandSpec = { actionKey:"edit", requiresLockCheck:true,
  async validate(rawPayload){ const p=readIdAndLock(rawPayload); return p.ok?ok(undefined):p; },
  async execute(rawPayload,ctx){ const payload=rawPayload as PlanAutomationCommandPayload; const beforeResult=await getPlanTask(ctx,payload.id); if(!beforeResult.ok)return beforeResult; const before=beforeResult.data;
    const {data,error}=await ctx.supabase.rpc("resume_house_plan_automation",{p_house_id:ctx.house.id,p_task_id:payload.id,p_lock_version:payload.lockVersion});
    if(error)return err(error.message.includes("STALE_OR_INVALID_STATE")?"Дані застаріли або автоматизацію неможливо відновити.":error.message,error.message.includes("STALE_OR_INVALID_STATE")?"STALE_CONTENT":"INTERNAL");
    const task=data as HousePlanTask; return ok({data:task,history:{entityType:HOUSE_PLAN_TASK_ENTITY_TYPE,entityId:task.id,action:"updated",description:`Відновлено автоматизацію завдання «${task.title}».`,beforeSnapshot:before,afterSnapshot:task,metadata:planHistoryMetadata({automationAction:"resumed"})},extraRevalidatePaths:publicPlanPaths(ctx.house.slug)});
  }};
