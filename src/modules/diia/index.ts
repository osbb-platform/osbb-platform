export {
  readDiiaConfig,
  type DiiaConfig,
  type DiiaDisabledConfig,
  type DiiaMockConfig,
  type DiiaOfficialConfig,
} from "./config";

export {
  resolveDiiaProvider,
  type DiiaProviderResolution,
} from "./provider";

export { MockDiiaProvider } from "./mockProvider";
export { OfficialDiiaProvider } from "./diiaProvider";

export type {
  DiiaInitAuthResult,
  DiiaProvider,
  DiiaProviderName,
  DiiaProviderState,
  DiiaReadinessStatus,
  DiiaRejectedCallback,
  DiiaReturnContext,
  DiiaVerifiedCallback,
  DiiaVerifyCallbackResult,
} from "./types";
