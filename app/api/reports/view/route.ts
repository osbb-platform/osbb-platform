import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

function sanitizeFilename(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return normalized || "document";
}

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path")?.trim();
  const bucket = request.nextUrl.searchParams.get("bucket")?.trim() || "house-reports";
  const download = request.nextUrl.searchParams.get("download") === "1";
  const filename = request.nextUrl.searchParams.get("filename")?.trim();

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  const allowedBuckets = new Set(["house-reports", "house-documents", "house-announcements"]);

  if (!allowedBuckets.has(bucket)) {
    return new NextResponse("Unsupported bucket", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (download) {
    const { data, error } = await supabase.storage.from(bucket).download(filePath);

    if (error || !data) {
      console.error("Failed to download file", {
        bucket,
        filePath,
        error: error?.message ?? null,
      });

      return new NextResponse("Unable to download file", { status: 404 });
    }

    const safeFilename = sanitizeFilename(filename || "document.pdf");

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL", {
      bucket,
      filePath,
      error: error?.message ?? null,
    });

    return new NextResponse("Unable to create signed URL", { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
