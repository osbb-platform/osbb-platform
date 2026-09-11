import { describe, expect, it } from "vitest";
import { createCommand } from "@/src/modules/content-engine/v2/handlers/information_posts/commands/create";
import { updateCommand } from "@/src/modules/content-engine/v2/handlers/information_posts/commands/update";
import { INFORMATION_BODY_MAX_LENGTH } from "@/src/shared/constants/information/information.constants";
import type { HandlerContext } from "@/src/modules/content-engine/v2/types/pipeline";

const stubCtx = {} as HandlerContext;

function bodyOfLength(length: number, fill = "a") {
  const withBreaks = "line one\nline two\n" + fill.repeat(Math.max(0, length - 18));
  return withBreaks.slice(0, length);
}

const validBase = {
  headline: "Заголовок",
  category: "Про будинок" as const,
};

describe("Information post body length (Track 5: 512 -> 1024)", () => {
  it("shares one canonical limit constant equal to 1024", () => {
    expect(INFORMATION_BODY_MAX_LENGTH).toBe(1024);
  });

  it("create: accepts a body of exactly 1024 characters", async () => {
    const result = await createCommand.validate!({
      ...validBase,
      body: bodyOfLength(INFORMATION_BODY_MAX_LENGTH),
    }, stubCtx);
    expect(result.ok).toBe(true);
  });

  it("create: accepts a body of 511 and 512 characters (legacy boundaries, still valid under the new limit)", async () => {
    for (const length of [511, 512]) {
      const result = await createCommand.validate!({
        ...validBase,
        body: bodyOfLength(length),
      }, stubCtx);
      expect(result.ok).toBe(true);
    }
  });

  it("create: rejects a body of 1025 characters", async () => {
    const result = await createCommand.validate!({
      ...validBase,
      body: bodyOfLength(INFORMATION_BODY_MAX_LENGTH + 1),
    }, stubCtx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("1024");
    }
  });

  it("update: accepts exactly 1024 and rejects 1025", async () => {
    const accepted = await updateCommand.validate!({
      ...validBase,
      id: "00000000-0000-4000-8000-000000000000",
      lockVersion: 1,
      body: bodyOfLength(INFORMATION_BODY_MAX_LENGTH),
    }, stubCtx);
    expect(accepted.ok).toBe(true);

    const rejected = await updateCommand.validate!({
      ...validBase,
      id: "00000000-0000-4000-8000-000000000000",
      lockVersion: 1,
      body: bodyOfLength(INFORMATION_BODY_MAX_LENGTH + 1),
    }, stubCtx);
    expect(rejected.ok).toBe(false);
  });

  it("preserves line breaks up to the limit (validation counts raw length, not a sanitized/collapsed one)", async () => {
    const body = bodyOfLength(INFORMATION_BODY_MAX_LENGTH);
    expect(body).toContain("\n");
    const result = await createCommand.validate!({ ...validBase, body }, stubCtx);
    expect(result.ok).toBe(true);
  });
});
