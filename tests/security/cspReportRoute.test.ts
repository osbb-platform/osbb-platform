import {
  NextRequest,
} from "next/server";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CSP_REPORT_MAX_BODY_BYTES,
  handleCspReportRequest,
} from "@/app/api/csp-report/route";

function createRequest(
  body: string,
) {
  return new NextRequest(
    "http://localhost/api/csp-report",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/csp-report",
      },
      body,
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe(
  "POST /api/csp-report",
  () => {
    it(
      "sanitizes legacy CSP reports",
      async () => {
        const warning = vi
          .spyOn(
            console,
            "warn",
          )
          .mockImplementation(
            () => undefined,
          );

        const response =
          await handleCspReportRequest(
            createRequest(
              JSON.stringify({
                "csp-report": {
                  "document-uri":
                    "https://admin.osbb-platform.com.ua/houses?secret=value#fragment",
                  "blocked-uri":
                    "https://evil.example/script.js?token=value",
                  "effective-directive":
                    "script-src-elem",
                  "violated-directive":
                    "script-src",
                  disposition:
                    "report",
                  "status-code": 200,
                },
              }),
            ),
          );

        expect(response.status).toBe(204);
        expect(warning).toHaveBeenCalledTimes(1);

        const serialized = String(
          warning.mock.calls[0]?.[1] ?? "",
        );

        expect(serialized).toContain(
          "https://admin.osbb-platform.com.ua/houses",
        );

        expect(serialized).toContain(
          "https://evil.example/script.js",
        );

        expect(serialized).not.toContain(
          "secret=value",
        );

        expect(serialized).not.toContain(
          "token=value",
        );
      },
    );

    it(
      "accepts Reporting API payloads",
      async () => {
        const warning = vi
          .spyOn(
            console,
            "warn",
          )
          .mockImplementation(
            () => undefined,
          );

        const response =
          await handleCspReportRequest(
            createRequest(
              JSON.stringify([
                {
                  type: "csp-violation",
                  body: {
                    documentURL:
                      "https://house.osbb-platform.com.ua/reports?x=1",
                    blockedURL:
                      "https://example.supabase.co/storage/report.pdf?token=secret",
                    effectiveDirective:
                      "frame-src",
                    disposition:
                      "report",
                    statusCode:
                      200,
                  },
                },
              ]),
            ),
          );

        expect(response.status).toBe(204);
        expect(warning).toHaveBeenCalledTimes(1);

        const serialized = String(
          warning.mock.calls[0]?.[1] ?? "",
        );

        expect(serialized).toContain(
          "frame-src",
        );

        expect(serialized).not.toContain(
          "token=secret",
        );
      },
    );

    it(
      "ignores malformed JSON",
      async () => {
        const warning = vi
          .spyOn(
            console,
            "warn",
          )
          .mockImplementation(
            () => undefined,
          );

        const response =
          await handleCspReportRequest(
            createRequest("{not-json"),
          );

        expect(response.status).toBe(204);
        expect(warning).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects oversized bodies",
      async () => {
        const response =
          await handleCspReportRequest(
            createRequest(
              "x".repeat(
                CSP_REPORT_MAX_BODY_BYTES
                  + 1,
              ),
            ),
          );

        expect(response.status).toBe(413);
      },
    );
  },
);
