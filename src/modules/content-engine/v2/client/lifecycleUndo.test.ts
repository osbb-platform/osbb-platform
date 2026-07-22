import { describe, expect, it } from "vitest";
import { buildLifecycleUndoCommand } from "./lifecycleUndo";

describe("buildLifecycleUndoCommand", () => {
  it("uses the fresh lock version returned by publish", () => {
    expect(buildLifecycleUndoCommand(
      { type: "reports.publish", houseId: "house-1", payload: { id: "report-1", lockVersion: 4 } },
      { id: "report-1", lock_version: 5 },
    )).toEqual({
      type: "reports.archive",
      houseId: "house-1",
      payload: { id: "report-1", lockVersion: 5 },
    });
  });

  it("keeps the information post payload contract", () => {
    expect(buildLifecycleUndoCommand(
      { type: "information_posts.archive", houseId: "house-1", payload: { data: { id: "post-1", lockVersion: 7 } } },
      { id: "post-1", lock_version: 8 },
    )).toEqual({
      type: "information_posts.restore",
      houseId: "house-1",
      payload: { data: { id: "post-1", lockVersion: 8 } },
    });
  });

  it("keeps faqId for FAQ commands", () => {
    expect(buildLifecycleUndoCommand(
      { type: "faq.publish", houseId: "house-1", payload: { faqId: "faq-1", lockVersion: 2 } },
      { id: "faq-1", lock_version: 3 },
    )).toEqual({
      type: "faq.archive",
      houseId: "house-1",
      payload: { faqId: "faq-1", lockVersion: 3 },
    });
  });

  it("does not add Undo to delete or stale results", () => {
    expect(buildLifecycleUndoCommand(
      { type: "reports.delete", houseId: "house-1", payload: { id: "report-1", lockVersion: 4 } },
      { id: "report-1", lock_version: 5 },
    )).toBeNull();

    expect(buildLifecycleUndoCommand(
      { type: "reports.publish", houseId: "house-1", payload: { id: "report-1", lockVersion: 4 } },
      { id: "report-1" },
    )).toBeNull();
  });
});
