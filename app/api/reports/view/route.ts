import { NextRequest, NextResponse } from "next/server";
import { resolveSignedFileUrl } from "@/src/modules/files/services/resolveSignedFileUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

function boolParam(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const result = await resolveSignedFileUrl({
    entityType: params.get("entityType"),
    entityId: params.get("entityId"),
    fieldKey: params.get("fieldKey") || "pdf",
    bucket: params.get("bucket"),
    path: params.get("path"),
    filename: params.get("filename"),
    download: boolParam(params.get("download")),
  });

  if (!result.ok) {
    return new NextResponse(result.message, {
      status: result.status,
      headers: NO_STORE_HEADERS,
    });
  }

  return NextResponse.redirect(result.signedUrl, {
    headers: NO_STORE_HEADERS,
  });
}
