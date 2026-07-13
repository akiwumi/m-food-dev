// Native in-app purchases via RevenueCat (StoreKit under Capacitor). This is
// the ONLY purchase path inside the iOS app — App Store guideline 3.1.1 forbids
// redirecting to Stripe web checkout for a digital subscription; Stripe stays
// web-only. The SDK is imported dynamically so the web bundle never ships it,
// and every export is a safe no-op on the web/pilot build (degradable, like
// every other backend dependency in this app).
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";
import { packageForPlan, subscriptionFromCustomerInfo, type StoreSubscription } from "./subscription";

export const isNativeApp = Capacitor.isNativePlatform();

const RC_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY ?? "";

// Native purchases need both the native shell and a RevenueCat key baked into
// the build. Dev/pilot native builds without a key keep the local simulation.
export const canUseNativePurchases = isNativeApp && !!RC_API_KEY;

type PurchasesModule = typeof import("@revenuecat/purchases-capacitor").Purchases;

let configured: Promise<PurchasesModule | null> | null = null;

// Lazily configure the SDK exactly once. Resolves null when native purchases
// are unavailable (web, pilot build, or configure failure).
function purchases(): Promise<PurchasesModule | null> {
  configured ??= (async () => {
    if (!canUseNativePurchases) return null;
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.configure({ apiKey: RC_API_KEY });
    return Purchases;
  })().catch(e => {
    console.warn("[purchases] RevenueCat configure failed:", e);
    return null;
  });
  return configured;
}

// Identify the RevenueCat customer as the Supabase user, so the RevenueCat
// webhook can write the `subscriptions` row (cross-device unlock). Signed-out
// users stay anonymous — the entitlement still works on-device.
export async function linkPurchasesToUser(userId: string): Promise<void> {
  const p = await purchases();
  if (!p) return;
  try { await p.logIn({ appUserID: userId }); }
  catch (e) { console.warn("[purchases] logIn failed:", e); }
}

export async function unlinkPurchasesUser(): Promise<void> {
  const p = await purchases();
  if (!p) return;
  try { await p.logOut(); }
  catch { /* already anonymous — nothing to unlink */ }
}

// Launch sync: attach the signed-in Supabase user (if any), then read the
// entitlement. RevenueCat caches CustomerInfo on-device, so after the first
// launch this also works offline. null = no store history / unavailable.
export async function syncStoreSubscription(): Promise<StoreSubscription | null> {
  const p = await purchases();
  if (!p) return null;
  try {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await p.logIn({ appUserID: session.user.id });
    }
    const { customerInfo } = await p.getCustomerInfo();
    return subscriptionFromCustomerInfo(customerInfo);
  } catch (e) {
    console.warn("[purchases] entitlement sync failed:", e);
    return null;
  }
}

export type PurchaseOutcome =
  | { ok: true; sub: StoreSubscription }
  | { ok: false; cancelled: boolean; error?: string };

const UNAVAILABLE: PurchaseOutcome = {
  ok: false, cancelled: false, error: "Purchases aren't available in this build.",
};

// Run the StoreKit purchase for a plan via the current RevenueCat offering.
export async function purchasePlan(plan: string): Promise<PurchaseOutcome> {
  const p = await purchases();
  if (!p) return UNAVAILABLE;
  try {
    const offerings = await p.getOfferings();
    const pkg = packageForPlan(plan, offerings.current?.availablePackages ?? []);
    if (!pkg) return { ok: false, cancelled: false, error: "That plan isn't available right now. Please try again later." };
    const { customerInfo } = await p.purchasePackage({ aPackage: pkg });
    const sub = subscriptionFromCustomerInfo(customerInfo);
    if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
      return { ok: false, cancelled: false, error: "The purchase went through but isn't active yet. Try Restore purchases in a moment." };
    }
    return { ok: true, sub };
  } catch (e) {
    const err = e as { code?: unknown; message?: string; userCancelled?: boolean | null };
    // PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR — the user closed the
    // Apple payment sheet; not an error worth surfacing.
    if (err.userCancelled || String(err.code) === "1") return { ok: false, cancelled: true };
    return { ok: false, cancelled: false, error: err.message ?? "Purchase failed. Please try again." };
  }
}

// Restore previous purchases for this Apple ID (Apple requires offering this).
export async function restoreStorePurchases(): Promise<PurchaseOutcome> {
  const p = await purchases();
  if (!p) return UNAVAILABLE;
  try {
    const { customerInfo } = await p.restorePurchases();
    const sub = subscriptionFromCustomerInfo(customerInfo);
    if (!sub) return { ok: false, cancelled: false, error: "No previous purchases found for this Apple ID." };
    return { ok: true, sub };
  } catch (e) {
    return { ok: false, cancelled: false, error: (e as Error).message || "Restore failed. Please try again." };
  }
}

// Where the user manages/cancels: RevenueCat's per-subscription management URL
// when known, else Apple's subscriptions page.
export async function openManageSubscriptions(): Promise<void> {
  let url = "https://apps.apple.com/account/subscriptions";
  const p = await purchases();
  if (p) {
    try {
      const { customerInfo } = await p.getCustomerInfo();
      url = customerInfo.managementURL ?? url;
    } catch { /* fall back to the generic App Store page */ }
  }
  window.open(url, "_blank");
}
