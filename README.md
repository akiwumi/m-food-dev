# MoodFood

Mobile-first focused-pilot implementation based on the blueprint in `blue-print/`.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open the network URL on a phone connected to the same Wi-Fi.

## Verify

```bash
npm run verify
```

## Pilot architecture

- React + TypeScript + Vite PWA
- Persistent local pilot state and recoverable cook sessions
- Deterministic, versioned safety-first recommendation module
- Supabase schema/RLS migration in `supabase/migrations`
- Authenticated AI gateway contract with deterministic fallback

Supabase Auth, Claude, Stripe, and provider-backed recipe ingestion require deployment credentials before they can be connected to live services.

See `SECURITY.md` before connecting real users or sensitive data.
