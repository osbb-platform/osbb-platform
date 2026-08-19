import "server-only";

import type { DiiaOfficialConfig } from "./config";
import type {
  DiiaInitAuthResult,
  DiiaProvider,
  DiiaReturnContext,
  DiiaVerifyCallbackResult,
} from "./types";

/**
 * Production Diia.Signature authorization adapter.
 *
 * IMPORTANT:
 * Do not add guessed endpoints, request fields, callback fields,
 * signature headers, algorithms, or identity fields here.
 *
 * The public Diia materials confirm the partner authorization
 * scenario, but the exact partner API contract must be completed
 * from official technical documentation supplied/approved during
 * partner onboarding.
 */
export class OfficialDiiaProvider implements DiiaProvider {
  readonly name = "diia" as const;

  constructor(
    private readonly config: DiiaOfficialConfig,
  ) {
    void this.config;
  }

  async initAuthRequest(
    _challenge: string,
    _returnCtx: DiiaReturnContext,
  ): Promise<DiiaInitAuthResult> {
    /**
     * TODO(DIIA-OFFICIAL-DOCS):
     * Implement only from the official partner documentation:
     * - authorization/session initiation endpoint;
     * - exact request/challenge format;
     * - authenticated client mechanism;
     * - approved callback/return binding;
     * - deep-link / QR response contract;
     * - official TTL/retry/rate-limit requirements.
     */
    throw new Error(
      "DIIA_OFFICIAL_CONTRACT_NOT_CONFIGURED",
    );
  }

  async verifyCallback(
    _raw: unknown,
  ): Promise<DiiaVerifyCallbackResult> {
    /**
     * TODO(DIIA-OFFICIAL-DOCS):
     * Implement only from the official partner documentation:
     * - callback transport;
     * - authenticity/signature verification;
     * - exact transaction identifier;
     * - official stable identity identifier;
     * - replay/idempotency contract;
     * - callback failure semantics.
     *
     * Never persist the raw callback or passport/personal fields.
     */
    return {
      ok: false,
      code:
        "DIIA_OFFICIAL_CONTRACT_NOT_CONFIGURED",
    };
  }
}
