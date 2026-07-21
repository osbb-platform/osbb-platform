"use client";

import * as React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export type FileDropzoneFile = {
  name: string;
  size: number;
};

export type FileDropzoneProps = {
  onFiles?: (files: FileList) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  accept?: string;
  hint?: string;
  label?: string;
  uploading?: boolean;
  saving?: boolean;
  progress?: number;
  file?: FileDropzoneFile | null;
  files?: FileDropzoneFile[];
  currentFile?: FileDropzoneFile | null;
  onRemove?: () => void;
  onRemoveCurrent?: () => void;
  removalPending?: boolean;
  onUndoRemoval?: () => void;
  disabled?: boolean;
  multiple?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  inputId?: string;
  kind?: "pdf" | "image" | "file";
  error?: string | null;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function getKindLabel(kind: FileDropzoneProps["kind"]) {
  if (kind === "image") return "IMG";
  if (kind === "pdf") return "PDF";
  return "FILE";
}

export function FileDropzone({
  onFiles,
  onChange,
  accept = "application/pdf,.pdf",
  hint = "PDF до 15 МБ",
  label = "Перетягніть файл або натисніть, щоб обрати",
  uploading = false,
  saving = false,
  progress = 0,
  file,
  files = [],
  currentFile,
  onRemove,
  onRemoveCurrent,
  removalPending = false,
  onUndoRemoval,
  disabled = false,
  multiple = false,
  inputRef,
  inputId,
  kind = "pdf",
  error,
}: FileDropzoneProps) {
  const localInputRef = React.useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? localInputRef;
  const [dragActive, setDragActive] = React.useState(false);
  const selectedFiles = file ? [file] : files;

  function dispatchFiles(filesToDispatch: FileList) {
    if (onFiles) {
      onFiles(filesToDispatch);
      return;
    }

    if (onChange) {
      const target = {
        files: filesToDispatch,
        value: "",
      } as unknown as HTMLInputElement;

      onChange({
        target,
        currentTarget: target,
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (onChange) {
      onChange(event);
    } else if (event.target.files?.length) {
      onFiles?.(event.target.files);
    }

    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      {currentFile ? (
        <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3.5 py-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--r-sm)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] text-[11px] font-bold text-[var(--cms-text-muted)]">
            {getKindLabel(kind)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--cms-text)]">
              {currentFile.name}
            </div>
            <div className="text-xs text-[var(--cms-text-soft)]">
              {formatFileSize(currentFile.size)}
            </div>
          </div>
          {onRemoveCurrent ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemoveCurrent}
              className="rounded-[var(--r-sm)] px-3 py-2 text-xs font-medium text-[var(--cms-danger-text)] hover:bg-[var(--cms-danger-bg)] disabled:opacity-60"
            >
              Видалити
            </button>
          ) : null}
        </div>
      ) : null}

      {removalPending ? (
        <div className="flex items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] px-4 py-3 text-sm text-[var(--cms-warning-text)]">
          <span>Файл буде видалено після збереження.</span>
          {onUndoRemoval ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onUndoRemoval}
              className="font-medium underline underline-offset-2 disabled:opacity-60"
            >
              Скасувати
            </button>
          ) : null}
        </div>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div className="space-y-2">
          {selectedFiles.map((selectedFile, index) => (
            <div
              key={`${selectedFile.name}-${selectedFile.size}-${index}`}
              className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3.5 py-3"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--r-sm)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] text-[11px] font-bold text-[var(--cms-accent-primary)]">
                {getKindLabel(kind)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--cms-text)]">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-[var(--cms-text-soft)]">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
              {onRemove && selectedFiles.length === 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onRemove}
                  aria-label="Прибрати вибраний файл"
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--cms-text-soft)] hover:bg-[var(--cms-pill-bg)] disabled:opacity-60"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled || uploading || saving}
        onClick={() => resolvedInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!disabled && event.dataTransfer.files?.length) {
            dispatchFiles(event.dataTransfer.files);
          }
        }}
        className={cx(
          "flex w-full items-center gap-3.5 rounded-[var(--r-lg)] border-[1.5px] border-dashed px-5 py-4 text-left transition-colors",
          dragActive
            ? "border-[var(--cms-accent-primary)] bg-[color-mix(in_srgb,var(--cms-accent-primary)_10%,var(--cms-surface-muted))]"
            : "border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <input
          id={inputId}
          ref={resolvedInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleInputChange}
        />

        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] text-[var(--cms-accent-primary)]">
          {uploading || saving ? "…" : "↓"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--cms-text)]">
            {uploading ? "Завантаження файлу…" : saving ? "Збереження…" : label}
          </div>
          <div className="text-xs text-[var(--cms-text-soft)]">{hint}</div>

          {uploading ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-[var(--r-pill)] bg-[var(--cms-surface-elevated)]">
              <div
                className="h-full rounded-[var(--r-pill)] bg-[var(--cms-accent-primary)]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          ) : null}
        </div>
      </button>

      {error ? (
        <div role="alert" className="text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
