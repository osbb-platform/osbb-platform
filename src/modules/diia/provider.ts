import "server-only";

import {
  readDiiaConfig,
  type DiiaConfig,
} from "./config";
import { OfficialDiiaProvider } from "./diiaProvider";
import { MockDiiaProvider } from "./mockProvider";
import type {
  DiiaProvider,
  DiiaProviderState,
} from "./types";

export type DiiaProviderResolution = {
  provider: DiiaProvider | null;
  state: DiiaProviderState;
  config: DiiaConfig;
};

export function resolveDiiaProvider(
  config: DiiaConfig = readDiiaConfig(),
): DiiaProviderResolution {
  if (!config.enabled) {
    return {
      provider: null,
      state: config.state,
      config,
    };
  }

  if (config.provider === "mock") {
    return {
      provider: new MockDiiaProvider({
        callbackUrl: config.callbackUrl,
        identityHmacSecret:
          config.identityHmacSecret,
      }),
      state: config.state,
      config,
    };
  }

  return {
    provider: new OfficialDiiaProvider(config),
    state: config.state,
    config,
  };
}
