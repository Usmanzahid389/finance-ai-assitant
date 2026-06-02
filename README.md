# FinanceAI

A personal finance assistant. Sign in, import your bank transactions, and just ask questions about your money in plain English.

## What it does

- Chat with an AI about your spending, budgets, and subscriptions
- Upload a receipt photo — it reads and logs it automatically
- Import transactions from any bank CSV export
- Set monthly budgets and track them in real time
- Auto-detects recurring charges you might have forgotten about
- Looks up unknown merchants online
- Remembers your preferences ("I get paid on the 1st", "don't count rent in food")
- Dark and light mode, with your currency of choice

## Tech stack

- **Next.js 14** — fullstack, App Router
- **Supabase** — auth, database, file storage
- **Anthropic Claude** — the AI brain (tool use + vision)
- **Tailwind CSS + Framer Motion** — UI and animations
- **Vercel** — deployment

## Getting started

**1. Clone and install**
```bash
git clone <repo-url>
cd finance-assitance
npm install
```

**2. Set up Supabase**
- Create a project at supabase.com
- Run `supabase/schema.sql` in the SQL editor
- Create a storage bucket called `receipts` (set to public)

**3. Add environment variables**
```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase → Settings → API
ANTHROPIC_API_KEY=               # console.anthropic.com
BRAVE_SEARCH_API_KEY=            # optional, for merchant lookups
```

**4. Run**
```bash
npm run dev
```

Go to `http://localhost:3000`, create an account, and import a CSV to get started.

---

## How the AI works

Not every question needs the same treatment. A "how much did I spend on groceries?" is just a database query. A receipt photo needs vision. A question about an unknown charge needs a web search.

So instead of sending everything to a heavy model and hoping for the best, each message gets routed to the right tool:

- Spending questions → query the database, summarise the result
- Receipt photo → vision model extracts merchant, amount, date
- Unknown merchant → Brave Search lookup
- Month comparisons → pre-aggregated monthly summaries (not raw rows)
- User preferences → saved to DB, injected into future prompts

Claude picks the tools it needs, runs them in parallel, and writes the response. It never gets handed thousands of raw transaction rows — just the relevant slice.

## Database

Row Level Security is on every table. Users can only ever see their own data, enforced at the database level.

Monthly spending summaries are pre-computed on every import so historical comparisons are fast and cheap.
