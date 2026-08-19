import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type {
  DiiaInitAuthResult,
  DiiaProvider,
  DiiaReturnContext,
  DiiaVerifyCallbackResult,
} from "./types";

type MockCallbackPayload = {
  version: 1;
  challenge: string;
  returnCtx: DiiaReturnContext;
  identityStableId: string;
  txnId: string;
  issuedAt: string;
};

type MockIdentityFactory = (
  context: DiiaReturnContext,
) => string;

type MockTxnFactory = () => string;

function encodePayload(
  payload: MockCallbackPayload,
): string {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
}

function decodePayload(
  encoded: string,
): MockCallbackPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as unknown;

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    const value = parsed as Record<string, unknown>;

    if (
      value.version !== 1 ||
      typeof value.challenge !== "string" ||
      !value.challenge ||
      typeof value.identityStableId !== "string" ||
      !value.identityStableId ||
      typeof value.txnId !== "string" ||
      !value.txnId ||
      typeof value.issuedAt !== "string" ||
      !value.issuedAt ||
      !value.returnCtx ||
      typeof value.returnCtx !== "object" ||
      Array.isArray(value.returnCtx)
    ) {
      return null;
    }

    const returnCtx: Record<string, string> = {};

    for (
      const [key, rawValue]
      of Object.entries(
        value.returnCtx as Record<string, unknown>,
      )
    ) {
      if (typeof rawValue !== "string") {
        return null;
      }

      returnCtx[key] = rawValue;
    }

    return {
      version: 1,
      challenge: value.challenge,
      returnCtx,
      identityStableId: value.identityStableId,
      txnId: value.txnId,
      issuedAt: value.issuedAt,
    };
  } catch {
    return null;
  }
}

function deriveMockSigningKey(
  identityHmacSecret: string,
): Buffer {
  return createHmac(
    "sha256",
    identityHmacSecret,
  )
    .update("osbb:p06:mock-provider-signing:v1")
    .digest();
}

function signatureFor(
  payload: string,
  signingKey: Buffer,
): string {
  return createHmac("sha256", signingKey)
    .update(payload)
    .digest("hex");
}

function signaturesEqual(
  left: string,
  right: string,
): boolean {
  if (
    !/^[a-f0-9]{64}$/i.test(left) ||
    !/^[a-f0-9]{64}$/i.test(right)
  ) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function callbackFields(
  raw: unknown,
): {
  payload: string;
  signature: string;
} | null {
  if (raw instanceof URLSearchParams) {
    const payload = raw.get("payload");
    const signature = raw.get("sig");

    return payload && signature
      ? { payload, signature }
      : null;
  }

  if (typeof raw === "string") {
    try {
      const url = new URL(raw, "https://mock.local");
      return callbackFields(url.searchParams);
    } catch {
      return null;
    }
  }

  if (
    raw &&
    typeof raw === "object"
  ) {
    const object = raw as Record<string, unknown>;

    if (
      typeof object.payload === "string" &&
      typeof object.sig === "string"
    ) {
      return {
        payload: object.payload,
        signature: object.sig,
      };
    }
  }

  return null;
}

export class MockDiiaProvider implements DiiaProvider {
  readonly name = "mock" as const;

  private readonly callbackUrl: string;
  private readonly signingKey: Buffer;
  private readonly identityFactory: MockIdentityFactory;
  private readonly txnFactory: MockTxnFactory;

  constructor(params: {
    callbackUrl: string;
    identityHmacSecret: string;

    /**
     * Test-only injection point.
     * Production application code does not provide this.
     */
    identityFactory?: MockIdentityFactory;
    txnFactory?: MockTxnFactory;
  }) {
    this.callbackUrl = params.callbackUrl;
    this.signingKey = deriveMockSigningKey(
      params.identityHmacSecret,
    );

    this.identityFactory =
      params.identityFactory ??
      (() => `mock-identity:${randomUUID()}`);

    this.txnFactory =
      params.txnFactory ??
      (() => `mock-txn:${randomUUID()}`);
  }

  async initAuthRequest(
    challenge: string,
    returnCtx: DiiaReturnContext,
  ): Promise<DiiaInitAuthResult> {
    const normalizedChallenge = challenge.trim();

    if (!normalizedChallenge) {
      throw new Error("DIIA_CHALLENGE_REQUIRED");
    }

    const payload: MockCallbackPayload = {
      version: 1,
      challenge: normalizedChallenge,
      returnCtx: { ...returnCtx },
      identityStableId:
        this.identityFactory(returnCtx),
      txnId: this.txnFactory(),
      issuedAt: new Date().toISOString(),
    };

    const encoded = encodePayload(payload);
    const signature = signatureFor(
      encoded,
      this.signingKey,
    );

    const redirect = new URL(this.callbackUrl);

    redirect.searchParams.set("provider", "mock");
    redirect.searchParams.set("payload", encoded);
    redirect.searchParams.set("sig", signature);

    return {
      redirectUrl: redirect.toString(),
    };
  }

  async verifyCallback(
    raw: unknown,
  ): Promise<DiiaVerifyCallbackResult> {
    const fields = callbackFields(raw);

    if (!fields) {
      return {
        ok: false,
        code: "INVALID_CALLBACK",
      };
    }

    const expectedSignature = signatureFor(
      fields.payload,
      this.signingKey,
    );

    if (
      !signaturesEqual(
        fields.signature,
        expectedSignature,
      )
    ) {
      return {
        ok: false,
        code: "INVALID_SIGNATURE",
      };
    }

    const payload = decodePayload(fields.payload);

    if (!payload) {
      return {
        ok: false,
        code: "INVALID_PAYLOAD",
      };
    }

    return {
      ok: true,
      identityStableId:
        payload.identityStableId,
      txnId: payload.txnId,
      challenge: payload.challenge,
      returnCtx: payload.returnCtx,
    };
  }
}
