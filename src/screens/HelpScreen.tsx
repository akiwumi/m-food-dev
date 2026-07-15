import { useState } from "react";
import { BookMarked, Sparkles, Camera, ShieldCheck, Users, Activity, Dna, ChevronRight } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { onboardingQuestions, onboardingSections } from "../onboarding";

const FAQ_DATA = [
  {
    section: "Getting started",
    items: [
      { q: "What is MoodFood?", a: "MoodFood is a personal dinner companion that matches you with one safe, perfectly suited meal based on how you feel, your energy, time available, and your food profile. It removes the 'what's for dinner?' decision entirely." },
      { q: "What is the onboarding for?", a: `The in-depth onboarding (${onboardingQuestions.length} questions across ${onboardingSections.length} chapters) builds your food psychology profile, covering your cooking moods, taste phenotype (flavours and textures you love or avoid), emotional eating patterns, comfort food, kitchen setup, habits, values, and nutrition goals. Every answer shapes your recommendations.` },
      { q: "Can I change my profile later?", a: "Yes. Go to Settings → Psychological food profile to edit every answer. Changes take effect immediately on your next recommendation." },
      { q: "How do I reset and start fresh?", a: "Tap Settings → Sign out and replay first launch. This clears all stored data and takes you back to the welcome screen." },
    ],
  },
  {
    section: "Getting a recommendation",
    items: [
      { q: "How does the mood check-in work?", a: "Select your mood, how long you have, and your energy level on the home screen, then tap 'Find tonight's dinner'. Moody scores every recipe against your profile and surfaces the best match." },
      { q: "What does the energy slider do?", a: "Low energy nudges Moody toward one-pot, minimal-prep, easy recipes. High energy opens up more adventurous, multi-step dishes." },
      { q: "Are my allergies always enforced?", a: "Yes, always. Allergens and dietary restrictions set during onboarding are hard filters that are never relaxed, regardless of mood or any other setting." },
      { q: "What does 'Not tonight' do on a pick card?", a: "It hides that recipe for the current session only. It comes back next time." },
    ],
  },
  {
    section: "Food photo & calorie log",
    items: [
      { q: "How do I log a meal with a photo?", a: "Tap the camera button on the Home screen, in the Diary, on a Recipe detail page, or after finishing Cook mode. Add a photo, name the dish, and tap 'Look up' to pull real per-serving numbers from a food database — or type them in yourself. If you're logging a recipe you just cooked, its calories carry over automatically." },
      { q: "Where do the calorie numbers come from?", a: "From an honest source only — never guessed from the photo. They come from a real per-serving lookup in the FatSecret food database matched to the dish you name, from the calories of the recipe you cooked, or from what you enter by hand. A blank field means unknown, never invented." },
      { q: "Can I edit the calorie count?", a: "Yes — every number is editable. Type your own, re-run the database lookup with a more specific dish name, or leave a field blank if it's unknown. Editing a value marks it as your own." },
      { q: "Where are my logged meals stored?", a: "Photo logs are saved on your device in localStorage. They appear in the Food photo log screen (Settings → Food photo log) and feed the 'Today's calories' stat on your home screen." },
    ],
  },
  {
    section: "Cook mode",
    items: [
      { q: "What is cook mode?", a: "A distraction-free step-by-step cooking guide. The screen stays awake, each step shows the active ingredients, and timers can be started inline. Your progress is saved if you leave and come back." },
      { q: "How does cook mode work?", a: "The full method stays on one scrolling page, so you can move naturally between steps without opening tabs." },
    ],
  },
  {
    section: "Household & safety",
    items: [
      { q: "How do household diners work?", a: "Add family members or frequent diners under Settings → Household diners. On the home screen, select who is eating tonight. MoodFood combines every selected person's allergens and dietary requirements, so if anyone in the group has a peanut allergy, no recipe containing peanuts will appear." },
      { q: "What does 'Shared safety is active' mean?", a: "It means you have selected one or more household diners in addition to yourself, and their safety constraints are merged with yours for tonight's recommendations." },
    ],
  },
  {
    section: "Account & subscription",
    items: [
      { q: "What is included in the free trial?", a: "Full access to all features for 7 days: personalised recommendations, cook mode, the food photo log, mood check-ins, health trends, and the community. No payment information is required to start the pilot." },
      { q: "How do I cancel before the trial ends?", a: "Open the notifications panel (bell icon, top right) and tap 'Cancel before trial ends'. For the full production version, cancellation is also available in Settings → Subscription." },
      { q: "What happens to my data if I cancel?", a: "Your recipes, diary, and food photo log remain readable for 7 days after cancellation, then are deleted from our servers. Your local device data remains until you clear it." },
    ],
  },
  {
    section: "Privacy",
    items: [
      { q: "Where is my mood and psychological data stored?", a: "During the local pilot, all data is stored in your browser's localStorage, it never leaves your device. The psychological food profile, raw mood entries, and private diary are never shown to other users." },
      { q: "What can other users see?", a: "Only what you share publicly: your display name, bio, profile photo, and any meal posts you explicitly choose to share in the Community tab. Your mood selections, food psychology profile, and diary are always private." },
    ],
  },
];

export function HelpScreen({ back }: { back: () => void }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="screen">
      <TopBar title="Help & FAQ" back={back} />

      {/* Quick-start tutorial */}
      <div className="help-tutorial">
        <div className="help-tutorial-header">
          <BookMarked size={20} />
          <div>
            <b>Quick start, 5 steps</b>
            <span>Get your first recommendation in under 2 minutes</span>
          </div>
        </div>
        {[
          { n: 1, title: "Complete onboarding", desc: `${onboardingQuestions.length} questions build your taste + psychology profile. More detail = better matches.` },
          { n: 2, title: "Create your account", desc: "Save your profile so it travels with you. Confirm your email to unlock everything." },
          { n: 3, title: "Check in on the home screen", desc: "Pick a mood, set your time and energy, then tap 'Find tonight's dinner'." },
          { n: 4, title: "Cook with Moody", desc: "Open a pick → 'Start cook mode' for step-by-step guidance with timers. Screen stays awake." },
          { n: 5, title: "Log your meal with a photo", desc: "After cooking, tap the camera button. Moody reads the plate and estimates calories + macros." },
        ].map(s => (
          <div className="help-step" key={s.n}>
            <div className="hs-num">{s.n}</div>
            <div><b>{s.title}</b><p>{s.desc}</p></div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div className="help-features">
        {[
          { icon: <Sparkles size={20} />, title: "Moody AI", desc: "Your dinner co-pilot. Tap the floating sparkle button anytime to ask Moody anything, get a pick, rescue a step, or find the easiest safe option." },
          { icon: <Camera size={20} />, title: "Food photo log", desc: "Photograph any meal for an instant calorie + macro estimate. Logged photos feed your health trends and today's calorie total on the home screen." },
          { icon: <ShieldCheck size={20} />, title: "Safety first, always", desc: "Allergen and diet filters are hard constraints. They apply to every recommendation, every household diner, and are never softened by any setting." },
          { icon: <Users size={20} />, title: "Household diners", desc: "Add family members with their own profiles. Select them at check-in and safety constraints merge automatically, no meal reaches the table that's unsafe for anyone at it." },
          { icon: <Activity size={20} />, title: "Health trends", desc: "Tracks your logged diary entries and photo logs across nutrition, dietary variety, eating patterns, and family meal balance. Informational only, never medical advice." },
          { icon: <Dna size={20} />, title: "Food psychology profile", desc: "Powered by the Food Choice Questionnaire (FCQ) and Three-Factor Eating Questionnaire (TFEQ). Your flavour phenotype, emotional triggers, and comfort cues all shape what Moody suggests." },
        ].map(f => (
          <div className="help-feature-card" key={f.title}>
            <div className="hfc-icon">{f.icon}</div>
            <div><b>{f.title}</b><p>{f.desc}</p></div>
          </div>
        ))}
      </div>

      {/* FAQ accordion */}
      <h2 className="help-faq-title">Frequently asked questions</h2>
      {FAQ_DATA.map(section => (
        <div key={section.section} className="faq-section">
          <p className="faq-section-label">{section.section.toUpperCase()}</p>
          {section.items.map(item => (
            <div key={item.q} className={"faq-item" + (open === item.q ? " open" : "")}>
              <button className="faq-q" onClick={() => setOpen(open === item.q ? null : item.q)}>
                <span>{item.q}</span>
                <ChevronRight size={16} className={open === item.q ? "rot90" : ""} />
              </button>
              {open === item.q && <p className="faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      ))}
      <p className="quiet" style={{ marginTop: 16, paddingBottom: 24 }}>MoodFood is a focused pilot. Features described may not yet be fully implemented in the production version.</p>
    </div>
  );
}
