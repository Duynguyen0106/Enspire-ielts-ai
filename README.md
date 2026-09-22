# VietIELTS AI

Học IELTS cùng AI dành cho người Việt — 4 kỹ năng, 9 cấp độ, lộ trình cá nhân hóa.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- Auth.js v5 (Credentials + Google)
- Zod + react-hook-form

## Setup

```bash
pnpm install
cp .env.example .env
# Fill DATABASE_URL, AUTH_SECRET, optional OPENAI_API_KEY / Upstash / S3

pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed admin

- Email: `admin@vietielts.ai`
- Password: `Admin@12345`

### Phase 2 — Placement

After seeding, a shared IELTS Placement Test (4 sections) is available at `/placement`.
Without `OPENAI_API_KEY`, Writing/Speaking scoring uses a safe heuristic fallback and still writes `AIFeedback` rows.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed levels, skills, admin, placement test |
| `pnpm db:seed:placement` | Re-seed placement test only |
