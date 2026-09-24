/**
 * Marketing walkthrough — headed Chromium on DISPLAY=:1 for screen recording.
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const EMAIL = "admin@vietielts.ai";
const PASS = "Admin@12345";

async function pause(page, ms = 1800) {
  await page.waitForTimeout(ms);
}

async function dismissCookies(page) {
  try {
    const btn = page.getByRole("button", { name: /Đồng ý|Accept|Agree/i }).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await pause(page, 400);
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--start-maximized", "--window-size=1440,900"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "vi-VN",
  });
  const page = await context.newPage();

  // 1) Landing — brand + live demo
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
  await dismissCookies(page);
  await pause(page, 2800);
  await page.evaluate(() => window.scrollBy(0, 420));
  await pause(page, 2200);
  await page.evaluate(() => window.scrollBy(0, 500));
  await pause(page, 2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(page, 1000);

  // 2) Login
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await dismissCookies(page);
  await pause(page, 1000);
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASS);
  await pause(page, 600);
  const loginBtn = page
    .locator("button[type=submit]")
    .filter({ hasText: /^Đăng nhập$/ })
    .first();
  await loginBtn.click();
  await page.waitForURL(/dashboard|onboarding|levels|placement/, { timeout: 30000 }).catch(() => {});
  await pause(page, 2500);

  // If onboarding, skip toward dashboard
  if (page.url().includes("onboarding")) {
    const skip = page.getByRole("link", { name: /bỏ qua|dashboard|tiếp/i }).first();
    if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skip.click().catch(() => {});
    } else {
      await page.goto(BASE + "/dashboard");
    }
    await pause(page, 1500);
  }

  // 3) Dashboard
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" }).catch(() => {});
  await pause(page, 2800);

  // 4) Levels / lessons
  await page.goto(BASE + "/levels", { waitUntil: "networkidle" }).catch(() => {});
  await pause(page, 2200);
  await page.goto(BASE + "/lessons", { waitUntil: "networkidle" }).catch(() => {});
  await pause(page, 2200);

  // Open first lesson if any
  const lessonLink = page.locator('a[href*="/lessons/"]').first();
  if (await lessonLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await lessonLink.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await pause(page, 2500);
  }

  // 5) Practice
  for (const path of ["/practice/listening", "/practice/reading", "/writing", "/speaking"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await pause(page, 2000);
  }

  // 6) Full tests + practice exams hub
  await page.goto(BASE + "/tests", { waitUntil: "networkidle" }).catch(() => {});
  await pause(page, 2200);
  await page.evaluate(() => window.scrollBy(0, 350));
  await pause(page, 2200);
  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(page, 2000);

  // 7) Pricing
  await page.goto(BASE + "/pricing", { waitUntil: "networkidle" }).catch(() => {});
  await pause(page, 2500);

  // 8) Back to landing CTA moment
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await pause(page, 2500);

  await browser.close();
  console.log("marketing walkthrough done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
