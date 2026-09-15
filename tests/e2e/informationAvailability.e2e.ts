// Permanent local release gate for the cross-flow incident:
// an authenticated admin creates and publishes a 1024-character information
// post, then a fresh resident session loads the invalidated house cache and
// must receive the real house page (not a false session error or false 404).
import { createClient } from "@supabase/supabase-js";
import type { Browser, Page } from "puppeteer";

import {
  createE2eAdminFixture,
  destroyE2eAdminFixture,
  type E2eAdminFixture,
} from "./lib/adminFixture";
import {
  clickButtonByText,
  dismissOnboardingIfPresent,
  gotoWithRetry,
  launchE2eBrowser,
  loginAsE2eAdmin,
  safeEvaluate,
} from "./lib/browser";
import { e2eEnv } from "./lib/e2eEnv";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${message}`);
}

async function waitForText(page: Page, text: string, timeout = 15_000) {
  await page.waitForFunction(
    (expected) => document.body.innerText.includes(expected),
    { timeout },
    text,
  );
}

async function run(): Promise<void> {
  let fixture: E2eAdminFixture | null = null;
  let browser: Browser | null = null;

  try {
    fixture = await createE2eAdminFixture("information");
    const admin = createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const accessCode = "654321";
    const accessUpdate = await admin
      .from("houses")
      .update({ current_access_code: accessCode })
      .eq("id", fixture.houseId);
    assert(!accessUpdate.error, `failed to assign resident access code: ${accessUpdate.error?.message}`);
    const accessRpc = await admin.rpc("upsert_house_access", {
      target_house_id: fixture.houseId,
      raw_password: accessCode,
    });
    assert(!accessRpc.error, `failed to configure resident access: ${accessRpc.error?.message}`);

    browser = await launchE2eBrowser();
    const adminPage = await browser.newPage();
    await loginAsE2eAdmin(adminPage, {
      email: fixture.email,
      password: fixture.password,
    });
    await gotoWithRetry(
      adminPage,
      `${e2eEnv.adminBaseUrl}/houses/${fixture.houseId}?block=information`,
      { waitUntil: "networkidle2", timeout: 30_000 },
    );
    await dismissOnboardingIfPresent(adminPage);

    const title = `E2E information ${Date.now()}`;
    const body = "І".repeat(1024);
    await clickButtonByText(adminPage, "Нова стаття");
    await adminPage.waitForSelector('[role="dialog"] input[name="headline"]');
    await adminPage.type('[role="dialog"] input[name="headline"]', title);
    await adminPage.type('[role="dialog"] textarea[name="body"]', body);
    await clickButtonByText(adminPage, "Створити");
    await adminPage.waitForSelector('[role="dialog"]', { hidden: true, timeout: 15_000 });

    const adminBody = await safeEvaluate(adminPage, () => document.body.innerText);
    assert(
      !adminBody.includes("Сесія завершилася"),
      "information mutation was falsely reported as an expired session",
    );
    await waitForText(adminPage, title);

    const openedMenu = await adminPage.evaluate((expectedTitle) => {
      const card = Array.from(document.querySelectorAll('[role="button"]')).find((node) =>
        node.textContent?.includes(expectedTitle),
      );
      const button = card?.querySelector('button[aria-label="Швидкі дії"]') as HTMLButtonElement | null;
      button?.click();
      return Boolean(button);
    }, title);
    assert(openedMenu, "information draft quick-actions menu was not found");
    await clickButtonByText(adminPage, "Опублікувати");
    await adminPage.waitForSelector('[role="dialog"]');
    await clickButtonByText(adminPage, "Підтвердити публікацію");

    await adminPage.waitForFunction(
      (expectedTitle) => {
        const bodyText = document.body.innerText;
        return bodyText.includes(expectedTitle) && !bodyText.includes("Підтверджуємо...");
      },
      { timeout: 15_000 },
      title,
    );

    const post = await admin
      .from("house_information_posts")
      .select("id, lifecycle_status, body")
      .eq("house_id", fixture.houseId)
      .eq("headline", title)
      .single();
    assert(!post.error, `published information lookup failed: ${post.error?.message}`);
    assert(post.data?.lifecycle_status === "published", "information post was not published");
    assert(post.data?.body.length === 1024, `expected 1024 characters, got ${post.data?.body.length}`);

    const residentPage = await browser.newPage();
    const houseUrl = `http://${fixture.houseSlug}.${e2eEnv.houseBaseHost}`;
    await residentPage.goto(`${houseUrl}/information`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    const digitInputs = await residentPage.$$('input[inputmode="numeric"]');
    assert(digitInputs.length === 6, `expected resident password gate, got ${digitInputs.length} inputs`);
    for (let index = 0; index < accessCode.length; index += 1) {
      await digitInputs[index]!.type(accessCode[index]!);
    }
    await clickButtonByText(residentPage, "Увійти до кабінету");
    await residentPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);

    const coldResponse = await residentPage.goto(`${houseUrl}/information`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    assert(coldResponse?.status() === 200, `resident cold request returned ${coldResponse?.status()}`);
    await waitForText(residentPage, title);
    const residentBody = await safeEvaluate(residentPage, () => document.body.innerText);
    assert(!residentBody.includes("This page could not be found"), "resident received a false 404");

    console.log("INFORMATION_AVAILABILITY_E2E_RESULT=PASS");
  } catch (error) {
    console.log("INFORMATION_AVAILABILITY_E2E_RESULT=FAIL");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (fixture) {
      await destroyE2eAdminFixture(fixture).catch((error) =>
        console.error("CLEANUP_FAILED", error),
      );
    }
  }
}

void run();
