# MoodFood Security

MoodFood processes sensitive mood, dietary, psychological-profile, household,
and health-trend data. Treat all of it as confidential health-adjacent data.
No application can guarantee that hacking is impossible; these controls reduce
risk and define the work required before a production launch.

## Trust boundaries

- The browser is untrusted. Client validation improves UX but never grants
  authorization.
- Supabase Auth establishes identity. PostgreSQL row-level security (RLS) is
  the final authorization boundary for user data.
- Service-role keys and AI-provider keys belong only in server-side secrets.
- AI output is advisory. Deterministic allergy and safety rules must run before
  and after any model call.
- Images are stored in private buckets. Access for other authorized users must
  use short-lived signed URLs issued by a trusted API after checking post or
  profile visibility.

## Controls in this repository

- RLS and owner-scoped policies on personal, household, diary, and social data.
- Privileged analytics and recommendation records are not browser-writable.
- Global recipes and ranking configuration have explicit read-only policies.
- Private image buckets restrict type, size, and paths to the authenticated
  user's UUID.
- Connection requests can only be accepted or blocked by their recipient;
  requesters cannot approve themselves.
- The AI gateway verifies Supabase JWTs, restricts origins and methods, limits
  request size, and prevents caching.
- CSP and browser security headers reduce XSS, framing, MIME sniffing, and
  referrer leakage.
- The service worker only caches safe same-origin shell responses and excludes
  API traffic.
- Public text and image inputs are bounded and validated.
- CI audits dependencies, tests security invariants, and builds the app.

## Required before production

1. Replace the local pilot auth and localStorage persistence with live Supabase
   Auth and database calls. localStorage is not suitable for sensitive
   multi-user production data.
2. Apply every migration to a staging Supabase project and run adversarial RLS
   tests as two separate authenticated users, anon, and service role.
3. Implement a trusted signed-image URL endpoint that validates post/profile
   visibility. Never make the image buckets public.
4. Add per-user and per-IP rate limits to auth-sensitive APIs and the AI
   gateway. Add spend limits and abuse detection for AI-provider calls.
5. Keep `SUPABASE_SERVICE_ROLE_KEY`, AI keys, and signing secrets out of Vite
   variables, browser bundles, logs, and source control.
6. Redact mood, psychological-profile, health, household, and recipe-history
   data from application and AI-provider logs.
7. Add account export/deletion, session revocation, retention rules, encrypted
   backups, restore testing, and an incident-response process.
8. Configure breached-password protection, email verification, MFA for
   privileged operators, and short session lifetimes appropriate to the risk.
9. Run SAST, secret scanning, dependency auditing, and a third-party
   penetration test before launch and after significant auth/data changes.
10. Review applicable privacy and health-data laws with qualified counsel.

## Local verification

```bash
npm run verify
```

This verifies repository controls only. It does not test deployed Supabase
configuration, cloud secrets, DNS, hosting, or third-party services.
