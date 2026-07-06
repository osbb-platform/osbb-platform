import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildContentSecurityPolicyReportOnly,
  getSecurityResponseHeaders,
  type RuntimeEnvironment,
} from "@/src/shared/security/httpHeaders";

function readProjectFile(
  path: string,
) {
  return readFileSync(
    resolve(
      process.cwd(),
      path,
    ),
    "utf8",
  );
}

function toHeaderMap(
  environment: RuntimeEnvironment,
) {
  return new Map(
    getSecurityResponseHeaders(
      environment,
    ).map(
      ({ key, value }) => [
        key,
        value,
      ],
    ),
  );
}

describe(
  "S1.T7 security response headers",
  () => {
    it(
      "defines the required protection headers",
      () => {
        const headers =
          toHeaderMap("production");

        expect(
          headers.get(
            "Strict-Transport-Security",
          ),
        ).toBe(
          "max-age=31536000; includeSubDomains",
        );

        expect(
          headers.get(
            "X-Content-Type-Options",
          ),
        ).toBe("nosniff");

        expect(
          headers.get(
            "X-Frame-Options",
          ),
        ).toBe("DENY");

        expect(
          headers.get(
            "Referrer-Policy",
          ),
        ).toBe(
          "strict-origin-when-cross-origin",
        );

        expect(
          headers.get(
            "Permissions-Policy",
          ),
        ).toContain("camera=()");
      },
    );

    it(
      "uses report-only CSP before enforcement",
      () => {
        const headers =
          toHeaderMap("production");

        expect(
          headers.has(
            "Content-Security-Policy-Report-Only",
          ),
        ).toBe(true);

        expect(
          headers.has(
            "Content-Security-Policy",
          ),
        ).toBe(false);
      },
    );

    it(
      "accounts for Supabase, Storage, images and PDF frames",
      () => {
        const csp =
          buildContentSecurityPolicyReportOnly(
            "production",
          );

        expect(csp).toContain(
          "https://*.supabase.co",
        );

        expect(csp).toContain(
          "wss://*.supabase.co",
        );

        expect(csp).toContain(
          "https://images.unsplash.com",
        );

        expect(csp).toContain(
          "frame-src 'self' blob: https://*.supabase.co",
        );

        expect(csp).toContain(
          "report-uri /api/csp-report",
        );
      },
    );

    it(
      "limits unsafe-eval to development",
      () => {
        const production =
          buildContentSecurityPolicyReportOnly(
            "production",
          );

        const development =
          buildContentSecurityPolicyReportOnly(
            "development",
          );

        expect(production).toContain(
          "script-src 'self' 'unsafe-inline' 'report-sample'",
        );

        expect(production).not.toContain(
          "'unsafe-eval'",
        );

        expect(development).toContain(
          "'unsafe-eval'",
        );
      },
    );

    it(
      "wires the policy to all Next.js responses",
      () => {
        const source =
          readProjectFile(
            "next.config.ts",
          );

        expect(source).toContain(
          'source: "/:path*"',
        );

        expect(source).toContain(
          "getSecurityResponseHeaders()",
        );
      },
    );

    it(
      "documents the report endpoint",
      () => {
        const source =
          readProjectFile(
            "docs/SYSTEM_MAP.md",
          );

        expect(source).toContain(
          "Detected API routes: **4**.",
        );

        expect(source).toContain(
          "| POST | /api/csp-report |",
        );

        expect(source).toContain(
          "API route handlers         = 4",
        );
      },
    );
  },
);
