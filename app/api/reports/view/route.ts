import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  parseSignedFileRequest,
  resolveSignedFileUrl,
} from "@/src/modules/files/services/resolveSignedFileUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function errorResponse(
  status: 400 | 401 | 403 | 404 | 500,
) {
  const message =
    status === 400
      ? "Invalid file request"
      : status === 401
        ? "Authentication required"
        : status === 403
          ? "File access denied"
          : status === 404
            ? "File not found"
            : "Unable to open file";

  return new NextResponse(message, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

type SignedFileResolver =
  typeof resolveSignedFileUrl;

export async function handleReportViewRequest(
  request: NextRequest,
  resolver: SignedFileResolver =
    resolveSignedFileUrl,
) {
  const parsed = parseSignedFileRequest(
    request.nextUrl.searchParams,
  );

  if (!parsed.ok) {
    return errorResponse(parsed.status);
  }

  const result = await resolver(parsed.request);

  if (!result.ok) {
    return errorResponse(result.status);
  }

  return NextResponse.redirect(
    result.signedUrl,
    {
      status: 302,
      headers: NO_STORE_HEADERS,
    },
  );
}

export async function GET(request: NextRequest) {
  return handleReportViewRequest(request);
}
