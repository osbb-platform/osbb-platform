import { describe, expect, it } from "vitest";
import {
  HOUSE_ANNOUNCEMENT_BUCKET,
  HOUSE_ANNOUNCEMENT_MAX_PDF_SIZE_BYTES,
  HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY,
  allFilesDeleteRef,
  normalizeAnnouncementPdfInput,
  pdfDeleteRef,
  toFileTrack,
} from "./shared";

const houseId = "11111111-1111-4111-8111-111111111111";
const announcementId = "22222222-2222-4222-8222-222222222222";

function validPdf(overrides: Record<string, unknown> = {}) {
  return {
    bucket: HOUSE_ANNOUNCEMENT_BUCKET,
    path: `houses/${houseId}/announcements/${announcementId}/file.pdf`,
    originalName: "notice.pdf",
    mimeType: "application/pdf",
    size: 1024,
    ...overrides,
  };
}

describe("announcement PDF handler helpers", () => {
  it("accepts a valid announcement PDF payload", () => {
    const result = normalizeAnnouncementPdfInput(validPdf(), {
      houseId,
      announcementId,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data).toEqual(validPdf());
      expect(toFileTrack(result.data!)).toEqual({
        fieldKey: HOUSE_ANNOUNCEMENT_PDF_FIELD_KEY,
        bucket: HOUSE_ANNOUNCEMENT_BUCKET,
        path: `houses/${houseId}/announcements/${announcementId}/file.pdf`,
        originalName: "notice.pdf",
        mimeType: "application/pdf",
        size: 1024,
      });
    }
  });

  it("rejects bucket substitution", () => {
    const result = normalizeAnnouncementPdfInput(validPdf({ bucket: "house-reports" }), {
      houseId,
      announcementId,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects cross-house paths", () => {
    const result = normalizeAnnouncementPdfInput(
      validPdf({
        path: `houses/33333333-3333-4333-8333-333333333333/announcements/${announcementId}/file.pdf`,
      }),
      {
        houseId,
        announcementId,
      },
    );

    expect(result.ok).toBe(false);
  });

  it("rejects cross-announcement paths when entity id is known", () => {
    const result = normalizeAnnouncementPdfInput(
      validPdf({
        path: `houses/${houseId}/announcements/33333333-3333-4333-8333-333333333333/file.pdf`,
      }),
      {
        houseId,
        announcementId,
      },
    );

    expect(result.ok).toBe(false);
  });

  it("rejects non-PDF mime and oversized payloads", () => {
    const wrongMime = normalizeAnnouncementPdfInput(validPdf({ mimeType: "image/png" }), {
      houseId,
      announcementId,
    });
    const oversized = normalizeAnnouncementPdfInput(
      validPdf({ size: HOUSE_ANNOUNCEMENT_MAX_PDF_SIZE_BYTES + 1 }),
      {
        houseId,
        announcementId,
      },
    );

    expect(wrongMime.ok).toBe(false);
    expect(oversized.ok).toBe(false);
  });

  it("builds delete refs for pdf-only and entity-wide cleanup", () => {
    expect(pdfDeleteRef(announcementId)).toEqual({
      entityType: "house_announcement",
      entityId: announcementId,
      fieldKeys: ["pdf"],
    });

    expect(allFilesDeleteRef(announcementId)).toEqual({
      entityType: "house_announcement",
      entityId: announcementId,
    });
  });
});
