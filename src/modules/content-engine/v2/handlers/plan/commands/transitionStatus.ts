import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import { isPlanAutomationStatus, resetPlanAutomationInterval } from "../automationLifecycle";
import type { HousePlanTask, TransitionPlanTaskStatusPayload } from "../types";
import { getPlanTask, HOUSE_PLAN_TASK_ENTITY_TYPE, planHistoryMetadata, publicPlanPaths, readIdAndLock } from "./shared";
export const transitionStatusCommand: CommandSpec = { actionKey:"edit", requiresLockCheck:true,
  async validate(rawPayload){ const p=readIdAndLock(rawPayload); if(!p.ok)return p; const payload=rawPayload as Partial<TransitionPlanTaskStatusPayload>; if(!isPlanAutomationStatus(payload.toStatus))return err("Оберіть коректний статус завдання.","VALIDATION_FAILED"); return ok(undefined); },
  async execute(rawPayload,ctx){ const payload=rawPayload as TransitionPlanTaskStatusPayload; const beforeResult=await getPlanTask(ctx,payload.id); if(!beforeResult.ok)return beforeResult; const before=beforeResult.data; if(before.task_status===payload.toStatus)return err("Статус завдання не змінився.","VALIDATION_FAILED");
    resetPlanAutomationInterval({enabled:before.automation_enabled,intervalDays:before.automation_interval_days,occurredAt:new Date().toISOString()});
    const {data,error}=await ctx.supabase.rpc("transition_house_plan_status_manual",{p_house_id:ctx.house.id,p_task_id:payload.id,p_lock_version:payload.lockVersion,p_to_status:payload.toStatus});
    if(error){ if(error.message.includes("STALE_OR_INVALID_STATE")||error.message.includes("NO_STATUS_CHANGE"))return err("Дані застаріли або статус уже було змінено.","STALE_CONTENT"); return err(error.message,"INTERNAL"); }
    const task=data as HousePlanTask; return ok({data:task,history:{entityType:HOUSE_PLAN_TASK_ENTITY_TYPE,entityId:task.id,action:"updated",description:`Змінено статус завдання «${task.title}»: ${before.task_status} → ${task.task_status}.`,beforeSnapshot:before,afterSnapshot:task,metadata:planHistoryMetadata({fromStatus:before.task_status,toStatus:task.task_status,automationIntervalReset:task.automation_enabled})},extraRevalidatePaths:publicPlanPaths(ctx.house.slug)});
  }};
