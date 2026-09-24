/**
 * Marketing product demo with Playwright viewport recording (reliable for demos).
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@vietielts.ai";
const PASS = "Admin@12345";
const OUT_DIR = "/tmp/vietielts-marketing-video";

async function pause(page, ms = 1600) {
  await page.waitForTimeout(ms);
}

async function dismissOverlays(page) {
  for (const name of [/Đồng ý/i, /Accept/i, /Close/i, /Đóng/i]) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
      await btn.click({ timeout: 1500 }).catch(() => {});
      await pause(page, 300);
    }
  }
  // Next.js issue badge / cookie — try Escape
  await page.keyboard.press("Escape").catch(() => {});
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "vi-VN",
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();

  // --- LANDING INTRO ---
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
  await dismissOverlays(page);
  await pause(page, 3200);
  await page.evaluate(() => window.scrollBy({ top: 480, behavior: "smooth" }));
  await pause(page, 2800);
  await page.evaluate(() => window.scrollBy({ top: 520, behavior: "smooth" }));
  await pause(page, 2400);
  await page.evaluate(() => window.scrollBy({ top: 520, behavior: "smooth" }));
  await pause(page, 2200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(page, 1200);

  // CTA hover
  const cta = page.getByRole("link", { name: /Bắt đầu miễn phí/i }).first();
  if (await cta.isVisible().catch(() => false)) {
    await cta.hover().catch(() => {});
    await pause(page, 900);
  }

  // --- LOGIN ---
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await dismissOverlays(page);
  await pause(page, 1200);
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await pause(page, 400);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASS);
  await pause(page, 500);
  await page
    .locator("button[type=submit]")
    .filter({ hasText: /^Đăng nhập$/ })
    .first()
    .click();
  await page.waitForURL(/dashboard|onboarding|levels|placement/, { timeout: 35000 }).catch(() => {});
  await pause(page, 2000);
  if (page.url().includes("onboarding") || page.url().includes("placement")) {
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  }
  await dismissOverlays(page);
  await pause(page, 2800);

  // --- DASHBOARD ---
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await dismissOverlays(page);
  await pause(page, 2800);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
  await pause(page, 1600);

  // --- LEVELS & LESSONS ---
  await page.goto(BASE + "/levels", { waitUntil: "networkidle" });
  await pause(page, 2400);
  await page.goto(BASE + "/lessons", { waitUntil: "networkidle" });
  await pause(page, 2200);
  const lesson = page.locator('a[href*="/lessons/"]').first();
  if (await lesson.isVisible({ timeout: 2000 }).catch(() => false)) {
    await lesson.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await pause(page, 2600);
  }

  // --- SKILLS ---
  const skillPaths = [
    "/practice/listening",
    "/practice/reading",
    "/writing",
    "/speaking",
  ];
  for (const pathUrl of skillPaths) {
    await page.goto(BASE + pathUrl, { waitUntil: "domcontentloaded", timeout: 40000 }).catch(() => {});
    await pause(page, 2200);
  }

  // --- TESTS HUB ---
  await page.goto(BASE + "/tests", { waitUntil: "networkidle" });
  await pause(page, 2400);
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: "smooth" }));
  await pause(page, 2400);
  await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
  await pause(page, 2200);

  // --- PRICING ---
  await page.goto(BASE + "/pricing", { waitUntil: "networkidle" });
  await pause(page, 2800);

  // --- CLOSING LANDING ---
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await dismissOverlays(page);
  await pause(page, 3200);

  await context.close();
  await browser.close();

  const videos = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".webm"));
  if (!videos.length) throw new Error("No video produced");
  const src = path.join(OUT_DIR, videos[0]);
  console.log("raw video", src, fs.statSync(src).size);
  // Convert to mp4 for artifacts
  const { execSync } = require("child_process");
  const dest = "/opt/cursor/artifacts/vietielts_new_user_feature_tour.mp4";
  execSync(
    `ffmpeg -y -i "${src}" -vf "scale=1440:-2" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart -an "${dest}"`,
    { stdio: "inherit" }
  );
  console.log("saved", dest, fs.statSync(dest).size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
