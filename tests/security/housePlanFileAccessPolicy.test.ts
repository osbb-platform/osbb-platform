import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canReadLifecycleEntity,
  isRegistryRowAllowedForRequest,
} from "../../src/modules/files/services/signedFileAccessPolicy";

const publicPlanViewer = readFileSync(
  join(process.cwd(), "src/modules/houses/components/PublicPlanTaskViewer.tsx"),
  "utf8",
);

const planImageFile = {
  entity_type: "house_plan_task",
  entity_id: "task-1",
  field_key: "image_1",
  storage_bucket: "house-plan-media",
  storage_path: "houses/house-1/plan/task-1/image-1.jpg",
};

const planDocumentFile = {
  entity_type: "house_plan_task",
  entity_id: "task-1",
  field_key: "pdf_1",
  storage_bucket: "house-plan-documents",
  storage_path: "houses/house-1/plan/task-1/document-1.pdf",
};

describe("house plan signed-file access", () => {
  it("requires exact task, field, bucket and path identity", () => {
    expect(isRegistryRowAllowedForRequest(planImageFile, {
      entityType: "house_plan_task",
      entityId: "task-1",
      fieldKey: "image_1",
      bucket: "house-plan-media",
      path: planImageFile.storage_path,
    })).toBe(true);

    expect(isRegistryRowAllowedForRequest(planImageFile, {
      entityType: "house_plan_task",
      entityId: "task-1",
      fieldKey: "image_1",
      bucket: "house-plan-documents",
      path: planImageFile.storage_path,
    })).toBe(false);

    expect(isRegistryRowAllowedForRequest(planDocumentFile, {
      entityType: "house_plan_task",
      entityId: "task-2",
      fieldKey: "pdf_1",
      bucket: "house-plan-documents",
      path: planDocumentFile.storage_path,
    })).toBe(false);
  });

  it("allows public files only for published or archived plan tasks", () => {
    expect(canReadLifecycleEntity({ entityType: "house_plan_task", lifecycleStatus: "published", isAdmin: false })).toBe(true);
    expect(canReadLifecycleEntity({ entityType: "house_plan_task", lifecycleStatus: "archived", isAdmin: false })).toBe(true);
    expect(canReadLifecycleEntity({ entityType: "house_plan_task", lifecycleStatus: "draft", isAdmin: false })).toBe(false);
    expect(canReadLifecycleEntity({ entityType: "house_plan_task", lifecycleStatus: "draft", isAdmin: true })).toBe(true);
  });

  it("passes registry identity and actual bucket for plan images and documents", () => {
    expect(publicPlanViewer).toContain("entityType=house_plan_task");
    expect(publicPlanViewer).toContain("entityId=${encodeURIComponent(task.id)}");
    expect(publicPlanViewer).toContain("fieldKey=${encodeURIComponent(image.fieldKey)}");
    expect(publicPlanViewer).toContain("bucket=${encodeURIComponent(image.bucket)}");
    expect(publicPlanViewer).toContain('entityType="house_plan_task"');
    expect(publicPlanViewer).toContain("entityId={task.id}");
    expect(publicPlanViewer).toContain("fieldKey={document.fieldKey}");
    expect(publicPlanViewer).toContain("bucket={document.bucket}");
  });
});
