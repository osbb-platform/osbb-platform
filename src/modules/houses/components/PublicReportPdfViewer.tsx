"use client";

import { useMemo, useState } from "react";

type Props = {
  filePath: string;
  fileName?: string;
  bucket?: string;
};

function buildViewerUrl(path: string, bucket: string) {
  if (!path.trim()) return "";

  return `/api/reports/view?path=${encodeURIComponent(path)}&bucket=${encodeURIComponent(bucket)}`;
}

export function PublicReportPdfViewer({
  filePath,
  fileName,
  bucket = "house-reports",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const viewerUrl = useMemo(() => buildViewerUrl(filePath, bucket), [filePath, bucket]);

  if (!filePath.trim()) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        PDF файл будет подключен следующим шагом через CMS upload.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-5 inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
      >
        Ознайомитися
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="text-sm font-medium text-slate-900">
                {fileName || "Просмотр отчета"}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Закрити PDF"
              >
                ×
              </button>
            </div>

            <iframe
              src={viewerUrl}
              title={fileName || "PDF report"}
              className="h-[calc(85vh-73px)] w-full"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
