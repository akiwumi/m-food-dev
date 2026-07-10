import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PlanPicker } from "../../components/misc";
import { PLANS } from "../../appTypes";
import { isSupabaseConfigured } from "../../auth";
import { startCheckout, redeemInviteCode } from "../../api/backend";
import { scheduleTrial } from "../../notifications";
import type { Profile } from "../../store";

export function SubscriptionScreen({ profile, save, proceed, onStarted }: { profile: Profile; save: (p: Profile) => void; proceed: () => void; onStarted?: () => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const [mode, setMode] = useState<"trial" | "invite">("trial");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const chosen = PLANS.find(p => p.id === plan);

  const start = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    if (isSupabaseConfigured) {
      // Real Stripe Checkout, redirects user to Stripe's hosted page.
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
            <button className="primary" onClick={start} disabled={checkoutLoading}>
              {checkoutLoading ? "Opening checkout…" : <>Start 7-day free trial <ArrowRight /></>}
            </button>
            <small>7 days free, then {chosen?.price}. Cancel before the trial ends if MoodFood does not make dinner feel easier.</small>
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
            <small>Valid codes grant 1 year of full access, tracked in Stripe.</small>
          </>
        )}
        <button className="skip" onClick={proceed}>Continue without saving trial</button>
      </section>
    </div>
  );
}
