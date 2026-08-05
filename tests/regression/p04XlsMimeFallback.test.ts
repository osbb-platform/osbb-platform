import { describe, expect, it } from "vitest";

import { validateImportFileDescriptor } from "../../src/modules/import-buffer/fileSecurity";

describe("P04 XLS MIME fallback", () => {
  it("accepts legacy xls with octet-stream", () => {
    expect(
      validateImportFileDescriptor({
        name: "Краткая сводная ведомость 186.xls",
        type: "application/octet-stream",
        size: 100,
      }).ok,
    ).toBe(true);
  });

  it("accepts xls with empty browser mime", () => {
    expect(
      validateImportFileDescriptor({
        name: "file.xls",
        type: "",
        size: 100,
      }).ok,
    ).toBe(true);
  });

  it("rejects wrong extension", () => {
    expect(
      validateImportFileDescriptor({
        name: "file.pdf",
        type: "application/pdf",
        size: 100,
      }).ok,
    ).toBe(false);
  });
});
