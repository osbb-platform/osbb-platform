import puppeteer, { type Browser, type Page } from "puppeteer";
import { e2eEnv } from "./e2eEnv";

export async function launchE2eBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: e2eEnv.headless,
    args: ["--window-size=1400,1000", "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1400, height: 1000 },
  });
}

export type NetworkLog = {
  postRequests: string[];
  failedRequests: string[];
  consoleErrors: string[];
};

export function attachNetworkLog(page: Page): NetworkLog {
  const log: NetworkLog = { postRequests: [], failedRequests: [], consoleErrors: [] };

  page.on("request", (req) => {
    if (req.method() === "POST") {
      log.postRequests.push(`${req.method()} ${req.url()}`);
    }
  });

  page.on("requestfailed", (req) => {
    log.failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") log.consoleErrors.push(msg.text());
  });

  return log;
}

// Waits for an AdminSidePanel-style drawer ([role="dialog"]) to actually be
// present in the DOM, instead of a blind sleep after a click that opens one.
export async function waitForDialogOpen(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForSelector('[role="dialog"]', { timeout: timeoutMs });
}

// Clicking a list item to reopen a drawer right after a hard reload
// (window.location.reload()) can occasionally race React hydration —
// the click event fires on a not-yet-interactive DOM node and is a no-op.
// Retries the click itself (not just the wait) a few times before failing.
export async function clickAndWaitForDialog(page: Page, containingText: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    await clickButtonContainingText(page, containingText);
    try {
      await waitForDialogOpen(page, 3_000);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Checks the shared AdminSegmentedTabs component's aria-selected state
// (role="tab") for the tab whose label contains `tabLabel`, rather than
// inferring the active tab from list content — list content (counts, empty
// states) is server-rendered and present even when the client-side tab
// selection itself never actually switched.
export async function isWorkspaceTabActive(page: Page, tabLabel: string): Promise<boolean> {
  return page.evaluate((label: string) => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((el) =>
      el.textContent?.includes(label),
    );
    return tab?.getAttribute("aria-selected") === "true";
  }, tabLabel);
}

// A successful Save can still route through the same dirtyGuard.request()
// path as a drawer's manual close button (closeWorkspace() calls
// `dirtyGuard.request(resetWorkspace)` unconditionally), showing a generic
// "Є незбережені зміни" confirmation even though the data was already
// persisted. Confirmed by direct measurement: the modal only appears once
// the save's dispatch + refreshOnSuccess round trip fully settles, which can
// take ~2s — checking once immediately (or after a short fixed sleep) can
// miss it, leaving the drawer open in a state that then blocks unrelated
// later actions (a disabled action button, or a tab-switch silently
// re-triggering the same guard instead of switching). Poll for it instead;
// if it never appears within timeoutMs, the workspace closed on its own and
// there is nothing to dismiss.
export async function waitAndDismissDirtyGuardIfPresent(page: Page, timeoutMs = 4_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const dismissed = await safeEvaluate(page, () => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.trim() === "Вийти без збереження",
      ) as HTMLButtonElement | undefined;
      if (!button) return false;
      button.click();
      return true;
    });
    if (dismissed) {
      await sleep(400);
      return true;
    }
    await sleep(150);
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A page.evaluate() call issued immediately after an action that can trigger
// a hard reload or client-side re-render (this workspace's refreshPage() is
// a real window.location.reload()) can race a transient "Execution context
// was destroyed" error even though the page itself is fine a moment later.
// Retry a few times before giving up. Every DOM-touching helper below is
// built on this for that reason.
export async function safeEvaluate<T>(page: Page, fn: () => T): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await page.evaluate(fn);
    } catch (error) {
      lastError = error;
      await sleep(300);
    }
  }
  throw lastError;
}

export async function safeEvaluateWithText(page: Page, fn: (arg: string) => boolean, arg: string): Promise<boolean> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      lastError = error;
      await sleep(300);
    }
  }
  throw lastError;
}

// The post-login page (loginAsE2eAdmin) performs a hard `window.location.href`
// navigation client-side, after the login form's own submit/redirect cycle
// (see AdminLoginForm.tsx's RC-3 fix). If the caller's own explicit
// `page.goto()` to a different admin URL races that still-in-flight client
// redirect, one navigation cancels the other with `net::ERR_ABORTED` -- not a
// real page-load failure, just two navigations started too close together.
// Retrying the (idempotent, side-effect-free) GET is a safe, bounded fix.
export async function gotoWithRetry(
  page: Page,
  url: string,
  options: { waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2"; timeout?: number; retries?: number } = {},
): Promise<void> {
  const { retries = 2, ...gotoOptions } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, gotoOptions);
      return;
    } catch (error) {
      lastError = error;
      await sleep(400);
    }
  }
  throw lastError;
}

export async function loginAsE2eAdmin(
  page: Page,
  params: { email: string; password: string; baseUrl?: string },
): Promise<void> {
  const baseUrl = params.baseUrl ?? e2eEnv.adminBaseUrl;
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle2", timeout: 30_000 });

  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15_000 });
  const emailSelector = (await page.$('input[type="email"]')) ? 'input[type="email"]' : 'input[name="email"]';
  await page.type(emailSelector, params.email, { delay: 5 });

  const passwordSelector = (await page.$('input[type="password"]')) ? 'input[type="password"]' : 'input[name="password"]';
  await page.type(passwordSelector, params.password, { delay: 5 });

  const submitButton = await page.$('button[type="submit"]');
  if (!submitButton) throw new Error("E2E_LOGIN_SUBMIT_BUTTON_NOT_FOUND");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30_000 }).catch(() => null),
    submitButton.click(),
  ]);
}

// A first-login onboarding tour ("Пропустити" / "Ласкаво просимо...") can
// overlay the admin shell for a brand-new admin account. It is dismissible
// and unrelated to whatever the scenario is testing, so scenarios should
// clear it once right after landing in the admin shell.
export async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  const dismissed = await safeEvaluate(page, () => {
    const skip = Array.from(document.querySelectorAll("button, a")).find(
      (node) => node.textContent?.trim() === "Пропустити",
    ) as HTMLElement | undefined;
    if (!skip) return false;
    skip.click();
    return true;
  });

  if (dismissed) {
    await sleep(400);
  }
}

// Clicks a button/link matching the exact text, then retries the ORIGINATING
// click (not just the wait) if `condition` doesn't become true in time. Use
// this instead of a plain click + hope whenever the click could be a silent
// no-op relative to React — e.g. right after a hard page reload, before
// React has attached its event listeners to the freshly-hydrated DOM. Never
// retries an action whose success cannot be cheaply/safely re-attempted
// (see waitForEnabledButtonByText for the "button is legitimately disabled"
// case, which retrying a click can never fix).
export async function clickAndWaitForCondition(
  page: Page,
  performClick: () => Promise<void>,
  condition: () => Promise<boolean>,
  options: { label: string; attempts?: number; conditionTimeoutMs?: number; pollIntervalMs?: number },
): Promise<void> {
  const attempts = options.attempts ?? 4;
  const conditionTimeoutMs = options.conditionTimeoutMs ?? 3_000;
  const pollIntervalMs = options.pollIntervalMs ?? 150;

  for (let attempt = 0; attempt < attempts; attempt++) {
    await performClick();
    const start = Date.now();
    while (Date.now() - start < conditionTimeoutMs) {
      if (await condition()) return;
      await sleep(pollIntervalMs);
    }
  }

  throw new Error(`E2E_CONDITION_NOT_REACHED: "${options.label}" after ${attempts} attempt(s)`);
}

// Waits for a button with the exact given text to exist AND be enabled, then
// clicks it. A button that is legitimately `disabled` (e.g. a shared
// mutation-pending flag still settling from a just-completed save/refresh,
// or from dismissing a dirty-guard confirmation that deferred an earlier
// close) makes a plain `.click()` a silent no-op: the browser never fires a
// click event on a disabled control at all, so no React handler ever runs,
// no request is sent, and nothing in the UI changes. Retrying the click
// itself cannot fix this — only waiting for the disabled state to clear can.
export async function waitForEnabledButtonByText(page: Page, text: string, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  let everFound = false;
  while (Date.now() - start < timeoutMs) {
    const result = await safeEvaluateWithText(
      page,
      (label: string) => {
        const el = Array.from(document.querySelectorAll("button, a")).find(
          (node) => node.textContent?.trim() === label,
        ) as HTMLButtonElement | undefined;
        if (!el) return false;
        if ("disabled" in el && el.disabled) return false;
        el.click();
        return true;
      },
      text,
    );
    if (result) return;

    const found = await safeEvaluateWithText(
      page,
      (label: string) =>
        Array.from(document.querySelectorAll("button, a")).some((node) => node.textContent?.trim() === label),
      text,
    );
    everFound = everFound || found;
    await sleep(150);
  }

  throw new Error(
    everFound
      ? `E2E_BUTTON_STAYED_DISABLED: "${text}" was present but never became enabled within ${timeoutMs}ms`
      : `E2E_BUTTON_NOT_FOUND: "${text}" (waited ${timeoutMs}ms)`,
  );
}

export async function clickButtonByText(page: Page, text: string): Promise<void> {
  const clicked = await safeEvaluateWithText(
    page,
    (label: string) => {
      const el = Array.from(document.querySelectorAll("button, a")).find(
        (node) => node.textContent?.trim() === label,
      ) as HTMLElement | undefined;
      if (!el) return false;
      el.click();
      return true;
    },
    text,
  );

  if (!clicked) throw new Error(`E2E_BUTTON_NOT_FOUND: "${text}"`);
}

// Like clickButtonByText, but matches a button/link whose text CONTAINS the
// given substring rather than exactly equalling it — for list items that
// wrap a title alongside other rendered text (status badges, metadata).
export async function clickButtonContainingText(page: Page, text: string): Promise<void> {
  const clicked = await safeEvaluateWithText(
    page,
    (needle: string) => {
      const el = Array.from(document.querySelectorAll("button, a")).find(
        (node) => node.textContent?.includes(needle),
      ) as HTMLElement | undefined;
      if (!el) return false;
      el.click();
      return true;
    },
    text,
  );

  if (!clicked) throw new Error(`E2E_BUTTON_CONTAINING_TEXT_NOT_FOUND: "${text}"`);
}
