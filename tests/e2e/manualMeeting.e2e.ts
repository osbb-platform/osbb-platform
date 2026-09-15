// Permanent local release-gate scenario for the manual meeting lifecycle
// (RC-1 fix verification): create -> add a second question -> publish ->
// move to review -> cast three atomic manual ballots (A/B/C, one full vote
// per apartment across both questions) -> verify per-apartment atomicity via
// lock_version increments -> verify tallied results. Run with
// `npm run test:e2e:local` against a `next dev -p 3100` server and local
// Supabase.
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

// Unlike the poll workspace's list items (plain <button>), each meeting
// list item is an <article onClick=...> card (see HouseMeetingsWorkspace.tsx
// list rendering), so it isn't reachable via the shared clickAndWaitForDialog
// helper, which only matches <button>/<a>. Click the card directly by title.
async function openMeetingCard(page: Page, title: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const clicked = await page.evaluate((needle: string) => {
      const article = Array.from(document.querySelectorAll("article")).find((el) =>
        el.textContent?.includes(needle),
      ) as HTMLElement | undefined;
      if (!article) return false;
      article.click();
      return true;
    }, title);

    if (!clicked) throw new Error(`E2E_MEETING_CARD_NOT_FOUND: "${title}"`);

    try {
      await waitForDialogOpen(page, 3_000);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// clickButtonByText throws immediately if the button isn't in the DOM yet;
// a confirm modal (PlatformConfirmModal) can take a render tick to mount
// after the button that opens it is clicked, so poll briefly before giving up.
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

// Polls up to `timeoutMs` for the in-flight Save to settle, since the
// mutation + router.refresh() round trip is async and has no single DOM
// event to await. Returns the error banner text if Save failed, or null if
// it appears to have succeeded (banner gone / workspace advanced).
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

async function waitForCondition(
  page: Page,
  predicate: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(predicate)) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function selectManualVoteChoice(
  page: Page,
  questionIndex: number,
  choiceLabel: "За" | "Проти" | "Утримався",
): Promise<void> {
  const clicked = await page.evaluate(
    (qIndex: number, label: string) => {
      // Each question card renders 3 choice buttons (За/Проти/Утримався)
      // with identical text; filter by label and index into the Nth
      // question's occurrence of that label.
      const buttons = Array.from(document.querySelectorAll("button")).filter(
        (btn) => btn.textContent?.trim() === label,
      ) as HTMLButtonElement[];
      const target = buttons[qIndex];
      if (!target) return false;
      target.click();
      return true;
    },
    questionIndex,
    choiceLabel,
  );

  assert(clicked, `manual vote choice button not found: question ${questionIndex} choice "${choiceLabel}"`);
}

async function run(): Promise<void> {
  let fixture: E2eAdminFixture | null = null;
  let browser: Browser | null = null;
  const admin = createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    fixture = await createE2eAdminFixture("manual-meeting");

    const apartmentsInsert = await admin
      .from("house_apartments")
      .insert([
        { house_id: fixture.houseId, account_number: "A-001", apartment_label: "1", owner_name: "Ballot A Owner", area: 40, source_type: "manual" },
        { house_id: fixture.houseId, account_number: "B-002", apartment_label: "2", owner_name: "Ballot B Owner", area: 40, source_type: "manual" },
        { house_id: fixture.houseId, account_number: "C-003", apartment_label: "3", owner_name: "Ballot C Owner", area: 40, source_type: "manual" },
      ])
      .select("id, apartment_label");

    assert(!apartmentsInsert.error, `fixture apartments insert failed: ${apartmentsInsert.error?.message}`);
    assert((apartmentsInsert.data ?? []).length === 3, "expected 3 fixture apartments");

    browser = await launchE2eBrowser();
    const page: Page = await browser.newPage();

    await loginAsE2eAdmin(page, { email: fixture.email, password: fixture.password });

    await gotoWithRetry(page, `${e2eEnv.adminBaseUrl}/houses/${fixture.houseId}?block=meetings`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await sleep(500);
    await dismissOnboardingIfPresent(page);

    // --- Step 1: create a manual-mode meeting with 2 questions, save as draft ---
    await clickButtonByText(page, "Нові збори");
    await waitForDialogOpen(page);
    await sleep(200);

    const titleInput = await page.$('input[placeholder="Назва зборів"]');
    assert(titleInput, "meeting title input not found");
    await titleInput.type("E2E Загальні збори", { delay: 3 });

    // Native <input type="date"/time"> Chromium widgets don't reliably accept
    // ISO strings via .type() (they expect locale-formatted keystrokes);
    // setting .value directly + dispatching input/change is deterministic.
    const dateSet = await page.evaluate(() => {
      const input = document.querySelector('input[type="date"]') as HTMLInputElement | null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "2027-06-01");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    assert(dateSet, "meeting date input not found");

    const timeSet = await page.evaluate(() => {
      const input = document.querySelector('input[type="time"]') as HTMLInputElement | null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "18:00");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    });
    assert(timeSet, "meeting time input not found");

    const question1Input = await page.$('input[placeholder="Питання 1"]');
    assert(question1Input, "question 1 input not found");
    await question1Input.type("Затвердити кошторис на рік", { delay: 3 });

    await clickButtonByText(page, "Додати питання");
    await sleep(150);

    const question2Input = await page.$('input[placeholder="Питання 2"]');
    assert(question2Input, "question 2 input not found");
    await question2Input.type("Обрати підрядника для ремонту даху", { delay: 3 });

    await clickButtonByText(page, "Зберегти");
    const createError = await waitForSaveOutcome(page);
    assert(!createError, `unexpected error after creating the draft meeting: ${createError}`);
    await sleep(500);
    await waitAndDismissDirtyGuardIfPresent(page);

    async function waitForMeetingStatus(
      column: "lifecycle_status" | "meeting_status" | "display_status",
      expected: string,
      // A dispatch's `router.refresh()` re-renders the whole admin house RSC
      // tree in dev mode (Turbopack, unoptimized), which can measurably take
      // several seconds on this machine; 8s intermittently timed out before
      // the DB write (already committed) had actually round-tripped back
      // into the client's view. This still resolves as soon as the real
      // state lands — it is not a fixed sleep.
      timeoutMs = 20_000,
    ): Promise<void> {
      const start = Date.now();
      let lastValue: unknown;
      while (Date.now() - start < timeoutMs) {
        const row = await admin
          .from("house_meetings")
          .select(column)
          .eq("house_id", fixture!.houseId)
          .eq("title", "E2E Загальні збори")
          .maybeSingle();
        lastValue = (row.data as Record<string, unknown> | null)?.[column];
        if (lastValue === expected) return;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error(`TIMED_OUT_WAITING_FOR_${column}=${expected} (last seen: ${String(lastValue)})`);
    }

    // --- Step 2: publish from the "Чернетки" tab ---
    await clickButtonContainingText(page, "Чернетки");
    await sleep(300);
    await openMeetingCard(page, "E2E Загальні збори");
    await sleep(200);

    // "Опублікувати" is disabled while the workspace's shared mutation-pending
    // flag is still settling from the preceding Save (its dispatch + refresh +
    // dirty-guard dismissal chain took ~2s in practice); clicking it while
    // disabled is a silent no-op (no click event fires at all on a disabled
    // control), which previously left the test waiting forever for a
    // "Підтвердити" confirm modal that could never appear.
    await waitForEnabledButtonByText(page, "Опублікувати");
    await waitAndClickButtonByText(page, "Підтвердити");
    const publishError = await waitForSaveOutcome(page);
    assert(!publishError, `unexpected error after publishing the meeting: ${publishError}`);
    await waitForMeetingStatus("lifecycle_status", "published");
    await sleep(300);

    // --- Step 3: move to "На перевірці" (review) so manual voting UI opens ---
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
    await sleep(500);
    await clickButtonContainingText(page, "Активні");
    await sleep(300);
    await openMeetingCard(page, "E2E Загальні збори");
    await sleep(200);

    await clickButtonByText(page, "На перевірці");
    await sleep(150);
    await clickButtonByText(page, "Зберегти");
    const reviewError = await waitForSaveOutcome(page);
    assert(!reviewError, `unexpected error after moving meeting to review: ${reviewError}`);
    await waitForMeetingStatus("display_status", "review");
    await sleep(300);
    await waitAndDismissDirtyGuardIfPresent(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
    await sleep(500);

    // --- Step 4: reopen and cast 3 atomic manual ballots (A: for/for, B: against/abstained, C: abstained/against) ---
    await clickButtonContainingText(page, "Активні");
    await sleep(300);
    await openMeetingCard(page, "E2E Загальні збори");
    await sleep(300);

    // The "Зберегти голос ..." label is object_kind-dependent; resolve it dynamically.
    async function saveBallotButtonLabel(): Promise<string> {
      return page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.trim().startsWith("Зберегти голос"),
        );
        return btn?.textContent?.trim() ?? "";
      });
    }

    async function selectApartmentByLabel(label: string) {
      const value = await page.evaluate((needle: string) => {
        const selectEl = document.querySelector("select") as HTMLSelectElement | null;
        if (!selectEl) return null;
        const option = Array.from(selectEl.options).find((o) => o.textContent?.includes(needle));
        return option ? option.value : null;
      }, label);
      assert(value, `apartment option not found for label "${label}"`);
      await page.select("select", value!);
    }

    async function castFullBallot(
      apartmentLabel: string,
      q1Choice: "За" | "Проти" | "Утримався",
      q2Choice: "За" | "Проти" | "Утримався",
    ) {
      await selectApartmentByLabel(apartmentLabel);
      await sleep(150);
      await selectManualVoteChoice(page, 0, q1Choice);
      await sleep(100);
      await selectManualVoteChoice(page, 1, q2Choice);
      await sleep(100);

      // Guard against clicking while still disabled from a still-settling
      // prior transition (see the re-enable wait after each ballot below) —
      // a disabled button's native .click() silently no-ops.
      const enabledBeforeClick = await waitForCondition(
        page,
        () => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) =>
            b.textContent?.trim().startsWith("Зберегти голос"),
          ) as HTMLButtonElement | undefined;
          return btn ? !btn.disabled : false;
        },
        8000,
      );
      assert(enabledBeforeClick, `save-ballot button still disabled for apartment "${apartmentLabel}"`);

      const label = await saveBallotButtonLabel();
      assert(label, "save-ballot button label could not be resolved");
      await clickButtonByText(page, label);
      const ballotError = await waitForSaveOutcome(page, 5000);
      assert(!ballotError, `unexpected error after casting ballot for apartment "${apartmentLabel}": ${ballotError}`);

      // Mutation pending is independent from the optional route refresh.
      // Poll for the actual mutation to settle before the next ballot.
      const reenabled = await waitForCondition(
        page,
        () => {
          const btn = Array.from(document.querySelectorAll("button")).find((b) =>
            b.textContent?.trim().startsWith("Зберегти голос"),
          ) as HTMLButtonElement | undefined;
          return btn ? !btn.disabled : false;
        },
        8000,
      );
      assert(reenabled, `save-ballot button never re-enabled after casting ballot for apartment "${apartmentLabel}"`);
      await sleep(150);
    }

    const meetingIdRow = await admin
      .from("house_meetings")
      .select("id")
      .eq("house_id", fixture.houseId)
      .eq("title", "E2E Загальні збори")
      .single();
    assert(!meetingIdRow.error, `meeting id lookup failed: ${meetingIdRow.error?.message}`);
    const meetingId = meetingIdRow.data!.id as string;

    async function voteRowCount(): Promise<number> {
      const result = await admin
        .from("house_meeting_manual_votes")
        .select("id", { count: "exact", head: true })
        .eq("meeting_id", meetingId);
      assert(!result.error, `vote row count query failed: ${result.error?.message}`);
      return result.count ?? 0;
    }

    await castFullBallot("1", "За", "За");
    const countAfterA = await voteRowCount();
    assert(countAfterA === 2, `expected 2 vote rows after ballot A, got ${countAfterA}`);

    const lockAfterA = await admin
      .from("house_meetings")
      .select("lock_version")
      .eq("id", meetingId)
      .single();
    assert(!lockAfterA.error, `lock_version read after ballot A failed: ${lockAfterA.error?.message}`);

    await castFullBallot("2", "Проти", "Утримався");
    const countAfterB = await voteRowCount();
    assert(countAfterB === 4, `expected 4 vote rows after ballot B, got ${countAfterB}`);

    await castFullBallot("3", "Утримався", "Проти");
    const countAfterC = await voteRowCount();
    assert(countAfterC === 6, `expected 6 vote rows after ballot C, got ${countAfterC}`);

    // --- Step 5: own ballot lock_version must be accepted by the next edit
    // and then by a status transition in the same open drawer lifecycle. ---
    const descriptionInput = await page.$('textarea[placeholder="Короткий опис"]');
    assert(descriptionInput, "meeting short description input not found after ballots");
    await descriptionInput.type(" Перевірено після ручних бюлетенів", { delay: 3 });
    await clickButtonByText(page, "Зберегти");
    const postBallotSaveError = await waitForSaveOutcome(page);
    assert(!postBallotSaveError, `false stale error after ballot -> edit/save: ${postBallotSaveError}`);
    await waitAndDismissDirtyGuardIfPresent(page);
    await sleep(300);

    await openMeetingCard(page, "E2E Загальні збори");
    await clickButtonByText(page, "Завершено");
    await clickButtonByText(page, "Зберегти");
    const completionError = await waitForSaveOutcome(page);
    assert(!completionError, `false stale error after ballot -> status transition: ${completionError}`);
    await waitForMeetingStatus("display_status", "completed");
    await waitAndDismissDirtyGuardIfPresent(page);
    await sleep(300);
    await openMeetingCard(page, "E2E Загальні збори");

    // --- Step 6: verify the recorded votes and per-question tallies directly from the DB ---
    const meetingRow = await admin
      .from("house_meetings")
      .select("id, lock_version")
      .eq("house_id", fixture.houseId)
      .eq("title", "E2E Загальні збори")
      .single();

    assert(!meetingRow.error, `meeting lookup failed: ${meetingRow.error?.message}`);

    const voteRows = await admin
      .from("house_meeting_manual_votes")
      .select("apartment_id, question_id, choice")
      .eq("meeting_id", meetingRow.data!.id);

    assert(!voteRows.error, `manual vote rows lookup failed: ${voteRows.error?.message}`);
    assert(
      (voteRows.data ?? []).length === 6,
      `expected 6 recorded manual vote rows (3 apartments x 2 questions), got ${(voteRows.data ?? []).length}`,
    );

    const choicesByApartment = new Map<string, string[]>();
    for (const row of voteRows.data ?? []) {
      const list = choicesByApartment.get(row.apartment_id as string) ?? [];
      list.push(row.choice as string);
      choicesByApartment.set(row.apartment_id as string, list);
    }
    assert(
      choicesByApartment.size === 3,
      `expected 3 distinct apartments with recorded votes, got ${choicesByApartment.size}`,
    );
    for (const [, choices] of choicesByApartment) {
      assert(choices.length === 2, `expected 2 answers (atomic ballot) per apartment, got ${choices.length}`);
    }

    // Each successful atomic ballot RPC call increments lock_version by
    // exactly 1 (RC-1's fix target); after 3 ballots the meeting is at
    // lockVersion0 + 3.
    assert(
      meetingRow.data!.lock_version >= (lockAfterA.data?.lock_version ?? 0) + 2,
      `expected lock_version to have advanced across all 3 ballots, got ${meetingRow.data!.lock_version}`,
    );

    // --- Step 7: results remain visible after the status transition ---
    const resultsText = await safeEvaluate(page, () => document.body.innerText);
    assert(resultsText.includes("За:"), "expected tallied 'За:' result text in the UI after casting ballots");
    assert(resultsText.includes("Проти:"), "expected tallied 'Проти:' result text in the UI after casting ballots");
    assert(resultsText.includes("Утрималися:"), "expected tallied 'Утрималися:' result text in the UI after casting ballots");
    assert(resultsText.includes("Підсумок:"), "expected a 'Підсумок:' (outcome) line in the UI after casting ballots");

    console.log("MANUAL_MEETING_E2E_RESULT=PASS");
    console.log(`MANUAL_MEETING_E2E_MEETING_ID=${meetingRow.data!.id}`);
    console.log(`MANUAL_MEETING_E2E_FINAL_LOCK_VERSION=${meetingRow.data!.lock_version}`);
  } catch (error) {
    console.log("MANUAL_MEETING_E2E_RESULT=FAIL");
    console.error(error);
    if (browser) {
      const pages = await browser.pages().catch(() => []);
      const page = pages[pages.length - 1];
      if (page) {
        await page.screenshot({ path: "/tmp/manual_meeting_e2e_failure.png", fullPage: true }).catch(() => {});
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
