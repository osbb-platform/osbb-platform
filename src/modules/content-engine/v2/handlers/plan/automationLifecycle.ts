import { addUtcCalendarDays } from "./automation";

export const PLAN_AUTOMATION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;

export type PlanAutomationStatus =
  (typeof PLAN_AUTOMATION_STATUSES)[number];

export type PlanAutomationSchedule = {
  automationAnchorAt: string | null;
  automationNextDueAt: string | null;
  automationPausedAt: string | null;
};

export type PlanAutomationTransition = {
  fromStatus: PlanAutomationStatus;
  toStatus: PlanAutomationStatus;
  dueAt: string | null;
  executedAt: string;
  kind: "automatic" | "manual";
};

export function resolveAutomationScheduleOnUpdate(input: {
  enabled: boolean;
  intervalDays: number | null;
  lifecycleStatus: string;
  previous: {
    enabled: boolean;
    intervalDays: number | null;
    anchorAt: string | null;
    nextDueAt: string | null;
    pausedAt: string | null;
  };
  now: string;
}): PlanAutomationSchedule {
  if (!input.enabled || input.lifecycleStatus !== "published") {
    return {
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    };
  }

  if (input.previous.pausedAt !== null) {
    return {
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: input.previous.pausedAt,
    };
  }

  const needsNewInterval =
    input.previous.enabled === false ||
    input.previous.intervalDays !== input.intervalDays ||
    input.previous.nextDueAt === null;

  if (needsNewInterval) {
    return resetPlanAutomationInterval({
      enabled: input.enabled,
      intervalDays: input.intervalDays,
      occurredAt: input.now,
    });
  }

  return {
    automationAnchorAt: input.previous.anchorAt,
    automationNextDueAt: input.previous.nextDueAt,
    automationPausedAt: null,
  };
}

export function isPlanAutomationStatus(
  value: unknown,
): value is PlanAutomationStatus {
  return (
    typeof value === "string" &&
    PLAN_AUTOMATION_STATUSES.includes(
      value as PlanAutomationStatus,
    )
  );
}

export function getNextAutomaticPlanStatus(
  status: PlanAutomationStatus,
): PlanAutomationStatus | null {
  switch (status) {
    case "planned":
      return "in_progress";
    case "in_progress":
      return "completed";
    case "completed":
      return "archived";
    case "archived":
      return null;
  }
}

export function resetPlanAutomationInterval(input: {
  enabled: boolean;
  intervalDays: number | null;
  occurredAt: string;
}): PlanAutomationSchedule {
  if (!input.enabled || input.intervalDays === null) {
    return {
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    };
  }

  return {
    automationAnchorAt: input.occurredAt,
    automationNextDueAt: addUtcCalendarDays(
      input.occurredAt,
      input.intervalDays,
    ),
    automationPausedAt: null,
  };
}

export function pausePlanAutomation(input: {
  enabled: boolean;
  pausedAt: string;
}): PlanAutomationSchedule {
  if (!input.enabled) {
    return {
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    };
  }

  return {
    automationAnchorAt: null,
    automationNextDueAt: null,
    automationPausedAt: input.pausedAt,
  };
}

export function resumePlanAutomation(input: {
  enabled: boolean;
  intervalDays: number | null;
  resumedAt: string;
}): PlanAutomationSchedule {
  return resetPlanAutomationInterval({
    enabled: input.enabled,
    intervalDays: input.intervalDays,
    occurredAt: input.resumedAt,
  });
}

export function createManualPlanTransition(input: {
  fromStatus: PlanAutomationStatus;
  toStatus: PlanAutomationStatus;
  executedAt: string;
}): PlanAutomationTransition | null {
  if (input.fromStatus === input.toStatus) {
    return null;
  }

  return {
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    dueAt: null,
    executedAt: input.executedAt,
    kind: "manual",
  };
}

export function createAutomaticPlanTransition(input: {
  fromStatus: PlanAutomationStatus;
  dueAt: string;
  executedAt: string;
}): PlanAutomationTransition | null {
  const toStatus = getNextAutomaticPlanStatus(input.fromStatus);

  if (toStatus === null) {
    return null;
  }

  return {
    fromStatus: input.fromStatus,
    toStatus,
    dueAt: input.dueAt,
    executedAt: input.executedAt,
    kind: "automatic",
  };
}

export function calculateAutomaticCatchUp(input: {
  currentStatus: PlanAutomationStatus;
  firstDueAt: string;
  executedAt: string;
  intervalDays: number;
}): PlanAutomationTransition[] {
  const transitions: PlanAutomationTransition[] = [];
  let currentStatus = input.currentStatus;
  let dueAt = input.firstDueAt;

  while (Date.parse(dueAt) <= Date.parse(input.executedAt)) {
    const transition = createAutomaticPlanTransition({
      fromStatus: currentStatus,
      dueAt,
      executedAt: input.executedAt,
    });

    if (transition === null) {
      break;
    }

    transitions.push(transition);
    currentStatus = transition.toStatus;
    dueAt = addUtcCalendarDays(dueAt, input.intervalDays);
  }

  return transitions;
}
