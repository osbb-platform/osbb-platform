"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPlatformTask,
  type CreatePlatformTaskState,
} from "@/src/modules/tasks/actions/createPlatformTask";
import {
  adminButtonDisabledClass,
  adminPrimaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type TaskAssigneeOption = {
  id: string;
  name: string;
};

type HouseOption = {
  id: string;
  name: string;
};

type CreateTaskModalProps = {
  assignees: TaskAssigneeOption[];
  houses: HouseOption[];
};

const INITIAL_STATE: CreatePlatformTaskState = {
  error: null,
  success: null,
};

export function CreateTaskModal({ assignees, houses }: CreateTaskModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CreatePlatformTaskState>(INITIAL_STATE);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setState(INITIAL_STATE);

    const result = await createPlatformTask(INITIAL_STATE, formData);

    setIsPending(false);

    if (result.error) {
      setState(result);
      return;
    }

    formRef.current?.reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState(INITIAL_STATE);
          setOpen(true);
        }}
        className="inline-flex items-center justify-center rounded-[var(--r-lg)] bg-[var(--cms-primary)] px-5 py-3 text-sm font-medium text-[var(--cms-primary-contrast)] transition hover:opacity-90"
      >
        Створити задачу
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--cms-overlay)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-title"
          onMouseDown={() => {
            if (!isPending) setOpen(false);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6 shadow-[var(--cms-shadow-lg)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="create-task-title"
                  className="text-xl font-semibold text-[var(--cms-text)]"
                >
                  Нова задача
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                  Обовʼязкова лише назва. Інші поля можна заповнити пізніше.
                </p>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border)] text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-surface-muted)] disabled:opacity-60"
                aria-label="Закрити"
              >
                ×
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[var(--cms-text)]">
                  Заголовок задачі
                </span>
                <input
                  name="title"
                  required
                  className="mt-2 w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
                  placeholder="Наприклад: перевірити чернетку оголошення"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--cms-text)]">
                  Опис
                </span>
                <textarea
                  name="description"
                  rows={4}
                  className="mt-2 w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
                  placeholder="Деталі задачі"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text)]">
                    Виконавець
                  </span>
                  <select
                    name="assignedTo"
                    className="mt-2 w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
                  >
                    <option value="">Не призначено</option>
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text)]">
                    Будинок
                  </span>
                  <select
                    name="houseId"
                    className="mt-2 w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
                  >
                    <option value="">Без будинку</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>
                        {house.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text)]">
                    Пріоритет
                  </span>
                  <select
                    name="priority"
                    className="mt-2 w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
                  >
                    <option value="">Без пріоритету</option>
                    <option value="low">Низький</option>
                    <option value="medium">Середній</option>
                    <option value="high">Високий</option>
                                      </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--cms-text)]">
                    Дедлайн
                  </span>
                  <input
                    name="deadlineAt"
                    type="date"
                    className="mt-2 w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)]"
                  />
                </label>
              </div>

              {state.error ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
                  {state.error}
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className={[adminPrimaryButtonClass, adminButtonDisabledClass].join(" ")}
                >
                  {isPending ? "Створюємо..." : "Створити задачу"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
