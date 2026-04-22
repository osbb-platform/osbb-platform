import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path")?.trim();
  const bucket =
    request.nextUrl.searchParams.get("bucket")?.trim() || "house-reports";

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 5); // 5 минут

  if (error || !data?.signedUrl) {
    return new NextResponse("Unable to open file", { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
