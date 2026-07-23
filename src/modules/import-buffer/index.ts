export {
  normalizeAccountNumber,
  normalizeLocalizedNumber,
} from "./normalization";

export {
  detectAdapter,
  getAdapter,
  listRegisteredAdapters,
  registerAdapter,
  requireAdapter,
} from "./registry";

export {
  buildImportPipelineStats,
  runImportPipeline,
} from "./pipeline";

export type {
  DetectResult,
  HeaderMap,
  ImportAdapter,
  ImportAdapterError,
  ImportAdapterKey,
  ImportMatchStatus,
  ImportPipelineResult,
  ImportPipelineStats,
  ImportResult,
  ImportRowClassification,
  ParsedRow,
  PeriodGuess,
  RawSheet,
} from "./types";

export {
  validateImportFileDescriptor,
  IMPORT_BUFFER_MAX_FILE_SIZE,
} from "./fileSecurity";

export {
  reconcileDebtors1cRows,
} from "./matching";

export {
  buildDebtorsMonthTransferRows,
} from "./debtors1cTransfer";

export {
  confirmImportBufferPeriod,
  discardImportBuffer,
  transferImportBufferToDebtors,
} from "./workflow";

export type {
  ActiveApartmentRegistryRow,
  DebtorsMonthTransferGateway,
  ImportBufferPreview,
  ImportBufferRepository,
  ImportBufferUploadRecord,
  ImportReconciliationResult,
  ImportReconciliationWarning,
  ImportReconciliationWarningCode,
  MatchedDebtors1cRow,
  ParsedDebtors1cPreviewInput,
  SkippedImportRow,
} from "./workflowTypes";
