/**
 * Full-feature QA harness — visits every user-facing page + exercises key APIs.
 * Writes JSON report to /tmp/vietielts-qa-report.json
 */
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.QA_EMAIL || "admin@vietielts.ai";
const PASS = process.env.QA_PASS || "Admin@12345";
const CYCLE = process.env.QA_CYCLE || "1";

const PUBLIC_PAGES = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/privacy",
  "/terms",
];

const APP_PAGES = [
  "/dashboard",
  "/levels",
  "/levels/1",
  "/levels/3",
  "/lessons",
  "/practice",
  "/practice/listening",
  "/practice/reading",
  "/writing",
  "/writing/history",
  "/writing/TASK2/new",
  "/speaking",
  "/speaking/practice/1",
  "/speaking/sim/new",
  "/tests",
  "/results",
  "/settings",
  "/placement",
  "/onboarding",
  "/admin",
  "/admin/users",
  "/admin/content",
  "/admin/tests",
  "/admin/feature-flags",
  "/admin/ai-logs",
  "/admin/audit-log",
];

async function dismissOverlays(page) {
  for (const name of [/Đồng ý/i, /Accept/i]) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
      await btn.click().catch(() => {});
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}

function collectPageErrors(page, bucket) {
  page.on("pageerror", (err) => {
    bucket.push({ type: "pageerror", message: String(err.message || err) });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (/favicon|Download the React DevTools|hydration/i.test(text)) return;
      bucket.push({ type: "console", message: text.slice(0, 400) });
    }
  });
}

async function checkPage(page, path, authed) {
  const errors = [];
  const handler = [];
  collectPageErrors(page, handler);
  let status = null;
  let title = "";
  let bodySnippet = "";
  let failed = false;
  let reason = "";

  try {
    const res = await page.goto(BASE + path, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    status = res ? res.status() : null;
    await page.waitForTimeout(700);
    await dismissOverlays(page);
    title = await page.title().catch(() => "");
    bodySnippet = (await page.locator("body").innerText().catch(() => "")).slice(0, 280);

    if (status && status >= 500) {
      failed = true;
      reason = `HTTP ${status}`;
    }
    if (
      /Application error|Something went wrong|Unhandled Runtime Error|This page could not be found|Lỗi hệ thống/i.test(
        bodySnippet
      )
    ) {
      failed = true;
      reason = reason || "error UI text";
    }
    if (authed && /\/login/.test(page.url()) && !path.startsWith("/login")) {
      failed = true;
      reason = "redirected to login";
    }
    if (status === 404 && !path.includes("missing")) {
      failed = true;
      reason = "404";
    }
  } catch (e) {
    failed = true;
    reason = String(e.message || e).slice(0, 200);
  }

  const consoleErrors = handler.filter((e) => e.type === "console" || e.type === "pageerror");
  if (consoleErrors.length) {
    errors.push(...consoleErrors.slice(0, 5));
  }

  return {
    path,
    status,
    url: page.url(),
    title,
    failed,
    reason,
    errors,
    bodySnippet,
  };
}

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 60000 });
  await dismissOverlays(page);
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASS);
  await page.locator("button[type=submit]").filter({ hasText: /^Đăng nhập$/ }).first().click();
  await page.waitForURL(/dashboard|onboarding|levels|placement/, { timeout: 30000 });
  await page.waitForTimeout(800);
  return page.url();
}

async function apiGet(request, path) {
  const res = await request.get(BASE + path);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { path, status: res.status(), ok: res.ok(), json };
}

async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String(e.message || e);
      if (!/ECONNRESET|socket hang up|Timeout/i.test(msg) || i === attempts - 1) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr;
}

async function exerciseApis(request) {
  const results = [];
  const gets = [
    "/api/health",
    "/api/tests/levels",
    "/api/tests/practice-exams",
    "/api/tests/attempts",
    "/api/lessons",
    "/api/writing/prompts",
    "/api/speaking/sessions",
    "/api/ai/tutor/conversations",
    "/api/stripe/subscription",
    "/api/admin/feature-flags",
    "/api/admin/content",
    "/api/admin/tests",
  ];
  for (const p of gets) {
    try {
      const r = await apiGet(request, p);
      results.push({
        ...r,
        failed: r.status >= 500 || (r.status === 404 && !p.includes("missing")),
        reason: r.status >= 500 ? `HTTP ${r.status}` : r.status === 401 ? "401" : "",
      });
    } catch (e) {
      results.push({ path: p, failed: true, reason: String(e.message || e) });
    }
  }

  // Practice generate (may fail if AI credits)
  for (const p of [
    "/api/practice/listening/generate",
    "/api/practice/reading/generate",
  ]) {
    try {
      const res = await withRetry(() =>
        request.post(BASE + p, {
          data: { level: 3 },
          timeout: 90000,
        })
      );
      let json = null;
      try {
        json = await res.json();
      } catch {
        /* */
      }
      results.push({
        path: `POST ${p}`,
        status: res.status(),
        ok: res.ok(),
        failed: res.status() >= 500,
        reason: res.status() >= 500 ? JSON.stringify(json).slice(0, 200) : "",
        jsonSnippet: json ? JSON.stringify(json).slice(0, 180) : "",
      });
    } catch (e) {
      results.push({ path: `POST ${p}`, failed: true, reason: String(e.message || e) });
    }
  }

  // Placement start
  try {
    const res = await withRetry(() =>
      request.post(BASE + "/api/placement/start", { data: {}, timeout: 30000 })
    );
    const json = await res.json().catch(() => null);
    results.push({
      path: "POST /api/placement/start",
      status: res.status(),
      failed: res.status() >= 500,
      reason: res.status() >= 500 ? JSON.stringify(json).slice(0, 200) : "",
      jsonSnippet: json ? JSON.stringify(json).slice(0, 180) : "",
    });
  } catch (e) {
    results.push({ path: "POST /api/placement/start", failed: true, reason: String(e) });
  }

  // Start a practice exam or full level test if available
  try {
    const pe = await apiGet(request, "/api/tests/practice-exams");
    const examId = pe.json?.exams?.[0]?.testId;
    if (examId) {
      const res = await request.post(BASE + `/api/tests/${examId}/start`, { data: {} });
      const json = await res.json().catch(() => null);
      results.push({
        path: `POST /api/tests/${examId}/start`,
        status: res.status(),
        failed: res.status() >= 500,
        reason: res.status() >= 500 ? JSON.stringify(json).slice(0, 200) : "",
        jsonSnippet: json ? JSON.stringify(json).slice(0, 200) : "",
      });
    } else {
      results.push({ path: "POST practice-exam start", failed: false, reason: "no exams seeded", skipped: true });
    }
  } catch (e) {
    results.push({ path: "POST practice-exam start", failed: true, reason: String(e) });
  }

  // Account export
  try {
    const res = await request.get(BASE + "/api/account/export");
    results.push({
      path: "GET /api/account/export",
      status: res.status(),
      failed: res.status() >= 500,
      reason: "",
    });
  } catch (e) {
    results.push({ path: "GET /api/account/export", failed: true, reason: String(e) });
  }

  return results;
}

async function interactiveSmoke(page, request) {
  const notes = [];

  // Writing page CTA
  await page.goto(BASE + "/writing", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const writingLinks = await page.locator('a[href*="/writing/"]').count();
  notes.push({ step: "writing links", count: writingLinks });

  // Tests hub — practice exams visible?
  await page.goto(BASE + "/tests", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const mockText = await page.locator("body").innerText();
  notes.push({
    step: "tests hub",
    hasMocks: /ACADEMIC-MOCK|Đề thi thử Academic/i.test(mockText),
    hasLevels: /Bài thi cấp độ|Level 1/i.test(mockText),
    seedHint: /db:seed:practice-exams/i.test(mockText),
  });

  // Settings tabs
  await page.goto(BASE + "/settings?tab=billing", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const settingsBody = await page.locator("body").innerText();
  notes.push({
    step: "settings billing",
    ok: /billing|gói|Pro|đăng ký|subscription|Free/i.test(settingsBody),
    failed: /Application error|Something went wrong/i.test(settingsBody),
  });

  // Admin users table
  await page.goto(BASE + "/admin/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const adminBody = await page.locator("body").innerText();
  notes.push({
    step: "admin users",
    ok: /admin@vietielts|email|người dùng|Users/i.test(adminBody),
    failed: /Application error|Something went wrong|403|Forbidden|không có quyền/i.test(adminBody),
  });

  // Start practice exam from UI if button exists
  await page.goto(BASE + "/tests", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const startMock = page.getByRole("link", { name: /Bắt đầu đề thử/i }).first();
  if (await startMock.isVisible({ timeout: 1500 }).catch(() => false)) {
    await startMock.click();
    await page.waitForTimeout(1500);
    notes.push({ step: "open mock intro", url: page.url(), ok: /intro|tests\//.test(page.url()) });
    const begin = page.getByRole("button", { name: /Bắt đầu|Start|Tiếp tục/i }).first();
    if (await begin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await begin.click().catch(() => {});
      await page.waitForTimeout(2500);
      notes.push({ step: "start mock attempt", url: page.url() });
    }
  } else {
    notes.push({ step: "open mock intro", skipped: true });
  }

  return notes;
}

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "vi-VN",
  });
  const page = await context.newPage();
  const report = {
    cycle: CYCLE,
    startedAt: new Date().toISOString(),
    publicPages: [],
    appPages: [],
    apis: [],
    interactive: [],
    failures: [],
  };

  for (const path of PUBLIC_PAGES) {
    const r = await checkPage(page, path, false);
    report.publicPages.push(r);
    if (r.failed) report.failures.push({ area: "public", ...r });
  }

  let loginUrl = "";
  try {
    loginUrl = await login(page);
    report.login = { ok: true, url: loginUrl };
  } catch (e) {
    report.login = { ok: false, error: String(e.message || e) };
    report.failures.push({ area: "login", failed: true, reason: String(e.message || e) });
  }

  if (report.login?.ok) {
    for (const path of APP_PAGES) {
      const r = await checkPage(page, path, true);
      report.appPages.push(r);
      if (r.failed) report.failures.push({ area: "app", ...r });
    }
    report.apis = await exerciseApis(context.request);
    for (const a of report.apis) {
      if (a.failed) report.failures.push({ area: "api", ...a });
    }
    report.interactive = await interactiveSmoke(page, context.request);
    for (const n of report.interactive) {
      if (n.failed) report.failures.push({ area: "interactive", ...n });
    }
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    publicFail: report.publicPages.filter((p) => p.failed).length,
    appFail: report.appPages.filter((p) => p.failed).length,
    apiFail: report.apis.filter((a) => a.failed).length,
    totalFailures: report.failures.length,
  };

  const out = `/tmp/vietielts-qa-report-cycle${CYCLE}.json`;
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  console.log("failures:", report.failures.length);
  for (const f of report.failures.slice(0, 40)) {
    console.log("-", f.area, f.path || f.step, f.status || "", f.reason || f.error || "");
  }
  console.log("wrote", out);

  await browser.close();
  process.exit(report.failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
