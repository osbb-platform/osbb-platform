import { NextRequest, NextResponse } from "next/server";

import { resolveSignedFileUrl } from "@/src/modules/files/services/resolveSignedFileUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function boolParam(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function safeFileName(value: string | null) {
  return (
    (value || "document.pdf").replace(/[\r\n"]/g, "").trim() || "document.pdf"
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const download = boolParam(params.get("download"));

  const result = await resolveSignedFileUrl({
    entityType: params.get("entityType"),
    entityId: params.get("entityId"),
    fieldKey: params.get("fieldKey") || "pdf",
    bucket: params.get("bucket"),
    path: params.get("path"),
    filename: params.get("filename"),
    download,
  });

  if (!result.ok) {
    return new NextResponse(result.message, {
      status: result.status,
      headers: NO_STORE_HEADERS,
    });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(result.signedUrl, {
    cache: "no-store",
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse("Unable to open PDF", {
      status: upstream.status === 404 ? 404 : 502,
      headers: NO_STORE_HEADERS,
    });
  }

  const headers = new Headers(NO_STORE_HEADERS);
  const filename = safeFileName(result.filename);

  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "application/pdf",
  );
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");

  for (const name of ["content-length", "content-range", "etag"]) {
    const value = upstream.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
