"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

type WorkspaceRecord = Record<string, unknown>;

const WORKSPACE_MEMORY_CHANGE_EVENT = "osbb-workspace-memory-change";

function storageKey(section: string) {
  return `osbb.ws.${section}.v1`;
}

function readRawWorkspaceRecord(section: string) {
  try {
    return window.localStorage.getItem(storageKey(section)) ?? "";
  } catch {
    return "";
  }
}

function parseWorkspaceRecord(rawValue: string): WorkspaceRecord {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as WorkspaceRecord)
      : {};
  } catch {
    return {};
  }
}

function writeWorkspaceRecord(section: string, record: WorkspaceRecord) {
  try {
    const key = storageKey(section);

    if (Object.keys(record).length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(record));
    }

    window.dispatchEvent(
      new CustomEvent(WORKSPACE_MEMORY_CHANGE_EVENT, {
        detail: { section },
      }),
    );
  } catch {
    // localStorage may be unavailable in private or restricted contexts.
  }
}

function isCompatibleValue<T>(
  value: unknown,
  defaultValue: T,
  allowedValues?: readonly T[],
): value is T {
  if (allowedValues) {
    return allowedValues.some((allowed) => Object.is(allowed, value));
  }

  if (defaultValue === null) return value === null;
  if (Array.isArray(defaultValue)) return Array.isArray(value);

  return typeof value === typeof defaultValue;
}

export function useWorkspaceMemory<T>(
  section: string,
  field: string,
  defaultValue: T,
  allowedValues?: readonly T[],
): readonly [T, Dispatch<SetStateAction<T>>] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === storageKey(section)) {
          onStoreChange();
        }
      }

      function handleLocalChange(event: Event) {
        const detail = (event as CustomEvent<{ section?: string }>).detail;
        if (detail?.section === section) {
          onStoreChange();
        }
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        WORKSPACE_MEMORY_CHANGE_EVENT,
        handleLocalChange,
      );

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
          WORKSPACE_MEMORY_CHANGE_EVENT,
          handleLocalChange,
        );
      };
    },
    [section],
  );

  const getSnapshot = useCallback(
    () => readRawWorkspaceRecord(section),
    [section],
  );

  const rawRecord = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => "",
  );

  const record = useMemo(
    () => parseWorkspaceRecord(rawRecord),
    [rawRecord],
  );

  const storedValue = record[field];
  const value = isCompatibleValue(
    storedValue,
    defaultValue,
    allowedValues,
  )
    ? storedValue
    : defaultValue;

  const setRememberedValue = useCallback<Dispatch<SetStateAction<T>>>(
    (nextValue) => {
      const currentRecord = parseWorkspaceRecord(
        readRawWorkspaceRecord(section),
      );
      const currentStored = currentRecord[field];
      const currentValue = isCompatibleValue(
        currentStored,
        defaultValue,
        allowedValues,
      )
        ? currentStored
        : defaultValue;

      const resolved =
        typeof nextValue === "function"
          ? (nextValue as (current: T) => T)(currentValue)
          : nextValue;

      if (Object.is(resolved, defaultValue)) {
        delete currentRecord[field];
      } else {
        currentRecord[field] = resolved;
      }

      writeWorkspaceRecord(section, currentRecord);
    },
    [allowedValues, defaultValue, field, section],
  );

  return [value, setRememberedValue] as const;
}
