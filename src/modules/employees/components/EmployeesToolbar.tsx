"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type EmployeesToolbarProps = {
  selectedRole: string;
  selectedStatus: string;
  search: string;
};

export function EmployeesToolbar({
  selectedRole,
  selectedStatus,
  search,
}: EmployeesToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(search);
  const [roleValue, setRoleValue] = useState(selectedRole);
  const [statusValue, setStatusValue] = useState(selectedStatus);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => {
    setRoleValue(selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    setStatusValue(selectedStatus);
  }, [selectedStatus]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    const normalizedSearch = searchValue.trim();

    if (normalizedSearch) {
      params.set("search", normalizedSearch);
    }

    if (roleValue.trim()) {
      params.set("role", roleValue.trim());
    }

    if (statusValue.trim()) {
      params.set("status", statusValue.trim());
    }

    return params.toString();
  }, [roleValue, searchValue, statusValue]);

  const applyFilters = useCallback((nextQueryString: string) => {
    startTransition(() => {
      router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname);
    });
  }, [pathname, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      applyFilters(queryString);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [applyFilters, queryString]);

  function handleReset() {
    setSearchValue("");
    setRoleValue("");
    setStatusValue("");

    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <div className="sticky top-0 z-10 rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)]/95 p-4 backdrop-blur">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
            Пошук
          </label>
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Ім’я, email, посада"
            className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
            Роль
          </label>
          <select
            value={roleValue}
            onChange={(event) => setRoleValue(event.target.value)}
            className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
          >
            <option value="">Усі ролі</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
            Статус
          </label>
          <select
            value={statusValue}
            onChange={(event) => setStatusValue(event.target.value)}
            className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
          >
            <option value="">Усі статуси</option>
            <option value="invited">Запрошено</option>
            <option value="active">Активний</option>
            <option value="inactive">Неактивний</option>
            <option value="archived">Архівний</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] px-4 py-2 text-sm font-medium text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-secondary)] hover:text-[var(--cms-text-primary)] disabled:opacity-60"
        >
          Скинути
        </button>

        {isPending ? (
          <div className="text-xs text-[var(--cms-text-muted)]">Оновлюємо список...</div>
        ) : null}
      </div>
    </div>
  );
}
