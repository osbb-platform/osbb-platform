// Permanent local release-gate scenario for the poll admin workspace.
//
// This is a runtime regression test for RC-2 (poll Save validation error was
// rendered outside the visible AdminSidePanel drawer, so a manager saving a
// single/multiple-choice poll with untouched "Варіант 1"/"Варіант 2"
// placeholders saw no feedback at all and no request was ever sent) plus the
// full poll lifecycle happy path. Run with `npm run test:e2e:local` against
// a `next dev -p 3100` server and local Supabase.
import { createClient } from "@supabase/supabase-js";
import { createE2eAdminFixture, destroyE2eAdminFixture, type E2eAdminFixture } from "./lib/adminFixture";
import { attachNetworkLog, clickAndWaitForCondition, clickAndWaitForDialog, clickButtonByText, clickButtonContainingText, dismissOnboardingIfPresent, gotoWithRetry, isWorkspaceTabActive, launchE2eBrowser, loginAsE2eAdmin, safeEvaluate, sleep, waitForDialogOpen } from "./lib/browser";
import { e2eEnv } from "./lib/e2eEnv";
import type { Browser, Page } from "puppeteer";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${message}`);
}

async function run(): Promise<void> {
  let fixture: E2eAdminFixture | null = null;
  let browser: Browser | null = null;

  try {
    fixture = await createE2eAdminFixture("poll");
    browser = await launchE2eBrowser();
    const page: Page = await browser.newPage();
    const netLog = attachNetworkLog(page);

    await loginAsE2eAdmin(page, { email: fixture.email, password: fixture.password });

    await gotoWithRetry(page, `${e2eEnv.adminBaseUrl}/houses/${fixture.houseId}?block=polls`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await sleep(500);
    await dismissOnboardingIfPresent(page);

    // --- Scenario 1: RC-2 regression — invalid options must be visible and block Save ---
    await clickButtonByText(page, "Нове опитування");
    await waitForDialogOpen(page);
    await sleep(200);

    const titleInput = await page.$('input[placeholder="Наприклад: Благоустрій подвірʼя"]');
    assert(titleInput, "title input not found");
    await titleInput.type("E2E Опитування про благоустрій", { delay: 3 });

    const questionInput = await page.$('input[placeholder="Текст питання"]');
    assert(questionInput, "question input not found");
    await questionInput.type("Чи підтримуєте ви ініціативу?", { delay: 3 });

    // Deliberately leave the "Варіант 1"/"Варіант 2" placeholder inputs empty,
    // exactly like the reported manager scenario.
    const postCountBeforeSave = netLog.postRequests.length;

    await clickButtonByText(page, "Зберегти");
    await sleep(1000);

    const postCountAfterSave = netLog.postRequests.length;
    assert(
      postCountAfterSave === postCountBeforeSave,
      `expected 0 new POST requests on failed client-side validation, got ${postCountAfterSave - postCountBeforeSave}`,
    );

    // The error must be visible: rendered inside the open drawer (an
    // ancestor with role="dialog"), not hidden behind it.
    const errorInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const alert = dialog?.querySelector('[role="alert"]');
      return alert?.textContent?.trim() ?? null;
    });
    assert(errorInsideDialog, "validation error not found inside the open drawer (role=dialog)");
    assert(
      errorInsideDialog.includes("два непорожні варіанти"),
      `unexpected validation error text: ${errorInsideDialog}`,
    );

    const invalidCount = await page.$$eval('[aria-invalid="true"]', (els) => els.length);
    assert(invalidCount >= 2, `expected at least 2 aria-invalid fields (both empty options), got ${invalidCount}`);

    // The first invalid field must be focused for the operator to fix it immediately.
    const activeElementIsInvalid = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute("aria-invalid") === "true";
    });
    assert(activeElementIsInvalid, "first invalid field was not focused after failed Save");

    // Fixing the form must clear the error (per spec: error updates when the
    // draft changes) without requiring a page reload.
    const optionInputs = await page.$$('input[placeholder^="Варіант"]');
    assert(optionInputs.length >= 2, "expected at least 2 option inputs");
    await optionInputs[0]!.type("Так", { delay: 3 });
    await sleep(150);

    const errorClearedAfterEdit = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.querySelector('[role="alert"]') === null;
    });
    assert(errorClearedAfterEdit, "validation error was not cleared after editing the draft");

    await optionInputs[1]!.type("Ні", { delay: 3 });
    await sleep(150);

    // --- Scenario 2: valid Save -> reload -> Edit -> Save -> Publish -> Open ---
    // Every successful save/lifecycle action in this workspace calls
    // refreshPage() = window.location.reload() (a real hard reload, not a
    // soft router refresh), which also closes any open drawer. Each step
    // below waits for that navigation, then explicitly re-selects the tab
    // and reopens the drawer for the next step.
    const postCountBeforeValidSave = netLog.postRequests.length;
    await clickButtonByText(page, "Зберегти");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
    await sleep(900);

    const postCountAfterValidSave = netLog.postRequests.length;
    assert(postCountAfterValidSave > postCountBeforeValidSave, "expected a POST request for the valid Save");

    // The freshly-saved poll is a draft, so it lives under the "Чернетки"
    // tab, not the default "Опубліковані" (active) tab. The preceding Save
    // did a hard `window.location.reload()`, so this is the first click
    // after a fresh navigation — if it fires before React finishes
    // hydrating, the click is a silent no-op (the tab's aria-selected never
    // flips), which previously left the test unable to find the poll's
    // title button under a tab that never actually became active. Retry the
    // click itself (not just the wait) until the tab is verifiably active.
    await clickAndWaitForCondition(
      page,
      () => clickButtonContainingText(page, "Чернетки"),
      () => isWorkspaceTabActive(page, "Чернетки"),
      { label: 'workspace tab "Чернетки" active' },
    );
    await sleep(300);
    await clickAndWaitForDialog(page, "E2E Опитування про благоустрій");
    await sleep(200);

    const noErrorAfterValidSave = await safeEvaluate(page, () => document.querySelector('[role="alert"]') === null);
    assert(noErrorAfterValidSave, "unexpected error banner after a valid Save");

    const reloadedOptionValues = await page.$$eval('input[placeholder^="Варіант"]', (els) =>
      (els as HTMLInputElement[]).map((el) => el.value),
    );
    assert(
      reloadedOptionValues.includes("Так") && reloadedOptionValues.includes("Ні"),
      `expected persisted option values, got ${JSON.stringify(reloadedOptionValues)}`,
    );

    await clickButtonByText(page, "Зберегти й опублікувати");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
    await sleep(900);

    const publishedBanner = await safeEvaluate(page, () => document.querySelector('[role="alert"]')?.textContent ?? null);
    assert(!publishedBanner, `unexpected error after publish: ${publishedBanner}`);

    // Publish moved the poll to the "Опубліковані" tab, which is the default.
    await clickAndWaitForDialog(page, "E2E Опитування про благоустрій");
    await sleep(200);

    await clickButtonByText(page, "Відкрити опитування");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
    await sleep(900);

    const openBanner = await safeEvaluate(page, () => document.querySelector('[role="alert"]')?.textContent ?? null);
    assert(!openBanner, `unexpected error after opening the poll: ${openBanner}`);

    // Confirm DB state directly: poll is published + active with our two options.
    const admin = createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const pollRow = await admin
      .from("house_polls")
      .select("id, lifecycle_status, poll_status")
      .eq("house_id", fixture.houseId)
      .eq("title", "E2E Опитування про благоустрій")
      .single();

    assert(!pollRow.error, `poll lookup failed: ${pollRow.error?.message}`);
    assert(pollRow.data?.lifecycle_status === "published", `expected published, got ${pollRow.data?.lifecycle_status}`);
    assert(pollRow.data?.poll_status === "active", `expected active, got ${pollRow.data?.poll_status}`);

    const optionRows = await admin
      .from("house_poll_options")
      .select("label, question_id, house_poll_questions!inner(poll_id)")
      .eq("house_poll_questions.poll_id", pollRow.data!.id);

    assert(!optionRows.error, `option lookup failed: ${optionRows.error?.message}`);
    const labels = (optionRows.data ?? []).map((row) => row.label as string);
    assert(labels.includes("Так") && labels.includes("Ні"), `expected persisted DB option labels, got ${JSON.stringify(labels)}`);

    console.log("POLL_E2E_RESULT=PASS");
    console.log(`POLL_E2E_POLL_ID=${pollRow.data!.id}`);
  } catch (error) {
    console.log("POLL_E2E_RESULT=FAIL");
    console.error(error);
    if (browser) {
      const pages = await browser.pages().catch(() => []);
      const page = pages[pages.length - 1];
      if (page) {
        await page.screenshot({ path: "/tmp/poll_e2e_failure.png", fullPage: true }).catch(() => {});
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
