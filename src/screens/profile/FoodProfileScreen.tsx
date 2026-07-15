import { TopBar } from "../../components/AppChrome";
import { SetupStep } from "../../components/misc";
import { QuestionField } from "../onboarding/QuestionField";
import { onboardingQuestions, onboardingSections, profileCompletion, type OnboardingKey, type ProfileValue } from "../../onboarding";
import type { Profile } from "../../store";

// Editable view of every onboarding answer, grouped by section. This is the same
// set of questions the user saw at first launch, they can refine anything here
// any time, which is why returning users never have to repeat onboarding. It's
// also the progressive-profiling home: new users complete only the ~7-item quick
// gate up front, then fill the rest here at their own pace (concept-recovery
// Phase 1), tracked by the completion meter below.
export function FoodProfileScreen({ profile, save, back }: { profile: Profile; save: (p: Profile) => void; back: () => void }) {
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  const completion = profileCompletion(profile);
  const done = completion.percent >= 100;
  return <div className="screen food-profile">
    <TopBar title="Food profile" back={back} />
    <section className="fp-intro">
      <span>YOUR FOOD PROFILE</span>
      <h1>Fine-tune what MoodFood knows.</h1>
      <p>These are the same questions from onboarding, change anything, any time, and your recommendations update to match. Everything saves automatically.</p>
    </section>
    <section className="fp-completion" aria-label="Profile completion">
      <div className="fp-completion-head">
        <b>{done ? "Your food profile is complete" : `Complete your food profile — ${completion.percent}%`}</b>
        <span>{completion.answered} of {completion.total} signals</span>
      </div>
      <div className="fp-completion-bar"><i style={{ width: `${completion.percent}%` }} /></div>
      <p>{done
        ? "Every signal is in — Moody has the full picture. Adjust anything below whenever you like."
        : `The more you fill in, the more telepathic Moody's picks feel. ${completion.remaining.length} ${completion.remaining.length === 1 ? "prompt" : "prompts"} left — answer any of them below.`}</p>
    </section>
    {onboardingSections.map(section => {
      const qs = visible.filter(q => q.section === section);
      if (!qs.length) return null;
      return <section className="fp-section" key={section}>
        <h2 className="fp-section-title">{section}</h2>
        {qs.map(q => <div className="fp-q" key={q.id}>
          <SetupStep eyebrow={q.eyebrow} title={q.title} text={q.text}>
            <QuestionField q={q} profile={profile} update={update} />
          </SetupStep>
        </div>)}
      </section>;
    })}
  </div>;
}
