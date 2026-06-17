import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, ChefHat, Heart, HeartPulse, Share2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useStoredState } from "./store";

// Capture Chrome/Android's install prompt as early as possible so the landing
// can offer a one-tap "Add to Home Screen". On browsers that don't fire this
// (notably iOS Safari) we fall back to short instructions instead.
let deferredInstallPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstallPrompt = e as typeof deferredInstallPrompt; });
}

// Gentle nudge: this is a PWA, so invite the user to add it to their home
// screen. Uses Chrome's install prompt when available, iOS instructions
// otherwise. Dismissible and remembered.
function AddToHomeScreenHint() {
  const standalone = typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [dismissed, setDismissed] = useStoredState("moodfood-a2hs-dismissed", false);
  const [show, setShow] = useState(false);
  const [canPrompt, setCanPrompt] = useState(!!deferredInstallPrompt);

  useEffect(() => {
    if (standalone || dismissed) return;
    const onPrompt = () => setCanPrompt(true);
    const onInstalled = () => setDismissed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setShow(true), 2200); // let the hero intro land first
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, [standalone, dismissed]);

  if (standalone || dismissed || !show) return null;

  const install = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch { /* user dismissed */ }
    deferredInstallPrompt = null;
    setDismissed(true);
  };

  return (
    <div className="a2hs" role="status">
      <div className="a2hs-icon"><img src="/images/logo-1.png" alt="" /></div>
      <div className="a2hs-body">
        <b>Add MoodFood to your home screen</b>
        {isIOS
          ? <p>Tap <Share2 size={13} /> Share, then <b>Add to Home Screen</b> for one-tap access.</p>
          : <p>Install it for a faster, full-screen experience, no app store needed.</p>}
      </div>
      {canPrompt && !isIOS && <button className="a2hs-cta" onClick={install}>Add</button>}
      <button className="a2hs-x" onClick={() => setDismissed(true)} aria-label="Dismiss"><X size={16} /></button>
    </div>
  );
}

const HERO_PHOTO = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=85";
const MOOD_WORDS = ["cozy", "drained", "celebratory", "adventurous", "nostalgic", "stressed", "curious"];

const HOW_STEPS = [
  {
    title: "Tell us how you feel",
    text: "A two-minute mood check, your headspace, your energy, the time you actually have tonight.",
    photo: "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=900&q=80",
    alt: "A colourful breakfast bowl",
    icon: HeartPulse,
  },
  {
    title: "We match one safe meal",
    text: "Filtered against your allergies, diet, and dislikes. One perfect pick, never a wall of 400 recipes.",
    photo: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
    alt: "A warming bowl of soup",
    icon: BrainCircuit,
  },
  {
    title: "Cook with your hand held",
    text: "Step-by-step cook mode with timers, photos, and Moody, your AI sous-chef, on call.",
    photo: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80",
    alt: "Hands cooking in a bright kitchen",
    icon: ChefHat,
  },
];

const QUESTION_POINTS = [
  { icon: Heart, title: "It learns what matters to you", text: "Allergies, cravings, comfort foods, the time you have, nothing one-size-fits-all." },
  { icon: ChefHat, title: "Every answer trains your MoodFood", text: "The more it knows, the smarter and more personal every suggestion becomes." },
  { icon: Check, title: "You start in a great place", text: "From day one you get picks that genuinely fit you, not generic guesses." },
] as const;

// Intro flow shown only before onboarding: hero → how it works → why the
// questions. Signed-in / onboarded users never come through here.
type IntroStep = "hero" | "how" | "why";

export function Landing({ begin, signin }: { begin: () => void; signin: () => void }) {
  const [step, setStep] = useState<IntroStep>("hero");
  const rootRef = useRef<HTMLDivElement>(null);
  const cyclerRef = useRef<HTMLElement>(null);

  // Soft staggered entrance on every page of the intro.
  useEffect(() => {
    window.scrollTo(0, 0);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-reveal]", { y: 22, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 });
      }, rootRef);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [step]);

  // Mood-word cycler in the hero sub-line; swaps text without re-rendering.
  useEffect(() => {
    if (step !== "hero") return;
    const cycler = cyclerRef.current;
    if (!cycler || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.7, delay: 1.7 });
    tl.to(cycler, { yPercent: -110, opacity: 0, duration: 0.4, ease: "power2.in" })
      .add(() => { i = (i + 1) % MOOD_WORDS.length; cycler.textContent = MOOD_WORDS[i]; })
      .fromTo(cycler, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
    return () => { tl.kill(); };
  }, [step]);

  if (step === "hero") {
    return (
      <div className="intro-hero" ref={rootRef} key="hero">
        <img className="ih-photo" src={HERO_PHOTO} alt="A fresh, colourful meal" />
        <div className="ih-veil" />
        <AddToHomeScreenHint />
        <header className="ih-top">
          <div className="ih-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
          <button className="ih-signin" onClick={signin}>Sign in</button>
        </header>
        <div className="ih-copy">
          <span className="ih-eyebrow" data-reveal>YOUR PERSONAL FOOD COMPANION</span>
          <h1 data-reveal><span>Feeling cozy?</span><br /><em>Eat something warm.</em></h1>
          <p data-reveal>
            Feeling <span className="ih-cycle"><b ref={cyclerRef}>{MOOD_WORDS[0]}</b></span> tonight?
            We'll match you to one safe, doable meal, chosen for your mood, your energy, and the people at your table.
          </p>
          <div className="ih-actions" data-reveal>
            <button className="ih-cta" onClick={() => setStep("how")}>Let's eat <ArrowRight size={17} /></button>
            <button className="ih-ghost" onClick={signin}>I already have an account</button>
          </div>
          <div className="ih-trust" data-reveal>
            <span><ShieldCheck size={13} /> Allergy-safe, always</span>
            <span><Sparkles size={13} /> AI-curated</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "how") {
    return (
      <div className="intro-page" ref={rootRef} key="how">
        <header className="ip-top">
          <button className="ip-back" onClick={() => setStep("hero")} aria-label="Back"><ArrowLeft size={19} /></button>
          <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
          <span className="ip-step-chip">1 of 2</span>
        </header>
        <div className="ip-segments"><i className="active" /><i /></div>
        <main className="ip-main">
          <span className="ip-eyebrow" data-reveal>HOW IT WORKS</span>
          <h1 data-reveal>From mood to meal in three moves.</h1>
          <div className="ip-steps">
            {HOW_STEPS.map((s, i) => (
              <article key={s.title} data-reveal>
                <div className="ip-photo"><img src={s.photo} alt={s.alt} loading="lazy" /><b>{i + 1}</b></div>
                <h3><s.icon size={16} /> {s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </main>
        <footer className="ip-footer">
          <button className="primary" onClick={() => setStep("why")}>Continue <ArrowRight size={16} /></button>
        </footer>
      </div>
    );
  }

  return (
    <div className="intro-page" ref={rootRef} key="why">
      <header className="ip-top">
        <button className="ip-back" onClick={() => setStep("how")} aria-label="Back"><ArrowLeft size={19} /></button>
        <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
        <span className="ip-step-chip">2 of 2</span>
      </header>
      <div className="ip-segments"><i className="active" /><i className="active" /></div>
      <main className="ip-main">
        <span className="ip-eyebrow" data-reveal>BEFORE WE START</span>
        <h1 data-reveal>Start small. Improve as you cook.</h1>
        <p className="ip-lede" data-reveal>We'll ask only what we need for a safe first pick. After that, you can build a richer food profile whenever you want sharper recommendations.</p>
        <ul className="ip-points">
          {QUESTION_POINTS.map(p => (
            <li key={p.title} data-reveal>
              <span className="ip-dot"><p.icon size={15} /></span>
              <div><b>{p.title}</b><p>{p.text}</p></div>
            </li>
          ))}
        </ul>
        <p className="ip-note" data-reveal>Short on time? Answer what you can, nothing is set in stone. You can revisit and refine everything any time from your Food Profile.</p>
      </main>
      <footer className="ip-footer">
        <button className="primary" onClick={begin}>Pick your meal <ArrowRight size={16} /></button>
      </footer>
    </div>
  );
}
