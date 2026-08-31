import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("S2-T6 file entity allowlist parity", () => {
  it("RED: signed file policy supports tracked house_information_post files", () => {
    const source = read(
      "src/modules/files/services/signedFileAccessPolicy.ts",
    );

    expect(source).toMatch(
      /\|\s*"house_information_post"/,
    );

    expect(source).toMatch(
      /house_information_post\s*:\s*\{[\s\S]*?table:\s*"house_information_posts"[\s\S]*?buckets:\s*\[\s*"house-information-images"\s*\][\s\S]*?fieldKeys:\s*\[\s*"coverImage"\s*\][\s\S]*?lifecycleColumn:\s*"lifecycle_status"[\s\S]*?publicStatuses:\s*\[\s*"published"\s*\]/,
    );

    expect(source).toMatch(
      /normalized\s*===\s*"house_information_post"/,
    );
  });

  it("tracking pipeline already emits house_information_post", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/information_posts/commands/create.ts",
    );

    expect(source).toContain('entityType: "house_information_post"');
    expect(source).toContain("filesToTrack");
  });

  it("DB admin file helper already supports house_information_post", () => {
    const source = read(
      "supabase/migrations/202608241800_p09_r0_3_content_scope.sql",
    );

    expect(source).toMatch(
      /when\s+'house_information_post'\s+then[\s\S]*?from\s+public\.house_information_posts[\s\S]*?admin_has_house_access\(x\.house_id\)/i,
    );
  });
});
