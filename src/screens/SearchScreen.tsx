import { useMemo, useState } from "react";
import { Search, Settings2, ArrowRight } from "lucide-react";
import type { Profile } from "../store";
import type { Recipe } from "../data";
import type { DiaryEntry, SearchRequest } from "../appTypes";
import { SPOON_CUISINES, MEAL_TYPES, SEARCH_DIETS, SORT_OPTIONS, type RecipeFilters } from "../searchFilters";
import { deriveDailySuggestions } from "../lib/dailySuggestions";
import { toggle } from "../lib/toggle";
import { TopBar } from "../components/AppChrome";
import { DailySuggestionCarousel } from "../components/DailySuggestionCarousel";
import { TokenInput } from "../components/TokenInput";
import { moodSearchTags, type Mood } from "@/data/moodTags";
import { buildMoodSearchQuery, getMoodByValue, normalizeRecipeSearchIntent } from "@/lib/moodSearch";

export function SearchScreen({
  profile, diary, saved, catalog, onSearch,
}: {
  profile: Profile;
  diary: DiaryEntry[];
  saved: string[];
  catalog: Recipe[];
  onSearch: (request: SearchRequest) => void;
}) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [diet, setDiet] = useState("Any");
  const [maxTime, setMaxTime] = useState(60);
  const [sort, setSort] = useState(profile.rankingPreference || "Most popular");
  const [include, setInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [maxCalories, setMaxCalories] = useState(0);   // 0 = off
  const [minProtein, setMinProtein] = useState(0);     // 0 = off

  const suggestions = useMemo(
    () => deriveDailySuggestions(diary, saved, catalog, profile),
    // Recompute only when the underlying data changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diary.length, saved.length, catalog.length, profile.diet, profile.allergies.join()],
  );

  const selectedMood = mood ? getMoodByValue(mood) : undefined;

  const activeFilterCount =
    cuisines.length + include.length + exclude.length +
    (mood ? 1 : 0) +
    (type ? 1 : 0) + (diet !== "Any" ? 1 : 0) + (maxTime !== 60 ? 1 : 0) +
    (sort !== (profile.rankingPreference || "Most popular") ? 1 : 0) +
    (maxCalories ? 1 : 0) + (minProtein ? 1 : 0);

  const run = () => {
    const searchQuery = buildMoodSearchQuery({
      mood: mood || undefined,
      cuisine: cuisines.join(" ") || undefined,
      maxCookingTime: maxTime,
      query,
    });
    const intent = normalizeRecipeSearchIntent(searchQuery, type);
    const filters: RecipeFilters = {
      query: intent.query, cuisines,
      type: intent.type || undefined,
      diet: diet === "Any" ? undefined : diet,
      maxReadyTime: maxTime, sort,
      includeIngredients: include, excludeIngredients: exclude,
      maxCalories: maxCalories || undefined,
      minProtein: minProtein || undefined,
    };
    onSearch({ query: intent.query, mood: selectedMood?.label, filters });
  };

  const pickSuggestion = (r: Recipe) => {
    onSearch({ query: r.title, filters: { query: r.title } });
  };

  return <div className="screen">
    <TopBar title="Search recipes" />
    <DailySuggestionCarousel suggestions={suggestions} onPick={pickSuggestion} />
    <div className="ai-search-intro"><Search size={15} /><p>Search with structured filters. Your saved diet, allergies, and exclusions always remain protected.</p></div>
    <div className="filter-block">
      <span className="filter-label">How are you feeling?</span>
      <div className="choice">
        {moodSearchTags.map(m => <button key={m.mood} className={mood === m.mood ? "active" : ""} onClick={() => setMood(prev => prev === m.mood ? "" : m.mood)}>{m.label}</button>)}
      </div>
      {selectedMood && <p className="mood-helper"><b>{selectedMood.label}</b> {selectedMood.description}</p>}
    </div>
    <form className="search-box" onSubmit={e => { e.preventDefault(); run(); }}>
      <Search />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="“Something cozy and high-protein under 30 min”" />
    </form>
    <div className="search-actions">
      <button className={"filter-toggle" + (showFilters ? " open" : "")} onClick={() => setShowFilters(v => !v)}>
        <Settings2 size={15} /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
      </button>
      <button className="primary search-go" onClick={run}>Search <ArrowRight size={15} /></button>
    </div>

    {showFilters && <div className="search-filters">
      <div className="filter-block">
        <span className="filter-label">Sort by</span>
        <div className="choice">{SORT_OPTIONS.map(o => <button key={o.id} className={sort === o.id ? "active" : ""} onClick={() => setSort(o.id)} title={o.hint}>{o.label}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Course (results never mix courses)</span>
        <select className="cuisine-select" value={type} onChange={e => setType(e.target.value)}>
          <option value="">Any course</option>
          {MEAL_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
      <div className="filter-block">
        <span className="filter-label">Cuisine</span>
        <div className="choice">{SPOON_CUISINES.map(c => <button key={c} className={cuisines.includes(c) ? "active" : ""} onClick={() => setCuisines(toggle(cuisines, c))}>{c}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Additional diet filter</span>
        <select className="cuisine-select" value={diet} onChange={e => setDiet(e.target.value)}>
          {SEARCH_DIETS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="filter-block">
        <span className="filter-label">Max cook time: {maxTime} min</span>
        <input type="range" min={10} max={120} step={5} value={maxTime} onChange={e => setMaxTime(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Max calories: {maxCalories ? `${maxCalories} kcal` : "off"}</span>
        <input type="range" min={0} max={1200} step={50} value={maxCalories} onChange={e => setMaxCalories(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Min protein: {minProtein ? `${minProtein} g` : "off"}</span>
        <input type="range" min={0} max={60} step={5} value={minProtein} onChange={e => setMinProtein(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Must include</span>
        <TokenInput tokens={include} setTokens={setInclude} placeholder="e.g. chicken, spinach" />
      </div>
      <div className="filter-block">
        <span className="filter-label">Must exclude</span>
        <TokenInput tokens={exclude} setTokens={setExclude} placeholder="e.g. mushrooms" />
      </div>
      {!!activeFilterCount && <button className="secondary" style={{ width: "100%" }} onClick={() => { setMood(""); setCuisines([]); setType(""); setDiet("Any"); setMaxTime(60); setSort(profile.rankingPreference || "Most popular"); setInclude([]); setExclude([]); setMaxCalories(0); setMinProtein(0); }}>Clear filters</button>}
    </div>}

    <p className="quiet">Your saved allergies and diet always remain hard rules. Search filters can only narrow them further.</p>
  </div>;
}
