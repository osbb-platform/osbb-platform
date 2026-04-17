import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

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

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 10);

  if (error || !data?.signedUrl) {
    return new NextResponse("Unable to create signed URL", { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
