# Trade OS — Mechanical Forex Trading Operating System

A disciplined, date-centric trading operating system for EUR/USD forex trading. Forces a structured daily workflow to prevent impulsive trades and enforce process.

## Daily Workflow

```
PRE-MARKET → NO-TRADE FILTER → MARKET ANALYSIS → TRADE SETUP → TRADE EXECUTION → POST-TRADE REVIEW → END-OF-DAY REVIEW
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Netlify

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/fbaafi1/TradeOS.git
cd TradeOS
npm install
```

### 2. Environment Variables

Create `.env.local` with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TWELVEDATA_API_KEY=your_twelvedata_key   # optional, for market data
```

### 3. Database Setup

Run migrations in order in the Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_analysis_schema.sql
supabase/migrations/003_trading_os_schema.sql
supabase/migrations/004_seed_defaults.sql   ← existing users only
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Netlify)

Set the following environment variables in **Netlify → Site Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

The `netlify.toml` handles the build configuration automatically via `@netlify/plugin-nextjs`.

## Key Features

- **No-Trade Filter** — Hard/soft block system evaluated before every session
- **Multi-Timeframe Analysis** — Daily → 4H → 1H → 15M → 5M per day
- **Trade Execution Log** — Full trade record with auto-calculated R:R
- **Post-Trade Review** — Good/Bad trade categorisation per trade
- **End-of-Day Review** — "Did I follow my Trade OS?" daily accountability
- **Settings** — Fully editable No-Trade conditions and setup rules
- **Calendar View** — Visual month view of all sessions

## Default Timezone

Ghana (GMT/UTC+0)
