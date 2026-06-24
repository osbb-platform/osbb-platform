"use client";

import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type FileMeta = { name: string; size: number };

export type FileDropzoneProps = {
  onFiles: (files: FileList) => void;
  accept?: string;
  hint?: string;
  uploading?: boolean;
  progress?: number;
  file?: FileMeta | null;
  onRemove?: () => void;
  disabled?: boolean;
};

export function FileDropzone({
  onFiles,
  accept = "application/pdf",
  hint = "PDF до 10 МБ",
  uploading,
  progress = 0,
  file,
  onRemove,
  disabled,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3.5 py-3">
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[var(--r-sm)] bg-[var(--cms-danger-bg)] text-[11px] font-bold text-[var(--cms-danger-text)]">
          PDF
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-medium text-[var(--cms-text)]">{file.name}</div>
          <div className="text-xs text-[var(--cms-text-soft)]">{(file.size / 1024 / 1024).toFixed(1)} МБ</div>
        </div>
        {onRemove && (
          <button
            type="button"
            aria-label="Видалити файл"
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--cms-text-soft)] transition-colors hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      className={cx(
        "flex w-full items-center gap-3.5 rounded-[var(--r-lg)] border-[1.5px] border-dashed px-5 py-4 text-left transition-colors",
        drag
          ? "border-[var(--cms-accent-primary)] bg-[color-mix(in_srgb,var(--cms-accent-primary)_10%,var(--cms-surface-muted))]"
          : "border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)]",
        "disabled:opacity-60",
        "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
        }}
      />
      <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[var(--r-md)] bg-[var(--cms-pill-bg)] text-[var(--cms-accent-primary)]">
        {uploading ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <polyline points="7 10 12 15 17 10" />
            <path d="M5 19h14" />
          </svg>
        )}
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium text-[var(--cms-text)]">
          {uploading ? "Завантаження…" : "Перетягніть файл або натисніть, щоб обрати"}
        </div>
        <div className="text-xs text-[var(--cms-text-soft)]">{hint}</div>
        {uploading && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cms-surface-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--cms-accent-primary)] transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </button>
  );
}
