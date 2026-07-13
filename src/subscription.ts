// Subscription entitlement helpers shared by the native IAP layer
// (src/purchases.ts) and the UI. Pure functions only — the RevenueCat SDK never
// leaks past purchases.ts, so everything here is testable and web-bundle-safe.
import type { Profile } from "./store";

// The single RevenueCat entitlement that unlocks everything paid.
export const PRO_ENTITLEMENT = "pro";

// Pro = a live trial or paid subscription. This is the one gate for premium
// features (AI curation, AI taste summary). Invite codes, the web Stripe flow,
// the pilot simulation, and native IAP all funnel into these same statuses.
export function isPro(profile: Pick<Profile, "subscriptionStatus">): boolean {
  return profile.subscriptionStatus === "trialing" || profile.subscriptionStatus === "active";
}

// The slice of app subscription state a store purchase can change.
export type StoreSubscription = {
  status: Profile["subscriptionStatus"];
  plan: string | null;       // annual | quarterly | monthly; null = keep current
  expiresAt: string | null;  // ISO date the current period (or trial) ends
};

// Structural mirrors of the RevenueCat SDK types — only the fields we read, so
// tests don't need the SDK and the SDK stays dynamically imported.
export type EntitlementInfoLike = {
  isActive: boolean;
  periodType: string;
  expirationDate: string | null;
  productIdentifier: string;
};
export type CustomerInfoLike = {
  entitlements: { all: Record<string, EntitlementInfoLike> };
};
export type PackageLike = {
  identifier: string;
  packageType: string;
  product: { identifier: string };
};

// Map a store product id (e.g. "moodfood_pro_annual") to a PLANS id.
export function planFromProductId(productId: string): string | null {
  const id = productId.toLowerCase();
  if (id.includes("annual") || id.includes("year")) return "annual";
  if (id.includes("quarter") || id.includes("3month") || id.includes("three_month")) return "quarterly";
  if (id.includes("month")) return "monthly";
  return null;
}

// RevenueCat CustomerInfo → app subscription state. Returns null when the user
// has no store purchase history at all, so callers leave the existing status
// alone (it may come from an invite code or the web Stripe flow).
export function subscriptionFromCustomerInfo(info: CustomerInfoLike): StoreSubscription | null {
  const ent = info.entitlements.all[PRO_ENTITLEMENT];
  if (!ent) return null;
  const status = ent.isActive
    ? (ent.periodType.toUpperCase() === "TRIAL" ? "trialing" : "active")
    : "canceled";
  return { status, plan: planFromProductId(ent.productIdentifier), expiresAt: ent.expirationDate };
}

// Which RevenueCat standard package type carries each of our plans.
const PLAN_PACKAGE_TYPE: Record<string, string> = {
  annual: "ANNUAL",
  quarterly: "THREE_MONTH",
  monthly: "MONTHLY",
};

// Pick the offering package for a chosen plan: prefer RevenueCat's standard
// package types, fall back to matching custom package/product identifiers.
export function packageForPlan<P extends PackageLike>(plan: string, packages: P[]): P | null {
  const byType = packages.find(p => p.packageType === PLAN_PACKAGE_TYPE[plan]);
  if (byType) return byType;
  return packages.find(p =>
    planFromProductId(p.identifier) === plan || planFromProductId(p.product.identifier) === plan,
  ) ?? null;
}
