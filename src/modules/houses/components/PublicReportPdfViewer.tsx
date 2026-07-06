"use client";

import {
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { FileEntityType } from "@/src/modules/files/types/fileAccess";
import { PublicDocumentActionButton } from "@/src/shared/ui/public/PublicDocumentActionButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type Props = {
  entityType: FileEntityType;
  entityId: string;
  fieldKey: string;
  houseSlug?: string;
  fileName?: string;
  analyticsHouseId?: string;
  analyticsHouseSlug?: string;
  analyticsEntityId?: string | null;
  analyticsDocumentType?: string;
};

export function PublicReportPdfViewer({
  entityType,
  entityId,
  fieldKey,
  houseSlug,
  fileName,
  analyticsHouseId,
  analyticsHouseSlug,
  analyticsEntityId,
  analyticsDocumentType,
}: Props) {
  const [isOpen, setIsOpen] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(false);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const hasFileReference = Boolean(
    entityId.trim() &&
    fieldKey.trim(),
  );

  const viewerUrl = useMemo(() => {
    if (!hasFileReference) {
      return "";
    }

    const params = new URLSearchParams({
      entityType,
      entityId,
      fieldKey,
    });

    if (houseSlug?.trim()) {
      params.set(
        "houseSlug",
        houseSlug.trim(),
      );
    }

    if (fileName?.trim()) {
      params.set(
        "filename",
        fileName.trim(),
      );
    }

    return `/api/reports/view?${params.toString()}#toolbar=0&navpanes=0&scrollbar=0`;
  }, [
    entityId,
    entityType,
    fieldKey,
    fileName,
    hasFileReference,
    houseSlug,
  ]);

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
            entityId:
              analyticsEntityId ?? null,
            metadata: {
              source:
                "public_pdf_viewer",
              houseSlug:
                analyticsHouseSlug ??
                null,
              documentType:
                analyticsDocumentType ??
                entityType,
            },
          },
        ],
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.sendBeacon
      ) {
        const blob = new Blob(
          [payload],
          {
            type: "application/json",
          },
        );

        navigator.sendBeacon(
          "/api/analytics/track",
          blob,
        );

        return;
      }

      void fetch(
        "/api/analytics/track",
        {
          method: "POST",
          body: payload,
          headers: {
            "Content-Type":
              "application/json",
          },
          keepalive: true,
        },
      );
    } catch (error) {
      console.error(
        "[analytics] Failed to track document open",
        error,
      );
    }
  }

  if (!hasFileReference) {
    return (
      <div className="mt-5 rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-4 py-3 text-sm text-[var(--pub-text-muted)]">
        PDF файл буде підключено наступним
        кроком через CMS upload.
      </div>
    );
  }

  const modal = (
    <div className="pub-theme-root fixed inset-0 z-[100] flex items-center justify-center bg-[var(--pub-overlay)] p-4 backdrop-blur-[2px]">
      <div className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--pub-text)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] bg-[var(--pub-info-bg)] text-[var(--pub-info-text)]">
              <PubIcon
                name="doc"
                className="h-[17px] w-[17px]"
              />
            </span>
            {fileName ||
              "Перегляд звіту"}
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
            <PubIcon
              name="close"
              className="h-5 w-5"
            />
          </button>
        </div>

        <iframe
          src={viewerUrl}
          title={
            fileName ||
            "PDF report"
          }
          className="h-[calc(85vh-73px)] w-full bg-[var(--pub-surface-elevated)]"
          onLoad={() =>
            setIsLoading(false)
          }
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
        <PubIcon
          name="doc"
          className="h-[18px] w-[18px]"
        />
        {isLoading
          ? "Відкриваємо..."
          : "Ознайомитися"}
      </PublicDocumentActionButton>

      {loadError ? (
        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-4 py-3 text-sm text-[var(--pub-danger-text)]">
          {loadError}
        </div>
      ) : null}

      {isOpen &&
      typeof window !== "undefined"
        ? createPortal(
            modal,
            document.body,
          )
        : null}
    </>
  );
}
