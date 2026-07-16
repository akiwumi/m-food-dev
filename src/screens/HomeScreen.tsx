import { useEffect, useMemo, useState } from "react";
import { Sparkles, Check, RotateCcw, ChefHat, Clock3, ShieldCheck, Play, ArrowRight, FlameKindling, Camera, Activity, Users, UserRound, Sliders } from "lucide-react";
import { moods, type Recipe } from "../data";
import { moodVoice } from "../moodVoice";
import { explainPick, type LearnedSignals } from "../recommendation";
import type { Profile, Diner } from "../store";
import { sumNutrition, type FoodPhoto } from "../foodAnalysis";
import { SPOON_CUISINES, SEARCH_DIETS } from "../searchFilters";
import { RESULT_BATCH_SIZE } from "../resultBatches";
import { deriveDailySuggestions } from "../lib/dailySuggestions";
import type { Page, DiaryEntry } from "../appTypes";
import { FALLBACK_FOOD } from "../components/photos";
import { AppHeader } from "../components/AppChrome";
import { PickCard } from "../components/PickCard";
import { DailySuggestionCarousel } from "../components/DailySuggestionCarousel";
import { FoodCamera } from "../components/FoodCamera";

export function HomeScreen({ profile, diary, saved, catalog, mood, setMood, energy, setEnergy, time, setTime, mealCategory, setMealCategory, cuisine, setCuisine, diet, setDiet, results, setResults, beginResults, ranked, curating, hasFetched, loadMore, live, curated, degraded, cuisineRelaxed, retry, open, go, diners, selectedDiners, setSelectedDiners, eaterCount, setEaterCount, openNotifs, unread, addPhoto, onPickSuggestion, toggleSave, signals }: {
  profile: Profile; diary: DiaryEntry[]; saved: string[]; catalog: Recipe[];
  mood: string; setMood: (v: string) => void; energy: number; setEnergy: (v: number) => void; time: number; setTime: (v: number) => void;
  mealCategory: string; setMealCategory: (v: string) => void;
  cuisine: string; setCuisine: (v: string) => void;
  diet: string; setDiet: (v: string) => void;
  results: boolean; setResults: (v: boolean) => void; beginResults: () => void; ranked: Recipe[]; curating?: boolean; hasFetched?: boolean; loadMore?: () => void; live?: boolean; curated?: boolean; degraded?: boolean; cuisineRelaxed?: boolean; retry?: () => void; open: (r: Recipe) => void; go: (p: Page) => void;
  diners: Diner[]; selectedDiners: string[]; setSelectedDiners: (v: string[]) => void;
  eaterCount: number; setEaterCount: (v: number) => void; openNotifs?: () => void; unread?: number;
  addPhoto: (p: FoodPhoto) => void; onPickSuggestion: (r: Recipe) => void; toggleSave: (r: Recipe) => void;
  signals?: LearnedSignals;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const [shownCount, setShownCount] = useState(RESULT_BATCH_SIZE);
  const visible = ranked.filter(r => !rejected.includes(r.id)).slice(0, shownCount);
  const hero = ranked[0];
  const suggestions = useMemo(
    () => deriveDailySuggestions(diary, saved, catalog, profile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diary.length, saved.length, catalog.length, profile.diet, profile.allergies.join()],
  );
  // Reset rejections whenever a fresh set of picks arrives.
  useEffect(() => { setRejected([]); setShownCount(RESULT_BATCH_SIZE); }, [results]);
  const showMore = async () => {
    await loadMore?.();
    setShownCount(count => count + RESULT_BATCH_SIZE);
  };

  // Results view, same layout container, different content
  if (results) return (
    <div className="home-screen">
      <AppHeader profile={profile} openNotifs={openNotifs} unread={unread} openProfile={() => go("account")} />
      {(curating || !hasFetched) ? <div className="thinking-state">
        <div className="thinking-orbit"><Sparkles /><i /><i /><i /></div>
        <span>MOODY IS THINKING</span>
        <h1>Finding {mealCategory || "dinner"} that fits tonight.</h1>
        <p>Reading your mood, {cuisine ? `${cuisine} cuisine, ` : ""}safety rules, {time}-minute limit, and food profile.</p>
        <div className="thinking-lines"><i /><i /><i /></div>
      </div> : <>
      <div className="home-greeting">
        <h1>{mealCategory ? `${mealCategory[0].toUpperCase()}${mealCategory.slice(1)} picks.` : "Tonight’s picks."}</h1>
        {moodVoice(mood, energy) && <p className="moody-voice"><Sparkles size={14} /> {moodVoice(mood, energy)}</p>}
        <p>{energy < 50 ? "Low-effort" : "Interesting"}, {mood.toLowerCase()}{mealCategory ? `, ${mealCategory}` : ""}{cuisine ? `, ${cuisine}` : ""}, within {time} min · {eaterCount} {eaterCount === 1 ? "person" : "people"}</p>
        {cuisineRelaxed && visible.length > 0 && <p className="source-note">No {cuisine} recipes available right now{degraded ? " — live recipe search is at its daily limit" : ""}. Showing other picks that fit your mood.</p>}
        {degraded && !cuisineRelaxed && visible.length > 0 && <p className="source-note">Live recipe search is at its daily limit — showing backup picks for now.</p>}
        {live && !degraded && !cuisineRelaxed && curated && <p className="source-note live"><Check size={13} /> Moody chose these for you.</p>}
        {live && !degraded && !cuisineRelaxed && !curated && <p className="source-note live"><Check size={13} /> Live picks, matched to your mood.</p>}
        {!live && hasFetched && visible.length > 0 && <p className="source-note">Offline picks from your cookbook — live recipes are unavailable right now.</p>}
      </div>
      {visible.length ? (
        <div style={{ padding: "0 16px", display: "grid", gap: 14 }}>
          {visible.map(r => <PickCard key={r.id} recipe={r} servings={eaterCount} open={() => open(r)} reject={() => setRejected([...rejected, r.id])} save={() => toggleSave(r)} saved={saved.includes(r.id)} why={explainPick(r, profile, mood, energy, time, signals)} />)}
          {loadMore && (
            <button className="secondary" style={{ width: "100%" }} disabled={curating} onClick={showMore}>
              {curating ? "Finding more…" : <>Show me 5 more <RotateCcw size={16} /></>}
            </button>
          )}
        </div>
      ) : (
        <div style={{ margin: "0 16px" }} className="empty-state">
          <ChefHat />
          <h2>{rejected.length ? "Want a fresh set?" : "No results from Moody"}</h2>
          <p>{rejected.length
            ? "None of those landed, Moody can pull a completely new batch that still respects your profile and safety rules."
            : "Moody couldn't find matching recipes right now. Try adjusting your mood, time, or cuisine and search again."}</p>
          {rejected.length && loadMore
            ? <button className="primary" disabled={curating} onClick={showMore}>{curating ? "Finding more…" : <>Show me 5 more <RotateCcw size={16} /></>}</button>
            : <>{retry && <button className="primary" onClick={retry} style={{ marginBottom: 8 }}><RotateCcw size={16} /> Retry</button>}<button className="secondary" onClick={() => setResults(false)}>Adjust check-in</button></>}
        </div>
      )}
      <div style={{ padding: "14px 16px 0" }}>
        <button className="secondary" style={{ width: "100%" }} onClick={() => setResults(false)}>← Change meal choice</button>
      </div>
      </>}
    </div>
  );

  return (
    <div className="home-screen">
      {/* Header: avatar/logo + greeting + bell, cloned from reference */}
      <AppHeader profile={profile} openNotifs={openNotifs} unread={unread} openProfile={() => go("account")} />

      <div className="home-greeting">
        <h1>How does dinner feel tonight?</h1>
        <p>Tap how you feel. Moody chooses one safe answer and keeps backups ready — refine only if you want to.</p>
      </div>

      {/* ── Hero recipe photo (45vh, rounded, like the fitness hero image) ── */}
      <div className="home-hero" onClick={hero ? () => open(hero) : undefined}>
        <img src={hero?.image || FALLBACK_FOOD} alt={hero?.title || "Tonight’s dinner"} />
        <div className="hveil" />
        {/* Frosted glass chips top-left, copied from reference overlay chips */}
        <div className="hero-chips">
          <span className="hero-chip"><Clock3 size={13} /> {time} min</span>
          <span className="hero-chip">{mood}</span>
          {selectedDiners.some(id => id !== "self") && <span className="hero-chip"><ShieldCheck size={13} /> Shared safety</span>}
        </div>
        {/* Recipe name + sub bottom-left */}
        {hero ? (
          <>
            <div className="hero-info">
              <b>{hero.title}</b>
              <span>{hero.reason}</span>
            </div>
            {/* Blue circular arrow, "Start" button from reference */}
            <button className="hero-go" aria-label="View recipe" onClick={e => { e.stopPropagation(); open(hero); }}>
              <Play size={18} fill="currentColor" />
            </button>
          </>
        ) : (
          <div className="hero-no-pick">
            <div><ChefHat size={32} /><p>Complete your check-in below to get a pick</p></div>
          </div>
        )}
      </div>

      {/* ── Daily suggestions carousel ── */}
      <div style={{ padding: "14px 16px 0" }}>
        <DailySuggestionCarousel suggestions={suggestions} onPick={onPickSuggestion} showHero={false} />
      </div>

      {/* ── Check-in card: one question → one answer. Mood alone is enough. ── */}
      <div className="home-checkin">
        <span className="section-label">How are you feeling?</span>
        {/* Tapping a mood is the whole check-in: it picks tonight's dinner. */}
        <div className="mood-pills">
          {moods.map(v => (
            <button key={v} className={mood === v ? "active" : ""} onClick={() => { setMood(v); beginResults(); }}>{v}</button>
          ))}
        </div>
        <p className="checkin-hint">Tap a mood and Moody picks one safe dinner. Everything below is optional.</p>

        <button
          className="primary"
          style={{ width: "100%", marginTop: 14, minHeight: 54 }}
          onClick={beginResults}
        >
          Choose tonight’s dinner <ArrowRight size={18} />
        </button>

        {/* Time · energy · meal · cuisine · diet — off the critical path, one tap away. */}
        <details className="home-refine">
          <summary><Sliders size={15} /> Refine <span>time · energy · meal · cuisine · diet</span></summary>
          <div className="home-refine-body">
            <span className="section-label">Time available</span>
            <div className="time-pills">
              {[15, 20, 30, 45, 60].map(v => (
                <button key={v} className={time === v ? "active" : ""} onClick={() => setTime(v)}>
                  {v}
                </button>
              ))}
            </div>
            <div className="range-label" style={{ marginTop: 6 }}>
              <span>15 min</span><span style={{ color: "var(--blue-deep)", fontWeight: 700 }}>{time} min selected</span><span>60 min</span>
            </div>

            <span className="section-label">Energy level: {energy}%</span>
            <input type="range" value={energy} onChange={e => setEnergy(+e.target.value)} style={{ width: "100%" }} />
            <div className="range-label"><span>Low: easy recipes</span><span>High: adventurous</span></div>

            <span className="section-label">Meal type</span>
            <div className="meal-category-pills">
              {["Breakfast", "Lunch", "Dinner", "Snacks", "Dessert"].map(cat => (
                <button
                  key={cat}
                  className={mealCategory === cat.toLowerCase() ? "active" : ""}
                  onClick={() => setMealCategory(mealCategory === cat.toLowerCase() ? "" : cat.toLowerCase())}
                >{cat}</button>
              ))}
            </div>

            <span className="section-label" style={{ marginTop: 14 }}>Cuisine style</span>
            <select
              className="cuisine-select"
              value={cuisine}
              onChange={e => setCuisine(e.target.value)}
            >
              <option value="">Any cuisine</option>
              {SPOON_CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <span className="section-label" style={{ marginTop: 14 }}>Dietary preference</span>
            <select
              className="cuisine-select"
              value={diet}
              onChange={e => setDiet(e.target.value)}
            >
              {SEARCH_DIETS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </details>
      </div>

      <details className="home-more">
        <summary>More tools</summary>
        {/* ── Stat cards, today’s logged nutrition + Moody’s pick ── */}
        {(() => {
          const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
          const todayLogs = profile.photoLogs.filter(l => l.when.startsWith(today));
          const totals = sumNutrition(todayLogs);
          return (
            <div className="home-stats">
              <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => go("food-log")}>
                <div className="sc-icon"><FlameKindling size={20} /></div>
                <div className="sc-label">Today’s calories</div>
                {totals.calories > 0
                  ? <div><span className="sc-value">{totals.calories}</span><span className="sc-unit"> kcal</span></div>
                  : <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Log a meal →</div>}
              </div>
              <div className="stat-card">
                <div className="sc-icon"><Clock3 size={20} /></div>
                <div className="sc-label">{hero ? "Cook time" : "Tonight’s pick"}</div>
                {hero
                  ? <div><span className="sc-value">{hero.time}</span><span className="sc-unit"> min</span></div>
                  : <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Check in above</div>}
              </div>
            </div>
          );
        })()}

        {/* ── Photo log shortcut ── */}
        <div className="home-photo-shortcut">
          <FoodCamera label="Log a meal with photo" onSave={addPhoto} allergies={profile.allergies} />
        </div>

        {/* ── Quick-link cards, styled like the bottom rows in reference ── */}
        <div className="home-links">
          <button className="home-link-card" onClick={() => go("food-log")}>
            <span className="hlc-icon"><Camera size={20} /></span>
            <span className="hlc-text"><b>Food photo log</b><small>Photograph meals for calorie estimates</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
          <button className="home-link-card" onClick={() => go("health")}>
            <span className="hlc-icon"><Activity size={20} /></span>
            <span className="hlc-text"><b>Your health trends</b><small>Nutrition, variety, and patterns</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
          <button className="home-link-card" onClick={() => go("community")}>
            <span className="hlc-icon"><Users size={20} /></span>
            <span className="hlc-text"><b>MoodFood community</b><small>Share cooks, recipes, and tips</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
          <button className="home-link-card" onClick={() => go("settings")}>
            <span className="hlc-icon"><UserRound size={20} /></span>
            <span className="hlc-text"><b>Your food profile</b><small>Safety, moods, and preferences</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
        </div>
      </details>
    </div>
  );
}
