import { Sparkles, Heart, Clock3, Search, Home } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { RecipeImage } from "../RecipeImage";
import { stepImageSources } from "../cooking";
import type { Recipe } from "../data";
import type { SearchRequest } from "../appTypes";
import type { RecipeFilters } from "../searchFilters";

function describeFilters(filters: RecipeFilters): string {
  const parts: string[] = [];
  if (filters.cuisines?.length) parts.push(filters.cuisines.join(" or "));
  if (filters.type) parts.push(filters.type);
  const diet = filters.diet;
  if (diet && !["any", "anything", "everything"].includes(diet.toLowerCase())) parts.push(diet.toLowerCase());
  return parts.join(" + ");
}

export function SearchResultsScreen({ results, loading, request, relaxed, degraded, more, home, search, open, saved, toggleSave }: { results: Recipe[]; loading: boolean; request: SearchRequest; relaxed?: boolean; degraded?: boolean; more: () => void; home: () => void; search: () => void; open: (recipe: Recipe) => void; saved: string[]; toggleSave: (recipe: Recipe) => void }) {
  const filterDesc = describeFilters(request.filters);
  const providers = [...new Set(results.map(recipe => recipe.provider).filter(Boolean))];
  return <div className="screen">
    <TopBar title="Results" />
    <div className="results-summary"><span>{request.filters.type ? `${request.filters.type.toUpperCase()} ONLY` : "FILTERED SEARCH"}</span><h1>{request.query || "Recipes matching your filters"}</h1><p>{results.length} unique options shown · up to {request.filters.maxReadyTime ?? 60} min{providers.length ? ` · Live from ${providers.join(" + ")}` : ""}</p></div>
    {relaxed && filterDesc && <div className="search-relaxed-notice"><p>No {filterDesc} recipes found — showing your closest diet-safe options instead. <button onClick={search}>Adjust filters</button></p></div>}
    {degraded && !relaxed && <div className="search-relaxed-notice"><p>Live recipe search is at its daily limit — showing backup recipes for now{filterDesc ? `, so these may not all match ${filterDesc}` : ""}. Exact matches return once it resets. <button onClick={search}>Adjust filters</button></p></div>}
    {loading && !results.length
      ? <div className="thinking-state"><div className="thinking-orbit"><Sparkles /><i /><i /><i /></div><span>SEARCHING</span><h1>Checking every hard rule.</h1><p>Diet, course, time, ingredients, and duplicates are being verified.</p></div>
      : results.length
        ? <div className="search-grid">{results.map(r => {
            const isSaved = saved.includes(r.id);
            return <article key={r.id}><RecipeImage sources={stepImageSources(undefined, r.image)} alt={r.title} /><button className={`search-save${isSaved ? " saved" : ""}`} aria-pressed={isSaved} aria-label={isSaved ? `Saved ${r.title}` : `Save ${r.title}`} onClick={() => toggleSave(r)}><Heart fill={isSaved ? "currentColor" : "none"} /></button><div><h2>{r.title}</h2><p>{r.reason}</p><span><Clock3 size={13} /> {r.time} min · {r.difficulty}</span><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>;
          })}</div>
        : <div className="empty-state"><Search /><h2>{filterDesc ? `No ${filterDesc} recipes found` : "No exact matches"}</h2><p>{filterDesc ? "Nothing matches that combination. Remove one filter and try again — your diet and allergy rules are always kept." : "Adjust one filter and search again. Your saved diet and allergies remain protected."}</p></div>}
    <div className="results-actions"><button className="primary" onClick={more} disabled={loading}>{loading ? "Finding 5 more…" : "Show 5 more options"}</button><button className="secondary" onClick={search}>Change search</button><button className="secondary" onClick={home}><Home size={17} />Return home</button></div>
  </div>;
}

export function EmptyResultsScreen({ home, search }: { home: () => void; search: () => void }) {
  return <div className="screen">
    <TopBar title="Results" />
    <div className="empty-state"><Search /><h2>No results yet</h2><p>Start a search or find tonight's dinner to see recommendations here.</p></div>
    <div className="results-actions"><button className="primary" onClick={search}><Search size={17} />Search recipes</button><button className="secondary" onClick={home}><Home size={17} />Return home</button></div>
  </div>;
}
