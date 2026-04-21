"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeHousePasswordForm } from "@/src/modules/houses/components/ChangeHousePasswordForm";
import { markHouseMessagesSeen } from "@/src/modules/houses/actions/markHouseMessagesSeen";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type HouseRegistryCardProps = {
  house: {
    id: string;
    name: string;
    slug: string;
    address: string;
    osbb_name: string | null;
    short_description: string | null;
    public_description: string | null;
    cover_image_path: string | null;
    cover_image_url?: string | null;
    is_active: boolean;
    archived_at: string | null;
    created_at: string;
    district: {
      id: string;
      name: string;
      slug: string;
      theme_color: string;
    } | null;
    unread_messages_count: number;
    message_items: Array<{
      id: string;
      created_at: string;
      category: string;
      specialist_label: string;
      requester_name: string;
      requester_email: string;
      requester_phone: string | null;
      apartment: string;
      subject: string | null;
      comment: string | null;
      status: string;
    }>;
  };
  currentUser: CurrentAdminUser;
  onOpenSettings: (house: HouseRegistryCardProps["house"]) => void;
};

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function EyeIcon() {
  return (
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
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function KeyIcon() {
  return (
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
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H21" />
      <path d="M17 12v3" />
      <path d="M19.5 12v2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .98 1.7 1.7 0 0 1-3.24 0A1.7 1.7 0 0 0 9.76 19a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.98-1 1.7 1.7 0 0 1 0-3.24A1.7 1.7 0 0 0 4.6 9.76a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.98 1.7 1.7 0 0 1 3.24 0A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .41.16.8.46 1.09.29.29.68.46 1.09.46a1.7 1.7 0 0 1 0 3.24A1.7 1.7 0 0 0 19.4 15z" />
    </svg>
  );
}

function MessageIcon() {
  return (
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
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M5.25 20.25V6A2.25 2.25 0 0 1 7.5 3.75h9A2.25 2.25 0 0 1 18.75 6v8.25A2.25 2.25 0 0 1 16.5 16.5H9.31l-4.06 3.75Z" />
    </svg>
  );
}

function formatMessageDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessageTypeLabel(category: string) {
  if (category === "Управляющая компания") return "Обращение в УК";
  if (category === "Предложение улучшения") return "Предложение улучшения";
  return category || "Обращение";
}

function getMessagePreview(item: HouseRegistryCardProps["house"]["message_items"][number]) {
  const subject = item.subject?.trim();
  if (subject) return subject;

  const comment = item.comment?.trim();
  if (!comment) return "Без темы";

  return comment.length > 140 ? `${comment.slice(0, 140).trim()}…` : comment;
}

export function HouseRegistryCard({
  house,
  currentUser,
  onOpenSettings,
}: HouseRegistryCardProps) {
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(house.unread_messages_count);
  const [localMessageItems, setLocalMessageItems] = useState(house.message_items);
  const [isMarkingSeen, startMarkingSeen] = useTransition();
  const router = useRouter();

  const access = getResolvedAccess(currentUser.role);
  const canManageSensitiveSettings = access.housesRegistry.changeAccessCode;
  const canManageSettings = access.housesRegistry.edit;

  function openMessagesPanel() {
    setIsMessagesOpen(true);

    if (localUnreadCount < 1) {
      return;
    }

    setLocalUnreadCount(0);
    setLocalMessageItems((current) =>
      current.map((item) =>
        item.status === "new" ? { ...item, status: "seen" } : item,
      ),
    );

    startMarkingSeen(async () => {
      await markHouseMessagesSeen(house.id);
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_12px_32px_rgba(2,6,23,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <h3 className="min-w-0 text-xl font-semibold text-white">
                {house.name}
              </h3>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  slug: {house.slug}
                </span>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Активен
                </span>

                {house.district ? (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: house.district.theme_color }}
                  >
                    {house.district.name}
                  </span>
                ) : null}
                
              </div>
            </div>

            <div className="mt-2 text-sm text-slate-400">
              {house.address}
            </div>

            <div className="mt-1 text-sm text-slate-500">
              ОСББ: {house.osbb_name ?? "не указано"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
  {canManageSensitiveSettings ? (
    <button
      type="button"
      onClick={() => setIsPasswordOpen(true)}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800"
      aria-label={`Изменить код доступа дома ${house.name}`}
      title="Изменить код доступа"
    >
      <KeyIcon />
    </button>
  ) : null}

  <button
    type="button"
    onClick={openMessagesPanel}
    className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800"
    aria-label={`Открыть центр обращений дома ${house.name}`}
    title="Центр обращений"
  >
    <MessageIcon />
    {localUnreadCount > 0 ? (
      <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
        {localUnreadCount > 9 ? "9+" : localUnreadCount}
      </span>
    ) : null}
  </button>

  {canManageSettings ? (
    <button
      type="button"
      onClick={() => onOpenSettings(house)}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800"
      aria-label={`Настройки дома ${house.name}`}
      title="Настройки"
    >
      <SettingsIcon />
    </button>
  ) : null}

  <Link
    href={`https://${house.slug}.osbb-platform.com.ua`}
    target="_blank"
    rel="noreferrer"
    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800"
    aria-label={`Открыть сайт дома ${house.name}`}
    title="Открыть сайт дома"
  >
    <EyeIcon />
  </Link>
</div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/houses/${house.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Управление домом
            </Link>
          </div>

          <div className="text-sm text-slate-500">
            Создан: {formatCreatedAt(house.created_at)}
          </div>
        </div>
      </div>

      {isMessagesOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsMessagesOpen(false)}
            aria-label="Закрыть центр обращений"
          />

          <div className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-6">
              <div>
                <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Центр обращений
                </div>

                <h2 className="mt-4 text-2xl font-semibold text-white">
                  Сообщения по дому
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Дом: {house.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMessagesOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                aria-label="Закрыть панель"
              >
                ×
              </button>
            </div>

            <div className="flex-1 px-6 py-6">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Всего записей: {localMessageItems.length}
                </div>
                <div className="rounded-full bg-rose-950/70 px-3 py-1 text-xs font-medium text-rose-200">
                  Новых: {isMarkingSeen ? "..." : localUnreadCount}
                </div>
              </div>

              {localMessageItems.length > 0 ? (
                <div className="space-y-4">
                  {localMessageItems.map((item) => (
                    <article
  key={item.id}
  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5"
>
  <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-200">
      {getMessageTypeLabel(item.category)}
    </span>
    <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
      Квартира: {item.apartment || "—"}
    </span>
    <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
      {formatMessageDate(item.created_at)}
    </span>

    {item.status === "new" ? (
      <span className="rounded-full bg-rose-950/70 px-3 py-1 text-[11px] font-medium text-rose-200">
        Новое
      </span>
    ) : null}
  </div>

  <div className="mt-4">
    <div className="text-base font-semibold text-white">
      {item.requester_name || "Без имени"}
    </div>
    <div className="mt-1 text-sm text-slate-400">
      {item.requester_email || "Email не указан"}
      {item.requester_phone ? ` · ${item.requester_phone}` : ""}
    </div>
  </div>

  {item.specialist_label ? (
    <div className="mt-3 text-sm text-slate-400">
      Специалист: {item.specialist_label}
    </div>
  ) : null}

  <div className="mt-4 text-sm leading-7 text-slate-300">
    {getMessagePreview(item)}
  </div>

  {item.comment ? (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm leading-7 text-slate-400">
      {item.comment}
    </div>
  ) : null}
</article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/70 px-5 py-6 text-sm leading-7 text-slate-400">
                  Для этого дома пока нет обращений. Когда житель оставит сообщение или заявку на специалиста, оно появится здесь.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isPasswordOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsPasswordOpen(false)}
            aria-label="Закрыть смену пароля"
          />

          <div className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-6">
              <div>
                <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Код доступа дома
                </div>

                <h2 className="mt-4 text-2xl font-semibold text-white">
                  Изменить код доступа
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Дом: {house.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPasswordOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                aria-label="Закрыть панель"
              >
                ×
              </button>
            </div>

            <div className="flex-1 px-6 py-6">
              <ChangeHousePasswordForm
                houseId={house.id}
                houseSlug={house.slug}
              />
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
}
