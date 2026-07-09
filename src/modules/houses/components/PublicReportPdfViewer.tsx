"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PublicDocumentActionButton } from "@/src/shared/ui/public/PublicDocumentActionButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type Props = {
  filePath: string;
  fileName?: string;
  bucket?: string;
  entityType?: string;
  entityId?: string;
  fieldKey?: string;
  buttonLabel?: string;
  modalTitle?: string;
  analyticsHouseId?: string;
  analyticsHouseSlug?: string;
  analyticsEntityId?: string | null;
  analyticsDocumentType?: string;
};

export function PublicReportPdfViewer({
  filePath,
  fileName,
  bucket = "house-reports",
  entityType,
  entityId,
  fieldKey,
  buttonLabel = "Ознайомитися",
  modalTitle,
  analyticsHouseId,
  analyticsHouseSlug,
  analyticsEntityId,
  analyticsDocumentType,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const viewerUrl = useMemo(() => {
    if (!filePath.trim() && !(entityType?.trim() && entityId?.trim())) return "";

    const params = new URLSearchParams();

    if (entityType?.trim() && entityId?.trim()) {
      params.set("entityType", entityType.trim());
      params.set("entityId", entityId.trim());
      params.set("fieldKey", fieldKey?.trim() || "pdf");
    }

    if (filePath.trim()) {
      params.set("path", filePath);
      params.set("bucket", bucket);
    }

    if (fileName?.trim()) {
      params.set("filename", fileName);
    }

    return `/api/reports/view?${params.toString()}#toolbar=0&navpanes=0&scrollbar=0`;
  }, [bucket, entityId, entityType, fieldKey, fileName, filePath]);

  function trackDocumentOpen() {
    try {
      if (!analyticsHouseId) {
        return;
      }

      const payload = JSON.stringify({
        houseId: analyticsHouseId,
        events: [
          {
            eventType: "document_open",
            entityId: analyticsEntityId ?? null,
            metadata: {
              source: "public_pdf_viewer",
              houseSlug: analyticsHouseSlug ?? null,
              documentType: analyticsDocumentType ?? bucket,
            },
          },
        ],
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/track", blob);
        return;
      }

      void fetch("/api/analytics/track", {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
        },
        keepalive: true,
      });
    } catch (error) {
      console.error("[analytics] Failed to track document open", error);
    }
  }

  if (!filePath.trim()) {
    return (
      <div className="mt-5 rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-4 py-3 text-sm text-[var(--pub-text-muted)]">
        PDF файл буде підключено наступним кроком через CMS upload.
      </div>
    );
  }

  const modal = (
    <div className="pub-theme-root fixed inset-0 z-[100] flex items-center justify-center bg-[var(--pub-overlay)] p-4 backdrop-blur-[2px]">
      <div className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--pub-text)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] bg-[var(--pub-info-bg)] text-[var(--pub-info-text)]">
              <PubIcon name="doc" className="h-[17px] w-[17px]" />
            </span>
            {modalTitle || fileName || "Перегляд PDF"}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsLoading(false);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] transition hover:bg-[var(--pub-bg-quiet)]"
            aria-label="Закрити PDF"
          >
            <PubIcon name="close" className="h-5 w-5" />
          </button>
        </div>

        <iframe
          src={viewerUrl}
          title={modalTitle || fileName || "PDF"}
          className="h-[calc(85vh-73px)] w-full bg-[var(--pub-surface-elevated)]"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );

  return (
    <>
      <PublicDocumentActionButton
        onClick={() => {
          trackDocumentOpen();
          setLoadError(null);
          setIsLoading(true);
          setIsOpen(true);
        }}
        className="mt-5 w-full"
      >
        <PubIcon name="doc" className="h-[18px] w-[18px]" />
        {isLoading ? "Відкриваємо..." : buttonLabel}
      </PublicDocumentActionButton>

      {loadError ? (
        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-4 py-3 text-sm text-[var(--pub-danger-text)]">
          {loadError}
        </div>
      ) : null}

      {isOpen && typeof window !== "undefined"
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}
