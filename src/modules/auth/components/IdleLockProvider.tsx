"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/src/shared/ui/toast/ToastProvider";

type IdleLockProviderProps = {
  children: ReactNode;
};

type IdleSessionEvent =
  | {
      type: "activity";
      timestamp: number;
    }
  | {
      type: "warning";
      timestamp: number;
    }
  | {
      type: "lock";
      timestamp: number;
    };

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 5 * 1000;

const CHANNEL_NAME = "osbb-admin-session";
const STORAGE_EVENT_KEY = "osbb-admin-session-event";

function serializeSessionEvent(event: IdleSessionEvent) {
  return JSON.stringify(event);
}

function parseSessionEvent(value: string | null): IdleSessionEvent | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<IdleSessionEvent>;

    if (
      parsed.type !== "activity" &&
      parsed.type !== "warning" &&
      parsed.type !== "lock"
    ) {
      return null;
    }

    if (typeof parsed.timestamp !== "number") {
      return null;
    }

    return parsed as IdleSessionEvent;
  } catch {
    return null;
  }
}

export function IdleLockProvider({ children }: IdleLockProviderProps) {
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const lastBroadcastActivityRef = useRef(0);
  const hasWarnedRef = useRef(false);
  const isLockedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const publishEvent = useCallback((event: IdleSessionEvent) => {
    channelRef.current?.postMessage(event);

    try {
      window.localStorage.setItem(STORAGE_EVENT_KEY, serializeSessionEvent(event));
    } catch {
      // localStorage can be unavailable in private contexts.
    }
  }, []);

  const lockSession = useCallback(
    (shouldBroadcast = true) => {
      if (isLockedRef.current) {
        return;
      }

      isLockedRef.current = true;
      setIsLocked(true);
      clearTimers();

      if (shouldBroadcast) {
        publishEvent({
          type: "lock",
          timestamp: Date.now(),
        });
      }
    },
    [clearTimers, publishEvent],
  );

  const scheduleTimers = useCallback(() => {
    clearTimers();

    if (isLockedRef.current) {
      return;
    }

    hasWarnedRef.current = false;

    warningTimerRef.current = window.setTimeout(() => {
      if (isLockedRef.current || hasWarnedRef.current) {
        return;
      }

      hasWarnedRef.current = true;

      toast({
        tone: "info",
        title: "Сесію буде заблоковано через 1 хв",
        description: "Ми заблокуємо адмінку через неактивність.",
      });

      publishEvent({
        type: "warning",
        timestamp: Date.now(),
      });
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_BEFORE_MS);

    lockTimerRef.current = window.setTimeout(() => {
      lockSession(true);
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, lockSession, publishEvent, toast]);

  const registerActivity = useCallback(
    (shouldBroadcast = true) => {
      if (isLockedRef.current) {
        return;
      }

      const now = Date.now();
      scheduleTimers();

      if (
        shouldBroadcast &&
        now - lastBroadcastActivityRef.current >= ACTIVITY_THROTTLE_MS
      ) {
        lastBroadcastActivityRef.current = now;

        publishEvent({
          type: "activity",
          timestamp: now,
        });
      }
    },
    [publishEvent, scheduleTimers],
  );

  const handleSessionEvent = useCallback(
    (event: IdleSessionEvent) => {
      if (event.type === "activity") {
        registerActivity(false);
        return;
      }

      if (event.type === "warning") {
        if (!isLockedRef.current && !hasWarnedRef.current) {
          hasWarnedRef.current = true;

          toast({
            tone: "info",
            title: "Сесію буде заблоковано через 1 хв",
            description: "Активність в іншій вкладці не зафіксована.",
          });
        }

        return;
      }

      if (event.type === "lock") {
        lockSession(false);
      }
    },
    [lockSession, registerActivity, toast],
  );

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    if ("BroadcastChannel" in window) {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current.onmessage = (message) => {
        handleSessionEvent(message.data as IdleSessionEvent);
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_EVENT_KEY) {
        return;
      }

      const parsedEvent = parseSessionEvent(event.newValue);
      if (parsedEvent) {
        handleSessionEvent(parsedEvent);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);

      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [handleSessionEvent]);

  useEffect(() => {
    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
    ];

    const handleActivity = () => {
      registerActivity(true);
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    registerActivity(false);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });

      clearTimers();
    };
  }, [clearTimers, registerActivity]);

  return (
    <div data-admin-idle-locked={isLocked ? "true" : "false"}>
      {children}
    </div>
  );
}
