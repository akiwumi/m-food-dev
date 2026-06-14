# MoodFood Backend and Security Setup for Beginners

This guide separates:

- **Manual steps:** dashboard settings, account creation, secrets, billing, and legal decisions that you must own.
- **Code steps:** implementation work that can be completed and tested in this repository.

Do not launch publicly until the **Production security gate** near the end is complete.

## Golden Rules

1. Never paste passwords, API keys, service-role keys, Stripe secret keys, or webhook secrets into chat.
2. Never put a secret in a variable beginning with `VITE_`. Vite variables are shipped to every browser.
3. Keep secrets in a password manager and in the provider's secret settings.
4. Use Stripe **test mode** until the complete payment flow has been tested.
5. Start with a staging/test Supabase project. Do not use real customer data while setting up.
6. Commit migration files, but never commit `.env.local`.

## What You Need

Create accounts for:

- Supabase: database, authentication, storage, and backend functions
- Vercel: web hosting
- OpenAI: Moody chat and food-photo analysis
- Spoonacular: recipe provider
- Stripe: subscriptions and payments
- Resend, Postmark, or SendGrid: production email

Install these on your Mac:

- Node.js and npm
- Supabase CLI
- Git

Check your tools:

```bash
node --version
npm --version
supabase --version
git --version
```

## Recommended Order

Complete one milestone at a time:

1. Supabase project and database
2. Real login and email verification
3. AI and recipes
4. Staging deployment
5. Stripe test payments
6. Production email and reminders
7. Security launch gate
8. Production launch

Stop after any milestone if its verification test fails.

---

## Milestone 1: Create Supabase and the Database

### Step 1. Create a staging Supabase project

Manual steps:

1. Visit <https://supabase.com> and sign in.
2. Click **New project**.
3. Name it something obvious, such as `moodfood-staging`.
4. Select a region near your expected users.
5. Generate a strong database password and save it in your password manager.
6. Wait for the project to finish provisioning.

### Step 2. Find the browser-safe Supabase values

In Supabase:

1. Open **Project Settings → API**.
2. Copy the **Project URL**.
3. Copy the **anon/public key**.
4. Do not copy the `service_role` key into `.env.local`.

In the project root, create `.env.local` if it does not already exist:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

These two values are designed for browser use. Security still depends on correct Row Level Security policies.

### Step 3. Link the Supabase CLI

From the project root:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

Your project ref is the part before `.supabase.co` in the Project URL.

### Step 4. Apply all database migrations

There are currently ten migrations, `001` through `010`. Apply all of them:

```bash
supabase db push
```

Do not stop at migration `008`; the invite-code and subscription tables are in `009` and `010`.

Verify in Supabase:

1. Open **Table Editor**.
2. Confirm tables such as `profiles`, `recipes`, `diary_entries`, `community_posts`, `invite_codes`, and `subscriptions` exist.
3. Open **Storage** and confirm the private image bucket exists.
4. Confirm the image bucket is not public.

### Milestone 1 verification

From the project root:

```bash
npm test
npm run build
```

Both commands must pass.

---

## Milestone 2: Configure Real Authentication

Manual steps in Supabase:

1. Open **Authentication → Providers → Email**.
2. Enable email authentication.
3. During initial staging tests, you may temporarily disable **Confirm email**.
4. Before any public launch, enable **Confirm email**.
5. Open **Authentication → URL Configuration**.
6. Set the staging Site URL, for example `https://YOUR-STAGING-URL.vercel.app`.
7. Add redirect URLs:
   - `http://localhost:5173`
   - Your staging Vercel URL
   - Your final production URL when known
8. Do not use wildcard redirect URLs in production.

Test:

1. Run `npm run dev`.
2. Create a new account using a test email.
3. Confirm a user appears under **Authentication → Users**.
4. Confirm a matching row appears in the `profiles` table.
5. Sign out and sign back in.

Before launch:

1. Configure a real SMTP provider under **Project Settings → Authentication → SMTP**.
2. Send a confirmation email to an address you control.
3. Confirm the link returns to the correct live URL.

---

## Milestone 3: Configure AI and Recipes

### Step 1. Set backend secrets

Get an OpenAI API key and Spoonacular API key. Enter them directly in your terminal or the Supabase secrets dashboard. Never place them in `.env.local`.

```bash
supabase secrets set OPENAI_API_KEY="YOUR-OPENAI-KEY"
supabase secrets set SPOONACULAR_API_KEY="YOUR-SPOONACULAR-KEY"
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://YOUR-STAGING-URL.vercel.app"
```

Use exact origins with no trailing slash.

### Step 2. Deploy the functions

```bash
supabase functions deploy ai-gateway
supabase functions deploy recipes
```

### Step 3. Test

1. Sign in to the staging app.
2. Ask Moody a simple food question.
3. Test food-photo analysis.
4. Confirm recipe results load.
5. Confirm signed-out users cannot call protected AI features.

Set spending limits and usage alerts in OpenAI and Spoonacular before inviting testers.

---

## Milestone 4: Deploy the Staging Website

Manual steps in Vercel:

1. Import the Git repository.
2. Choose the Vite framework preset.
3. Set build command to `npm run build`.
4. Set output directory to `dist`.
5. Add only these browser-safe environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY` when Stripe is configured
6. Deploy.
7. Add the resulting Vercel URL to:
   - Supabase Auth Site/Redirect URLs
   - The `ALLOWED_ORIGINS` Supabase secret

Never add `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, or webhook secrets to Vercel client environment variables.

---

## Milestone 5: Configure Stripe in Test Mode

Do not begin with live payments.

### Step 1. Verify existing Stripe configuration

The checkout function currently contains Stripe price IDs and a fixed app URL. Before deploying it, confirm that:

- The Stripe account and price IDs belong to you.
- The prices and billing intervals are correct.
- The fixed app URL is the staging URL you intend to use.

This is a **code review/change step**, not a dashboard-only step. Do not deploy checkout until it is verified.

### Step 2. Create or verify products

In Stripe test mode:

1. Open **Product catalog**.
2. Create or verify monthly, quarterly, and annual subscription prices.
3. Open **Developers → API keys**.
4. Copy the test publishable key into `.env.local`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
```

5. Save the test secret key directly as a Supabase secret:

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_YOUR_KEY"
```

### Step 3. Deploy payment functions

The price IDs and return URL must be verified in code first. Then:

```bash
supabase functions deploy create-checkout
supabase functions deploy delete-account
supabase functions deploy redeem-invite
supabase functions deploy stripe-webhook --no-verify-jwt
```

The Stripe webhook uses `--no-verify-jwt` because Stripe does not send a Supabase user token. The function must verify Stripe's webhook signature instead.

### Step 4. Create the webhook

In Stripe test mode:

1. Open **Developers → Webhooks → Add endpoint**.
2. Use:

```text
https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook
```

3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret and save it directly to Supabase:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY"
supabase functions deploy stripe-webhook --no-verify-jwt
```

### Step 5. Test payments

Use Stripe test cards only. Verify:

1. Checkout opens.
2. A test subscription is created.
3. The webhook succeeds in Stripe's event log.
4. The user's `subscriptions` row updates.
5. Cancelled and failed subscriptions update correctly.
6. Replayed webhook events do not create duplicate state.

Do not switch to live Stripe keys until all tests pass.

---

## Milestone 6: Production Email and Trial Reminders

Manual steps:

1. Create a Resend, Postmark, or SendGrid account.
2. Verify a sending domain you own.
3. Configure SPF and DKIM records exactly as the email provider instructs.
4. Configure Supabase Auth SMTP.

For Resend trial reminders:

```bash
supabase secrets set RESEND_API_KEY="YOUR-RESEND-KEY"
supabase secrets set REMINDER_FROM="MoodFood <hello@YOUR-DOMAIN>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY"
supabase functions deploy send-trial-reminders --no-verify-jwt
```

In Supabase, enable the `pg_cron` and `pg_net` extensions. Then schedule the reminder function using the SQL in `BACKEND_SETUP.md`, replacing every placeholder before running it.

Verify:

1. Send a reminder to your own test account.
2. Confirm it arrives and is not marked as spam.
3. Confirm the same reminder is not sent repeatedly.

---

## Production Security Gate

### Tasks you must personally own

- Keep all passwords and secrets in a password manager.
- Enable MFA on Supabase, Stripe, Vercel, GitHub, OpenAI, and email-provider accounts.
- Give collaborators the minimum access they need.
- Configure spending alerts and caps.
- Decide data-retention and account-deletion policies.
- Publish a privacy policy and terms appropriate for the data collected.
- Have qualified counsel review privacy and health-data obligations.
- Arrange an independent penetration test before public launch.

### Code work required before public launch

These are not dashboard settings. They require implementation and testing:

1. Replace remaining sensitive `localStorage` persistence with Supabase database/storage calls.
2. Implement trusted signed-image URL handling while keeping image buckets private.
3. Add per-user and per-IP rate limits to authentication-sensitive and AI endpoints.
4. Redact mood, psychological, health, household, and recipe-history data from logs.
5. Complete account export, deletion, session revocation, retention, backup, and restore flows.
6. Add adversarial Row Level Security tests using:
   - Anonymous user
   - User A
   - User B
   - Service role
7. Add automated secret scanning and static security analysis.

### Required security checks

Run locally:

```bash
npm run verify
git diff --check
```

In Supabase:

1. Confirm Row Level Security is enabled on every user-owned table.
2. Sign in as User A and confirm User A cannot read or modify User B's private data.
3. Confirm anonymous users cannot access private data.
4. Confirm private image buckets cannot be listed publicly.
5. Confirm deleted accounts lose access immediately.

In GitHub/Vercel:

1. Confirm no secret exists in source control or build logs.
2. Enable secret scanning and dependency alerts.
3. Protect the production branch.
4. Require tests before merge.

## Launch Checklist

- [ ] All migrations `001` through `010` applied to staging and production
- [ ] Real signup, email confirmation, login, logout, and password recovery tested
- [ ] Staging and production redirect URLs restricted correctly
- [ ] AI and recipe provider keys stored only as backend secrets
- [ ] AI/provider spending caps enabled
- [ ] Private image storage and signed access tested
- [ ] Sensitive app data moved out of `localStorage`
- [ ] Stripe test-mode flow fully tested
- [ ] Stripe live-mode flow tested with a small real transaction
- [ ] Webhook retries and duplicate events tested
- [ ] Production SMTP and reminder emails tested
- [ ] Account export and deletion tested
- [ ] RLS adversarial tests passed
- [ ] Security scanning and penetration test completed
- [ ] Privacy policy, terms, retention policy, and incident plan ready
- [ ] `npm run verify` passes

## When to Ask for Help

Ask for code help with one milestone at a time. Good requests:

- “Implement and test moving profile data from localStorage to Supabase.”
- “Review the Stripe price IDs and staging return URL before deployment.”
- “Add adversarial RLS tests for User A and User B.”
- “Implement signed private-image URLs.”
- “Run a production security review and fix launch blockers.”

Do not include any secret values in the request.
