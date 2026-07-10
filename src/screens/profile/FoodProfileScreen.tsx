import { TopBar } from "../../components/AppChrome";
import { SetupStep } from "../../components/misc";
import { QuestionField } from "../onboarding/QuestionField";
import { onboardingQuestions, onboardingSections, type OnboardingKey, type ProfileValue } from "../../onboarding";
import type { Profile } from "../../store";

// Editable view of every onboarding answer, grouped by section. This is the same
// set of questions the user saw at first launch, they can refine anything here
// any time, which is why returning users never have to repeat onboarding.
export function FoodProfileScreen({ profile, save, back }: { profile: Profile; save: (p: Profile) => void; back: () => void }) {
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  return <div className="screen food-profile">
    <TopBar title="Food profile" back={back} />
    <section className="fp-intro">
      <span>YOUR FOOD PROFILE</span>
      <h1>Fine-tune what MoodFood knows.</h1>
      <p>These are the same questions from onboarding, change anything, any time, and your recommendations update to match. Everything saves automatically.</p>
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
