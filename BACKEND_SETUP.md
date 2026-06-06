# MoodFood — Backend Setup Guide (graduating off the local pilot)

This is the complete, copy-paste runbook for turning MoodFood from a **localStorage-only
pilot** into a real app backed by **Supabase** (database, auth, email, file storage) and
**Stripe** (the trial → charge flow).

It's written for someone who can read and edit code but isn't a backend expert. Every
step says *where* to click and *what* to paste. Do the sections **in order** — later
steps depend on earlier ones.

> **Where things stand today** (updated — the scaffolding now exists)
> - ✅ Database schema: `supabase/migrations/001`–`005`.
> - ✅ **Seed data: `006_seed_data.sql`** (active ranking config + 3 published recipes + your invite).
> - ✅ **Signup → profile trigger: `007_profile_trigger.sql`**.
> - ✅ **Subscription columns: `008_subscription_columns.sql`** (billing fields on `profiles`).
> - ✅ **AI fully wired (OpenAI):** `ai-gateway` calls OpenAI for the Moody chat assistant
>   and food-photo vision; frontend uses it via `src/ai.ts` with graceful fallback to the
>   local simulation when not signed in. Just set `OPENAI_API_KEY` + deploy (Step E).
> - ✅ **AI-curated recipe core (the app's heart):** `recipes` function = Spoonacular →
>   hard safety filter → OpenAI ranking/explanations; frontend wired via `src/recipes.ts`
>   into the home "Tonight's picks". Set `SPOONACULAR_API_KEY` + deploy (Step E2).
> - ✅ **Auth fully wired (the keystone):** real Supabase signup, login, email verify, and
>   sign-out via `src/auth.ts` + the `entry` flow. Signing in unlocks all the AI above.
>   Pilot-safe: without `.env.local` the simulated flow still runs. (Step F)
> - ✅ **Payment functions scaffolded:** `create-checkout/`, `stripe-webhook/`, `send-trial-reminders/` (+ shared `_shared/cors.ts`).
> - ✅ **Frontend client: `src/supabase.ts`** (null-safe — won't crash the pilot if unconfigured), env typings in `src/vite-env.d.ts`, `@supabase/supabase-js` installed, `.env.example` added.
> - ❌ Still on you: create the Supabase project, **run** the SQL, set the **secrets/variables**,
>   **deploy** the functions, create your **Stripe products**, and swap the app's `localStorage`
>   flows over to the client (`src/store.ts`, `src/notifications.ts`).
>
> So the *code* is in place; what remains is the **manual setup + variables** below, plus the
> incremental frontend swap in [Step F](#step-f--wire-the-frontend-to-supabase).

---

## Table of contents

1. [What you'll end up with](#1-what-youll-end-up-with)
2. [The variables (your secrets cheat-sheet)](#2-the-variables-your-secrets-cheat-sheet)
3. [Step A — Create the Supabase project](#step-a--create-the-supabase-project)
4. [Step B — Run the SQL (database schema)](#step-b--run-the-sql-database-schema)
5. [Step C — Run the SQL (seed data)](#step-c--run-the-sql-seed-data) ← **app won't work without this**
6. [Step D — Configure Auth + confirmation emails](#step-d--configure-auth--confirmation-emails)
7. [Step E — Deploy the AI edge function](#step-e--deploy-the-ai-edge-function)
8. [Step F — Wire the frontend to Supabase](#step-f--wire-the-frontend-to-supabase)
9. [Step G — Payments: the trial → charge flow (Stripe)](#step-g--payments-the-trial--charge-flow-stripe)
10. [Step H — The day-before-trial reminder (scheduled job)](#step-h--the-day-before-trial-reminder-scheduled-job)
11. [Final checklist](#final-checklist)

---

## 1. What you'll end up with

The pilot fakes four things on the client. Here's what replaces each:

| Pilot (today) | Lives in | Real backend (after this guide) |
|---|---|---|
| Account creation | `src/App.tsx` `entry` state machine | Supabase Auth (`auth.users` + `public.profiles`) |
| Email confirmation / welcome | `src/notifications.ts` `moodfood-inbox` | Supabase Auth emails (real inbox) |
| Subscription billing | `src/notifications.ts` `scheduleTrial` / `runDue` | Stripe trial + webhook |
| Trial-ends-tomorrow reminder | `runDue` (clock-driven on client) | Scheduled Supabase function (`pg_cron`) + email |
| Food-photo calorie analysis | `src/foodAnalysis.ts` `simulateAnalysis` | Vision API call (optional, later) |

You do **not** have to do all of it at once. A sensible order is: **A → B → C → D → E → F**
gets you a real database + login. **G → H** add real money and is the riskier part — do it
last, in Stripe **test mode** first.

---

## 2. The variables (your secrets cheat-sheet)

You will collect these values as you go. Keep them somewhere safe (a password manager).
**Never commit the secret ones to git** — `.gitignore` already ignores `.env` and `.env.*`.

### 2a. Frontend variables → file `.env.local` (you create this in the project root)

Only variables prefixed with `VITE_` are visible to the browser. These two are **safe to
expose** (the anon key is designed to be public; Row-Level Security protects your data):

```bash
# .env.local  (project root — git ignores this automatically)
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
```

> ⚠️ **Never** put the `service_role` key or the Stripe **secret** key in a `VITE_`
> variable. Anything `VITE_` is shipped to every visitor's browser.

### 2b. Edge Function secrets → set in Supabase dashboard (not in a file)

The `ai-gateway` function reads these. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected
automatically by Supabase, so you usually only set `ALLOWED_ORIGINS` yourself:

| Name | Example value | Notes |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://moodfood.vercel.app` | Comma-separated. Must include your dev URL **and** your live URL. No trailing slash. |
| `OPENAI_API_KEY` | `sk-...` | **Powers the AI** (Moody chat, food-photo vision, recipe curation). Server-side only — **never** `VITE_`. |
| `SPOONACULAR_API_KEY` | `abc123...` | **The recipe source** for the AI-curated core (`recipes` function). Server-side only — **never** `VITE_`. |
| `SUPABASE_URL` | *(auto-provided)* | Don't set unless overriding. |
| `SUPABASE_ANON_KEY` | *(auto-provided)* | Don't set unless overriding. |

### 2c. Payment secrets (Step G) → Stripe dashboard + Supabase secrets

| Name | Where it goes | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Supabase function secret | `sk_test_...` first, `sk_live_...` later. **Never** `VITE_`. |
| `STRIPE_WEBHOOK_SECRET` | Supabase function secret | `whsec_...` from the webhook you create. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `.env.local` | `pk_test_...` — safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase function secret | For `stripe-webhook` + `send-trial-reminders` (server-only — bypasses RLS). **Never** `VITE_`. |
| `RESEND_API_KEY` | Supabase function secret | For `send-trial-reminders` email (or swap for your provider). |
| `REMINDER_FROM` | Supabase function secret | e.g. `MoodFood <hello@yourdomain.com>`. |

### How to find each Supabase value
- **Project ref / URL / anon key:** Supabase dashboard → **Project Settings → API**.
- **service_role key:** same page (keep it server-side only — you'll rarely need it).

---

## Step A — Create the Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick an **organization**, name it `moodfood`, choose a **region close to your users**,
   and set a **database password** (save it in your password manager).
3. Wait ~2 minutes for it to provision.
4. Go to **Project Settings → API** and copy into your cheat-sheet:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> **Shortcut:** I (Claude) have the Supabase MCP connected, so I can create the project and
> run all the SQL below for you instead of you doing it by hand — just ask. The manual steps
> are here so you understand and can reproduce what happens.

---

## Step B — Run the SQL (database schema)

Your schema is already written as 5 files in `supabase/migrations/`. You just need to run
them **in numeric order**. Two ways:

### Option 1 — Dashboard (easiest, no tooling)
1. Supabase dashboard → **SQL Editor → New query**.
2. Open each file below, copy its whole contents, paste, click **Run**. Do them **in order**:
   1. `supabase/migrations/001_pilot_schema.sql` — core tables + RLS
   2. `supabase/migrations/002_accounts_and_community.sql` — profiles, connections, posts
   3. `supabase/migrations/003_health_and_diners.sql` — household + health snapshots
   4. `supabase/migrations/004_security_hardening.sql` — locks down privileged tables
   5. `supabase/migrations/005_private_image_storage.sql` — private `avatars` + `community-images` buckets
3. If a step errors, **stop** and fix it before the next — they build on each other.

### Option 2 — Supabase CLI (repeatable, recommended once comfortable)
```bash
# one-time
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF   # ref is in your project URL

# pushes every file in supabase/migrations in order
supabase db push
```

### Verify it worked
Dashboard → **Table Editor**. You should see `profiles`, `recipes`, `mood_entries`,
`community_posts`, etc. Dashboard → **Database → Policies** should show RLS policies on each.

---

## Step C — Run the SQL (seed data)

**This is the piece that makes the app non-empty.** The app reads only `recipes` where
`status = 'published'` and the `ranking_configs` row where `active = true`. With an empty
database the app loads but shows **nothing**.

✅ **The file already exists** — `supabase/migrations/006_seed_data.sql` (active ranking
config + 3 published recipes + your invite email). Two more new migrations come with it:
- `007_profile_trigger.sql` — auto-creates a `profiles` row on signup (see Step D).
- `008_subscription_columns.sql` — adds billing columns to `profiles` for Step G.

Just **run** `006`, `007`, and `008` the same way you ran `001`–`005` (dashboard SQL Editor,
or `supabase db push` picks them up automatically). Re-running is safe — they're guarded.

> **Why this matters:** `001` and `004` give `recipes` a `select` policy only for
> `status = 'published'`, and `ranking_configs` is readable only when `active = true`.
> Until you seed at least one of each, the recommendation engine has nothing to rank.

---

## Step D — Configure Auth + confirmation emails

This replaces the fake `moodfood-inbox` emails in `src/notifications.ts`.

1. Dashboard → **Authentication → Providers → Email**: make sure **Email** is enabled.
2. **Authentication → Sign In / Providers**: decide if you want **"Confirm email"** on
   (recommended — mirrors your current verify screen).
3. **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:5173` for dev (change to your live URL later).
   - **Redirect URLs:** add both your dev and live URLs.
4. **Authentication → Email Templates:** the default "Confirm your signup" email works out
   of the box. Optionally paste your pilot copy from `sendConfirmationEmail` /
   `sendWelcomeEmail` in `src/notifications.ts`.
5. **Production email:** Supabase's built-in email is rate-limited and meant for testing.
   Before launch, **Project Settings → Authentication → SMTP** and plug in a real provider
   (Resend, Postmark, SendGrid). Variables that provider gives you:
   - SMTP host, port, username, password, sender email — all entered in that SMTP form
     (not in `.env`).

> **Auto-create a profile row on signup.** ✅ Already handled by
> `supabase/migrations/007_profile_trigger.sql` (run in Step C). Every new `auth.users` row
> now gets a matching `public.profiles` row automatically — no extra action needed here.

---

## Step E — Deploy the AI edge function (OpenAI)

`ai-gateway` is now a real OpenAI proxy (model `gpt-4o-mini`) — it enforces auth, origin
allow-listing, and body-size limits, then calls OpenAI on the user's behalf so your key
never reaches the browser. It handles two tasks:
- `chat` — the **Moody** assistant ([src/App.tsx](src/App.tsx) `MoodyPanel`), with the user's
  allergies/diet baked in as hard safety rules.
- `analyze-food` — **vision** calorie/macro estimate for photo logs ([src/foodAnalysis.ts](src/foodAnalysis.ts)).

```bash
# from the project root, with the CLI linked (Step B option 2)
supabase secrets set OPENAI_API_KEY="sk-..."                         # your key — server-side only
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://YOUR-LIVE-URL"
supabase functions deploy ai-gateway
```

> 🔑 **Set the key yourself via the CLI/dashboard — don't paste it into chat or any file.**
> It must never be a `VITE_` variable (those ship to every browser).

Verify: Dashboard → **Edge Functions → ai-gateway → Logs**. Calls from an origin not in
`ALLOWED_ORIGINS` get a 403; calls without a logged-in user get a 401.

> ✅ **Auth is wired (Step F), so the AI activates as soon as a user signs in.** The gateway
> requires a valid Supabase session token; signup/login now provide one. If a request ever
> arrives without a session (e.g. token expired), the app **gracefully falls back**: Moody
> shows a friendly note and food photos use the local simulation.

### Step E2 — The AI-curated recipe core (Spoonacular + OpenAI)

This is the heart of the app: turn the user's profile + mood into real meal options.
The `recipes` edge function runs a 3-stage pipeline — **Spoonacular** fetches real
candidates (filtered by diet + intolerances), a **hard safety filter** drops anything
mentioning an allergen, then **OpenAI** ranks them for the profile/mood and writes the
"why this fits you" reason. If OpenAI is unset it still returns real, safe recipes in
Spoonacular's order.

1. Get a free key at <https://spoonacular.com/food-api> (≈150 points/day free).
2. Set secrets + deploy:
   ```bash
   supabase secrets set SPOONACULAR_API_KEY="your-key"
   # OPENAI_API_KEY + ALLOWED_ORIGINS already set in Step E
   supabase functions deploy recipes
   ```
3. The frontend already calls it ([src/recipes.ts](src/recipes.ts)): the home screen's
   "Tonight's picks" fetches curated recipes when you ask for recommendations, and falls
   back to the bundled recipes + local ranking when not signed in.

> **Safety note:** allergen and diet filtering is enforced **deterministically** (both in
> the Spoonacular query and a server-side backstop) — the LLM only ranks/explains recipes
> that are already safe. It never decides what's safe to eat. Keep it that way.

> Same gate as the rest: it runs for a signed-in user (auth is wired — Step F). If signed
> out, the app falls back to the bundled recipes via the local ranker.

---

## Step F — Wire the frontend to Supabase

This is the code-side work that connects the app you've built to the backend above.

### F1–F3. Client + typings ✅ already done
- `@supabase/supabase-js` is installed.
- `src/supabase.ts` exports a ready-to-use `supabase` client (reads your `.env.local`).
- `src/vite-env.d.ts` declares the `VITE_` variables for TypeScript.

**Your only action here:** copy `.env.example` → `.env.local`, paste your real
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, then restart `npm run dev`. Import the client
anywhere with `import { supabase } from "./supabase";`.

### F4. Auth ✅ wired (signup, login, email verify, session)
Real Supabase Auth is now in the `entry` flow ([src/auth.ts](src/auth.ts) + `src/App.tsx`):
- **Sign up** (`AccountSetupScreen`) → `supabase.auth.signUp` with the name in user metadata.
- **Email verify** (`VerifyEmailScreen`) → works whether "Confirm email" is **ON** (shows the
  verify screen, listens for confirmation, auto-advances) or **OFF** (goes straight in).
- **Sign in** (`LoginScreen`, reached via "I already have an account" on Welcome).
- **Sign out** (Settings) → `supabase.auth.signOut`; multi-tab sign-out returns to Welcome.
- **Pilot-safe:** if `.env.local` is absent (`isSupabaseConfigured === false`), the original
  simulated flow runs unchanged — nothing breaks without a backend.

**This is the keystone:** once a user signs up/in, `supabase.auth.getSession()` returns a
token, so **the AI gateway, recipe curation, and vision all activate automatically.** No more
"AI only works after auth" caveat — auth is here.

**Your action:** in Supabase → **Authentication → Sign In / Providers**, decide on "Confirm
email". For the fastest first test, turn it **OFF** (signup logs you straight in). Turn it
**ON** for production (then set SMTP per Step D).

### F5. (Optional, later) Move app data into Postgres
Auth is done; the rest of the app still uses `localStorage` and works fine. When you want
multi-device data, migrate one flow at a time — none of this blocks the AI:
1. **Profile + onboarding** → `upsert` on `public.profiles` (`preferences_json` holds the
   onboarding object). *Note: the AI already gets the profile from the client request, so
   this is for persistence, not for the AI to work.*
2. **Diary / mood** → write `mood_entries` / `diary_entries` instead of localStorage arrays.
3. **Photo logs / community** → upload to the private `avatars` / `community-images` buckets
   (display via short-lived **signed URLs**), write rows to `community_posts`, etc.

> **Tip:** keep `useStoredState` as a cache while migrating.

---

## Step G — Payments: the trial → charge flow (Stripe)

This replaces `scheduleTrial` / `runDue` in `src/notifications.ts`. **Do everything in
Stripe TEST mode first** (toggle top-right of the Stripe dashboard).

### G1. In the Stripe dashboard
1. Create an account at <https://stripe.com>.
2. **Products → Add product**: create your plans (Annual / Quarterly / Monthly — matching
   the `plan` field in `src/store.ts`). Each gives you a **Price ID** (`price_...`). Save them.
3. **Developers → API keys**: copy the **Publishable key** (`pk_test_...`) →
   `VITE_STRIPE_PUBLISHABLE_KEY` in `.env.local`, and the **Secret key** (`sk_test_...`).
4. Set a **7-day free trial** on each price (or pass `trial_period_days: 7` when you create
   the subscription — matches your current `trialEndsAt` logic).

### G2. The checkout edge function ✅ scaffolded
`supabase/functions/create-checkout/index.ts` already exists. It takes a logged-in user +
a `priceId`, creates a Stripe Checkout session with a 7-day trial, and returns the redirect
URL. Set its secret and deploy:
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase functions deploy create-checkout
```
From the app, call it after the user picks a plan:
```ts
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
  method: "POST",
  headers: { authorization: `Bearer ${session?.access_token}`, "content-type": "application/json" },
  body: JSON.stringify({ priceId: "price_...", plan: "annual" }),
});
const { url } = await res.json();
window.location.href = url;   // redirect to Stripe Checkout
```

### G3. The webhook edge function ✅ scaffolded (this is what actually "charges")
`supabase/functions/stripe-webhook/index.ts` already exists. It verifies the Stripe
signature and updates `public.profiles.subscription_status` on
`checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid`, and
`invoice.payment_failed`.
1. Set secrets and deploy (note `--no-verify-jwt` — Stripe doesn't send a Supabase token):
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."   # Project Settings → API
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
2. Stripe dashboard → **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`
   - Select the events listed above. Stripe shows a **Signing secret** (`whsec_...`).
3. Save that secret and redeploy:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

> **Why a webhook?** The charge happens on Stripe's servers when the trial ends — your app
> may be closed. The webhook is Stripe telling your backend "it's paid," replacing the
> client-side `runDue()` that currently fakes the charge.

---

## Step H — The day-before-trial reminder (scheduled job)

Replaces the scheduled push in `scheduleTrial`. Supabase runs cron jobs with `pg_cron`.

1. Dashboard → **Database → Extensions**: enable **`pg_cron`** and **`pg_net`** (the job
   calls the edge function over HTTP).
2. ✅ The function `supabase/functions/send-trial-reminders/index.ts` already exists — it
   finds `trialing` profiles whose `trial_ends_at` is within ~24h and `trial_reminder_sent_at`
   is null, emails them (via Resend), and stamps `trial_reminder_sent_at`. Set secrets + deploy:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."   # if not already set in Step G3
   supabase secrets set RESEND_API_KEY="re_..."
   supabase secrets set REMINDER_FROM="MoodFood <hello@yourdomain.com>"
   supabase functions deploy send-trial-reminders --no-verify-jwt
   ```
3. Schedule it to run hourly via SQL:
   ```sql
   select cron.schedule(
     'trial-reminders-hourly',
     '0 * * * *',  -- top of every hour
     $$ select net.http_post(
          url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-trial-reminders',
          headers := '{"Authorization":"Bearer YOUR-SERVICE-ROLE-KEY"}'::jsonb
        ); $$
   );
   ```
   > The service-role key here lives **only** server-side in the cron definition — never in
   > the browser. Manage cron jobs with `select * from cron.job;`.

---

## Final checklist

Code marked ✅ is already in the repo; the checkboxes are the setup actions still on you.

- [ ] **A** — Supabase project created; `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` saved.
- [ ] **B** — Migrations `001`–`005` run in order; tables visible in Table Editor.
- [ ] **C** — ✅ files exist — run `006`/`007`/`008`; confirm a published recipe + active ranking config.
- [ ] **D** — Email auth on; Site/Redirect URLs set (trigger ✅ via `007`); SMTP set before launch.
- [ ] **E** — `ai-gateway` deployed; `ALLOWED_ORIGINS` includes dev + live URLs.
- [ ] **F** — ✅ auth wired (signup/login/verify/signout) — copy `.env.example`→`.env.local`, fill it, set "Confirm email" OFF for first test. (Moving app data to Postgres = optional F5.)
- [ ] **G** — ✅ functions scaffolded — create Stripe products/prices; set secrets; deploy; test in **test mode**.
- [ ] **H** — ✅ function scaffolded — enable `pg_cron`+`pg_net`; set email secrets; deploy; schedule the cron.

### Golden rules
1. **Secret keys never get a `VITE_` prefix** and never get committed. `service_role` and
   `sk_*` stay server-side only.
2. **Always test Stripe in test mode** before flipping to live keys.
3. **RLS is your safety net** — it's already on every user table. Don't disable it to "make
   something work"; fix the query/policy instead.
4. **Migrate one flow at a time** (auth → profile → recipes → community → payments) and test
   after each, rather than swapping everything at once.

---

*Questions on any single step — ask and I can do that step with you (including running the
SQL via the connected Supabase tools).*
