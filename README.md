# SciPlan

An interactive website that teaches and enables students to plan research —
step by step, from the research question through to the statistical analysis
plan — with a final AI review (Anthropic Claude) and built-in calculators.

Sign-in is required to use the site (Google, Microsoft, or the built-in admin
account). Administrators get a dashboard to manage users.

## The six steps

The wizard is mostly **dropdown-driven** — students choose from sound, named
options rather than writing free text:

1. **Research question** — discipline, question type, PICO building blocks, and
   hypothesis framing.
2. **Study design** — data source, nature, specific design, time structure,
   allocation unit, and blinding.
3. **Variables & definitions** — exposure/outcome names and **types**,
   measurement method, and confounders.
4. **Sample size** — analysis goal, effect-size basis, alpha/power/sidedness,
   allocation, and dropout, plus an expanded calculator.
5. **Resources & feasibility** — recruitment rate, timeline, budget, ethics,
   team, and data management.
6. **Statistical methods** — primary test, confounder handling, missing-data
   strategy, multiplicity control, and software.

### Final AI review

The student never chats with the AI. After completing the steps, they submit on
the **Review & finalize** step and the site passes every selected option and
note to Claude, which **reviews the choices, corrects anything inconsistent, and
returns a finalized study with a summary**.

The **sample-size calculator** now supports comparing two means/proportions,
paired means, one mean/proportion vs a reference, correlation, ANOVA, precision
estimates, and dropout inflation. Plans are saved to Postgres per user.

## Users & administration

- **Sign-in required**: Google, Microsoft (Entra ID), or the built-in admin.
- **Admin role**: granted automatically to emails in `ADMIN_EMAILS`
  (defaults to `yurigorelik@gmail.com`) and to the credentials admin
  (`admin` / `SciPlan2026!` by default — override via env).
- **Admin dashboard** (`/admin`): list users, block/unblock (single or all),
  delete (single or all), and view any user's plans and summaries read-only.
- **Blocked users** can still sign in and view plans they already created, but
  cannot create, edit, or finalize new plans.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **@anthropic-ai/sdk** (Claude `claude-opus-4-8`, streaming, adaptive thinking)

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL to a local or hosted Postgres
#   - set AUTH_SECRET (openssl rand -base64 32)
#   - set ANTHROPIC_API_KEY (from https://console.anthropic.com)
#   - optionally set AUTH_GOOGLE_* / AUTH_MICROSOFT_* for OAuth sign-in

# 3. Create the database schema
npm run db:push

# 4. Run the dev server
npm run dev
# open http://localhost:3000
```

Without OAuth credentials you can still sign in with the built-in admin
(`admin` / `SciPlan2026!`). Without `ANTHROPIC_API_KEY`, the final review reports
that AI is not configured.

## Deploying on Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**, pick this repo.
3. Add a **PostgreSQL** plugin to the project.
4. In the web service **Variables**, set:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference the plugin)
   - `AUTH_SECRET` = a random secret (`openssl rand -base64 32`)
   - `ANTHROPIC_API_KEY` = your Claude API key
   - `ANTHROPIC_MODEL` = `claude-opus-4-8` (optional)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (optional, for Google sign-in)
   - `AUTH_MICROSOFT_ID` / `AUTH_MICROSOFT_SECRET` / `AUTH_MICROSOFT_TENANT`
     (optional, for Microsoft sign-in)
   - `ADMIN_EMAILS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (optional overrides)
5. Configure each OAuth provider's redirect URI to
   `https://YOUR_DOMAIN/api/auth/callback/<google|microsoft-entra-id>`.
6. Deploy. `railway.json` builds the app and runs `prisma db push` on start to
   sync the schema, then starts Next.js.

Railway sets `PORT` automatically; `next start` reads it.

## Project layout

```
prisma/schema.prisma      User / Account / Session / Plan models
src/auth.ts               Auth.js config (Google, Microsoft, credentials admin)
src/auth.config.ts        Edge-safe auth config (used by the middleware)
src/middleware.ts         Gates every route behind sign-in
src/lib/admin.ts          Admin emails + credentials-admin settings
src/lib/anthropic.ts      Claude client + finalize system prompt
src/lib/stats.ts          Sample-size formulas (normal approximation)
src/lib/steps.ts          Dropdown-driven wizard step definitions
src/app/signin            Sign-in page (OAuth + admin login)
src/app/admin             Administrator dashboard
src/app/api/admin/users   Admin user management API
src/app/api/finalize      Final AI review/finalization endpoint
src/app/api/sample-size   Sample-size calculation endpoint
src/app/api/plans         Save / load / delete plans (per user)
src/components/Wizard.tsx  The step wizard + final review (client)
```

> SciPlan is an educational aid, not a substitute for a supervisor,
> statistician, or ethics board.
