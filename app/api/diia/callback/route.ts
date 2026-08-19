import { createHmac } from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveDiiaProvider,
} from "@/src/modules/diia/provider";
import {
  finalizeOnlineBallotCallback,
  recordDiiaCallbackRejection,
} from "@/src/modules/houses/resident/onlineVotingRepository";
import {
  getClientIpFromHeaders,
} from "@/src/shared/security/clientIp";
import {
  rateLimitPolicies,
} from "@/src/shared/security/rateLimitPolicies";
import {
  consumeServerRateLimit,
} from "@/src/shared/security/serverRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control":
    "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function callbackJson(
  code: string,
  status: number,
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    {
      ok: false,
      code,
    },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        ...(retryAfterSeconds !== undefined
          ? {
              "Retry-After":
                String(retryAfterSeconds),
            }
          : {}),
      },
    },
  );
}

function normalizeContextValue(
  value: string | undefined,
): string | null {
  const normalized = value?.trim() ?? "";

  return normalized || null;
}

function isSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    value,
  );
}

function resultRedirect(
  request: Request,
  slug: string,
  result: "confirmed" | "failed",
  code?: string,
) {
  const url = new URL(
    `/house/${encodeURIComponent(slug)}/meetings`,
    request.url,
  );

  url.searchParams.set(
    "onlineVote",
    result,
  );

  if (
    code &&
    /^[A-Z0-9_]{1,64}$/.test(code)
  ) {
    url.searchParams.set(
      "onlineVoteCode",
      code,
    );
  }

  const response =
    NextResponse.redirect(url);

  for (
    const [key, value]
    of Object.entries(NO_STORE_HEADERS)
  ) {
    response.headers.set(key, value);
  }

  return response;
}

async function rawProviderCallback(
  request: NextRequest,
): Promise<unknown> {
  if (request.method === "GET") {
    return request.url;
  }

  const contentType =
    request.headers
      .get("content-type")
      ?.toLowerCase() ?? "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  if (
    contentType.includes(
      "application/x-www-form-urlencoded",
    )
  ) {
    try {
      return new URLSearchParams(
        await request.text(),
      );
    } catch {
      return null;
    }
  }

  try {
    return await request.text();
  } catch {
    return null;
  }
}

function identityHmac(
  stableIdentityId: string,
  secret: string,
) {
  return createHmac(
    "sha256",
    secret,
  )
    .update(stableIdentityId)
    .digest("hex");
}

async function handleCallback(
  request: NextRequest,
) {
  const clientIp =
    getClientIpFromHeaders(
      request.headers,
    );

  let rateLimit;

  try {
    rateLimit =
      await consumeServerRateLimit({
        policy:
          rateLimitPolicies.diiaCallback,
        subject: [
          rateLimitPolicies
            .diiaCallback.scope,
          clientIp,
        ].join(":"),
      });
  } catch {
    return callbackJson(
      "CALLBACK_RATE_LIMIT_UNAVAILABLE",
      503,
    );
  }

  if (!rateLimit.allowed) {
    return callbackJson(
      "RATE_LIMITED",
      429,
      rateLimit.retryAfterSeconds,
    );
  }

  let resolution;

  try {
    resolution =
      resolveDiiaProvider();
  } catch {
    return callbackJson(
      "DIIA_CONFIG_INVALID",
      503,
    );
  }

  if (
    !resolution.provider ||
    !resolution.config.enabled
  ) {
    return callbackJson(
      "ONLINE_VOTING_UNAVAILABLE",
      503,
    );
  }

  const provider =
    resolution.provider;
  const config =
    resolution.config;

  const raw =
    await rawProviderCallback(
      request,
    );

  let verified;

  try {
    verified =
      await provider.verifyCallback(
        raw,
      );
  } catch {
    await recordDiiaCallbackRejection(
      provider.name,
      "PROVIDER_VERIFY_FAILED",
    );

    return callbackJson(
      "INVALID_CALLBACK",
      400,
    );
  }

  if (!verified.ok) {
    await recordDiiaCallbackRejection(
      provider.name,
      verified.code,
    );

    return callbackJson(
      "INVALID_CALLBACK",
      400,
    );
  }

  const ballotId =
    normalizeContextValue(
      verified.returnCtx.ballotId,
    );

  const meetingId =
    normalizeContextValue(
      verified.returnCtx.meetingId,
    );

  const slug =
    normalizeContextValue(
      verified.returnCtx.slug,
    );

  if (
    !ballotId ||
    !meetingId ||
    !slug ||
    !isSafeSlug(slug)
  ) {
    await recordDiiaCallbackRejection(
      provider.name,
      "RETURN_CONTEXT_INVALID",
    );

    return callbackJson(
      "INVALID_CALLBACK_CONTEXT",
      400,
    );
  }

  const stableIdentityId =
    verified.identityStableId.trim();

  const txnId =
    verified.txnId.trim();

  const challenge =
    verified.challenge.trim();

  if (
    !stableIdentityId ||
    !txnId ||
    !challenge
  ) {
    await recordDiiaCallbackRejection(
      provider.name,
      "VERIFIED_FIELDS_INVALID",
    );

    return callbackJson(
      "INVALID_CALLBACK",
      400,
    );
  }

  const hmac =
    identityHmac(
      stableIdentityId,
      config.identityHmacSecret,
    );

  let finalized;

  try {
    finalized =
      await finalizeOnlineBallotCallback({
        ballotId,
        meetingId,
        slug,
        challenge,
        provider:
          provider.name,
        identityHmac: hmac,
        txnId,
        verifiedAt:
          new Date().toISOString(),
      });
  } catch {
    return resultRedirect(
      request,
      slug,
      "failed",
      "CALLBACK_FINALIZE_FAILED",
    );
  }

  if (!finalized.ok) {
    return resultRedirect(
      request,
      slug,
      "failed",
      finalized.code,
    );
  }

  return resultRedirect(
    request,
    slug,
    "confirmed",
    finalized.code,
  );
}

export async function GET(
  request: NextRequest,
) {
  return handleCallback(request);
}

export async function POST(
  request: NextRequest,
) {
  return handleCallback(request);
}
