// Permanent local release-gate scenario for the online (internal_resident)
// voting flow: admin creates an online-mode meeting, publishes it, opens
// online voting; a resident logs into the public house portal with the
// house access code and casts a weighted online ballot. Covers the happy
// path plus a key client-side rejection invariant (zero/invalid owned
// area) and confirms a fully-voted apartment is removed from the ballot
// picker (duplicate-vote prevention). Requires the dev server's process
// environment to have ONLINE_VOTING_PROVIDER=internal_resident and
// ONLINE_VOTING_IDENTITY_HMAC_SECRET set (the admin online-voting toggle
// and the resident ballot endpoint both read this at request time). Run
// with `npm run test:e2e:local` against a `next dev -p 3100` server (with
// those two env vars exported into its process) and local Supabase.
import { createClient } from "@supabase/supabase-js";
import { createE2eAdminFixture, destroyE2eAdminFixture, type E2eAdminFixture } from "./lib/adminFixture";
import {
  clickButtonByText,
  clickButtonContainingText,
  dismissOnboardingIfPresent,
  gotoWithRetry,
  launchE2eBrowser,
  loginAsE2eAdmin,
  safeEvaluate,
  sleep,
  waitAndDismissDirtyGuardIfPresent,
  waitForDialogOpen,
  waitForEnabledButtonByText,
} from "./lib/browser";
import { e2eEnv } from "./lib/e2eEnv";
import type { Browser, Page } from "puppeteer";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${message}`);
}

const HOUSE_ACCESS_CODE = "482913";

async function waitForCondition(page: Page, predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(predicate)) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function waitAndClickButtonByText(page: Page, text: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      await clickButtonByText(page, text);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw lastError;
}

async function waitForSaveOutcome(page: Page, timeoutMs = 8000): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const errorText = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      return alert?.textContent?.trim() || null;
    });
    if (errorText) return errorText;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

async function run(): Promise<void> {
  let fixture: E2eAdminFixture | null = null;
  let browser: Browser | null = null;
  const admin = createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    fixture = await createE2eAdminFixture("online-voting");

    const accessUpsert = await admin.rpc("upsert_house_access", {
      target_house_id: fixture.houseId,
      raw_password: HOUSE_ACCESS_CODE,
    });
    assert(!accessUpsert.error, `house access code bootstrap failed: ${accessUpsert.error?.message}`);

    const apartmentsInsert = await admin
      .from("house_apartments")
      .insert([
        { house_id: fixture.houseId, account_number: "OV-001", apartment_label: "10", owner_name: "Online Voter One", area: 50, source_type: "manual" },
        { house_id: fixture.houseId, account_number: "OV-002", apartment_label: "11", owner_name: "Online Voter Two", area: 30, source_type: "manual" },
      ])
      .select("id");
    assert(!apartmentsInsert.error, `fixture apartments insert failed: ${apartmentsInsert.error?.message}`);
    assert((apartmentsInsert.data ?? []).length === 2, "expected 2 fixture apartments");

    browser = await launchE2eBrowser();
    const adminPage: Page = await browser.newPage();
    await loginAsE2eAdmin(adminPage, { email: fixture.email, password: fixture.password });

    await gotoWithRetry(adminPage, `${e2eEnv.adminBaseUrl}/houses/${fixture.houseId}?block=meetings`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await sleep(500);
    await dismissOnboardingIfPresent(adminPage);

    // --- Step 1: create an online-mode meeting with 1 question ---
    await clickButtonByText(adminPage, "Нові збори");
    await waitForDialogOpen(adminPage);
    await sleep(200);

    const titleInput = await adminPage.$('input[placeholder="Назва зборів"]');
    assert(titleInput, "meeting title input not found");
    await titleInput.type("E2E Онлайн збори", { delay: 3 });

    const dateSet = await adminPage.evaluate(() => {
      const input = document.querySelector('input[type="date"]') as HTMLInputElement | null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "2027-07-01");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    assert(dateSet, "meeting date input not found");

    const question1Input = await adminPage.$('input[placeholder="Питання 1"]');
    assert(question1Input, "question 1 input not found");
    await question1Input.type("Затвердити новий тариф", { delay: 3 });

    // Switch voting mode to online (enabled because the dev server has
    // ONLINE_VOTING_PROVIDER=internal_resident set).
    await clickButtonContainingText(adminPage, "Онлайн-голосування");
    await sleep(150);

    await clickButtonByText(adminPage, "Зберегти");
    const createError = await waitForSaveOutcome(adminPage);
    assert(!createError, `unexpected error after creating the draft meeting: ${createError}`);
    await sleep(500);
    await waitAndDismissDirtyGuardIfPresent(adminPage);

    // --- Step 2: publish ---
    await clickButtonContainingText(adminPage, "Чернетки");
    await sleep(300);

    const openedDraft = await adminPage.evaluate((needle: string) => {
      const article = Array.from(document.querySelectorAll("article")).find((el) =>
        el.textContent?.includes(needle),
      ) as HTMLElement | undefined;
      if (!article) return false;
      article.click();
      return true;
    }, "E2E Онлайн збори");
    assert(openedDraft, "draft meeting card not found");
    await waitForDialogOpen(adminPage);
    await sleep(300);

    // See manualMeeting.e2e.ts: "Опублікувати" is disabled while the shared
    // mutation-pending flag is still settling from the preceding Save; a
    // click while disabled is a silent no-op that previously left the test
    // waiting forever for a "Підтвердити" confirm modal that never appears.
    await waitForEnabledButtonByText(adminPage, "Опублікувати");
    await waitAndClickButtonByText(adminPage, "Підтвердити");
    const publishError = await waitForSaveOutcome(adminPage);
    assert(!publishError, `unexpected error after publishing the meeting: ${publishError}`);

    async function waitForMeetingColumn(
      column: "lifecycle_status" | "display_status",
      expected: string,
      // See manualMeeting.e2e.ts: a dispatch's server action can incur a
      // one-time dev-mode (Turbopack) compile cost on first invocation in a
      // fresh dev server, which measurably exceeded 8s here; this still
      // resolves as soon as the real DB state lands.
      timeoutMs = 20_000,
    ): Promise<void> {
      const start = Date.now();
      let lastValue: unknown;
      while (Date.now() - start < timeoutMs) {
        const row = await admin
          .from("house_meetings")
          .select(column)
          .eq("house_id", fixture!.houseId)
          .eq("title", "E2E Онлайн збори")
          .maybeSingle();
        lastValue = (row.data as Record<string, unknown> | null)?.[column];
        if (lastValue === expected) return;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error(`TIMED_OUT_WAITING_FOR_${column}=${expected} (last seen: ${String(lastValue)})`);
    }

    await waitForMeetingColumn("lifecycle_status", "published");
    await sleep(300);
    await adminPage.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
    await sleep(500);

    // --- Step 3: open online voting ---
    await clickButtonContainingText(adminPage, "Активні");
    await sleep(300);

    const openedActive = await adminPage.evaluate((needle: string) => {
      const article = Array.from(document.querySelectorAll("article")).find((el) =>
        el.textContent?.includes(needle),
      ) as HTMLElement | undefined;
      if (!article) return false;
      article.click();
      return true;
    }, "E2E Онлайн збори");
    assert(openedActive, "scheduled meeting card not found");
    await waitForDialogOpen(adminPage);
    await sleep(300);

    await clickButtonByText(adminPage, "Відкрити голосування");
    const openVotingError = await waitForSaveOutcome(adminPage);
    assert(!openVotingError, `unexpected error after opening online voting: ${openVotingError}`);
    await sleep(500);

    const meetingRow = await admin
      .from("house_meetings")
      .select("id, display_status, voting_mode")
      .eq("house_id", fixture.houseId)
      .eq("title", "E2E Онлайн збори")
      .single();
    assert(!meetingRow.error, `meeting lookup failed: ${meetingRow.error?.message}`);
    assert(meetingRow.data!.voting_mode === "online", `expected voting_mode=online, got ${meetingRow.data!.voting_mode}`);
    assert(meetingRow.data!.display_status === "active", `expected display_status=active after opening voting, got ${meetingRow.data!.display_status}`);

    // --- Step 4: resident logs into the public house portal and votes ---
    const residentPage: Page = await browser.newPage();
    const houseUrl = `http://${fixture.houseSlug}.${e2eEnv.houseBaseHost}`;

    await residentPage.goto(`${houseUrl}/meetings`, { waitUntil: "networkidle2", timeout: 30_000 });
    await sleep(500);

    const codeInputs = await residentPage.$$('input[inputmode="numeric"]');
    assert(codeInputs.length === 6, `expected 6 access-code digit inputs, got ${codeInputs.length}`);
    await codeInputs[0]!.click();
    await residentPage.keyboard.type(HOUSE_ACCESS_CODE, { delay: 20 });
    await sleep(200);

    await clickButtonByText(residentPage, "Увійти до кабінету");
    await residentPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
    await sleep(500);

    // The public meetings page defaults to the "scheduled" mode tab; an
    // opened online meeting is "active", so it only appears under ?mode=active.
    await residentPage.goto(`${houseUrl}/meetings?mode=active`, { waitUntil: "networkidle2", timeout: 30_000 });
    await sleep(500);

    const gateStillShown = await safeEvaluate(residentPage, () =>
      document.body.innerText.includes("Увійти до кабінету"),
    );
    assert(!gateStillShown, "house password gate still shown after a correct access code");

    // --- Step 4a: rejection invariant — zero owned area must be blocked client-side ---
    const apartmentSelect = await residentPage.$("select");
    assert(apartmentSelect, "resident apartment select not found");

    const apartment1Value = await residentPage.evaluate(() => {
      const select = document.querySelector("select") as HTMLSelectElement | null;
      const option = Array.from(select?.options ?? []).find((o) => o.textContent?.includes("10"));
      return option?.value ?? null;
    });
    assert(apartment1Value, "apartment option for label 10 not found");
    await residentPage.select("select", apartment1Value!);
    await sleep(200);

    const areaInput = await residentPage.$('input[inputmode="decimal"]');
    assert(areaInput, "owned area input not found");
    await areaInput.type("0", { delay: 10 });
    await sleep(150);

    const answerRadio = await residentPage.$('input[type="radio"][value="for"]');
    assert(answerRadio, "answer radio not found");
    await answerRadio.click();
    await sleep(100);

    await clickButtonByText(residentPage, "Підтвердити голос");
    await sleep(600);

    const zeroAreaError = await safeEvaluate(residentPage, () => document.querySelector('[role="alert"]')?.textContent ?? null);
    assert(zeroAreaError, "expected a client-side validation error for a zero owned area");

    // --- Step 4b: happy path — a valid full-area ballot for apartment 10 ---
    await residentPage.evaluate(() => {
      const input = document.querySelector('input[inputmode="decimal"]') as HTMLInputElement | null;
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const areaInputAgain = await residentPage.$('input[inputmode="decimal"]');
    assert(areaInputAgain, "owned area input not found (second pass)");
    await areaInputAgain.type("50", { delay: 10 });
    await sleep(150);

    await clickButtonByText(residentPage, "Підтвердити голос");
    await residentPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
    await sleep(700);

    const ballotRow = await admin
      .from("house_meeting_online_ballots")
      .select("id, status, owned_area_m2")
      .eq("meeting_id", meetingRow.data!.id)
      .eq("apartment_id", apartment1Value!)
      .maybeSingle();
    assert(!ballotRow.error, `ballot lookup failed: ${ballotRow.error?.message}`);
    assert(ballotRow.data, "expected a recorded online ballot for apartment 10");
    assert(ballotRow.data!.status === "confirmed", `expected ballot status=confirmed, got ${ballotRow.data!.status}`);
    assert(Number(ballotRow.data!.owned_area_m2) === 50, `expected owned_area_m2=50, got ${ballotRow.data!.owned_area_m2}`);

    // --- Step 4c: duplicate-vote prevention — a fully-voted apartment must
    // disappear from the ballot picker after the page reloads ---
    const stillSelectable = await waitForCondition(
      residentPage,
      () => {
        const select = document.querySelector("select") as HTMLSelectElement | null;
        return Array.from(select?.options ?? []).some((o) => o.textContent?.includes("10"));
      },
      1000,
    );
    assert(!stillSelectable, "fully-voted apartment 10 should no longer be selectable for a second ballot");

    console.log("ONLINE_VOTING_E2E_RESULT=PASS");
    console.log(`ONLINE_VOTING_E2E_MEETING_ID=${meetingRow.data!.id}`);
    console.log(`ONLINE_VOTING_E2E_BALLOT_ID=${ballotRow.data!.id}`);
  } catch (error) {
    console.log("ONLINE_VOTING_E2E_RESULT=FAIL");
    console.error(error);
    if (browser) {
      const pages = await browser.pages().catch(() => []);
      const page = pages[pages.length - 1];
      if (page) {
        await page.screenshot({ path: "/tmp/online_voting_e2e_failure.png", fullPage: true }).catch(() => {});
        console.error("URL_AT_FAILURE=" + page.url());
        const body = await safeEvaluate(page, () => document.body.innerText.slice(0, 2000)).catch(
          (evalError) => `<body read failed: ${evalError instanceof Error ? evalError.message : String(evalError)}>`,
        );
        console.error("BODY_AT_FAILURE=" + body);
      }
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (fixture && process.env.E2E_KEEP_FIXTURE !== "1") {
      await destroyE2eAdminFixture(fixture).catch((e) => console.error("CLEANUP_FAILED", e));
    } else if (fixture) {
      console.log(`E2E_FIXTURE_KEPT houseId=${fixture.houseId} email=${fixture.email} password=${fixture.password}`);
    }
  }
}

run();
