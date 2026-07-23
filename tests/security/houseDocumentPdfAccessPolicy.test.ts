import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  canReadLifecycleEntity,
  isRegistryRowAllowedForRequest,
  normalizeFileEntityType,
} from "../../src/modules/files/services/signedFileAccessPolicy";

const informationPage = readFileSync(
  join(
    process.cwd(),
    "app/(public)/house/[slug]/information/page.tsx",
  ),
  "utf8",
);

const foundingPage = readFileSync(
  join(
    process.cwd(),
    "app/(public)/house/[slug]/founding-documents/page.tsx",
  ),
  "utf8",
);

const documentFile = {
  entity_type: "house_document",
  entity_id: "document-1",
  field_key: "pdf",
  storage_bucket: "house-documents",
  storage_path: "houses/house-1/documents/document-1/file.pdf",
};

describe("house document PDF access policy", () => {
  it("recognizes house_document as an allowed signed-file entity", () => {
    expect(normalizeFileEntityType("house_document")).toBe("house_document");
  });

  it("allows the registered PDF only for its exact document identity", () => {
    expect(
      isRegistryRowAllowedForRequest(documentFile, {
        entityType: "house_document",
        entityId: "document-1",
        fieldKey: "pdf",
        bucket: "house-documents",
        path: documentFile.storage_path,
      }),
    ).toBe(true);

    expect(
      isRegistryRowAllowedForRequest(documentFile, {
        entityType: "house_document",
        entityId: "document-2",
        fieldKey: "pdf",
        bucket: "house-documents",
        path: documentFile.storage_path,
      }),
    ).toBe(false);
  });

  it("allows published documents publicly but keeps drafts admin-only", () => {
    expect(
      canReadLifecycleEntity({
        entityType: "house_document",
        lifecycleStatus: "published",
        isAdmin: false,
      }),
    ).toBe(true);

    expect(
      canReadLifecycleEntity({
        entityType: "house_document",
        lifecycleStatus: "draft",
        isAdmin: false,
      }),
    ).toBe(false);

    expect(
      canReadLifecycleEntity({
        entityType: "house_document",
        lifecycleStatus: "draft",
        isAdmin: true,
      }),
    ).toBe(true);
  });

  it("sends document identity from both public document sections", () => {
    for (const source of [informationPage, foundingPage]) {
      expect(source).toContain('entityType="house_document"');
      expect(source).toContain("entityId={document.id}");
      expect(source).toContain('fieldKey="pdf"');
    }
  });
});
