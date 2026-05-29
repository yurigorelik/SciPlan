# SciPlan

An interactive website that teaches and enables students to plan research —
step by step, from the research question through to the statistical analysis
plan — with AI guidance (Anthropic Claude) and built-in calculators.

## The six steps

1. **Research question** — frame an answerable question (PICO / FINER).
2. **Study design** — choose a design based on whether data is existing or
   newly collected (experimental vs observational, cohort/RCT/case-control…).
3. **Variables & definitions** — operational definitions, variable types,
   exposures, outcomes, confounders.
4. **Sample size** — power/precision calculators with assumptions and dropout.
5. **Resources & feasibility** — timeline, budget, people, approvals.
6. **Statistical methods** — pre-specify the analysis, assumptions, missing
   data, and multiplicity.

Each step has an **AI guidance** panel (powered by Claude) and the sample-size
step has a **calculator** (compare means/proportions, precision estimates,
dropout inflation). Plans are saved to Postgres and get a shareable link.

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
#   - set ANTHROPIC_API_KEY (from https://console.anthropic.com)

# 3. Create the database schema
npm run db:push

# 4. Run the dev server
npm run dev
# open http://localhost:3000
```

The app runs without an API key — the AI panel simply reports that AI is not
configured until you add `ANTHROPIC_API_KEY`.

## Deploying on Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**, pick this repo.
3. Add a **PostgreSQL** plugin to the project.
4. In the web service **Variables**, set:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference the plugin)
   - `ANTHROPIC_API_KEY` = your Claude API key
   - `ANTHROPIC_MODEL` = `claude-opus-4-8` (optional)
5. Deploy. `railway.json` builds the app and runs `prisma db push` on start to
   sync the schema, then starts Next.js.

Railway sets `PORT` automatically; `next start` reads it.

## Project layout

```
prisma/schema.prisma     Plan model (id, title, JSON data, timestamps)
src/lib/anthropic.ts     Claude client + frozen system prompt
src/lib/stats.ts         Sample-size formulas (normal approximation)
src/lib/steps.ts         Wizard step definitions + prompts
src/app/api/ai           Streaming Claude guidance endpoint
src/app/api/sample-size  Sample-size calculation endpoint
src/app/api/plans        Save / load plans
src/components/Wizard.tsx The step wizard (client)
```

> SciPlan is an educational aid, not a substitute for a supervisor,
> statistician, or ethics board.
