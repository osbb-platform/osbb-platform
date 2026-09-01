import "server-only";

export type OnlineVotingProviderMode =
  | "internal_resident"
  | "official_diia"
  | "disabled";

type Env = Record<string, string | undefined>;

export type OnlineVotingProviderConfig =
  | {
      mode: "disabled";
      identityHmacSecret: null;
    }
  | {
      mode: "internal_resident";
      identityHmacSecret: string;
    }
  | {
      mode: "official_diia";
      identityHmacSecret: null;
    };

function required(
  env: Env,
  key: string,
): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(
      `ONLINE_VOTING_CONFIG_MISSING:${key}`,
    );
  }

  return value;
}

export function readOnlineVotingProviderConfig(
  env: Env = process.env,
): OnlineVotingProviderConfig {
  const raw =
    env.ONLINE_VOTING_PROVIDER?.trim() ?? "";

  if (!raw || raw === "disabled") {
    return {
      mode: "disabled",
      identityHmacSecret: null,
    };
  }

  if (raw === "internal_resident") {
    return {
      mode: raw,
      identityHmacSecret: required(
        env,
        "ONLINE_VOTING_IDENTITY_HMAC_SECRET",
      ),
    };
  }

  if (raw === "official_diia") {
    return {
      mode: raw,
      identityHmacSecret: null,
    };
  }

  throw new Error(
    "ONLINE_VOTING_CONFIG_INVALID_PROVIDER",
  );
}

export function readOnlineVotingProviderModeForUi(
  env: Env = process.env,
): OnlineVotingProviderMode {
  try {
    return readOnlineVotingProviderConfig(env).mode;
  } catch {
    return "disabled";
  }
}
