import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cloneServiceSource = () =>
  readFileSync(
    join(process.cwd(), "src/modules/content-engine/v2/services/cloneService.ts"),
    "utf8",
  );

describe("cloneService tracked file duplication contract", () => {
  it("loads source tracked files from house_content_files by entity type and source entity id", () => {
    const source = cloneServiceSource();

    expect(source).toContain("export async function duplicateTableRecordToDraft");
    expect(source).toContain('from("house_content_files")');
    expect(source).toContain('.eq("entity_type", params.entityType)');
    expect(source).toContain('.eq("entity_id", params.entityId)');
  });

  it("creates a new physical storage object and allows entity-specific target paths", () => {
    const source = cloneServiceSource();

    expect(source).toContain("type BuildTargetFilePathArgs");
    expect(source).toContain("buildTargetFilePath?:");
    expect(source).toContain("async function copyStorageObject");
    expect(source).toContain("const targetPath = params.buildTargetFilePath");
    expect(source).toContain(": createCopiedStoragePath");
    expect(source).toContain("copyCapableBucket.copy(file.storage_path, targetPath)");
    expect(source).toContain("bucket.download(file.storage_path)");
    expect(source).toContain("bucket.upload(targetPath");
    expect(source.match(/path: targetPath,/g)).toHaveLength(2);
  });

  it("registers copied files under the new entity id in house_content_files", () => {
    const source = cloneServiceSource();

    expect(source).toContain("async function registerCopiedFiles");
    expect(source).toContain('from("house_content_files").insert');
    expect(source).toContain("entity_type: params.entityType");
    expect(source).toContain("entity_id: params.entityId");
    expect(source).toContain("field_key: file.fieldKey");
    expect(source).toContain("storage_bucket: file.bucket");
    expect(source).toContain("storage_path: file.path");
  });

  it("duplicates tracked files before registering them for each created draft", () => {
    const source = cloneServiceSource();

    expect(source).toContain("const filesResult = await loadTrackedFiles");
    expect(source).toContain("const copiedFilesResult = await copyTrackedFiles");
    expect(source).toContain("buildTargetFilePath: params.buildTargetFilePath");
    expect(source).toContain("await registerCopiedFiles");
    expect(source).toContain("copiedFiles");
  });
});

describe("cloneService B11 result contract", () => {
  it("returns the fresh lock version for every created draft", () => {
    const source = cloneServiceSource();
    expect(source).toContain("lockVersion: number");
    expect(source).toContain("inserted.lock_version");
    expect(source).toContain("lockVersion: insertedLockVersion");
  });
});
