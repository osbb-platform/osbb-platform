// Permanent local release-gate scenario for RC-3 (post-login first-paint
// flash): the first render after a successful login intermittently showed
// the public marketing site instead of the real destination, for both the
// admin and resident personas. Root cause: next/navigation's redirect()
// inside a Server Action performs a client-router *soft* transition, which
// was racing against route-tree resolution and occasionally rendering the
// (site) route group for path "/" instead of the rewritten admin/house
// destination — reproduced on both `next dev` and a `next start` production
// build. Fixed by having the client perform a hard navigation
// (window.location.href) after the action reports success, instead of
// letting the action redirect() itself. This test repeats each login
// several times because the original bug was intermittent, not
// deterministic on every attempt.
import { createClient } from "@supabase/supabase-js";
import { createE2eAdminFixture, destroyE2eAdminFixture, type E2eAdminFixture } from "./lib/adminFixture";
import { launchE2eBrowser, loginAsE2eAdmin, safeEvaluate, sleep } from "./lib/browser";
import { e2eEnv } from "./lib/e2eEnv";
import type { Browser } from "puppeteer";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${message}`);
}

const ATTEMPTS = Number(process.env.E2E_LOGIN_FLASH_ATTEMPTS ?? "5");
const MARKETING_MARKER = "СЕРВІС ДЛЯ ОСББ";

async function checkAdminLoginNoFlash(browser: Browser, fixture: E2eAdminFixture): Promise<void> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    // A fresh, isolated context per attempt: reusing one context would let
    // attempt 2+ start out already authenticated from attempt 1's cookie,
    // which is not the "fresh login" scenario this test needs to repeat.
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await loginAsE2eAdmin(page, { email: fixture.email, password: fixture.password });
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
      await sleep(600);

      // The deliberate window.location.href hard nav (the RC-3 fix itself)
      // can still be in flight this soon after the form submission's own
      // navigation settles; safeEvaluate retries through the transient
      // "Execution context was destroyed" error a raw page.evaluate() would
      // throw on if a second navigation starts mid-call.
      const body = await safeEvaluate(page, () => document.body.innerText);
      assert(
        !body.includes(MARKETING_MARKER),
        `admin login attempt ${attempt}/${ATTEMPTS} showed the public marketing site instead of the admin destination`,
      );
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function checkResidentLoginNoFlash(browser: Browser, fixture: E2eAdminFixture): Promise<void> {
  const admin = createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const accessCode = "654321";
  await admin.from("houses").update({ current_access_code: accessCode }).eq("id", fixture.houseId);
  const upsert = await admin.rpc("upsert_house_access", {
    target_house_id: fixture.houseId,
    raw_password: accessCode,
  });
  assert(!upsert.error, `failed to set resident access code: ${upsert.error?.message}`);

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://${fixture.houseSlug}.localhost:3100/`, {
        waitUntil: "networkidle2",
        timeout: 30_000,
      });

      const digitInputs = await page.$$('input[inputmode="numeric"]');
      assert(digitInputs.length === 6, `expected 6 access-code digit inputs, found ${digitInputs.length}`);
      for (let i = 0; i < accessCode.length; i++) {
        await digitInputs[i]!.type(accessCode[i]!, { delay: 5 });
      }

      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }).catch(() => null);
      await sleep(600);

      // The deliberate window.location.href hard nav (the RC-3 fix itself)
      // can still be in flight this soon after the form submission's own
      // navigation settles; safeEvaluate retries through the transient
      // "Execution context was destroyed" error a raw page.evaluate() would
      // throw on if a second navigation starts mid-call.
      const body = await safeEvaluate(page, () => document.body.innerText);
      assert(
        !body.includes(MARKETING_MARKER),
        `resident login attempt ${attempt}/${ATTEMPTS} showed the public marketing site instead of the house destination`,
      );
      assert(
        body.includes(fixture.houseSlug) || body.toLowerCase().includes("кабінет"),
        `resident login attempt ${attempt}/${ATTEMPTS} did not land on the house cabinet`,
      );
    } finally {
      await context.close().catch(() => {});
    }
  }
}

async function run(): Promise<void> {
  let fixture: E2eAdminFixture | null = null;
  let browser: Browser | null = null;

  try {
    fixture = await createE2eAdminFixture("loginflash");
    browser = await launchE2eBrowser();

    await checkAdminLoginNoFlash(browser, fixture);
    console.log(`ADMIN_LOGIN_FLASH_CHECK=PASS (${ATTEMPTS} attempts, 0 flashes)`);

    await checkResidentLoginNoFlash(browser, fixture);
    console.log(`RESIDENT_LOGIN_FLASH_CHECK=PASS (${ATTEMPTS} attempts, 0 flashes)`);

    console.log("LOGIN_FLASH_E2E_RESULT=PASS");
  } catch (error) {
    console.log("LOGIN_FLASH_E2E_RESULT=FAIL");
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (fixture) await destroyE2eAdminFixture(fixture).catch((e) => console.error("CLEANUP_FAILED", e));
  }
}

run();
