import { Buffer } from "node:buffer";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const CSP_REPORT_MAX_BODY_BYTES =
  64 * 1024;

type JsonRecord = Record<string, unknown>;

type NormalizedCspReport = {
  documentUri: string | null;
  blockedUri: string | null;
  effectiveDirective: string | null;
  violatedDirective: string | null;
  disposition: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  statusCode: number | null;
};

function asRecord(
  value: unknown,
): JsonRecord | null {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonRecord;
}

function readString(
  record: JsonRecord,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string"
      && value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(
  record: JsonRecord,
  keys: string[],
): number | null {
  for (const key of keys) {
    const parsed = Number(record[key]);

    if (
      Number.isFinite(parsed)
      && parsed >= 0
    ) {
      return parsed;
    }
  }

  return null;
}

function sanitizeText(
  value: string | null,
  maxLength = 512,
): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value
    .replace(
      /[\u0000-\u001f\u007f]/g,
      " ",
    )
    .trim()
    .slice(0, maxLength);

  return sanitized || null;
}

function sanitizeUri(
  value: string | null,
): string | null {
  const sanitized = sanitizeText(
    value,
    2048,
  );

  if (!sanitized) {
    return null;
  }

  if (
    sanitized === "inline"
    || sanitized === "eval"
    || sanitized === "self"
    || sanitized === "data"
    || sanitized === "blob"
  ) {
    return sanitized;
  }

  try {
    const parsed = new URL(sanitized);

    if (
      parsed.protocol !== "http:"
      && parsed.protocol !== "https:"
    ) {
      return sanitizeText(
        parsed.protocol.replace(":", ""),
        64,
      );
    }

    return sanitizeText(
      `${parsed.origin}${parsed.pathname}`,
      1024,
    );
  } catch {
    return sanitizeText(
      sanitized.split(/[?#]/, 1)[0] ?? "",
      1024,
    );
  }
}

function resolveReportRecord(
  payload: unknown,
): JsonRecord | null {
  if (Array.isArray(payload)) {
    const first = asRecord(payload[0]);

    if (!first) {
      return null;
    }

    return asRecord(first.body) ?? first;
  }

  const root = asRecord(payload);

  if (!root) {
    return null;
  }

  return (
    asRecord(root["csp-report"])
    ?? asRecord(root.body)
    ?? root
  );
}

function normalizeCspReport(
  payload: unknown,
): NormalizedCspReport | null {
  const report = resolveReportRecord(payload);

  if (!report) {
    return null;
  }

  const normalized: NormalizedCspReport = {
    documentUri: sanitizeUri(
      readString(report, [
        "document-uri",
        "documentURL",
        "documentUrl",
      ]),
    ),
    blockedUri: sanitizeUri(
      readString(report, [
        "blocked-uri",
        "blockedURL",
        "blockedUrl",
      ]),
    ),
    effectiveDirective: sanitizeText(
      readString(report, [
        "effective-directive",
        "effectiveDirective",
      ]),
    ),
    violatedDirective: sanitizeText(
      readString(report, [
        "violated-directive",
        "violatedDirective",
      ]),
    ),
    disposition: sanitizeText(
      readString(report, [
        "disposition",
      ]),
      64,
    ),
    sourceFile: sanitizeUri(
      readString(report, [
        "source-file",
        "sourceFile",
      ]),
    ),
    lineNumber: readNumber(
      report,
      [
        "line-number",
        "lineNumber",
      ],
    ),
    columnNumber: readNumber(
      report,
      [
        "column-number",
        "columnNumber",
      ],
    ),
    statusCode: readNumber(
      report,
      [
        "status-code",
        "statusCode",
      ],
    ),
  };

  if (
    !normalized.documentUri
    && !normalized.blockedUri
    && !normalized.effectiveDirective
    && !normalized.violatedDirective
  ) {
    return null;
  }

  return normalized;
}

function emptyResponse(
  status = 204,
) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control":
        "no-store, max-age=0",
      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

export async function handleCspReportRequest(
  request: NextRequest,
): Promise<NextResponse> {
  const declaredLength = Number(
    request.headers.get(
      "content-length",
    ) ?? "0",
  );

  if (
    Number.isFinite(declaredLength)
    && declaredLength
      > CSP_REPORT_MAX_BODY_BYTES
  ) {
    return emptyResponse(413);
  }

  let rawBody = "";

  try {
    rawBody = await request.text();
  } catch {
    return emptyResponse();
  }

  if (
    Buffer.byteLength(
      rawBody,
      "utf8",
    ) > CSP_REPORT_MAX_BODY_BYTES
  ) {
    return emptyResponse(413);
  }

  if (!rawBody.trim()) {
    return emptyResponse();
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return emptyResponse();
  }

  const report = normalizeCspReport(payload);

  if (report) {
    console.warn(
      "[security:csp-report]",
      JSON.stringify(report),
    );
  }

  return emptyResponse();
}

export async function POST(
  request: NextRequest,
) {
  return handleCspReportRequest(request);
}
