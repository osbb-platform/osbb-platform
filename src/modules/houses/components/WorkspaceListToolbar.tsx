"use client";

import {
  adminInputClass,
  adminSelectClass,
} from "@/src/shared/ui/admin/adminStyles";
import { WorkspacePaginationControls } from "@/src/modules/houses/components/WorkspacePaginationControls";
import type { WorkspaceListSortMode } from "@/src/modules/houses/utils/workspaceList";

type WorkspaceListToolbarProps = {
  searchQuery: string;
  sortMode: WorkspaceListSortMode;
  visible: number;
  total: number;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: WorkspaceListSortMode) => void;
  onShowMore: () => void;
};

export function WorkspaceListToolbar({
  searchQuery,
  sortMode,
  visible,
  total,
  searchPlaceholder,
  onSearchChange,
  onSortChange,
  onShowMore,
}: WorkspaceListToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
            Пошук
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className={adminInputClass}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
            Сортування
          </span>
          <select
            value={sortMode}
            onChange={(event) =>
              onSortChange(event.target.value as WorkspaceListSortMode)
            }
            className={adminSelectClass}
          >
            <option value="newest">Новіші</option>
            <option value="oldest">Старіші</option>
            <option value="title_asc">Назва А–Я</option>
          </select>
        </label>
      </div>

      <WorkspacePaginationControls
        visible={visible}
        total={total}
        onShowMore={onShowMore}
      />
    </div>
  );
}
