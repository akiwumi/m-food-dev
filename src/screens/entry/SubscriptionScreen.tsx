import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PlanPicker } from "../../components/misc";
import { PLANS } from "../../appTypes";
import { isSupabaseConfigured } from "../../auth";
import { startCheckout, redeemInviteCode } from "../../api/backend";
import { canUseNativePurchases, purchasePlan, restoreStorePurchases } from "../../purchases";
import type { StoreSubscription } from "../../subscription";
import { scheduleTrial } from "../../notifications";
import type { Profile } from "../../store";

export function SubscriptionScreen({ profile, save, proceed, onStarted }: { profile: Profile; save: (p: Profile) => void; proceed: () => void; onStarted?: () => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const [mode, setMode] = useState<"trial" | "invite">("trial");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const chosen = PLANS.find(p => p.id === plan);

  // A store purchase/restore succeeded: mirror it into the profile and enter.
  const enterWithStoreSub = (sub: StoreSubscription) => {
    const now = new Date().toISOString();
    save({
      ...profile,
      plan: sub.plan ?? plan,
      trialStartedAt: sub.status === "trialing" ? now : profile.trialStartedAt,
      trialEndsAt: sub.expiresAt ?? profile.trialEndsAt,
      subscriptionStatus: sub.status,
    });
    if (sub.status === "trialing" && sub.expiresAt) {
      scheduleTrial(profile.email, chosen?.name || plan, chosen?.price || "", sub.expiresAt);
    }
    onStarted?.();
    proceed();
  };

  const start = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    if (canUseNativePurchases) {
      // Native iOS: the subscription must go through Apple IAP (StoreKit via
      // RevenueCat) — App Store guideline 3.1.1. Stripe checkout is web-only.
      const result = await purchasePlan(plan);
      setCheckoutLoading(false);
      if (!result.ok) {
        if (!result.cancelled) setCheckoutError(result.error ?? "Purchase failed. Please try again.");
        return;
      }
      enterWithStoreSub(result.sub);
    } else if (isSupabaseConfigured) {
      // Web: real Stripe Checkout, redirects user to Stripe's hosted page.
      const result = await startCheckout(plan);
      if (result.url) {
        window.location.href = result.url;
        return; // page will navigate away
      }
      setCheckoutError(result.error ?? "Could not start checkout. Please try again.");
      setCheckoutLoading(false);
    } else {
      // No backend, local pilot simulation.
      const now = new Date();
      const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      save({ ...profile, plan, trialStartedAt: now.toISOString(), trialEndsAt: endsAt, subscriptionStatus: "trialing" });
      scheduleTrial(profile.email, chosen?.name || plan, chosen?.price || "", endsAt);
      onStarted?.();
      proceed();
    }
  };

  // Apple requires a Restore Purchases affordance wherever we sell.
  const restore = async () => {
    setRestoreLoading(true);
    setCheckoutError("");
    const result = await restoreStorePurchases();
    setRestoreLoading(false);
    if (!result.ok) {
      setCheckoutError(result.error ?? "Nothing to restore.");
      return;
    }
    enterWithStoreSub(result.sub);
  };

  const redeem = async () => {
    const code = inviteInput.trim().toUpperCase();
    if (!code) { setInviteError("Please enter your invite code."); return; }
    setInviteLoading(true);
    setInviteError("");
    const result = await redeemInviteCode(code);
    setInviteLoading(false);
    if (!result.ok) { setInviteError(result.error ?? "Invalid code."); return; }
    save({ ...profile, subscriptionStatus: "active", inviteCode: code, inviteSubEnd: result.subscriptionEnd ?? "" });
    onStarted?.();
    proceed();
  };

  return (
    <div className="subscription">
      <div className="sub-logo"><img src="/images/logo-1.png" alt="MoodFood" /><span>MoodFood</span></div>
      <section className="billing">
        <span>DINNER DECISIONS, LIGHTER</span>
        <h1>{mode === "invite" ? "Redeem your invite." : "Keep MoodFood deciding with you."}</h1>
        <div className="sub-mode-toggle">
          <button className={mode === "trial" ? "active" : ""} onClick={() => setMode("trial")}>Free trial</button>
          <button className={mode === "invite" ? "active" : ""} onClick={() => setMode("invite")}>Invite code</button>
        </div>
        {mode === "trial" ? (
          <>
            <p>Save your quick profile, unlock guided cooking, and let Moody get sharper every time you cook, reject, or rate a meal.</p>
            <PlanPicker plan={plan} setPlan={setPlan} />
            {checkoutError && <p className="invite-error">{checkoutError}</p>}
            <button className="primary" onClick={start} disabled={checkoutLoading || restoreLoading}>
              {checkoutLoading ? "Opening checkout…" : <>Start 7-day free trial <ArrowRight /></>}
            </button>
            <small>
              {canUseNativePurchases
                ? `7 days free, then ${chosen?.price}. Billed through your App Store account; cancel anytime in your Apple ID subscriptions.`
                : `7 days free, then ${chosen?.price}. Cancel before the trial ends if MoodFood does not make dinner feel easier.`}
            </small>
            {canUseNativePurchases && (
              <button className="skip" onClick={restore} disabled={checkoutLoading || restoreLoading}>
                {restoreLoading ? "Restoring…" : "Restore purchases"}
              </button>
            )}
          </>
        ) : (
          <>
            <p>If you received an invite code, enter it below to unlock a full year of MoodFood, no payment required.</p>
            <input
              className="invite-code-input"
              value={inviteInput}
              onChange={e => { setInviteInput(e.target.value.toUpperCase()); setInviteError(""); }}
              placeholder="e.g. LAUNCH2026"
              maxLength={40}
              autoCapitalize="characters"
              spellCheck={false}
            />
            {inviteError && <p className="invite-error">{inviteError}</p>}
            <button className="primary" onClick={redeem} disabled={inviteLoading}>
              {inviteLoading ? "Checking…" : <>Redeem code <ArrowRight /></>}
            </button>
            <small>Valid codes grant 1 year of full access, no payment details needed.</small>
          </>
        )}
        <button className="skip" onClick={proceed}>Continue without saving trial</button>
      </section>
    </div>
  );
}
