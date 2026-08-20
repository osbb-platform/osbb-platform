import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("P07 resident poll submit", () => {
  const action = read("src/modules/houses/resident/submitPollAnswers.ts");
  const repo = read("src/modules/houses/resident/pollsRepository.ts");
  const policies = read("src/shared/security/rateLimitPolicies.ts");

  it("uses resident session + dedicated limiter", () => {
    expect(action).toContain("withResidentSession");
    expect(action).toContain("rateLimitPolicies.pollSubmit");
    expect(policies).toContain("pollSubmit:");
    expect(policies).toContain('scope: "poll_submit"');
  });

  it("validates active poll and apartment house scope", () => {
    expect(repo).toContain('poll.lifecycle_status !== "published"');
    expect(repo).toContain('poll.poll_status !== "active"');
    expect(repo).toContain('.eq("house_id", params.houseId)');
    expect(repo).toContain('.is("archived_at", null)');
  });

  it("covers required/scope and all five answer types", () => {
    expect(repo).toContain("question.is_required");
    expect(repo).toContain('"QUESTION_SCOPE_INVALID"');
    expect(repo).toContain('"OPTION_SCOPE_INVALID"');
    for (const type of ["single_choice","multiple_choice","yes_no","scale","free_text"]) expect(repo).toContain(`"${type}"`);
    expect(repo).toContain("answer.value > question.scale_max");
  });

  it("writes participation before answers and compensates failures", () => {
    const p = repo.indexOf('.from("house_poll_participation")');
    const a = repo.indexOf('.from("house_poll_answers")');
    expect(p).toBeGreaterThan(-1);
    expect(a).toBeGreaterThan(p);
    expect(repo).toContain('"APARTMENT_ALREADY_ANSWERED"');
    expect(repo).toContain("compensateParticipation");
  });

  it("keeps anonymous answer rows and history free of apartment identity", () => {
    expect(repo).toMatch(/poll\.identity_mode === "anonymous" \? null : params\.apartmentId/);
    expect(repo).toMatch(/poll\.identity_mode === "open"[\s\S]*?apartmentId: params\.apartmentId[\s\S]*?: \{ pollId: params\.pollId, identityMode: poll\.identity_mode \}/);
    expect(repo).toContain('actor_name: "Мешканець"');
    expect(repo).toContain("actor_admin_id: null");
  });
});
