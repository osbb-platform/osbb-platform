import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getHouseBySlug as loadHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import {
  FILE_ENTITY_TYPES,
  type FileEntityType,
} from "@/src/modules/files/types/fileAccess";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HOUSE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ALLOWED_QUERY_KEYS = new Set([
  "entityType",
  "entityId",
  "fieldKey",
  "houseSlug",
  "filename",
  "download",
  "v",
]);

const FILE_ENTITY_TYPE_SET = new Set<string>(FILE_ENTITY_TYPES);

export type SignedFileRequest = {
  entityType: FileEntityType;
  entityId: string;
  fieldKey: string;
  houseSlug: string | null;
};

export type FileAccessFailure = {
  ok: false;
  status: 400 | 401 | 403 | 404 | 500;
  code: string;
};

export type FileAccessSuccess = {
  ok: true;
  signedUrl: string;
};

export type FileAccessResult = FileAccessFailure | FileAccessSuccess;

export type ParseSignedFileRequestResult =
  | {
      ok: true;
      request: SignedFileRequest;
    }
  | FileAccessFailure;

export type ResolvedFileTarget = {
  houseId: string;
  bucket: string;
  path: string;
  residentVisible: boolean;
};

export type FileTargetLookupResult =
  | {
      kind: "found";
      target: ResolvedFileTarget;
    }
  | {
      kind: "not_found";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "internal_error";
    };

export type FileAccessDataSource = {
  resolveTarget(
    request: SignedFileRequest,
    isAdmin: boolean,
  ): Promise<FileTargetLookupResult>;
};

export type ResolveSignedFileUrlDependencies = {
  getCurrentAdminUser(): Promise<{
    role: string | null;
    status: string | null;
  } | null>;

  getCookieValue(name: string): Promise<string | undefined>;

  validateHouseSession(params: {
    slug: string;
    sessionToken: string;
  }): Promise<boolean>;

  getHouseBySlug(slug: string): Promise<{ id: string } | null>;

  createDataSource(): Promise<FileAccessDataSource>;

  signFile(params: {
    bucket: string;
    path: string;
  }): Promise<string | null>;
};

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type RowLookupResult =
  | {
      kind: "found";
      row: Record<string, unknown>;
    }
  | {
      kind: "not_found";
    }
  | {
      kind: "internal_error";
    };

type ContentFileLookupResult =
  | {
      kind: "found";
      bucket: string;
      path: string;
    }
  | {
      kind: "not_found";
    }
  | {
      kind: "internal_error";
    };

function failure(
  status: FileAccessFailure["status"],
  code: string,
): FileAccessFailure {
  return {
    ok: false,
    status,
    code,
  };
}

function readString(
  row: Record<string, unknown>,
  key: string,
): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function isValidFieldKey(
  entityType: FileEntityType,
  fieldKey: string,
): boolean {
  if (entityType === "house_report") {
    return fieldKey === "pdf";
  }

  if (entityType === "house_document") {
    return fieldKey === "pdf";
  }

  if (entityType === "house_plan_task") {
    return /^(?:image|pdf)_[0-9]+$/.test(fieldKey);
  }

  if (entityType === "house_meeting") {
    return fieldKey === "protocol";
  }

  return fieldKey === "pdf";
}

function allowedBucketsForRequest(
  request: SignedFileRequest,
): ReadonlySet<string> {
  if (request.entityType === "house_report") {
    return new Set(["house-reports"]);
  }

  if (request.entityType === "house_document") {
    return new Set(["house-documents"]);
  }

  if (request.entityType === "house_plan_task") {
    return request.fieldKey.startsWith("image_")
      ? new Set(["house-plan-media"])
      : new Set(["house-plan-documents"]);
  }

  if (request.entityType === "house_meeting") {
    // Current meeting protocol flow supports:
    // 1. a canonical house_document record;
    // 2. a legacy protocol_pdf storage path in house-reports.
    return new Set(["house-documents", "house-reports"]);
  }

  return new Set(["house-announcements"]);
}

export function isSafeStoragePath(value: string): boolean {
  const path = value.trim();

  if (!path || path.length > 1024) {
    return false;
  }

  if (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    path.includes("\\") ||
    path.includes("?") ||
    path.includes("#") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return false;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return false;
  }

  if (/%(?:2e|2f|5c)/i.test(path)) {
    return false;
  }

  const segments = path.split("/");

  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== "." &&
      segment !== "..",
  );
}

export function parseSignedFileRequest(
  searchParams: URLSearchParams,
): ParseSignedFileRequestResult {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return failure(400, "INVALID_QUERY");
    }
  }

  for (const key of ["entityType", "entityId", "fieldKey"]) {
    if (searchParams.getAll(key).length !== 1) {
      return failure(400, "INVALID_QUERY");
    }
  }

  if (searchParams.getAll("houseSlug").length > 1) {
    return failure(400, "INVALID_QUERY");
  }

  const entityTypeValue =
    searchParams.get("entityType")?.trim() ?? "";
  const entityId = searchParams.get("entityId")?.trim() ?? "";
  const fieldKey = searchParams.get("fieldKey")?.trim() ?? "";
  const houseSlugValue =
    searchParams.get("houseSlug")?.trim() ?? "";

  if (!FILE_ENTITY_TYPE_SET.has(entityTypeValue)) {
    return failure(400, "INVALID_ENTITY_TYPE");
  }

  const entityType = entityTypeValue as FileEntityType;

  if (!UUID_PATTERN.test(entityId)) {
    return failure(400, "INVALID_ENTITY_ID");
  }

  if (
    !fieldKey ||
    fieldKey.length > 100 ||
    !isValidFieldKey(entityType, fieldKey)
  ) {
    return failure(400, "INVALID_FIELD_KEY");
  }

  if (
    houseSlugValue &&
    (
      houseSlugValue.length > 120 ||
      !HOUSE_SLUG_PATTERN.test(houseSlugValue)
    )
  ) {
    return failure(400, "INVALID_HOUSE_SLUG");
  }

  return {
    ok: true,
    request: {
      entityType,
      entityId,
      fieldKey,
      houseSlug: houseSlugValue || null,
    },
  };
}

async function loadRow(
  supabase: ServerSupabaseClient,
  params: {
    table: string;
    select: string;
    id: string;
  },
): Promise<RowLookupResult> {
  const { data, error } = await supabase
    .from(params.table)
    .select(params.select)
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[file-access] entity lookup failed", {
      table: params.table,
    });

    return {
      kind: "internal_error",
    };
  }

  if (!data) {
    return {
      kind: "not_found",
    };
  }

  return {
    kind: "found",
    row: data as unknown as Record<string, unknown>,
  };
}

async function loadContentFile(
  supabase: ServerSupabaseClient,
  params: {
    entityType: string;
    entityId: string;
    fieldKey: string;
  },
): Promise<ContentFileLookupResult> {
  const { data, error } = await supabase
    .from("house_content_files")
    .select("storage_bucket, storage_path")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .eq("field_key", params.fieldKey)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[file-access] content file lookup failed", {
      entityType: params.entityType,
    });

    return {
      kind: "internal_error",
    };
  }

  if (!data) {
    return {
      kind: "not_found",
    };
  }

  const row = data as unknown as Record<string, unknown>;
  const bucket = readString(row, "storage_bucket");
  const path = readString(row, "storage_path");

  if (!bucket || !path) {
    return {
      kind: "not_found",
    };
  }

  return {
    kind: "found",
    bucket,
    path,
  };
}

async function resolveTrackedTarget(
  supabase: ServerSupabaseClient,
  params: {
    request: SignedFileRequest;
    table: string;
    entitySelect: string;
    residentVisible(
      row: Record<string, unknown>,
    ): boolean;
  },
): Promise<FileTargetLookupResult> {
  const entityLookup = await loadRow(supabase, {
    table: params.table,
    select: params.entitySelect,
    id: params.request.entityId,
  });

  if (entityLookup.kind !== "found") {
    return entityLookup;
  }

  const houseId = readString(entityLookup.row, "house_id");

  if (!UUID_PATTERN.test(houseId)) {
    return {
      kind: "internal_error",
    };
  }

  const fileLookup = await loadContentFile(supabase, {
    entityType: params.request.entityType,
    entityId: params.request.entityId,
    fieldKey: params.request.fieldKey,
  });

  if (fileLookup.kind !== "found") {
    return fileLookup;
  }

  return {
    kind: "found",
    target: {
      houseId,
      bucket: fileLookup.bucket,
      path: fileLookup.path,
      residentVisible: params.residentVisible(
        entityLookup.row,
      ),
    },
  };
}

function createSupabaseFileAccessDataSource(
  supabase: ServerSupabaseClient,
): FileAccessDataSource {
  return {
    async resolveTarget(request, isAdmin) {
      if (request.entityType === "house_report") {
        return resolveTrackedTarget(supabase, {
          request,
          table: "house_reports",
          entitySelect: "house_id, lifecycle_status",
          residentVisible: (row) =>
            readString(row, "lifecycle_status") ===
            "published",
        });
      }

      if (request.entityType === "house_document") {
        return resolveTrackedTarget(supabase, {
          request,
          table: "house_documents",
          entitySelect: "house_id, lifecycle_status",
          residentVisible: (row) =>
            readString(row, "lifecycle_status") ===
            "published",
        });
      }

      if (request.entityType === "house_plan_task") {
        return resolveTrackedTarget(supabase, {
          request,
          table: "house_plan_tasks",
          entitySelect: "house_id, lifecycle_status",
          residentVisible: (row) => {
            const lifecycleStatus = readString(
              row,
              "lifecycle_status",
            );

            return (
              lifecycleStatus === "published" ||
              lifecycleStatus === "archived"
            );
          },
        });
      }

      if (request.entityType === "house_meeting") {
        const meetingLookup = await loadRow(supabase, {
          table: "house_meetings",
          select: [
            "house_id",
            "lifecycle_status",
            "display_status",
            "protocol_pdf",
            "protocol_document_id",
          ].join(", "),
          id: request.entityId,
        });

        if (meetingLookup.kind !== "found") {
          return meetingLookup;
        }

        const houseId = readString(
          meetingLookup.row,
          "house_id",
        );

        if (!UUID_PATTERN.test(houseId)) {
          return {
            kind: "internal_error",
          };
        }

        const lifecycleStatus = readString(
          meetingLookup.row,
          "lifecycle_status",
        );
        const displayStatus = readString(
          meetingLookup.row,
          "display_status",
        );

        const residentVisible =
          lifecycleStatus === "published" &&
          (
            displayStatus === "completed" ||
            displayStatus === "archived"
          );

        const protocolDocumentId = readString(
          meetingLookup.row,
          "protocol_document_id",
        );

        if (UUID_PATTERN.test(protocolDocumentId)) {
          const documentLookup = await loadRow(supabase, {
            table: "house_documents",
            select: "house_id",
            id: protocolDocumentId,
          });

          if (documentLookup.kind === "internal_error") {
            return documentLookup;
          }

          if (documentLookup.kind === "found") {
            const documentHouseId = readString(
              documentLookup.row,
              "house_id",
            );

            if (documentHouseId !== houseId) {
              return {
                kind: "forbidden",
              };
            }

            const fileLookup = await loadContentFile(
              supabase,
              {
                entityType: "house_document",
                entityId: protocolDocumentId,
                fieldKey: "pdf",
              },
            );

            if (fileLookup.kind === "internal_error") {
              return fileLookup;
            }

            if (fileLookup.kind === "found") {
              return {
                kind: "found",
                target: {
                  houseId,
                  bucket: fileLookup.bucket,
                  path: fileLookup.path,
                  residentVisible,
                },
              };
            }
          }
        }

        const legacyProtocolPath = readString(
          meetingLookup.row,
          "protocol_pdf",
        );

        if (!legacyProtocolPath) {
          return {
            kind: "not_found",
          };
        }

        return {
          kind: "found",
          target: {
            houseId,
            bucket: "house-reports",
            path: legacyProtocolPath,
            residentVisible,
          },
        };
      }

      if (!isAdmin) {
        return {
          kind: "forbidden",
        };
      }

      const houseLookup = await loadRow(supabase, {
        table: "houses",
        select: "id",
        id: request.entityId,
      });

      if (houseLookup.kind !== "found") {
        return houseLookup;
      }

      return {
        kind: "found",
        target: {
          houseId: request.entityId,
          bucket: "house-announcements",
          path: `${request.entityId}/announcement.pdf`,
          residentVisible: false,
        },
      };
    },
  };
}

const defaultDependencies: ResolveSignedFileUrlDependencies = {
  async getCurrentAdminUser() {
    const user = await getCurrentAdminUser();

    return user
      ? {
          role: user.role,
          status: user.status,
        }
      : null;
  },

  async getCookieValue(name) {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
  },

  validateHouseSession,

  async getHouseBySlug(slug) {
    const house = await loadHouseBySlug(slug);

    return house
      ? {
          id: house.id,
        }
      : null;
  },

  async createDataSource() {
    const supabase = await createSupabaseServerClient();
    return createSupabaseFileAccessDataSource(supabase);
  },

  async signFile(params) {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.storage
      .from(params.bucket)
      .createSignedUrl(params.path, 60 * 5);

    if (error || !data?.signedUrl) {
      console.error("[file-access] storage signing failed", {
        bucket: params.bucket,
      });

      return null;
    }

    return data.signedUrl;
  },
};

export async function resolveSignedFileUrl(
  request: SignedFileRequest,
  dependencies: ResolveSignedFileUrlDependencies =
    defaultDependencies,
): Promise<FileAccessResult> {
  try {
    const currentAdmin =
      await dependencies.getCurrentAdminUser();

    const isAdmin = Boolean(
      currentAdmin?.role &&
      currentAdmin.status === "active",
    );

    let residentHouseId: string | null = null;

    if (!isAdmin) {
      if (!request.houseSlug) {
        return failure(401, "AUTHENTICATION_REQUIRED");
      }

      const sessionToken =
        await dependencies.getCookieValue(
          getHouseAccessCookieName(
            request.houseSlug,
          ),
        );

      if (!sessionToken) {
        return failure(401, "AUTHENTICATION_REQUIRED");
      }

      const hasValidSession =
        await dependencies.validateHouseSession({
          slug: request.houseSlug,
          sessionToken,
        });

      if (!hasValidSession) {
        return failure(403, "INVALID_HOUSE_SESSION");
      }

      const sessionHouse =
        await dependencies.getHouseBySlug(
          request.houseSlug,
        );

      if (!sessionHouse) {
        return failure(403, "HOUSE_ACCESS_DENIED");
      }

      residentHouseId = sessionHouse.id;
    }

    const dataSource =
      await dependencies.createDataSource();

    const lookup = await dataSource.resolveTarget(
      request,
      isAdmin,
    );

    if (lookup.kind === "not_found") {
      return failure(404, "FILE_NOT_FOUND");
    }

    if (lookup.kind === "forbidden") {
      return failure(403, "FILE_ACCESS_DENIED");
    }

    if (lookup.kind === "internal_error") {
      return failure(500, "FILE_LOOKUP_FAILED");
    }

    const { target } = lookup;

    if (!UUID_PATTERN.test(target.houseId)) {
      return failure(500, "INVALID_FILE_OWNER");
    }

    if (!isAdmin) {
      if (!target.residentVisible) {
        return failure(403, "FILE_ACCESS_DENIED");
      }

      if (target.houseId !== residentHouseId) {
        return failure(403, "HOUSE_ACCESS_DENIED");
      }
    }

    const allowedBuckets =
      allowedBucketsForRequest(request);

    if (!allowedBuckets.has(target.bucket)) {
      return failure(403, "BUCKET_ACCESS_DENIED");
    }

    if (!isSafeStoragePath(target.path)) {
      return failure(400, "INVALID_STORAGE_PATH");
    }

    // Service-role client is created only inside signFile(),
    // after authentication, entity ownership and bucket/path checks.
    const signedUrl = await dependencies.signFile({
      bucket: target.bucket,
      path: target.path,
    });

    if (!signedUrl) {
      return failure(404, "FILE_UNAVAILABLE");
    }

    return {
      ok: true,
      signedUrl,
    };
  } catch {
    return failure(500, "FILE_ACCESS_FAILED");
  }
}
