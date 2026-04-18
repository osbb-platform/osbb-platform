import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path")?.trim();
  const bucket = request.nextUrl.searchParams.get("bucket")?.trim() || "house-reports";

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  const allowedBuckets = new Set(["house-reports", "house-documents"]);

  if (!allowedBuckets.has(bucket)) {
    return new NextResponse("Unsupported bucket", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

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
