import { createSupabaseAdminClient } from "../../../integrations/supabase/server/admin";
import { createSupabaseServerClient } from "../../../integrations/supabase/server/server";
import {
  FILE_ENTITY_CONFIG,
  canReadLifecycleEntity,
  fileAccessFailure,
  isGeneratedHouseAnnouncementPdfRequest,
  isRegistryRowAllowedForRequest,
  normalizeFileEntityType,
  normalizeText,
  type FileAccessResult,
  type FileEntityType,
  type FileRegistryRow,
  type LifecycleRow,
  type SignedFileRequest,
} from "./signedFileAccessPolicy";

type AdminAuthResult = {
  isAdmin: boolean;
  userId: string | null;
};

const SIGNED_URL_TTL_SECONDS = 60 * 5;

async function getAdminAuth(): Promise<AdminAuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      return { isAdmin: false, userId: null };
    }

    const { data: role, error: roleError } = await supabase.rpc("get_my_admin_role");

    if (roleError) {
      return { isAdmin: false, userId: userData.user.id };
    }

    const normalizedRole = typeof role === "string" ? role.trim() : "";

    return {
      isAdmin: Boolean(normalizedRole) && normalizedRole !== "inactive",
      userId: userData.user.id,
    };
  } catch {
    return { isAdmin: false, userId: null };
  }
}

async function adminHasHouseAccess(houseId: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_has_house_access", {
      target_house_id: houseId,
    });

    if (error) {
      console.error("SIGNED_FILE_ADMIN_HOUSE_ACCESS_FAILED", {
        houseId,
        code: error.code,
      });
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}

async function loadFileByEntityRequest(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  request: SignedFileRequest,
) {
  const entityType = normalizeFileEntityType(request.entityType);
  const entityId = normalizeText(request.entityId);
  const fieldKey = normalizeText(request.fieldKey || "pdf");

  if (!entityType || !entityId || !fieldKey) {
    return null;
  }

  const { data, error } = await supabase
    .from("house_content_files")
    .select(
      [
        "entity_type",
        "entity_id",
        "field_key",
        "storage_bucket",
        "storage_path",
        "original_file_name",
        "mime_type",
        "size_bytes",
      ].join(", "),
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("field_key", fieldKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as FileRegistryRow | null;
}

async function loadFileByLegacyPathRequest(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  request: SignedFileRequest,
) {
  const bucket = normalizeText(request.bucket);
  const path = normalizeText(request.path);

  if (!bucket || !path) {
    return null;
  }

  const { data, error } = await supabase
    .from("house_content_files")
    .select(
      [
        "entity_type",
        "entity_id",
        "field_key",
        "storage_bucket",
        "storage_path",
        "original_file_name",
        "mime_type",
        "size_bytes",
      ].join(", "),
    )
    .eq("storage_bucket", bucket)
    .eq("storage_path", path)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as FileRegistryRow | null;
}

async function loadLifecycleRow(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  entityType: FileEntityType,
  entityId: string,
) {
  const config = FILE_ENTITY_CONFIG[entityType];

  if (config.lifecycleColumn === null) {
    return {
      id: entityId,
      house_id: null,
      lifecycle_status: null,
    } satisfies LifecycleRow;
  }

  const { data, error } = await supabase
    .from(config.table)
    .select("id, house_id, lifecycle_status")
    .eq("id", entityId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as LifecycleRow | null;
}

async function createSignedUrl(params: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  bucket: string;
  path: string;
  filename: string | null;
  download: boolean;
}) {
  const storageBucket = params.supabase.storage.from(params.bucket) as unknown as {
    createSignedUrl: (
      path: string,
      expiresIn: number,
      options?: { download?: string | boolean },
    ) => Promise<{
      data?: { signedUrl?: string | null } | null;
      error?: { message?: string } | null;
    }>;
  };

  const signedUrlResult = await storageBucket.createSignedUrl(
    params.path,
    SIGNED_URL_TTL_SECONDS,
    params.download
      ? {
          download: params.filename || true,
        }
      : undefined,
  );

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    return null;
  }

  return signedUrlResult.data.signedUrl;
}

export async function resolveSignedFileUrl(
  request: SignedFileRequest,
): Promise<FileAccessResult> {
  const normalizedEntityType = normalizeFileEntityType(request.entityType);
  const requestedBucket = normalizeText(request.bucket);
  const requestedPath = normalizeText(request.path);

  const hasEntityRequest = Boolean(
    normalizedEntityType && normalizeText(request.entityId),
  );
  const hasLegacyPathRequest = Boolean(requestedBucket && requestedPath);

  if (!hasEntityRequest && !hasLegacyPathRequest) {
    return fileAccessFailure(400, "BAD_REQUEST", "Missing file identifier");
  }

  const supabase = createSupabaseAdminClient();
  const adminAuth = await getAdminAuth();

  if (isGeneratedHouseAnnouncementPdfRequest({
    bucket: requestedBucket,
    path: requestedPath,
  })) {
    if (!adminAuth.isAdmin) {
      return fileAccessFailure(401, "AUTHENTICATION_REQUIRED", "Authentication required");
    }

    const generatedAnnouncementHouseId = requestedPath.split("/", 1)[0] || "";

    if (
      !generatedAnnouncementHouseId ||
      !(await adminHasHouseAccess(generatedAnnouncementHouseId))
    ) {
      return fileAccessFailure(403, "FORBIDDEN", "File is not available");
    }

    const signedUrl = await createSignedUrl({
      supabase,
      bucket: requestedBucket,
      path: requestedPath,
      filename: normalizeText(request.filename) || null,
      download: request.download === true,
    });

    if (!signedUrl) {
      return fileAccessFailure(404, "NOT_FOUND", "Unable to open file");
    }

    return {
      ok: true,
      signedUrl,
      bucket: requestedBucket,
      path: requestedPath,
      filename: normalizeText(request.filename) || null,
    };
  }

  let file: FileRegistryRow | null = null;

  try {
    file = hasEntityRequest
      ? await loadFileByEntityRequest(supabase, request)
      : await loadFileByLegacyPathRequest(supabase, request);
  } catch {
    return fileAccessFailure(500, "INTERNAL", "Unable to resolve file");
  }

  if (!file) {
    return fileAccessFailure(404, "NOT_FOUND", "File not found");
  }

  if (!isRegistryRowAllowedForRequest(file, request)) {
    return fileAccessFailure(403, "FORBIDDEN", "File request is not allowed");
  }

  const fileEntityType = normalizeFileEntityType(file.entity_type);

  if (!fileEntityType) {
    return fileAccessFailure(403, "FORBIDDEN", "File entity type is not allowed");
  }

  let lifecycleRow: LifecycleRow | null = null;

  try {
    lifecycleRow = await loadLifecycleRow(supabase, fileEntityType, file.entity_id);
  } catch {
    return fileAccessFailure(500, "INTERNAL", "Unable to validate file access");
  }

  if (!lifecycleRow) {
    return fileAccessFailure(404, "NOT_FOUND", "File entity not found");
  }

  if (
    adminAuth.isAdmin &&
    lifecycleRow.house_id &&
    !(await adminHasHouseAccess(lifecycleRow.house_id))
  ) {
    return fileAccessFailure(403, "FORBIDDEN", "File is not available");
  }

  if (
    !canReadLifecycleEntity({
      entityType: fileEntityType,
      lifecycleStatus: lifecycleRow.lifecycle_status,
      isAdmin: adminAuth.isAdmin,
    })
  ) {
    return adminAuth.userId
      ? fileAccessFailure(403, "FORBIDDEN", "File is not available")
      : fileAccessFailure(401, "AUTHENTICATION_REQUIRED", "Authentication required");
  }

  const signedUrl = await createSignedUrl({
    supabase,
    bucket: file.storage_bucket,
    path: file.storage_path,
    filename: normalizeText(request.filename) || file.original_file_name,
    download: request.download === true,
  });

  if (!signedUrl) {
    return fileAccessFailure(404, "NOT_FOUND", "Unable to open file");
  }

  return {
    ok: true,
    signedUrl,
    bucket: file.storage_bucket,
    path: file.storage_path,
    filename: normalizeText(request.filename) || file.original_file_name,
  };
}
