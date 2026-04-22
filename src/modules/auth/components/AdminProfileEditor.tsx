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
  if (status === "invited") return "Invited";
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "archived") return "Archived";
  return "Без статуса";
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
    ? "w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-medium text-white outline-none transition focus:border-slate-500"
    : "w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-lg font-medium text-slate-200 outline-none transition";

  const readonlyInputClass =
    "w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-lg font-medium text-slate-400 outline-none transition";

  const access = getResolvedAccess(currentRole as typeof ROLES[keyof typeof ROLES] | null);
  const allowedSections = [
    access.topLevel.dashboard && "Dashboard",
    access.topLevel.districts && "Районы",
    access.topLevel.houses && "Дома",
    access.topLevel.apartments && "Квартиры",
    access.topLevel.history && "История",
    access.topLevel.employees && "Сотрудники",
    access.topLevel.companyPages && "Сайт компании",
    access.topLevel.profile && "Профиль",
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
      ).sort((left, right) => left.name.localeCompare(right.name, "ru")),
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Мой профиль
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-400">
              Здесь собраны ваши данные для работы в CMS, уровень доступа и
              доступные рабочие разделы.
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Рабочий аккаунт сотрудника управляющей компании
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Уровень: {getRoleLabel(currentRole)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <AdminThemeSwitch />

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
              >
                Редактировать
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="inline-flex w-full min-w-[180px] items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <label className="mb-3 block text-sm text-slate-400">Имя</label>
            <input
              type="text"
              name="fullName"
              defaultValue={currentFullName}
              readOnly={!isEditing}
              className={editableInputClass}
            />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <label className="mb-3 block text-sm text-slate-400">Email</label>
            <input
              type="text"
              value={currentEmail || "Не указан"}
              readOnly
              className={readonlyInputClass}
            />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <label className="mb-3 block text-sm text-slate-400">
              Уровень доступа
            </label>
            <input
              type="text"
              value={getRoleLabel(currentRole)}
              readOnly
              className={readonlyInputClass}
            />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <label className="mb-3 block text-sm text-slate-400">Статус</label>
            <input
              type="text"
              value={getStatusLabel(currentStatus)}
              readOnly
              className={readonlyInputClass}
            />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
            <label className="mb-3 block text-sm text-slate-400">
              Доступные разделы CMS
            </label>

            <div className="flex flex-wrap gap-2">
              {allowedSections.map((section) => (
                <div
                  key={section}
                  className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
                >
                  {section}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:col-span-2">
            <label className="mb-3 block text-sm text-slate-400">
              Должность
            </label>
            <input
              type="text"
              name="jobTitle"
              defaultValue={currentJobTitle}
              placeholder="Например: Менеджер контента"
              readOnly={!isEditing}
              className={editableInputClass}
            />
          </div>
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        ) : null}

        {flashSuccess ? (
          <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            {flashSuccess}
          </div>
        ) : null}

        {isEditing ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
            >
              {isPending ? "Сохраняем..." : "Сохранить"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Отмена
            </button>
          </div>
        ) : null}
      </form>

      {canSeeHouseAccessCodes ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Доступы домов
              </div>

              <h2 className="mt-4 text-2xl font-semibold text-white">
                Текущие коды доступа
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Актуальный список домов платформы и их текущих кодов доступа для
                resident-facing входа.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedDistrictId}
                onChange={(event) => setSelectedDistrictId(event.target.value)}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition focus:border-slate-500"
              >
                <option value="">Все районы</option>
                {districtOptions.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>

              <div className="text-sm text-slate-500">
                Всего домов: {visibleHouses.length}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {visibleHouses.length > 0 ? (
              visibleHouses.map((house) => (
                <div
                  key={house.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {house.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      slug: {house.slug}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium tracking-[0.2em] text-white">
                      {house.currentAccessCode ?? "Не задан"}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(house.id, house.currentAccessCode)
                      }
                      disabled={!house.currentAccessCode}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Скопировать код доступа дома ${house.name}`}
                      title={
                        copiedHouseId === house.id
                          ? "Скопировано"
                          : "Скопировать код"
                      }
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                Дома пока не найдены.
              </div>
            )}
          </div>
        </div>
      ) : null}
    
      <PlatformConfirmModal
        open={isLogoutConfirmOpen}
        title="Ви впевнені, що хочете вийти?"
        description="Ви вийдете з кабінету і потрібно буде увійти знову."
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
