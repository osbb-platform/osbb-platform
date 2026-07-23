export type FileEntityType =
  | "house_report"
  | "house_announcement"
  | "house_document"
  | "house_plan_task";

export type FileAccessErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "AUTHENTICATION_REQUIRED"
  | "INTERNAL";

export type FileAccessResult =
  | {
      ok: true;
      signedUrl: string;
      bucket: string;
      path: string;
      filename: string | null;
    }
  | {
      ok: false;
      status: number;
      code: FileAccessErrorCode;
      message: string;
    };

export type SignedFileRequest = {
  entityType?: string | null;
  entityId?: string | null;
  fieldKey?: string | null;
  bucket?: string | null;
  path?: string | null;
  filename?: string | null;
  download?: boolean;
};

export type FileRegistryRow = {
  entity_type: string;
  entity_id: string;
  field_key: string;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
};

export type LifecycleRow = {
  id: string;
  house_id: string | null;
  lifecycle_status: string | null;
};

type EntityConfig = {
  table: string;
  buckets: readonly string[];
  fieldKeys: readonly string[] | null;
  lifecycleColumn: string | null;
  publicStatuses: readonly string[] | null;
};

export const FILE_ENTITY_CONFIG: Record<FileEntityType, EntityConfig> = {
  house_report: {
    table: "house_reports",
    buckets: ["house-reports"],
    fieldKeys: ["pdf"],
    lifecycleColumn: "lifecycle_status",
    publicStatuses: ["published"],
  },
  house_announcement: {
    table: "house_announcements",
    buckets: ["house-announcements"],
    fieldKeys: ["pdf"],
    lifecycleColumn: "lifecycle_status",
    publicStatuses: ["published"],
  },
  house_document: {
    table: "house_documents",
    buckets: ["house-documents"],
    fieldKeys: ["pdf"],
    lifecycleColumn: "lifecycle_status",
    publicStatuses: ["published"],
  },
  house_plan_task: {
    table: "house_plan_tasks",
    buckets: ["house-plan-media", "house-plan-documents"],
    fieldKeys: null,
    lifecycleColumn: "lifecycle_status",
    publicStatuses: ["published", "archived"],
  },
};

const GENERATED_HOUSE_ANNOUNCEMENT_PDF_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/announcement\.pdf$/i;

export function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function fileAccessFailure(
  status: number,
  code: FileAccessErrorCode,
  message: string,
): FileAccessResult {
  return {
    ok: false,
    status,
    code,
    message,
  };
}

export function normalizeFileEntityType(value: string | null | undefined): FileEntityType | null {
  const normalized = normalizeText(value);

  if (
    normalized === "house_report" ||
    normalized === "house_announcement" ||
    normalized === "house_document" ||
    normalized === "house_plan_task"
  ) {
    return normalized;
  }

  return null;
}

export function isAllowedBucketForEntity(entityType: FileEntityType, bucket: string) {
  return FILE_ENTITY_CONFIG[entityType].buckets.includes(bucket);
}

export function isAllowedFieldKeyForEntity(entityType: FileEntityType, fieldKey: string) {
  const allowedFieldKeys = FILE_ENTITY_CONFIG[entityType].fieldKeys;

  if (allowedFieldKeys === null) {
    return true;
  }

  return allowedFieldKeys.includes(fieldKey);
}

export function isGeneratedHouseAnnouncementPdfRequest(params: {
  bucket: string;
  path: string;
}) {
  return (
    params.bucket === "house-announcements" &&
    GENERATED_HOUSE_ANNOUNCEMENT_PDF_RE.test(params.path)
  );
}

export function isRegistryRowAllowedForRequest(
  row: Pick<
    FileRegistryRow,
    "entity_type" | "entity_id" | "field_key" | "storage_bucket" | "storage_path"
  >,
  request: SignedFileRequest,
) {
  const entityType = normalizeFileEntityType(row.entity_type);

  if (!entityType) {
    return false;
  }

  if (!isAllowedBucketForEntity(entityType, row.storage_bucket)) {
    return false;
  }

  if (!isAllowedFieldKeyForEntity(entityType, row.field_key)) {
    return false;
  }

  const requestedEntityType = normalizeText(request.entityType);
  const requestedEntityId = normalizeText(request.entityId);
  const requestedFieldKey = normalizeText(request.fieldKey);
  const requestedBucket = normalizeText(request.bucket);
  const requestedPath = normalizeText(request.path);

  if (requestedEntityType && requestedEntityType !== row.entity_type) {
    return false;
  }

  if (requestedEntityId && requestedEntityId !== row.entity_id) {
    return false;
  }

  if (requestedFieldKey && requestedFieldKey !== row.field_key) {
    return false;
  }

  if (requestedBucket && requestedBucket !== row.storage_bucket) {
    return false;
  }

  if (requestedPath && requestedPath !== row.storage_path) {
    return false;
  }

  return true;
}

export function canReadLifecycleEntity(params: {
  entityType: FileEntityType;
  lifecycleStatus: string | null;
  isAdmin: boolean;
}) {
  const config = FILE_ENTITY_CONFIG[params.entityType];

  if (config.lifecycleColumn === null) {
    return true;
  }

  if (params.isAdmin) {
    return true;
  }

  return Boolean(
    params.lifecycleStatus &&
      config.publicStatuses?.includes(params.lifecycleStatus),
  );
}
