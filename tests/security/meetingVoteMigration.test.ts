import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607080001_stabilize_meeting_votes_across_apartment_reimports.sql",
);

const migration = fs.readFileSync(migrationPath, "utf8");

describe("meeting vote migration contract", () => {
  it("populates the logical apartment key for every insert and relevant update", () => {
    expect(migration).toContain(
      "create trigger house_meeting_manual_votes_set_apartment_key",
    );
    expect(migration).toContain(
      "before insert or update of apartment_id, apartment_label",
    );
    expect(migration).toContain(
      "new.apartment_key := coalesce(",
    );
  });

  it("aborts instead of silently resolving conflicting duplicate answers", () => {
    expect(migration).toContain(
      "count(distinct vote.choice) > 1",
    );
    expect(migration).toContain(
      "Conflicting duplicate house meeting votes detected; migration aborted",
    );
  });

  it("enforces uniqueness by logical apartment and uses it in the vote RPC", () => {
    expect(migration).toContain(
      "house_meeting_manual_votes_logical_apartment_unique_idx",
    );
    expect(migration).toContain(
      "on conflict (meeting_id, apartment_key, question_id) do update",
    );
  });
});
