import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { PlanPicker } from "../components/misc";
import { PLANS } from "../appTypes";
import { redeemInviteCode, startCheckout } from "../api/backend";
import { isSupabaseConfigured } from "../auth";
import { canUseNativePurchases, openManageSubscriptions, purchasePlan, restoreStorePurchases } from "../purchases";
import { isPro, type StoreSubscription } from "../subscription";
import type { Profile } from "../store";

export function BillingScreen({ profile, save }: { profile: Profile; save: (p: Profile) => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const [mode, setMode] = useState<"plan" | "invite">("plan");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeError, setStoreError] = useState("");
  const chosen = PLANS.find(p => p.id === plan);
  const subscribed = isPro(profile);

  const applyStoreSub = (sub: StoreSubscription) => {
    save({ ...profile, plan: sub.plan ?? plan, subscriptionStatus: sub.status, trialEndsAt: sub.expiresAt ?? profile.trialEndsAt });
  };

  // Native iOS billing actions (Apple IAP via RevenueCat — never Stripe here).
  const storeAction = async () => {
    setStoreError("");
    if (subscribed) { await openManageSubscriptions(); return; }
    setStoreBusy(true);
    const result = await purchasePlan(plan);
    setStoreBusy(false);
    if (!result.ok) {
      if (!result.cancelled) setStoreError(result.error ?? "Purchase failed. Please try again.");
      return;
    }
    applyStoreSub(result.sub);
  };

  const restore = async () => {
    setStoreError("");
    setStoreBusy(true);
    const result = await restoreStorePurchases();
    setStoreBusy(false);
    if (!result.ok) { setStoreError(result.error ?? "Nothing to restore."); return; }
    applyStoreSub(result.sub);
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
    setInviteSuccess(true);
  };

  return (
    <div className="screen">
      <TopBar title="Subscription" />
      <section className="billing">
        <span>{profile.inviteCode ? "INVITE: 1 YEAR ACCESS" : "7-DAY FULL ACCESS"}</span>
        <h1>Keep dinner feeling lighter.</h1>
        {profile.inviteCode ? (
          <p>Your invite code <b>{profile.inviteCode}</b> is active. Access expires {profile.inviteSubEnd ? new Date(profile.inviteSubEnd).toLocaleDateString() : "in 1 year"}.</p>
        ) : (
          <>
            <div className="sub-mode-toggle">
              <button className={mode === "plan" ? "active" : ""} onClick={() => setMode("plan")}>Subscription</button>
              <button className={mode === "invite" ? "active" : ""} onClick={() => setMode("invite")}>Invite code</button>
            </div>
            {mode === "plan" ? (
              <>
                <p>Personalized decisions, safe recommendations, cook mode, and weekly reflections.</p>
                <PlanPicker plan={plan} setPlan={setPlan} />
                {storeError && <p className="invite-error">{storeError}</p>}
                <button className="primary" disabled={storeBusy} onClick={async () => {
                  if (canUseNativePurchases) { await storeAction(); return; }
                  if (isSupabaseConfigured) {
                    const result = await startCheckout(plan);
                    if (result.url) window.location.href = result.url;
                  } else {
                    save({ ...profile, plan });
                  }
                }}>
                  {canUseNativePurchases
                    ? (subscribed ? "Manage subscription in the App Store" : storeBusy ? "Opening App Store…" : `Start free trial: ${chosen?.name}`)
                    : subscribed ? "Manage subscription on Stripe" : `Start free trial: ${chosen?.name}`}
                </button>
                {canUseNativePurchases && (
                  <button className="skip" onClick={restore} disabled={storeBusy}>Restore purchases</button>
                )}
                <small>{canUseNativePurchases ? "Billed through your App Store account. Cancel anytime." : "Managed securely by Stripe. Cancel anytime."}</small>
              </>
            ) : inviteSuccess ? (
              <p className="invite-success"><Check size={18} /> Code redeemed, you now have 1 year of full access.</p>
            ) : (
              <>
                <p>Enter an invite code to unlock a full year of MoodFood, no payment required.</p>
                <input
                  className="invite-code-input"
                  value={inviteInput}
                  onChange={e => { setInviteInput(e.target.value.toUpperCase()); setInviteError(""); }}
                  placeholder="e.g. FOUNDER-A"
                  maxLength={40}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                {inviteError && <p className="invite-error">{inviteError}</p>}
                <button className="primary" onClick={redeem} disabled={inviteLoading}>
                  {inviteLoading ? "Checking…" : <>Redeem code <ArrowRight /></>}
                </button>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
