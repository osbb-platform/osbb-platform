export const HOUSE_DOCUMENT_ENTITY_TYPE = "house_document";
export const HOUSE_DOCUMENT_PDF_FIELD_KEY = "pdf";
export const HOUSE_DOCUMENT_BUCKET = "house-documents";

export type HouseDocumentCategory =
  | "regulations"
  | "tariffs"
  | "meetings"
  | "technical"
  | "contracts"
  | "resident_info";

export type HouseDocumentLifecycle = "draft" | "published" | "archived";
export type HouseDocumentScope = "information" | "founding";

export type HouseDocumentType =
  | "statute"
  | "extract"
  | "protocol"
  | "registration"
  | "contracts"
  | "other";

export type HouseDocumentFileInput = {
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type HouseDocument = {
  id: string;
  house_id: string;
  title: string;
  category: HouseDocumentCategory;
  lifecycle_status: HouseDocumentLifecycle;
  description: string | null;
  document_year: number | null;
  document_scope: HouseDocumentScope;
  document_type: HouseDocumentType | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  attachment_status: "none" | "uploaded";
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
};

export type DocumentIdAndLock = {
  id: string;
  lockVersion: number;
};

export type CreateDocumentPayload = {
  title: string;
  category?: HouseDocumentCategory;
  description?: string | null;
  documentScope?: HouseDocumentScope;
  documentType?: HouseDocumentType | null;
  documentYear?: number | null;
  pdf: HouseDocumentFileInput;
};

export type UpdateDocumentPayload = DocumentIdAndLock & {
  title: string;
  category?: HouseDocumentCategory;
  description?: string | null;
  documentScope?: HouseDocumentScope;
  documentType?: HouseDocumentType | null;
  documentYear?: number | null;
  pdf?: HouseDocumentFileInput | null;
  removePdf?: boolean;
};

export type ReplaceDocumentPdfPayload = DocumentIdAndLock & {
  pdf: HouseDocumentFileInput;
};

export type DeleteAllArchivedDocumentsPayload = {
  documentScope?: HouseDocumentScope;
};
