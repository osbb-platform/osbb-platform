"use client";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import {
  adminBodyClass,
  adminButtonDisabledClass,
  adminInputClass,
  adminModalSurfaceClass,
  adminOverlayClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSectionTitleClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";
import { useToast } from "@/src/shared/ui/toast/ToastProvider";

type IdleLockProviderProps = {
  children: ReactNode;
  userEmail: string | null;
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
    }
  | {
      type: "unlock";
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
      parsed.type !== "lock" &&
      parsed.type !== "unlock"
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

export function IdleLockProvider({
  children,
  userEmail,
}: IdleLockProviderProps) {
  const { toast } = useToast();
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

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

  const unlockSession = useCallback(
    (shouldBroadcast = true) => {
      isLockedRef.current = false;
      setIsLocked(false);
      setPassword("");
      setUnlockError(null);
      setIsUnlocking(false);
      scheduleTimers();

      if (shouldBroadcast) {
        publishEvent({
          type: "unlock",
          timestamp: Date.now(),
        });
      }
    },
    [publishEvent, scheduleTimers],
  );

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
        return;
      }

      if (event.type === "unlock") {
        unlockSession(false);
      }
    },
    [lockSession, registerActivity, toast, unlockSession],
  );

  async function handleUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userEmail || !password.trim()) {
      setUnlockError("Введіть пароль, щоб розблокувати адмінку.");
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (error) {
      setIsUnlocking(false);
      setUnlockError("Пароль не підійшов. Спробуйте ще раз.");
      return;
    }

    unlockSession(true);

    toast({
      tone: "success",
      title: "Сесію розблоковано",
      description: "Можна продовжувати роботу в адмінці.",
    });
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign(ROUTES.admin.login);
  }

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

      {isLocked ? (
        <div
          className={`fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6 ${adminOverlayClass}`}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-idle-lock-title"
            className={`w-full max-w-md ${adminModalSurfaceClass} p-6`}
          >
            <div>
              <h2 id="admin-idle-lock-title" className={adminSectionTitleClass}>
                Сесію заблоковано
              </h2>
              <p className={`mt-2 ${adminBodyClass}`}>
                Через неактивність ми тимчасово заблокували адмінку. Введіть
                пароль, щоб продовжити роботу.
              </p>
            </div>

            <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="idle-lock-password" className={`mb-2 block ${adminTextLabelClass}`}>
                  Пароль
                </label>
                <div className="relative">
                  <input
                    id="idle-lock-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`${adminInputClass} pr-12`}
                    autoComplete="current-password"
                    autoFocus
                    disabled={isUnlocking}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text)] shadow-sm transition hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={showPassword ? "Приховати пароль" : "Показати пароль"}
                    aria-pressed={showPassword}
                    disabled={isUnlocking}
                  >
                    {showPassword ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 8.5 4 10 8a13.2 13.2 0 0 1-2.05 3.42" />
                        <path d="M6.1 6.1C4.2 7.36 2.8 9.43 2 12c1.5 4 5 8 10 8a10.94 10.94 0 0 0 4.13-.8" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {unlockError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
                >
                  {unlockError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={adminSecondaryButtonClass}
                  disabled={isUnlocking}
                >
                  Вийти
                </button>

                <button
                  type="submit"
                  className={`${adminPrimaryButtonClass} ${adminButtonDisabledClass}`}
                  disabled={isUnlocking}
                  aria-disabled={isUnlocking}
                >
                  {isUnlocking ? "Перевіряємо..." : "Розблокувати"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
