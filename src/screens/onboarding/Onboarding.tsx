import { useEffect, useState } from "react";
import { Check, ArrowRight, Clock3 } from "lucide-react";
import { useStoredState, type Profile } from "../../store";
import { onboardingQuestions, onboardingSections, type OnboardingKey, type OnboardingQuestion, type ProfileValue } from "../../onboarding";
import { SetupStep } from "../../components/misc";
import { SECTION_PHOTOS, FALLBACK_FOOD } from "../../components/photos";
import { QuestionField } from "./QuestionField";

function useDesktopOnboarding() {
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1040px)").matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(min-width: 1040px)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return desktop;
}

export function Onboarding({ profile, save, finish }: { profile: Profile; save: (p: Profile) => void; finish: (p: Profile) => void }) {
  // Questions whose showIf condition currently passes (e.g. spice types only
  // appear once the user has any heat tolerance). Navigation runs over this list.
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  const total = visible.length;
  const desktop = useDesktopOnboarding();
  const [step, setStep] = useStoredState<number>("moodfood-onboarding-step", 0);
  const [desktopStep, setDesktopStep] = useStoredState<number>("moodfood-onboarding-section-step", 0);
  const index = Math.min(Math.max(0, step), total);          // index === total -> review
  const onReview = index === total;
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };

  if (desktop) {
    return <DesktopOnboarding profile={profile} visible={visible} step={desktopStep} setStep={setDesktopStep} update={update} finish={finish} />;
  }

  if (onReview) {
    const summary: [string, string][] = [
      ["Cooking moods", profile.cookingMoods.slice(0, 5).join(", ") || "-"],
      ["Diet", [profile.diet, ...profile.dietReligious].join(", ")],
      ["Hard exclusions", profile.allergies.join(", ") || "None"],
      ["Won't eat", profile.dislikedIngredients.join(", ") || "Open to most things"],
      ["Loves", [...profile.flavorLikes, ...profile.textureLikes].slice(0, 5).join(", ") || "Still learning"],
      ["Cuisines", profile.cuisines.slice(0, 6).join(", ") || "Open to anything"],
      ["Drawn to food for", profile.foodValues.slice(0, 4).join(", ") || "-"],
      ["Comfort means", profile.comfortFoods.slice(0, 4).join(", ") || "-"],
      ["Cooking", `${profile.skill} · serves ${profile.servings} · ${profile.weeknightTime}`],
      ["Working toward", profile.nutritionGoals.join(", ") || "No specific goal"],
    ];
    // ── Review screen ──────────────────────────────────────────────
    const reviewPhoto = SECTION_PHOTOS["Habits & values"];
    return (
      <div className="onboarding">
        <div className="onboarding-photo">
          <img src={reviewPhoto} alt="Your food profile" />
          <div className="op-veil" />
          <div className="op-bar">
            <div className="op-logo">
              <img src="/images/logo-1.png" alt="MoodFood" />
              <span>MoodFood</span>
            </div>
            <span className="op-step-chip"><Check size={13} /> {total} answers</span>
          </div>
        </div>
        <div className="onboarding-sheet">
          <div className="drag-h" />
          <div className="ob-segments">{onboardingSections.map((_, n) => <i className="active" key={n} />)}</div>
          <div className="ob-main">
            <SetupStep eyebrow="READY WHEN YOU ARE" title={`Nice to meet you, ${profile.name}.`} text="Here's the food profile Moody will start with. Every answer shapes your recommendations.">
              <div className="onboarding-review">{summary.map(([label, val]) => <p key={label}><b>{label}</b><span>{val}</span></p>)}</div>
            </SetupStep>
          </div>
        </div>
        <div className="ob-footer">
          <button className="secondary" onClick={() => go(total - 1)}>Back</button>
          <button className="primary" onClick={() => finish(profile)}>Continue <ArrowRight size={16} /></button>
        </div>
      </div>
    );
  }

  // ── Question screens ─────────────────────────────────────────────
  const q = visible[index];
  const sectionIndex = onboardingSections.indexOf(q.section);
  const last = index === total - 1;
  const sectionPhoto = SECTION_PHOTOS[q.section] || FALLBACK_FOOD;

  return (
    <div className="onboarding">
      {/* Photo hero, like the person/hero photo in the reference */}
      <div className="onboarding-photo">
        <img src={sectionPhoto} alt={q.section} />
        <div className="op-veil" />
        {/* Logo + step chip overlaid on photo, faithful to reference Image 1 */}
        <div className="op-bar">
          <div className="op-logo">
            <img src="/images/logo-1.png" alt="MoodFood" />
            <span>MoodFood</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="op-step-chip"><Clock3 size={12} /> {index + 1} / {total}</span>
            <span className="op-saved-chip">Saved</span>
          </div>
        </div>
      </div>

      {/* White bottom sheet, slides up over the photo */}
      <div className="onboarding-sheet">
        <div className="drag-h" />
        {/* Section progress bar */}
        <div className="ob-segments">
          {onboardingSections.map((_, n) => <i className={n <= sectionIndex ? "active" : ""} key={n} />)}
        </div>
        <div className="ob-main">
          <SetupStep eyebrow={q.eyebrow} title={q.title} text={q.text}>
            <QuestionField q={q} profile={profile} update={update} />
          </SetupStep>
        </div>
      </div>

      <div className="ob-footer">
        <button className="secondary" disabled={index === 0} onClick={() => go(index - 1)}>Back</button>
        <button className="primary" onClick={() => go(index + 1)}>
          {last ? "Review profile" : "Continue"} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function DesktopOnboarding({ profile, visible, step, setStep, update, finish }: { profile: Profile; visible: OnboardingQuestion[]; step: number; setStep: (n: number) => void; update: (k: OnboardingKey, v: ProfileValue) => void; finish: (p: Profile) => void }) {
  const sections = onboardingSections.map(section => ({
    section,
    questions: visible.filter(q => q.section === section),
  })).filter(group => group.questions.length);
  const totalSections = sections.length;
  const page = Math.min(Math.max(0, step), totalSections);
  const onReview = page === totalSections;
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };

  if (onReview) {
    const summary: [string, string][] = [
      ["Cooking moods", profile.cookingMoods.slice(0, 5).join(", ") || "-"],
      ["Diet", [profile.diet, ...profile.dietReligious].join(", ")],
      ["Safety rules", profile.allergies.join(", ") || "None"],
      ["Won't eat", profile.dislikedIngredients.join(", ") || "Open to most things"],
      ["Palate", [...profile.flavorLikes, ...profile.textureLikes].slice(0, 6).join(", ") || "Still learning"],
      ["Cuisines", profile.cuisines.slice(0, 6).join(", ") || "Open to anything"],
      ["Kitchen", `${profile.skill} · ${profile.weeknightTime} · serves ${profile.servings}`],
      ["Goals", profile.nutritionGoals.join(", ") || "No specific goal"],
    ];
    return <div className="onboarding desktop-onboarding">
      <DesktopOnboardingRail sections={sections.map(s => s.section)} active={totalSections} />
      <main className="desktop-ob-main desktop-ob-review">
        <section className="desktop-ob-hero">
          <span>PROFILE READY</span>
          <h1>Review your food profile.</h1>
          <p>Moody will use these signals to keep dinner safe, realistic, and matched to how you feel.</p>
        </section>
        <section className="desktop-ob-review-card">
          {summary.map(([label, value]) => <p key={label}><b>{label}</b><span>{value}</span></p>)}
        </section>
      </main>
      <DesktopOnboardingFooter back={() => go(totalSections - 1)} next={() => finish(profile)} nextLabel="Continue" />
    </div>;
  }

  const group = sections[page];
  const answeredCount = visible.filter(q => {
    const value = profile[q.key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return true;
    if (typeof value === "object" && value) return Object.values(value).some(Boolean);
    return Boolean(value);
  }).length;

  return <div className="onboarding desktop-onboarding">
    <DesktopOnboardingRail sections={sections.map(s => s.section)} active={page} />
    <main className="desktop-ob-main">
      <section className="desktop-ob-hero">
        <span>SECTION {page + 1} OF {totalSections}</span>
        <h1>{group.section}</h1>
        <p>{group.questions.length} focused prompts on one page. Fill what matters now, adjust anything later.</p>
        <div className="desktop-ob-progress"><i style={{ width: `${Math.round(((page + 1) / (totalSections + 1)) * 100)}%` }} /></div>
      </section>
      <section className="desktop-ob-board">
        {group.questions.map((q, n) => <article className="desktop-ob-question" key={q.id}>
          <div className="desktop-ob-question-head">
            <small>{q.eyebrow}</small>
            <span>{n + 1}</span>
          </div>
          <SetupStep eyebrow="" title={q.title} text={q.text}>
            <QuestionField q={q} profile={profile} update={update} />
          </SetupStep>
        </article>)}
      </section>
      <div className="desktop-ob-count">{answeredCount} of {visible.length} profile signals filled</div>
    </main>
    <DesktopOnboardingFooter back={() => go(page - 1)} next={() => go(page + 1)} nextLabel={page === totalSections - 1 ? "Review profile" : "Next section"} backDisabled={page === 0} />
  </div>;
}

function DesktopOnboardingRail({ sections, active }: { sections: string[]; active: number }) {
  return <aside className="desktop-ob-rail">
    <div className="desktop-ob-brand"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    <nav>{sections.map((section, index) => <div className={index === active ? "active" : index < active ? "done" : ""} key={section}>
      <b>{index + 1}</b><span>{section}</span>
    </div>)}</nav>
  </aside>;
}

function DesktopOnboardingFooter({ back, next, nextLabel, backDisabled = false }: { back: () => void; next: () => void; nextLabel: string; backDisabled?: boolean }) {
  return <footer className="desktop-ob-footer">
    <button className="secondary" disabled={backDisabled} onClick={back}>Back</button>
    <button className="primary" onClick={next}>{nextLabel} <ArrowRight size={16} /></button>
  </footer>;
}
