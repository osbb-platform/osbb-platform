import type {
  DiiaProviderName,
  DiiaProviderState,
} from "./types";

type Env = Record<string, string | undefined>;

export type DiiaDisabledConfig = {
  enabled: false;
  provider: null;
  state: DiiaProviderState;
};

export type DiiaMockConfig = {
  enabled: true;
  provider: "mock";
  identityHmacSecret: string;
  callbackUrl: string;
  state: DiiaProviderState;
};

export type DiiaOfficialConfig = {
  enabled: true;
  provider: "diia";
  identityHmacSecret: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  state: DiiaProviderState;
};

export type DiiaConfig =
  | DiiaDisabledConfig
  | DiiaMockConfig
  | DiiaOfficialConfig;

function required(
  env: Env,
  key: string,
): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`DIIA_CONFIG_MISSING:${key}`);
  }

  return value;
}

function validUrl(
  value: string,
  key: string,
): string {
  try {
    const parsed = new URL(value);

    if (!parsed.protocol || !parsed.host) {
      throw new Error("invalid");
    }

    return value;
  } catch {
    throw new Error(`DIIA_CONFIG_INVALID_URL:${key}`);
  }
}

export function readDiiaConfig(
  env: Env = process.env,
): DiiaConfig {
  const rawProvider = env.DIIA_PROVIDER?.trim();

  if (!rawProvider) {
    return {
      enabled: false,
      provider: null,
      state: {
        enabled: false,
        provider: null,
        readiness: "code_ready",
      },
    };
  }

  if (
    rawProvider !== "mock" &&
    rawProvider !== "diia"
  ) {
    throw new Error("DIIA_CONFIG_INVALID_PROVIDER");
  }

  const provider = rawProvider as DiiaProviderName;

  const identityHmacSecret = required(
    env,
    "DIIA_IDENTITY_HMAC_SECRET",
  );

  const callbackUrl = validUrl(
    required(env, "DIIA_CALLBACK_URL"),
    "DIIA_CALLBACK_URL",
  );

  if (provider === "mock") {
    return {
      enabled: true,
      provider,
      identityHmacSecret,
      callbackUrl,
      state: {
        enabled: true,
        provider,
        readiness: "code_ready",
      },
    };
  }

  return {
    enabled: true,
    provider,
    identityHmacSecret,
    baseUrl: validUrl(
      required(env, "DIIA_BASE_URL"),
      "DIIA_BASE_URL",
    ),
    clientId: required(env, "DIIA_CLIENT_ID"),
    clientSecret: required(
      env,
      "DIIA_CLIENT_SECRET",
    ),
    callbackUrl,
    state: {
      enabled: true,
      provider,
      /**
       * Credentials being present does not prove sandbox connectivity
       * or production activation. Those statuses are operationally
       * verified after official Diia partner onboarding.
       */
      readiness: "code_ready",
    },
  };
}
