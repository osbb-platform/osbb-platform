import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const migration = read(
  "supabase/migrations/202607101800_recover_report_periods_and_restore_announcement_pin.sql",
);
const types = read(
  "src/modules/content-engine/v2/handlers/announcements/types.ts",
);
const createCommand = read(
  "src/modules/content-engine/v2/handlers/announcements/commands/create.ts",
);
const updateCommand = read(
  "src/modules/content-engine/v2/handlers/announcements/commands/update.ts",
);
const archiveCommand = read(
  "src/modules/content-engine/v2/handlers/announcements/commands/archive.ts",
);
const duplicateCommand = read(
  "src/modules/content-engine/v2/handlers/announcements/commands/duplicate.ts",
);
const createForm = read(
  "src/modules/houses/components/CreateAnnouncementInlineForm.tsx",
);
const editForm = read(
  "src/modules/houses/components/EditAnnouncementSectionForm.tsx",
);
const publishedService = read(
  "src/modules/houses/services/getPublishedHouseAnnouncements.ts",
);
const publicPage = read(
  "app/(public)/house/[slug]/announcements/page.tsx",
);
const homeDashboard = read(
  "src/modules/houses/services/getPublicHouseHomeDashboard.ts",
);
const adminAnnouncementsPage = read(
  "app/(admin)/admin/(protected)/houses/[id]/announcements/page.tsx",
);
const adminHousePage = read(
  "app/(admin)/admin/(protected)/houses/[id]/page.tsx",
);

describe("report recovery and announcement pin migration", () => {
  it("recovers only confidently classified report periods", () => {
    expect(migration).toContain("public._p01_manual_review");
    expect(migration).toContain("lower(title) ~ 'кошторис'");
    expect(migration).toContain("lower(title) ~ 'півріч'");
    expect(migration).toContain("numeric_quarter_match");
    expect(migration).toContain("report_date is not null");
    expect(migration).toContain("eligible_for_update");
    expect(migration).toContain("remaining_review_count");
    expect(migration).not.toContain("report.created_at");
  });

  it("adds explicit pin state without inferring pins from danger level", () => {
    expect(migration).toContain(
      "add column if not exists is_pinned boolean not null default false",
    );
    expect(migration).toContain(
      "house_announcements_one_published_pin_per_house_idx",
    );
    expect(migration).toContain(
      "enforce_single_published_pinned_house_announcement",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).not.toMatch(/set\s+is_pinned\s*=\s*true/i);
  });

  it("writes pin state through create, update, archive and duplicate flows", () => {
    expect(types).toContain("is_pinned?: boolean");
    expect(types).toContain("isPinned?: boolean");
    expect(createCommand).toContain("is_pinned: payload.isPinned === true");
    expect(updateCommand).toContain("is_pinned: payload.isPinned === true");
    expect(archiveCommand).toContain("is_pinned: false");
    expect(duplicateCommand).toContain("is_pinned: false");
    expect(createForm).toContain('name="isPinned"');
    expect(editForm).toContain('name="isPinned"');
    expect(editForm).toContain(
      "defaultChecked={Boolean(section.content.isPinned)}",
    );
  });

  it("uses explicit pin state in public and admin projections", () => {
    expect(publishedService).toContain(
      ".select(\"id, title, body, level, is_pinned, published_at, updated_at\")",
    );
    expect(publicPage).toContain("isPinned: announcement.is_pinned");
    expect(publicPage).toContain("return content.isPinned === true");
    expect(homeDashboard).toContain(
      "sortedAnnouncements.find((announcement) => announcement.is_pinned)",
    );
    expect(homeDashboard).not.toContain(
      "sortedAnnouncements.find((announcement) => announcement.level === \"danger\")",
    );
    expect(adminAnnouncementsPage).toContain(
      "isPinned: Boolean(announcement.is_pinned)",
    );
    expect(adminHousePage).toContain(
      "isPinned: Boolean(announcement.is_pinned)",
    );
  });
});
