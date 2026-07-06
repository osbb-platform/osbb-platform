import { NextRequest } from "next/server";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  handleReportViewRequest,
} from "@/app/api/reports/view/route";
import {
  resolveSignedFileUrl,
} from "@/src/modules/files/services/resolveSignedFileUrl";

const REPORT_ID =
  "33333333-3333-4333-8333-333333333333";

describe("GET /api/reports/view", () => {
  it("returns 400 for the removed path/bucket exploit contract", async () => {
    const resolver =
      vi.fn<typeof resolveSignedFileUrl>();

    const request = new NextRequest(
      "http://localhost/api/reports/view?path=../etc/passwd&bucket=house-reports",
    );

    const response =
      await handleReportViewRequest(
        request,
        resolver,
      );

    expect(response.status).toBe(400);
    expect(
      response.headers.get(
        "cache-control",
      ),
    ).toContain("no-store");

    expect(
      resolver,
    ).not.toHaveBeenCalled();
  });

  it("maps an unauthenticated resolver result to 401", async () => {
    const resolver =
      vi.fn<typeof resolveSignedFileUrl>();

    resolver.mockResolvedValue({
      ok: false,
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });

    const request = new NextRequest(
      `http://localhost/api/reports/view?entityType=house_report&entityId=${REPORT_ID}&fieldKey=pdf&houseSlug=house-a`,
    );

    const response =
      await handleReportViewRequest(
        request,
        resolver,
      );

    expect(response.status).toBe(401);
    expect(
      await response.text(),
    ).toBe(
      "Authentication required",
    );
  });

  it("redirects an authorized request with status 302", async () => {
    const resolver =
      vi.fn<typeof resolveSignedFileUrl>();

    resolver.mockResolvedValue({
      ok: true,
      signedUrl:
        "https://storage.example/signed",
    });

    const request = new NextRequest(
      `http://localhost/api/reports/view?entityType=house_report&entityId=${REPORT_ID}&fieldKey=pdf&houseSlug=house-a`,
    );

    const response =
      await handleReportViewRequest(
        request,
        resolver,
      );

    expect(response.status).toBe(302);
    expect(
      response.headers.get("location"),
    ).toBe(
      "https://storage.example/signed",
    );
  });
});
