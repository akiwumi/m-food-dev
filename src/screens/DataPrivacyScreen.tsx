import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Activity, Upload, ChevronRight, RotateCcw, Check } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { SettingsGroup } from "../components/misc";
import type { CuisineSignal, MoodCuisineSignal } from "../recommendation";
import { getConsents, setConsent, resetLearningData, exportMyData, NO_CONSENT, type ConsentState, type ConsentScope } from "../governance";
import { deterministicTasteSummary, fetchTasteSummary } from "../tasteSummary";

// Slice 1.5 (roadmap v3): the Data Governance surface. Granular consent (default
// off, recorded), export, and the distinct pause / reset controls — all gated on
// being signed in, since the data lives server-side.
export function DataPrivacyScreen({ signal, moodSignal, suppressed, learningOn, onForget, onRestore }: { signal: CuisineSignal | null; moodSignal: MoodCuisineSignal | null; suppressed: string[]; learningOn: boolean; onForget: (c: string) => void; onRestore: (c: string) => void }) {
  const [consents, setConsents] = useState<ConsentState>(NO_CONSENT);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  // Slice 5: deterministic summary is shown by default; AI rephrase only on request.
  const [summary, setSummary] = useState<{ summary: string; source: "ai" | "fallback" } | null>(null);
  const shownSummary = summary?.summary ?? deterministicTasteSummary(signal, moodSignal);

  useEffect(() => { void getConsents().then(c => { setConsents(c); setLoaded(true); }); }, []);
  // Reset any AI prose when the underlying signal changes — prose is always
  // regenerable and must never drift from the canonical signal.
  useEffect(() => { setSummary(null); }, [signal, moodSignal]);

  const askMoody = async () => {
    setBusy("summary");
    setSummary(await fetchTasteSummary(signal, moodSignal));
    setBusy("");
  };

  const toggle = async (scope: ConsentScope, granted: boolean) => {
    setConsents(prev => ({ ...prev, [scope]: granted })); // optimistic
    const ok = await setConsent(scope, granted);
    if (!ok) { setConsents(await getConsents()); setNote("Couldn’t save that — sign in and try again."); }
    else setNote(granted ? "Consent recorded." : "Consent withdrawn — learning is paused.");
  };

  const doExport = async () => {
    setBusy("export"); setNote("");
    const data = await exportMyData();
    setBusy("");
    if (!data) { setNote("Export needs you to be signed in. Try again once signed in."); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `moodfood-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setNote("Your data was exported as a JSON file.");
  };

  const doReset = async () => {
    if (!window.confirm("Delete everything MoodFood has learned from your behaviour? Your account stays. This can’t be undone.")) return;
    setBusy("reset"); setNote("");
    const ok = await resetLearningData();
    setBusy("");
    setNote(ok ? "Learning data deleted." : "Couldn’t reset — sign in and try again.");
  };

  return <div className="screen"><TopBar title="Data & privacy" />
    <section className="privacy-intro">
      <ShieldCheck />
      <h2>You decide what MoodFood learns.</h2>
      <p>To improve your recommendations we can record what you cook, save, and rate, plus the mood you pick at check-in. It’s stored on your MoodFood account, used only to personalise your picks, and you can pause it, export it, or delete it here at any time. Both switches are off until you turn them on.</p>
    </section>
    <SettingsGroup title="LEARNING CONSENT">
      <label className="settings-toggle"><span><Sparkles size={15} />Learn from my recipe behaviour<small>Saves, cooks, and ratings improve your ranking. Off = no behavioural data is recorded.</small></span>
        <input type="checkbox" disabled={!loaded} checked={consents.behavioral_learning} onChange={e => toggle("behavioral_learning", e.target.checked)} /></label>
      <label className="settings-toggle"><span><Activity size={15} />Use my mood &amp; health context<small>Lets check-in mood and health-trend context feed learning. Separate from the above.</small></span>
        <input type="checkbox" disabled={!loaded} checked={consents.mood_health_context} onChange={e => toggle("mood_health_context", e.target.checked)} /></label>
    </SettingsGroup>
    {consents.behavioral_learning && <SettingsGroup title="WHAT MOODFOOD HAS LEARNED">
      <p className="taste-summary">{shownSummary}</p>
      {signal && signal.preferred.length > 0 && <button className="link-button" onClick={askMoody} disabled={busy === "summary"}><Sparkles size={14} />{busy === "summary" ? "Asking Moody…" : summary?.source === "ai" ? "Reworded by Moody" : "Say it in Moody’s words"}</button>}
      {signal && signal.preferred.length > 0 ? <>
        <p className="quiet">From the meals you’ve rated{learningOn ? ", these gently lift matching picks." : " (turn on “Learn from what I cook & rate” to use them)."}</p>
        {signal.preferred.map(c => {
          const n = signal.support[c] ?? 0;
          const confidence = n >= 6 ? "strong signal" : n >= 4 ? "growing signal" : "early signal";
          return <div className="taste-row" key={c}><span><b>{c}</b><small>{n} highly-rated {n === 1 ? "cook" : "cooks"} · {confidence}</small></span><button onClick={() => onForget(c)}>Forget</button></div>;
        })}
      </> : <p className="quiet">Nothing yet — cook and rate a few meals and the cuisines you enjoy will appear here. A couple of ratings are never treated as a permanent verdict.</p>}
      {suppressed.length > 0 && <div className="taste-suppressed"><small>FORGOTTEN</small>{suppressed.map(c => <div className="taste-row" key={c}><span>{c}</span><button onClick={() => onRestore(c)}>Restore</button></div>)}</div>}
    </SettingsGroup>}
    <SettingsGroup title="YOUR DATA">
      <button onClick={doExport} disabled={busy === "export"}><Upload />{busy === "export" ? "Preparing…" : "Export my data (JSON)"}<ChevronRight /></button>
      <button className="danger" onClick={doReset} disabled={busy === "reset"}><RotateCcw />{busy === "reset" ? "Deleting…" : "Reset what MoodFood has learned"}</button>
      <p className="quiet">To erase your whole account and everything in it, use Account → Delete account.</p>
    </SettingsGroup>
    {note && <p className="source-note live"><Check size={13} /> {note}</p>}
  </div>;
}
