import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REAL_DB_TEST_TIMEOUT, sql } from "../helpers/realDbSql";

describe("P06 atomic manual ballot real DB acceptance", () => {
  it("atomic RPC exists and is service_role only", () => {
    expect(sql("select to_regprocedure('public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)');")).toBe("record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)");
    expect(sql("select has_function_privilege('anon','public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)','execute');")).toBe("f");
    expect(sql("select has_function_privilege('authenticated','public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)','execute');")).toBe("f");
    expect(sql("select has_function_privilege('service_role','public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)','execute');")).toBe("t");
  }, REAL_DB_TEST_TIMEOUT);

  it("locks meeting before answer writes and bumps lock once", () => {
    const def = sql("select pg_get_functiondef('public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)'::regprocedure);");
    expect(def.toLowerCase()).toContain("for update");
    expect(def).toContain("v_meeting.lock_version <> p_expected_lock_version");
    expect(def).toContain("record_house_meeting_manual_vote");
    expect(def).toContain("lock_version = v_next_lock");
  }, REAL_DB_TEST_TIMEOUT);

  describe("real fixture behavior (RC-1 regression: apartment/question argument order)", () => {
    const houseId = randomUUID();
    const apartmentAId = randomUUID();
    const apartmentBId = randomUUID();
    const apartmentCId = randomUUID();
    const meetingId = randomUUID();
    const questionAId = randomUUID();
    const questionBId = randomUUID();
    const foreignQuestionId = randomUUID();

    beforeAll(() => {
      const managementCompanyId = sql("select id from public.management_companies limit 1;");
      if (!managementCompanyId) {
        throw new Error("RC1_FIXTURE_REQUIRES_ONE_MANAGEMENT_COMPANY_ROW");
      }

      sql(`insert into public.houses (id, management_company_id, name, slug, address) values ('${houseId}', '${managementCompanyId}', 'RC1 Fixture House', 'rc1-fixture-${houseId}', 'RC1 fixture address');`);

      sql(`insert into public.house_apartments (id, house_id, account_number, apartment_label, owner_name, source_type) values
        ('${apartmentAId}', '${houseId}', 'RC1-A', 'Кв. 1', 'RC1 Owner A', 'manual'),
        ('${apartmentBId}', '${houseId}', 'RC1-B', 'Кв. 2', 'RC1 Owner B', 'manual'),
        ('${apartmentCId}', '${houseId}', 'RC1-C', 'Кв. 3', 'RC1 Owner C', 'manual');`);

      sql(`insert into public.house_meetings (id, house_id, title, voting_mode, lock_version) values ('${meetingId}', '${houseId}', 'RC1 Fixture Meeting', 'manual', 1);`);

      sql(`insert into public.house_meeting_questions (id, meeting_id, question, sort_order) values
        ('${questionAId}', '${meetingId}', 'RC1 Question A', 1),
        ('${questionBId}', '${meetingId}', 'RC1 Question B', 2);`);
    }, REAL_DB_TEST_TIMEOUT);

    afterAll(() => {
      // Cascades to house_meetings, house_meeting_questions, house_meeting_manual_votes, house_apartments.
      sql(`delete from public.houses where id = '${houseId}';`);
    }, REAL_DB_TEST_TIMEOUT);

    it("records both answers against the correct apartment and question ids, and bumps lock_version by exactly one", () => {
      const answers = JSON.stringify([
        { questionId: questionAId, choice: "for" },
        { questionId: questionBId, choice: "against" },
      ]).replace(/'/g, "''");

      sql(`select record_house_meeting_manual_ballot('${meetingId}', '${apartmentAId}', 1, '${answers}'::jsonb);`);

      const rowA = sql(`select meeting_id||'|'||apartment_id||'|'||question_id||'|'||choice from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}' and question_id = '${questionAId}';`);
      expect(rowA).toBe(`${meetingId}|${apartmentAId}|${questionAId}|for`);

      const rowB = sql(`select meeting_id||'|'||apartment_id||'|'||question_id||'|'||choice from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}' and question_id = '${questionBId}';`);
      expect(rowB).toBe(`${meetingId}|${apartmentAId}|${questionBId}|against`);

      const voteCount = sql(`select count(*) from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}';`);
      expect(voteCount).toBe("2");

      const lockVersion = sql(`select lock_version from public.house_meetings where id = '${meetingId}';`);
      expect(lockVersion).toBe("2");
    }, REAL_DB_TEST_TIMEOUT);

    it("rejects a stale expected_lock_version without writing anything or bumping lock_version", () => {
      const answers = JSON.stringify([
        { questionId: questionAId, choice: "abstained" },
      ]).replace(/'/g, "''");

      // Current lock_version is 2 after the previous test; submit with the
      // now-stale value of 1 to prove optimistic-concurrency protection.
      expect(() =>
        sql(`select record_house_meeting_manual_ballot('${meetingId}', '${apartmentAId}', 1, '${answers}'::jsonb);`),
      ).toThrow(/STALE_CONTENT/);

      const rowA = sql(`select choice from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}' and question_id = '${questionAId}';`);
      expect(rowA).toBe("for");

      const lockVersion = sql(`select lock_version from public.house_meetings where id = '${meetingId}';`);
      expect(lockVersion).toBe("2");
    }, REAL_DB_TEST_TIMEOUT);

    it("re-submitting the same apartment updates (upserts) its own prior answer by product design, and still bumps lock_version", () => {
      // house_meeting_manual_votes upserts on (meeting_id, apartment_key, question_id) by
      // design (see 202607080001_stabilize_meeting_votes_across_apartment_reimports.sql) so a
      // chairman can correct a mis-recorded manual vote. This must not be confused with the
      // RC-1 defect: it is a deliberate idempotent-correction path, not a duplicate silently
      // accepted due to broken validation.
      const answers = JSON.stringify([
        { questionId: questionAId, choice: "abstained" },
      ]).replace(/'/g, "''");

      sql(`select record_house_meeting_manual_ballot('${meetingId}', '${apartmentAId}', 2, '${answers}'::jsonb);`);

      const rowA = sql(`select choice from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}' and question_id = '${questionAId}';`);
      expect(rowA).toBe("abstained");

      // Question B was not part of this second ballot, so its earlier answer is untouched.
      const rowB = sql(`select choice from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}' and question_id = '${questionBId}';`);
      expect(rowB).toBe("against");

      const voteCount = sql(`select count(*) from public.house_meeting_manual_votes where apartment_id = '${apartmentAId}';`);
      expect(voteCount).toBe("2");

      const lockVersion = sql(`select lock_version from public.house_meetings where id = '${meetingId}';`);
      expect(lockVersion).toBe("3");
    }, REAL_DB_TEST_TIMEOUT);

    it("rolls back the whole ballot (no partial vote rows, no lock bump) when one answer references a question from another meeting", () => {
      const answers = JSON.stringify([
        { questionId: questionAId, choice: "for" },
        { questionId: foreignQuestionId, choice: "against" },
      ]).replace(/'/g, "''");

      expect(() =>
        sql(`select record_house_meeting_manual_ballot('${meetingId}', '${apartmentBId}', 3, '${answers}'::jsonb);`),
      ).toThrow(/Question does not belong to meeting/);

      const partialVotes = sql(`select count(*) from public.house_meeting_manual_votes where apartment_id = '${apartmentBId}';`);
      expect(partialVotes).toBe("0");

      const lockVersion = sql(`select lock_version from public.house_meetings where id = '${meetingId}';`);
      expect(lockVersion).toBe("3");
    }, REAL_DB_TEST_TIMEOUT);

    it("accepts a fresh apartment's ballot after prior failures, proving the fix generalizes beyond the first apartment", () => {
      const answers = JSON.stringify([
        { questionId: questionAId, choice: "against" },
        { questionId: questionBId, choice: "abstained" },
      ]).replace(/'/g, "''");

      sql(`select record_house_meeting_manual_ballot('${meetingId}', '${apartmentCId}', 3, '${answers}'::jsonb);`);

      const rowA = sql(`select apartment_id||'|'||question_id||'|'||choice from public.house_meeting_manual_votes where apartment_id = '${apartmentCId}' and question_id = '${questionAId}';`);
      expect(rowA).toBe(`${apartmentCId}|${questionAId}|against`);

      const rowB = sql(`select apartment_id||'|'||question_id||'|'||choice from public.house_meeting_manual_votes where apartment_id = '${apartmentCId}' and question_id = '${questionBId}';`);
      expect(rowB).toBe(`${apartmentCId}|${questionBId}|abstained`);

      const lockVersion = sql(`select lock_version from public.house_meetings where id = '${meetingId}';`);
      expect(lockVersion).toBe("4");
    }, REAL_DB_TEST_TIMEOUT);
  });
});
