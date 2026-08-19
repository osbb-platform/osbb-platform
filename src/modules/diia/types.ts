export type DiiaProviderName = "mock" | "diia";

export type DiiaReadinessStatus =
  | "code_ready"
  | "sandbox_connected"
  | "production_enabled";

export type DiiaReturnContext = Readonly<Record<string, string>>;

export type DiiaInitAuthResult =
  | {
      redirectUrl: string;
      deepLink?: never;
    }
  | {
      redirectUrl?: never;
      deepLink: string;
    };

export type DiiaVerifiedCallback = {
  ok: true;
  identityStableId: string;
  txnId: string;
  challenge: string;
  returnCtx: DiiaReturnContext;
};

export type DiiaRejectedCallback = {
  ok: false;
  code:
    | "INVALID_CALLBACK"
    | "INVALID_SIGNATURE"
    | "INVALID_PAYLOAD"
    | "DIIA_OFFICIAL_CONTRACT_NOT_CONFIGURED";
};

export type DiiaVerifyCallbackResult =
  | DiiaVerifiedCallback
  | DiiaRejectedCallback;

export interface DiiaProvider {
  readonly name: DiiaProviderName;

  initAuthRequest(
    challenge: string,
    returnCtx: DiiaReturnContext,
  ): Promise<DiiaInitAuthResult>;

  verifyCallback(
    raw: unknown,
  ): Promise<DiiaVerifyCallbackResult>;
}

export type DiiaProviderState = {
  enabled: boolean;
  provider: DiiaProviderName | null;

  /**
   * T4 is code-ready.
   * sandbox_connected / production_enabled are operational statuses and
   * MUST NOT be inferred merely from the presence of environment variables.
   */
  readiness: DiiaReadinessStatus;
};
