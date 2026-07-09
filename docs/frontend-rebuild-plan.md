# Frontend Rebuild Plan — Moody Recipe Card Fix

## What changed and why a rebuild is needed

Three files were updated in commit `d96834a`:

- **`src/ai.ts`** — `aiChat()` now passes `recipe` from the gateway response through to the app. The old build silently drops it.
- **`src/App.tsx`** — `send()` uses `reply.recipe` directly as the selected recipe (no catalog lookup needed). The render uses `t.recipe` from the turn data so the card always shows even if the recipe wasn't pre-fetched locally.

Without a rebuild, the gateway correctly finds and returns the recipe server-side, but the old frontend bundle ignores the `recipe` field and the card never appears.

---

## Web (Vercel)

The app deploys to Vercel. If auto-deploy from `main` is enabled, the rebuild may already be in progress after the push to main. Check the Vercel dashboard first.

### If auto-deploy is off, or to trigger manually:

```bash
# 1. Pull latest (already done if you committed locally)
git pull

# 2. Install dependencies if any changed
npm install

# 3. Build
npm run build
# Runs: tsc -b && vite build → outputs to dist/

# 4. Deploy to Vercel
npx vercel --prod
# Or push to main if Vercel is connected to the repo
```

### Verify
- Open the deployed URL
- Sign in, open Moody, type "show me Yaki Udon"
- A tappable recipe card should appear below Moody's reply

---

## iOS (Capacitor)

The iOS app wraps the same web build. After rebuilding the web bundle, sync it into the iOS project and rebuild in Xcode.

```bash
# 1. Build the web bundle (if not already done above)
npm run build

# 2. Sync into iOS project
npx cap sync ios
# Copies dist/ into ios/App/App/public/

# 3. Open in Xcode
npx cap open ios
```

In Xcode:
- Select your device or simulator
- Product → Clean Build Folder (Cmd+Shift+K)
- Product → Build (Cmd+B)
- Run on device (Cmd+R)

### Verify
- Open the app on device
- Sign in, open Moody, ask for a specific recipe by name
- Recipe card should appear in the chat

---

## What works RIGHT NOW without a rebuild

The gateway fix is already live (server-side). Without a frontend rebuild:
- The gateway correctly searches Spoonacular and finds the recipe
- It returns a valid `recipeId`
- The OLD frontend may still show the card **if** the recipe happened to be in the locally pre-fetched catalog

After rebuild:
- The card is guaranteed to appear regardless of what was pre-fetched, because the recipe data travels with the gateway response directly into the turn
