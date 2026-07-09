import { describe, expect, it } from "vitest";

import {
  canReadLifecycleEntity,
  isAllowedBucketForEntity,
  isAllowedFieldKeyForEntity,
  isRegistryRowAllowedForRequest,
  normalizeFileEntityType,
  type FileRegistryRow,
} from "../../src/modules/files/services/signedFileAccessPolicy";

const announcementFile: FileRegistryRow = {
  entity_type: "house_announcement",
  entity_id: "announcement-1",
  field_key: "pdf",
  storage_bucket: "house-announcements",
  storage_path: "houses/house-1/announcements/announcement-1/notice.pdf",
  original_file_name: "notice.pdf",
  mime_type: "application/pdf",
  size_bytes: 1024,
};

describe("announcement PDF signed access policy", () => {
  it("allows only the announcement entity, house-announcements bucket and pdf field", () => {
    expect(normalizeFileEntityType("house_announcement")).toBe("house_announcement");
    expect(isAllowedBucketForEntity("house_announcement", "house-announcements")).toBe(true);
    expect(isAllowedBucketForEntity("house_announcement", "house-reports")).toBe(false);
    expect(isAllowedFieldKeyForEntity("house_announcement", "pdf")).toBe(true);
    expect(isAllowedFieldKeyForEntity("house_announcement", "file_1")).toBe(false);
  });

  it("rejects bucket substitution, path substitution and foreign entity id requests", () => {
    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: "announcement-1",
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: announcementFile.storage_path,
      }),
    ).toBe(true);

    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: "announcement-1",
        fieldKey: "pdf",
        bucket: "house-reports",
        path: announcementFile.storage_path,
      }),
    ).toBe(false);

    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: "announcement-1",
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: "houses/house-2/announcements/announcement-1/notice.pdf",
      }),
    ).toBe(false);

    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: "foreign-announcement",
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: announcementFile.storage_path,
      }),
    ).toBe(false);
  });

  it("rejects report entity type and non-pdf field substitutions for announcement PDFs", () => {
    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_report",
        entityId: "announcement-1",
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: announcementFile.storage_path,
      }),
    ).toBe(false);

    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: "announcement-1",
        fieldKey: "file_1",
        bucket: "house-announcements",
        path: announcementFile.storage_path,
      }),
    ).toBe(false);
  });

  it("allows anonymous public access only for published announcement PDFs", () => {
    expect(
      canReadLifecycleEntity({
        entityType: "house_announcement",
        lifecycleStatus: "published",
        isAdmin: false,
      }),
    ).toBe(true);

    expect(
      canReadLifecycleEntity({
        entityType: "house_announcement",
        lifecycleStatus: "draft",
        isAdmin: false,
      }),
    ).toBe(false);

    expect(
      canReadLifecycleEntity({
        entityType: "house_announcement",
        lifecycleStatus: "archived",
        isAdmin: false,
      }),
    ).toBe(false);

    expect(
      canReadLifecycleEntity({
        entityType: "house_announcement",
        lifecycleStatus: "draft",
        isAdmin: true,
      }),
    ).toBe(true);
  });
});
