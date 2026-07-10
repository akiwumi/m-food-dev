import { TopBar } from "../../components/AppChrome";
import { Moody } from "../../components/Moody";
import { ProfileEditor, EditableCues } from "../../components/misc";
import { optionsFor } from "../../onboarding";
import { moods } from "../../data";
import type { Profile } from "../../store";

export function PsychProfileScreen({ profile, save, back }: { profile: Profile; save: (p: Profile) => void; back: () => void }) {
  const update = (patch: Partial<Profile>) => save({ ...profile, ...patch });
  return <div className="screen psych-profile"><TopBar title="Your food psychology" back={back} /><section className="psych-summary"><Moody /><div><span>LIVING PROFILE</span><h1>What food means to you.</h1><p>Moody uses this alongside your mood, energy, history, and safety preferences. You own it, and you can change it anytime. Everything you set during onboarding lives here.</p></div></section>

    <ProfileEditor title="Your relationship with food" text="The broad intention Moody should protect."><textarea value={profile.foodRelationship} onChange={e => update({ foodRelationship: e.target.value })} /></ProfileEditor>

    <h2 className="psych-divider">Your palate</h2>
    <ProfileEditor title="Flavors you love" text="The tastes that reliably sound good."><EditableCues values={profile.flavorLikes} suggestions={optionsFor("flavor-likes")} save={flavorLikes => update({ flavorLikes })} /></ProfileEditor>
    <ProfileEditor title="Flavors you avoid" text="Tastes Moody should dial down."><EditableCues values={profile.flavorAvoids} suggestions={optionsFor("flavor-avoids")} save={flavorAvoids => update({ flavorAvoids })} /></ProfileEditor>
    <ProfileEditor title="Textures you reach for" text="Mouthfeels that make a meal feel right."><EditableCues values={profile.textureLikes} suggestions={optionsFor("texture-likes")} save={textureLikes => update({ textureLikes })} /></ProfileEditor>
    <ProfileEditor title="Textures that put you off" text="Aversions Moody will quietly route around."><EditableCues values={profile.textureAvoids} suggestions={optionsFor("texture-avoids")} save={textureAvoids => update({ textureAvoids })} /></ProfileEditor>
    <ProfileEditor title="Spice tolerance" text="How much heat you actually enjoy."><input type="range" value={profile.spiceTolerance} onChange={e => update({ spiceTolerance: +e.target.value })} /><div className="range-label"><span>Avoid heat</span><b>{profile.spiceTolerance}%</b><span>Bring the fire</span></div></ProfileEditor>
    <ProfileEditor title="Proteins you enjoy" text="What you happily build a plate around."><EditableCues values={profile.proteins} suggestions={optionsFor("proteins")} save={proteins => update({ proteins })} /></ProfileEditor>
    <ProfileEditor title="Cuisines you love" text="Gentle boosts toward the kitchens you enjoy."><EditableCues values={profile.cuisines} suggestions={optionsFor("cuisines")} save={cuisines => update({ cuisines })} /></ProfileEditor>
    <ProfileEditor title="Won't eat" text="Strong dislikes (not allergies). Moody steers recipes around these."><EditableCues values={profile.dislikedIngredients} suggestions={optionsFor("dislikes")} save={dislikedIngredients => update({ dislikedIngredients })} /></ProfileEditor>

    <h2 className="psych-divider">How you relate to food</h2>
    <ProfileEditor title="What drives your food choices" text="The motives that pull you, often several at once."><EditableCues values={profile.foodValues} suggestions={optionsFor("food-values")} save={foodValues => update({ foodValues })} /></ProfileEditor>
    <ProfileEditor title="How you tend to eat" text="Patterns, not rules. They help Moody match your rhythm."><EditableCues values={profile.eatingHabits} suggestions={optionsFor("eating-habits")} save={eatingHabits => update({ eatingHabits })} /></ProfileEditor>
    <ProfileEditor title="What shifts your eating" text="Emotions that change your cravings."><EditableCues values={profile.emotionalTriggers} suggestions={optionsFor("emotional-triggers")} save={emotionalTriggers => update({ emotionalTriggers })} /></ProfileEditor>
    <ProfileEditor title="Why you cook" text="The role cooking plays for you."><EditableCues values={profile.cookingMotivations} suggestions={optionsFor("cooking-motivations")} save={cookingMotivations => update({ cookingMotivations })} /></ProfileEditor>

    <h2 className="psych-divider">Comfort & goals</h2>
    <ProfileEditor title="Your comfort foods" text="What you turn to when a meal needs to feel like a hug."><EditableCues values={profile.comfortFoods} suggestions={optionsFor("comfort-foods")} save={comfortFoods => update({ comfortFoods })} /></ProfileEditor>
    <ProfileEditor title="What comfort feels like" text="Qualities, beyond any one dish, that signal comfort."><EditableCues values={profile.comfortCues} suggestions={optionsFor("comfort-cues")} save={comfortCues => update({ comfortCues })} /></ProfileEditor>
    <ProfileEditor title="What drains you" text="Moody will gently penalize these on low-energy nights."><EditableCues values={profile.avoidCues} suggestions={optionsFor("energy-drainers")} save={avoidCues => update({ avoidCues })} /></ProfileEditor>
    <ProfileEditor title="Working toward" text="Gentle nudges, never pressure. Informational only."><EditableCues values={profile.nutritionGoals} suggestions={optionsFor("nutrition-goals")} save={nutritionGoals => update({ nutritionGoals })} /></ProfileEditor>
    <ProfileEditor title="Novelty appetite" text="How far Moody should gently stretch your usual choices."><input type="range" value={profile.novelty} onChange={e => update({ novelty: +e.target.value })} /><div className="range-label"><span>Keep it familiar</span><b>{profile.novelty}%</b><span>Surprise me</span></div></ProfileEditor>

    <ProfileEditor title="Your personal mood meanings" text="These notes are used the moment you check in feeling that way."><div className="mood-defs">{moods.map(m => <label key={m}><b>{m}</b><input value={profile.moodNeeds[m] || ""} onChange={e => update({ moodNeeds: { ...profile.moodNeeds, [m]: e.target.value } })} placeholder="Add what usually helps..." /></label>)}</div></ProfileEditor>
  </div>;
}
