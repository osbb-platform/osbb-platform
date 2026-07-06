export const CSP_REPORT_PATH = "/api/csp-report";

export type RuntimeEnvironment =
  | "development"
  | "production"
  | "test"
  | undefined;

export type SecurityResponseHeader = {
  key: string;
  value: string;
};

/**
 * Phase 1 intentionally uses Report-Only CSP.
 *
 * The application and Next.js runtime currently emit inline scripts.
 * `unsafe-inline` is temporary and must be removed when the project moves
 * to request-scoped nonces before CSP enforcement.
 */
export function buildContentSecurityPolicyReportOnly(
  environment: RuntimeEnvironment = process.env.NODE_ENV,
): string {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "'report-sample'",
  ];

  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ];

  if (environment === "development") {
    scriptSources.push("'unsafe-eval'");

    connectSources.push(
      "http://localhost:*",
      "http://*.localhost:*",
      "ws://localhost:*",
      "ws://*.localhost:*",
    );
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      "https://images.unsplash.com",
      "https://*.supabase.co",
    ].join(" "),
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'self' blob: https://*.supabase.co",
    "media-src 'self' blob: https://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ");
}

export function getSecurityResponseHeaders(
  environment: RuntimeEnvironment = process.env.NODE_ENV,
): SecurityResponseHeader[] {
  return [
    {
      key: "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicyReportOnly(environment),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
}
