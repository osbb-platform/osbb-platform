import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canReadLifecycleEntity,
  isAllowedBucketForEntity,
  isAllowedFieldKeyForEntity,
  isGeneratedHouseAnnouncementPdfRequest,
  isRegistryRowAllowedForRequest,
  normalizeFileEntityType,
} from "../../src/modules/files/services/signedFileAccessPolicy";

const reportFile = {
  entity_type: "house_report",
  entity_id: "11111111-1111-4111-8111-111111111111",
  field_key: "pdf",
  storage_bucket: "house-reports",
  storage_path: "houses/house-1/reports/report-1/file.pdf",
};

const announcementFile = {
  entity_type: "house_announcement",
  entity_id: "22222222-2222-4222-8222-222222222222",
  field_key: "pdf",
  storage_bucket: "house-announcements",
  storage_path:
    "houses/33333333-3333-4333-8333-333333333333/announcements/22222222-2222-4222-8222-222222222222/file.pdf",
};

describe("resolveSignedFileUrl security helpers", () => {
  it("allows only known file entity types", () => {
    expect(normalizeFileEntityType("house_report")).toBe("house_report");
    expect(normalizeFileEntityType("house_announcement")).toBe("house_announcement");
    expect(normalizeFileEntityType("house_plan_task")).toBe("house_plan_task");
    expect(normalizeFileEntityType("house_document")).toBeNull();
    expect(normalizeFileEntityType("")).toBeNull();
  });

  it("rejects bucket substitution for reports and announcements", () => {
    expect(isAllowedBucketForEntity("house_report", "house-reports")).toBe(true);
    expect(isAllowedBucketForEntity("house_report", "house-announcements")).toBe(false);
    expect(isAllowedBucketForEntity("house_announcement", "house-announcements")).toBe(true);
    expect(isAllowedBucketForEntity("house_announcement", "house-reports")).toBe(false);
  });

  it("allows only the pdf field for report and announcement files", () => {
    expect(isAllowedFieldKeyForEntity("house_report", "pdf")).toBe(true);
    expect(isAllowedFieldKeyForEntity("house_report", "cover")).toBe(false);
    expect(isAllowedFieldKeyForEntity("house_announcement", "pdf")).toBe(true);
    expect(isAllowedFieldKeyForEntity("house_announcement", "file_1")).toBe(false);
  });

  it("requires request identity to match the registered file row", () => {
    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: announcementFile.entity_id,
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: announcementFile.storage_path,
      }),
    ).toBe(true);

    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: "99999999-9999-4999-8999-999999999999",
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: announcementFile.storage_path,
      }),
    ).toBe(false);

    expect(
      isRegistryRowAllowedForRequest(announcementFile, {
        entityType: "house_announcement",
        entityId: announcementFile.entity_id,
        fieldKey: "pdf",
        bucket: "house-reports",
        path: announcementFile.storage_path,
      }),
    ).toBe(false);
  });

  it("denies unregistered or wrong-path legacy lookups by row mismatch", () => {
    expect(
      isRegistryRowAllowedForRequest(reportFile, {
        bucket: "house-reports",
        path: reportFile.storage_path,
      }),
    ).toBe(true);

    expect(
      isRegistryRowAllowedForRequest(reportFile, {
        bucket: "house-reports",
        path: "houses/other/reports/report-1/file.pdf",
      }),
    ).toBe(false);
  });

  it("allows public lifecycle reads only for published reports and announcements", () => {
    expect(
      canReadLifecycleEntity({
        entityType: "house_report",
        lifecycleStatus: "published",
        isAdmin: false,
      }),
    ).toBe(true);

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

  it("keeps generated house-level announcement PDFs admin-only and separate from P02 attachments", () => {
    expect(
      isGeneratedHouseAnnouncementPdfRequest({
        bucket: "house-announcements",
        path: "33333333-3333-4333-8333-333333333333/announcement.pdf",
      }),
    ).toBe(true);

    expect(
      isGeneratedHouseAnnouncementPdfRequest({
        bucket: "house-announcements",
        path:
          "houses/33333333-3333-4333-8333-333333333333/announcements/22222222-2222-4222-8222-222222222222/file.pdf",
      }),
    ).toBe(false);
  });
});
