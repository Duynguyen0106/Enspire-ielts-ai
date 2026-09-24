# VietIELTS AI Runbook

## Health check

`GET /api/health` → `{ ok, db, stripe, openai, qstash }`

Use BetterStack / UptimeRobot against `/api/health`. Alert if `ok !== true`.

## AI (OpenAI) down

Symptoms: writing/speaking/tutor/practice return 503 or timeout.

1. Confirm `OPENAI_API_KEY` in Vercel (Production).
2. Check OpenAI status page.
3. Temporary: disable AI-heavy features via Feature Flags (`new_tutor_model` off, `beta_reading_generator` off).
4. Heuristic scoring still works for Listening/Reading objective sections.
5. Communicate on status page / social if outage > 15 minutes.

## QStash down

Symptoms: full-test scoring stuck in `SCORING`; jobs not delivered.

1. Verify `QSTASH_TOKEN` + signing keys.
2. Cron fallback: `/api/cron/exam-maintenance` re-queues stuck attempts (needs `CRON_SECRET`).
3. Manually re-score via Admin → Tests → recompute (dev) or `POST /api/jobs/score-full-attempt`.
4. If QStash remains down, inline scoring path activates when `CRON_SECRET` header matches.

## Stripe webhook fails

Symptoms: checkout succeeds but user stays FREE.

1. Stripe Dashboard → Webhooks → delivery logs.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches endpoint signing secret.
3. Replay failed events from Stripe Dashboard.
4. Manual fix: Admin → Users → grant Pro (comp) and log AdminAction.
5. Never trust client-reported money amounts.

## Database unreachable (Neon)

1. Check Neon console / status.
2. Confirm `DATABASE_URL` (pooled) and `DIRECT_URL` if used.
3. App will fail health check `db: false` — scale down traffic if needed.
4. Restore from Neon PITR if data corruption (monthly restore drill).

## Sentry alert flood

1. Mute noisy issue if known; fix root cause.
2. Check AI Zod parse failures (prompt schema drift).
3. Check Stripe webhook 500s and QStash signature mismatches.

## Account purge

Cron `/api/cron/account-purge` hard-deletes users with `deletedAt` older than 30 days.

## Weekly digest

Cron `/api/cron/weekly-digest` emails progress summary (Resend). Skips if `RESEND_API_KEY` missing.

## Deploy

```bash
pnpm prisma migrate deploy
pnpm build
# Seeds are MANUAL only — never on Vercel build
pnpm db:seed
```

## Secrets — never log

`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `AUTH_SECRET`, `SENTRY_AUTH_TOKEN`, DB URLs.

## Practice Academic mock exams

Official Cambridge/BC/IDP past papers are copyrighted — do **not** import them.

Seed original Academic-format mocks:

```bash
pnpm exec prisma migrate deploy
pnpm db:seed:practice-exams
```

Students find them under **Bài kiểm tra → Đề thi thử Academic**. Links to free official sample tests are shown in-app.

