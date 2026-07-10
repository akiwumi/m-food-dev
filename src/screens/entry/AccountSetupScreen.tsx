import { useState, type FormEvent } from "react";
import { ArrowLeft, Camera, ArrowRight, Lock } from "lucide-react";
import { readSafeImage, cleanText, validateEmail } from "../../security";
import { signUp as authSignUp, isSupabaseConfigured } from "../../auth";
import type { Profile } from "../../store";

export function AccountSetupScreen({ profile, back, submit, simulate = false }: { profile: Profile; back: () => void; submit: (patch: Partial<Profile>, opts?: { hasSession: boolean }) => void; simulate?: boolean }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => { if (!file) return; try { setAvatar(await readSafeImage(file)); setError(""); } catch (err) { setError((err as Error).message); } };
  // Validate the email locally before signup so we never ask the backend to send
  // a confirmation to a malformed/undeliverable/typo'd address (which would bounce).
  const emailCheck = validateEmail(email);
  const showEmailHint = email.includes("@") && email.includes(".") && !emailCheck.ok;
  const valid = Boolean(cleanText(name, 80) && emailCheck.ok && password.length >= 6);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cleanText(name, 80)) { setError("Add your name to continue."); return; }
    if (!emailCheck.ok) { setError(emailCheck.reason ?? "Enter a valid email address."); return; }
    if (password.length < 6) { setError("Use a password of at least 6 characters."); return; }
    const patch = { name: cleanText(name, 80), email: email.trim(), avatar };
    if (simulate) { submit(patch, { hasSession: true }); return; } // explicit QA route, no network side effects
    if (!isSupabaseConfigured) { submit(patch); return; } // pilot mode, simulated
    setBusy(true);
    const res = await authSignUp(email.trim(), password, patch.name);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not create your account. Try again."); return; }
    submit(patch, { hasSession: res.hasSession });
  };
  return <div className="auth-modern">
    <button className="back" onClick={back} aria-label="Back" style={{ marginBottom: 8 }}><ArrowLeft /></button>
    <div className="auth-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    <span className="eyebrow">CREATE YOUR ACCOUNT</span>
    <h1>Save your profile.</h1>
    <p className="lede">Your food profile is ready. Create an account so it's yours on every device, we'll send a confirmation email to finish.</p>
    <div className="avatar-pick"><label>{avatar ? <span className="ring"><img src={avatar} alt="" /></span> : <span className="ring"><span>{(name || "You").slice(0, 1).toUpperCase()}</span></span>}<span className="cam"><Camera size={16} /></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><em>Add a profile photo</em></div>
    <form onSubmit={onSubmit}>
      <label>Name<input value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Jessica" /></label>
      <label>Email address<input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>
      {showEmailHint && <span className="err">{emailCheck.reason}{emailCheck.suggestion && <> <button type="button" onClick={() => { setEmail(emailCheck.suggestion!); setError(""); }} style={{ background: "none", border: 0, padding: 0, color: "var(--olive)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Use {emailCheck.suggestion}</button></>}</span>}
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
      {error && <span className="err">{error}</span>}
      <button className="primary" type="submit" disabled={busy || !valid}>{busy ? "Creating account…" : <>Create account <ArrowRight size={18} /></>}</button>
    </form>
    <small><Lock size={11} /> We never share your mood data.{simulate || !isSupabaseConfigured ? " In this local test flow, your password isn't stored." : ""}</small>
  </div>;
}
