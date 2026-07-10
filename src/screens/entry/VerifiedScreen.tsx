import { Check, ArrowRight } from "lucide-react";

export function VerifiedScreen({ name, proceed }: { name: string; proceed: () => void }) {
  return <div className="auth-modern center">
    <div className="verify-icon verified-icon"><Check size={36} /></div>
    <span className="eyebrow">YOU'RE ALL SET</span>
    <h1>Welcome aboard{name ? `, ${name}` : ""}.</h1>
    <p className="lede">Your email is confirmed and your food profile is saved. One last step before we start cooking.</p>
    <button className="primary" onClick={proceed}>Continue <ArrowRight size={18} /></button>
  </div>;
}
