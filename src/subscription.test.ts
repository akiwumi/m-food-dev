import { describe, expect, it } from "vitest";
import {
  isPro,
  packageForPlan,
  planFromProductId,
  subscriptionFromCustomerInfo,
  type CustomerInfoLike,
  type EntitlementInfoLike,
  type PackageLike,
} from "./subscription";

const entitlement = (patch: Partial<EntitlementInfoLike> = {}): EntitlementInfoLike => ({
  isActive: true,
  periodType: "NORMAL",
  expirationDate: "2026-08-13T00:00:00Z",
  productIdentifier: "moodfood_pro_annual",
  ...patch,
});

const customerInfo = (ent: EntitlementInfoLike | null): CustomerInfoLike => ({
  entitlements: { all: ent ? { pro: ent } : {} },
});

describe("isPro", () => {
  it("treats trialing and active as Pro", () => {
    expect(isPro({ subscriptionStatus: "trialing" })).toBe(true);
    expect(isPro({ subscriptionStatus: "active" })).toBe(true);
  });
  it("treats none and canceled as free", () => {
    expect(isPro({ subscriptionStatus: "none" })).toBe(false);
    expect(isPro({ subscriptionStatus: "canceled" })).toBe(false);
  });
});

describe("planFromProductId", () => {
  it("recognizes annual, quarterly, and monthly product ids", () => {
    expect(planFromProductId("moodfood_pro_annual")).toBe("annual");
    expect(planFromProductId("com.akiwumi.moodfood.yearly")).toBe("annual");
    expect(planFromProductId("moodfood_pro_quarterly")).toBe("quarterly");
    expect(planFromProductId("moodfood_pro_3month")).toBe("quarterly");
    expect(planFromProductId("moodfood_pro_monthly")).toBe("monthly");
  });
  it("checks quarterly before monthly so '3month' doesn't match monthly", () => {
    expect(planFromProductId("pro_three_month")).toBe("quarterly");
  });
  it("returns null for unknown products", () => {
    expect(planFromProductId("moodfood_lifetime")).toBeNull();
  });
});

describe("subscriptionFromCustomerInfo", () => {
  it("returns null when the user has no store history (never clobber invite/web state)", () => {
    expect(subscriptionFromCustomerInfo(customerInfo(null))).toBeNull();
  });
  it("maps an active trial to trialing with the trial end date", () => {
    const sub = subscriptionFromCustomerInfo(customerInfo(entitlement({ periodType: "TRIAL" })));
    expect(sub).toEqual({ status: "trialing", plan: "annual", expiresAt: "2026-08-13T00:00:00Z" });
  });
  it("maps an active normal period to active", () => {
    expect(subscriptionFromCustomerInfo(customerInfo(entitlement()))?.status).toBe("active");
  });
  it("maps an expired entitlement to canceled", () => {
    expect(subscriptionFromCustomerInfo(customerInfo(entitlement({ isActive: false })))?.status).toBe("canceled");
  });
  it("keeps the current plan (null) when the product id is unrecognized", () => {
    const sub = subscriptionFromCustomerInfo(customerInfo(entitlement({ productIdentifier: "mystery" })));
    expect(sub?.plan).toBeNull();
  });
});

describe("packageForPlan", () => {
  const pkg = (patch: Partial<PackageLike>): PackageLike => ({
    identifier: "$rc_custom",
    packageType: "CUSTOM",
    product: { identifier: "product" },
    ...patch,
  });

  it("prefers RevenueCat's standard package types", () => {
    const annual = pkg({ identifier: "$rc_annual", packageType: "ANNUAL" });
    const monthly = pkg({ identifier: "$rc_monthly", packageType: "MONTHLY" });
    const quarterly = pkg({ identifier: "$rc_three_month", packageType: "THREE_MONTH" });
    const all = [monthly, quarterly, annual];
    expect(packageForPlan("annual", all)).toBe(annual);
    expect(packageForPlan("quarterly", all)).toBe(quarterly);
    expect(packageForPlan("monthly", all)).toBe(monthly);
  });
  it("falls back to matching custom package or product identifiers", () => {
    const custom = pkg({ product: { identifier: "moodfood_pro_annual" } });
    expect(packageForPlan("annual", [custom])).toBe(custom);
  });
  it("returns null when nothing matches", () => {
    expect(packageForPlan("annual", [pkg({})])).toBeNull();
  });
});
