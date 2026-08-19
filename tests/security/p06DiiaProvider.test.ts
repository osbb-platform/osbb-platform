import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readDiiaConfig } from "../../src/modules/diia/config";
import { MockDiiaProvider } from "../../src/modules/diia/mockProvider";

describe("P06 T4 Diia provider abstraction", () => {
  it("treats unset DIIA_PROVIDER as a safe feature-off state", () => {
    const config = readDiiaConfig({});

    expect(config.enabled).toBe(false);
    expect(config.provider).toBeNull();
    expect(config.state.readiness).toBe(
      "code_ready",
    );
  });

  it("validates the mock configuration", () => {
    const config = readDiiaConfig({
      DIIA_PROVIDER: "mock",
      DIIA_IDENTITY_HMAC_SECRET:
        "test-identity-secret",
      DIIA_CALLBACK_URL:
        "http://localhost:3000/api/diia/callback",
    });

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe("mock");
    expect(config.state.readiness).toBe(
      "code_ready",
    );
  });

  it("requires complete official-provider configuration", () => {
    expect(() =>
      readDiiaConfig({
        DIIA_PROVIDER: "diia",
        DIIA_IDENTITY_HMAC_SECRET: "secret",
        DIIA_CALLBACK_URL:
          "https://example.com/api/diia/callback",
      }),
    ).toThrow("DIIA_CONFIG_MISSING:DIIA_BASE_URL");

    const config = readDiiaConfig({
      DIIA_PROVIDER: "diia",
      DIIA_IDENTITY_HMAC_SECRET: "secret",
      DIIA_CALLBACK_URL:
        "https://example.com/api/diia/callback",
      DIIA_BASE_URL: "https://diia.example",
      DIIA_CLIENT_ID: "partner-client",
      DIIA_CLIENT_SECRET: "partner-secret",
    });

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe("diia");

    // Presence of credentials alone MUST NOT claim
    // sandbox or production connectivity.
    expect(config.state.readiness).toBe(
      "code_ready",
    );
  });

  it("rejects unknown providers", () => {
    expect(() =>
      readDiiaConfig({
        DIIA_PROVIDER: "something-else",
      }),
    ).toThrow("DIIA_CONFIG_INVALID_PROVIDER");
  });

  it("round-trips a signed Mock callback", async () => {
    const provider = new MockDiiaProvider({
      callbackUrl:
        "http://localhost:3000/api/diia/callback",
      identityHmacSecret:
        "unit-test-secret",
      identityFactory: () =>
        "mock-person-fixed",
      txnFactory: () =>
        "mock-txn-fixed",
    });

    const init = await provider.initAuthRequest(
      "challenge-123",
      {
        meetingId: "meeting-1",
        ballotId: "ballot-1",
        slug: "sobornyi-186",
      },
    );

    expect(typeof init.redirectUrl).toBe("string");

    if (typeof init.redirectUrl !== "string") {
      throw new Error("missing redirect");
    }

    const verified =
      await provider.verifyCallback(
        init.redirectUrl,
      );

    expect(verified).toEqual({
      ok: true,
      identityStableId:
        "mock-person-fixed",
      txnId: "mock-txn-fixed",
      challenge: "challenge-123",
      returnCtx: {
        meetingId: "meeting-1",
        ballotId: "ballot-1",
        slug: "sobornyi-186",
      },
    });
  });

  it("rejects a tampered Mock callback", async () => {
    const provider = new MockDiiaProvider({
      callbackUrl:
        "http://localhost:3000/api/diia/callback",
      identityHmacSecret:
        "unit-test-secret",
      identityFactory: () =>
        "mock-person-fixed",
      txnFactory: () =>
        "mock-txn-fixed",
    });

    const init = await provider.initAuthRequest(
      "challenge-123",
      { ballotId: "ballot-1" },
    );

    if (typeof init.redirectUrl !== "string") {
      throw new Error("missing redirect");
    }

    const url = new URL(init.redirectUrl);
    url.searchParams.set(
      "payload",
      `${url.searchParams.get("payload") ?? ""}x`,
    );

    const verified =
      await provider.verifyCallback(
        url.toString(),
      );

    expect(verified).toEqual({
      ok: false,
      code: "INVALID_SIGNATURE",
    });
  });

  it("allows deterministic Mock identity injection for duplicate-identity tests", async () => {
    const provider = new MockDiiaProvider({
      callbackUrl:
        "http://localhost:3000/api/diia/callback",
      identityHmacSecret:
        "unit-test-secret",
      identityFactory: () =>
        "same-co-owner",
    });

    const first =
      await provider.initAuthRequest(
        "challenge-one",
        {},
      );

    const second =
      await provider.initAuthRequest(
        "challenge-two",
        {},
      );

    if (
      typeof first.redirectUrl !== "string" ||
      typeof second.redirectUrl !== "string"
    ) {
      throw new Error("missing redirect");
    }

    const firstVerified =
      await provider.verifyCallback(
        first.redirectUrl,
      );

    const secondVerified =
      await provider.verifyCallback(
        second.redirectUrl,
      );

    expect(firstVerified.ok).toBe(true);
    expect(secondVerified.ok).toBe(true);

    if (
      firstVerified.ok &&
      secondVerified.ok
    ) {
      expect(
        firstVerified.identityStableId,
      ).toBe("same-co-owner");

      expect(
        secondVerified.identityStableId,
      ).toBe("same-co-owner");

      expect(firstVerified.txnId).not.toBe(
        secondVerified.txnId,
      );
    }
  });

  it("keeps the official provider fail-closed until the official contract is known", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/diia/diiaProvider.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      'import "server-only"',
    );
    expect(source).toContain(
      'throw new Error(\n      "DIIA_OFFICIAL_CONTRACT_NOT_CONFIGURED"',
    );
    expect(source).toContain(
      '"DIIA_OFFICIAL_CONTRACT_NOT_CONFIGURED"',
    );
  });

  it("contains no invented HTTP call in the official provider", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/diia/diiaProvider.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("axios");
    expect(source).toContain(
      "TODO(DIIA-OFFICIAL-DOCS)",
    );
    expect(source).toContain(
      "Do not add guessed endpoints",
    );
  });

  it("does not import legacy runtime code", () => {
    for (const file of [
      "types.ts",
      "config.ts",
      "mockProvider.ts",
      "diiaProvider.ts",
      "provider.ts",
      "index.ts",
    ]) {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          "src/modules/diia",
          file,
        ),
        "utf8",
      );

      expect(source).not.toContain(
        "legacy-v1",
      );
    }
  });
});
