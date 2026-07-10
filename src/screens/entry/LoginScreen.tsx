import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, Check } from "lucide-react";
import gsap from "gsap";
import {
  signIn as authSignIn,
  requestPasswordReset as authRequestPasswordReset,
  updatePassword as authUpdatePassword,
  isSupabaseConfigured,
} from "../../auth";
import { LOGIN_PHOTO } from "../../components/photos";

export function LoginScreen({ back, onSignedIn, recovery, doneRecovery }: { back: () => void; onSignedIn: (email: string) => void; recovery?: boolean; doneRecovery?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot" | "reset">(recovery ? "reset" : "signin");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (recovery) {
      setMode("reset");
      setError("");
      setNotice("Choose a new password for your MoodFood account.");
    }
  }, [recovery]);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".ap-sheet", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" });
        gsap.from("[data-auth]", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.15 });
      }, rootRef);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/.+@.+\..+/.test(email) || !password) { setError("Enter your email and password."); return; }
    if (!isSupabaseConfigured) { setError("Sign-in needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authSignIn(email.trim(), password);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not sign in. Check your details."); return; }
    onSignedIn(email.trim());
  };
  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/.+@.+\..+/.test(email)) { setError("Enter the email address for your account."); return; }
    if (!isSupabaseConfigured) { setError("Password reset needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authRequestPasswordReset(email.trim());
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not send a reset link. Try again."); return; }
    setNotice("If that email has a MoodFood account, a password reset link is on its way.");
  };
  const saveNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 6) { setError("Use a password of at least 6 characters."); return; }
    if (!isSupabaseConfigured) { setError("Password reset needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authUpdatePassword(newPassword);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not update your password. Open the reset link again and retry."); return; }
    setNewPassword("");
    doneRecovery?.();
    setMode("signin");
    setNotice("Password updated. Sign in with your new password.");
  };
  const title = mode === "reset" ? "Set a new password." : mode === "forgot" ? "Reset your password." : "Sign in.";
  const lede = mode === "reset"
    ? "Enter a fresh password for your MoodFood account."
    : mode === "forgot"
      ? "Enter your email and we'll send a secure link to reset your password."
      : "Pick up where you left off, your food profile and recommendations are waiting.";
  return <div className="auth-photo" ref={rootRef}>
    <div className="ap-hero">
      <img src={LOGIN_PHOTO} alt="A bowl of fresh food" />
      <div className="ap-veil" />
      <button className="ap-back" onClick={back} aria-label="Back"><ArrowLeft size={19} /></button>
      <div className="ap-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    </div>
    <div className="ap-sheet">
      <span className="ap-eyebrow" data-auth>{mode === "signin" ? "WELCOME BACK" : "ACCOUNT RECOVERY"}</span>
      <h1 data-auth>{title}</h1>
      <p className="ap-lede" data-auth>{lede}</p>
      {mode === "signin" && <form onSubmit={onSubmit} data-auth>
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>
        <label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Your password" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <span className="err" role="alert">{error}</span>}
        {notice && <span className="auth-notice" role="status">{notice}</span>}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}</button>
      </form>}
      {mode === "forgot" && <form onSubmit={sendReset} data-auth>
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>
        {error && <span className="err" role="alert">{error}</span>}
        {notice && <span className="auth-notice" role="status">{notice}</span>}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : <>Send reset link <Mail size={18} /></>}</button>
      </form>}
      {mode === "reset" && <form onSubmit={saveNewPassword} data-auth>
        <label>New password<span className="password-field"><input type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(""); }} placeholder="At least 6 characters" /><button type="button" onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? "Hide password" : "Show password"}>{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <span className="err" role="alert">{error}</span>}
        {notice && <span className="auth-notice" role="status">{notice}</span>}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : <>Save new password <Check size={18} /></>}</button>
      </form>}
      <p className="ap-alt" data-auth>
        {mode === "signin" ? <>
          <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot password?</button>
          <span> · New here? </span><button type="button" onClick={back}>Build your food profile</button>
        </> : <>
          Remembered it? <button type="button" onClick={() => { doneRecovery?.(); setMode("signin"); setError(""); setNotice(""); }}>Back to sign in</button>
        </>}
      </p>
    </div>
  </div>;
}
