import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  parseSignedFileRequest,
  resolveSignedFileUrl,
  type FileTargetLookupResult,
  type ResolveSignedFileUrlDependencies,
  type ResolvedFileTarget,
  type SignedFileRequest,
} from "@/src/modules/files/services/resolveSignedFileUrl";

const HOUSE_A =
  "11111111-1111-4111-8111-111111111111";
const HOUSE_B =
  "22222222-2222-4222-8222-222222222222";
const REPORT_ID =
  "33333333-3333-4333-8333-333333333333";

const VALID_REQUEST: SignedFileRequest = {
  entityType: "house_report",
  entityId: REPORT_ID,
  fieldKey: "pdf",
  houseSlug: "house-a",
};

const OWN_TARGET: ResolvedFileTarget = {
  houseId: HOUSE_A,
  bucket: "house-reports",
  path: `${HOUSE_A}/report.pdf`,
  residentVisible: true,
};

type HarnessOptions = {
  admin?: boolean;
  cookie?: string | null;
  sessionValid?: boolean;
  sessionHouseId?: string | null;
  lookup?: FileTargetLookupResult;
  signedUrl?: string | null;
};

function createHarness(
  options: HarnessOptions = {},
) {
  const events: string[] = [];

  const resolveTarget = vi.fn(
    async (): Promise<FileTargetLookupResult> => {
      events.push("lookup");

      return (
        options.lookup ?? {
          kind: "found",
          target: OWN_TARGET,
        }
      );
    },
  );

  const createDataSource = vi.fn(
    async () => {
      events.push("data-source");

      return {
        resolveTarget,
      };
    },
  );

  const signFile = vi.fn(
    async () => {
      events.push("sign");

      return options.signedUrl === undefined
        ? "https://storage.example/signed"
        : options.signedUrl;
    },
  );

  const dependencies: ResolveSignedFileUrlDependencies =
    {
      async getCurrentAdminUser() {
        events.push("admin");

        return options.admin
          ? {
              role: "admin",
              status: "active",
            }
          : null;
      },

      async getCookieValue() {
        events.push("cookie");

        if (options.cookie === null) {
          return undefined;
        }

        return (
          options.cookie ??
          "resident-session-token"
        );
      },

      async validateHouseSession() {
        events.push("validate");

        return (
          options.sessionValid ?? true
        );
      },

      async getHouseBySlug() {
        events.push("house");

        if (
          options.sessionHouseId === null
        ) {
          return null;
        }

        return {
          id:
            options.sessionHouseId ??
            HOUSE_A,
        };
      },

      createDataSource,
      signFile,
    };

  return {
    dependencies,
    events,
    createDataSource,
    resolveTarget,
    signFile,
  };
}

describe("S1.T2 private file access", () => {
  it("accepts any canonical PostgreSQL UUID version", () => {
    const parsed = parseSignedFileRequest(
      new URLSearchParams({
        entityType: "house_report",
        entityId: "33333333-3333-7333-8333-333333333333",
        fieldKey: "pdf",
        houseSlug: "house-a",
      }),
    );

    expect(parsed.ok).toBe(true);
  });

  it("rejects the legacy path and bucket query contract", () => {
    const parsed =
      parseSignedFileRequest(
        new URLSearchParams({
          path: "../etc/passwd",
          bucket: "house-reports",
        }),
      );

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.status).toBe(400);
    }
  });

  it("rejects anonymous access before database lookup or signing", async () => {
    const harness = createHarness({
      cookie: null,
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toMatchObject({
      ok: false,
      status: 401,
    });

    expect(
      harness.createDataSource,
    ).not.toHaveBeenCalled();

    expect(
      harness.signFile,
    ).not.toHaveBeenCalled();
  });

  it("rejects an invalid house session before lookup", async () => {
    const harness = createHarness({
      sessionValid: false,
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
    });

    expect(
      harness.createDataSource,
    ).not.toHaveBeenCalled();

    expect(
      harness.signFile,
    ).not.toHaveBeenCalled();
  });

  it("rejects a file owned by another house", async () => {
    const harness = createHarness({
      lookup: {
        kind: "found",
        target: {
          ...OWN_TARGET,
          houseId: HOUSE_B,
        },
      },
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
    });

    expect(
      harness.signFile,
    ).not.toHaveBeenCalled();
  });

  it("rejects traversal returned by a malformed trusted record", async () => {
    const harness = createHarness({
      lookup: {
        kind: "found",
        target: {
          ...OWN_TARGET,
          path: "../foreign/file.pdf",
        },
      },
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toMatchObject({
      ok: false,
      status: 400,
    });

    expect(
      harness.signFile,
    ).not.toHaveBeenCalled();
  });

  it("rejects a bucket outside the entity allowlist", async () => {
    const harness = createHarness({
      lookup: {
        kind: "found",
        target: {
          ...OWN_TARGET,
          bucket: "untrusted-bucket",
        },
      },
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
    });

    expect(
      harness.signFile,
    ).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown trusted file record", async () => {
    const harness = createHarness({
      lookup: {
        kind: "not_found",
      },
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toMatchObject({
      ok: false,
      status: 404,
    });

    expect(
      harness.signFile,
    ).not.toHaveBeenCalled();
  });

  it("signs an owned file only after auth and ownership checks", async () => {
    const harness = createHarness();

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toEqual({
      ok: true,
      signedUrl:
        "https://storage.example/signed",
    });

    expect(harness.events).toEqual([
      "admin",
      "cookie",
      "validate",
      "house",
      "data-source",
      "lookup",
      "sign",
    ]);
  });

  it("does not expose a storage failure", async () => {
    const harness = createHarness({
      signedUrl: null,
    });

    const result =
      await resolveSignedFileUrl(
        VALID_REQUEST,
        harness.dependencies,
      );

    expect(result).toEqual({
      ok: false,
      status: 404,
      code: "FILE_UNAVAILABLE",
    });

    expect(
      JSON.stringify(result),
    ).not.toContain("storage");
  });

  it("allows an active admin without a resident cookie", async () => {
    const harness = createHarness({
      admin: true,
      cookie: null,
    });

    const result =
      await resolveSignedFileUrl(
        {
          ...VALID_REQUEST,
          houseSlug: null,
        },
        harness.dependencies,
      );

    expect(result.ok).toBe(true);
    expect(harness.events).toEqual([
      "admin",
      "data-source",
      "lookup",
      "sign",
    ]);
  });
});
