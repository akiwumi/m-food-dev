import { useEffect, useState } from "react";
import { ArrowLeft, Mail, ArrowRight } from "lucide-react";
import { onAuthChange, isEmailConfirmed } from "../../auth";

export function VerifyEmailScreen({ email, realAuth, onVerified, resend, back }: { email: string; realAuth?: boolean; onVerified: () => void; resend: () => void; back: () => void }) {
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  // Real auth: the user confirms in the email link's tab; listen for the session
  // appearing (or being confirmed) and advance automatically.
  useEffect(() => {
    if (!realAuth) return;
    return onAuthChange((_event, session) => { if (session) onVerified(); });
  }, [realAuth]);

  const handleClick = async () => {
    if (!realAuth) { onVerified(); return; } // pilot, simulate confirmation
    setChecking(true);
    const ok = await isEmailConfirmed();
    setChecking(false);
    if (ok) onVerified(); else setNotYet(true);
  };

  return <div className="auth-modern center">
    <button className="back" onClick={back} aria-label="Back"><ArrowLeft /></button>
    <div className="verify-icon"><Mail size={34} /></div>
    <span className="eyebrow">CHECK YOUR INBOX</span>
    <h1>Confirm your email.</h1>
    <p className="lede">We sent a confirmation link to <span className="maskmail">{email}</span>. Open it to verify your account and continue.</p>
    <button className="primary" onClick={handleClick} disabled={checking}>{checking ? "Checking…" : <>I've opened the link <ArrowRight size={18} /></>}</button>
    <button className="ghost" onClick={() => { resend(); setSent(true); }}>{sent ? "Sent again ✓" : "Resend confirmation email"}</button>
    {notYet && <span className="err">We can't see a confirmation yet, open the link in the email, then tap again.</span>}
    <small>{realAuth ? "Tap the link in the email we just sent, then come back here." : "In a production build this button is the link inside the email. Here, tapping it simulates the confirmation."}</small>
  </div>;
}
