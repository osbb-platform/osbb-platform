"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  updateCurrentAdminProfile,
  type UpdateCurrentAdminProfileState,
} from "@/src/modules/auth/actions/updateCurrentAdminProfile";
import { logoutAdmin } from "@/src/modules/auth/actions/logoutAdmin";
import { AdminThemeSwitch } from "@/src/modules/cms/components/AdminThemeSwitch";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import {
  adminPrimaryButtonClass,
  adminDangerButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
import {
  getRoleLabel,
  ROLES,
} from "@/src/shared/constants/roles/roles.constants";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";
const initialState: UpdateCurrentAdminProfileState = {
  error: null,
  success: null,
};

type AdminProfileEditorProps = {
  currentFullName: string;
  currentEmail: string;
  currentRole: string | null;
  currentStatus: string | null;
  currentJobTitle: string;
  houses: Array<{
    id: string;
    name: string;
    slug: string;
    currentAccessCode: string | null;
    districtId: string | null;
    districtName: string;
  }>;
};

function getStatusLabel(status: string | null) {
  if (status === "invited") return "Запрошення надіслано";
  if (status === "active") return "Активний";
  if (status === "inactive") return "Неактивний";
  if (status === "archived") return "Архівний";
  return "Без статусу";
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function AdminProfileEditor({
  currentFullName,
  currentEmail,
  currentRole,
  currentStatus,
  currentJobTitle,
  houses,
}: AdminProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState<string | null>(null);
  const [copiedHouseId, setCopiedHouseId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateCurrentAdminProfile,
    initialState,
  );

  const formRef = useRef<HTMLFormElement | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  async function handleSubmit(formData: FormData) {
    await formAction(formData);

    if (state.success) {
      setFlashSuccess(state.success);
      setIsEditing(false);

      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }

      flashTimeoutRef.current = window.setTimeout(() => {
        setFlashSuccess(null);
      }, 3000);
    }
  }

  function handleCancel() {
    formRef.current?.reset();
    setIsEditing(false);
  }

  async function handleCopy(houseId: string, value: string | null) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedHouseId(houseId);

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedHouseId(null);
      }, 1800);
    } catch {}
  }

  const editableInputClass = isEditing
    ? "w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-lg font-medium text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
    : "w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-lg font-medium text-[var(--cms-text-primary)] outline-none transition";

  const readonlyInputClass =
    "w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-lg font-medium text-[var(--cms-text-secondary)] outline-none transition";

  const access = getResolvedAccess(currentRole as typeof ROLES[keyof typeof ROLES] | null);
  const allowedSections = [
    access.topLevel.dashboard && "Панель керування",
    access.topLevel.districts && "Райони",
    access.topLevel.houses && "Будинки",
    access.topLevel.apartments && "Квартири",
    access.topLevel.history && "Історія",
    access.topLevel.employees && "Співробітники",
    access.topLevel.companyPages && "Сайт компанії",
    access.topLevel.profile && "Профіль",
  ].filter(Boolean) as string[];
  const canSeeHouseAccessCodes =
    access.security.viewHouseAccessCodes;

  const districtOptions = useMemo(
    () =>
      Array.from(
        new Map(
          houses.map((house) => [
            house.districtId ?? "unassigned",
            {
              id: house.districtId ?? "unassigned",
              name: house.districtName,
            },
          ]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name, "uk")),
    [houses],
  );

  const visibleHouses = useMemo(() => {
    if (!selectedDistrictId) {
      return houses;
    }

    return houses.filter(
      (house) =>
        (house.districtId ?? "unassigned") === selectedDistrictId,
    );
  }, [houses, selectedDistrictId]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
              Мій профіль
            </h1>

            <p className="mt-3 text-base leading-7 text-[var(--cms-text-secondary)]">
              Тут зібрані ваші дані для роботи в CMS, рівень доступу та
              доступні робочі розділи.
            </p>

            <p className="mt-3 text-sm text-[var(--cms-text-muted)]">
              Робочий акаунт співробітника керуючої компанії
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
                Рівень: {getRoleLabel(currentRole)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`${adminPrimaryButtonClass} min-w-[220px]`}
              >
                Редагувати
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className={`${adminDangerButtonClass} min-w-[220px]`}
            >
              Вийти
            </button>
          </div>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
            <label className="mb-3 block text-sm text-[var(--cms-text-secondary)]">Ім'я</label>
            <input
              type="text"
              name="fullName"
              defaultValue={currentFullName}
              readOnly={!isEditing}
              className={editableInputClass}
            />
          </div>

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
            <label className="mb-3 block text-sm text-[var(--cms-text-secondary)]">Email</label>
            <input
              type="text"
              value={currentEmail || "Не вказано"}
              readOnly
              className={readonlyInputClass}
            />
          </div>

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
            <label className="mb-3 block text-sm text-[var(--cms-text-secondary)]">
              Рівень доступу
            </label>
            <input
              type="text"
              value={getRoleLabel(currentRole)}
              readOnly
              className={readonlyInputClass}
            />
          </div>

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
            <label className="mb-3 block text-sm text-[var(--cms-text-secondary)]">Статус</label>
            <input
              type="text"
              value={getStatusLabel(currentStatus)}
              readOnly
              className={readonlyInputClass}
            />
          </div>

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5 md:col-span-2">
            <label className="mb-3 block text-sm text-[var(--cms-text-secondary)]">
              Доступні розділи CMS
            </label>

            <div className="flex flex-wrap gap-2">
              {allowedSections.map((section) => (
                <div
                  key={section}
                  className="rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-3 py-2 text-sm text-[var(--cms-text-secondary)]"
                >
                  {section}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5 md:col-span-2">
            <label className="mb-3 block text-sm text-[var(--cms-text-secondary)]">
              Посада
            </label>
            <input
              type="text"
              name="jobTitle"
              defaultValue={currentJobTitle}
              placeholder="Наприклад: Менеджер контенту"
              readOnly={!isEditing}
              className={editableInputClass}
            />
          </div>

          <AdminThemeSwitch />
        </div>

        {state.error ? (
          <div className="rounded-2xl border px-4 py-3 text-sm border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]">
            {state.error}
          </div>
        ) : null}

        {flashSuccess ? (
          <div className="rounded-2xl border px-4 py-3 text-sm border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]">
            {flashSuccess}
          </div>
        ) : null}

        {isEditing ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className={`${adminPrimaryButtonClass} disabled:opacity-60`}
            >
              {isPending ? "Зберігаємо..." : "Зберегти"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-secondary)] hover:text-[var(--cms-text-primary)]"
            >
              Скасувати
            </button>
          </div>
        ) : null}
      </form>

      {canSeeHouseAccessCodes ? (
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
                Доступи будинків
              </div>

              <h2 className="mt-4 text-2xl font-semibold text-[var(--cms-text-primary)]">
                Поточні коди доступу
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--cms-text-secondary)]">
                Актуальний список будинків платформи та їхніх поточних кодів доступу для
                входу мешканців.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedDistrictId}
                onChange={(event) => setSelectedDistrictId(event.target.value)}
                className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2 text-sm text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                <option value="">Усі райони</option>
                {districtOptions.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>

              <div className="text-sm text-[var(--cms-text-muted)]">
                Усього будинків: {visibleHouses.length}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {visibleHouses.length > 0 ? (
              visibleHouses.map((house) => (
                <div
                  key={house.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--cms-text-primary)]">
                      {house.name}
                    </div>
                    <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
                      slug: {house.slug}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2 text-sm font-medium tracking-[0.2em] text-[var(--cms-text-primary)]">
                      {house.currentAccessCode ?? "Не задано"}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(house.id, house.currentAccessCode)
                      }
                      disabled={!house.currentAccessCode}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-primary)] transition hover:bg-[var(--cms-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Скопіювати код доступу будинку ${house.name}`}
                      title={
                        copiedHouseId === house.id
                          ? "Скопійовано"
                          : "Скопіювати код"
                      }
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4 text-sm text-[var(--cms-text-secondary)]">
                Будинки поки не знайдені.
              </div>
            )}
          </div>
        </div>
      ) : null}
    
      <PlatformConfirmModal
        open={isLogoutConfirmOpen}
        title="Ви впевнені, що хочете вийти?"
        description="Ви вийдете з кабінету й потрібно буде увійти знову."
        confirmLabel="Вийти"
        cancelLabel="Скасувати"
        tone="warning"
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          logoutAdmin();
        }}
      />

    </div>
  );
}
