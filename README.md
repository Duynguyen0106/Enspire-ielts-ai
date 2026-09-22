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
# Fill DATABASE_URL, AUTH_SECRET, and optional Google OAuth keys

pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed admin

- Email: `admin@vietielts.ai`
- Password: `Admin@12345`

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed levels, skills, admin |
