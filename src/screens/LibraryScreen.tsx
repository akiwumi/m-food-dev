import { Trash2, Heart, Share2 } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import type { Recipe } from "../data";

export function LibraryScreen({ title, source, open, remove, share }: { title: string; source: Recipe[]; open: (r: Recipe) => void; remove?: (r: Recipe) => void; share?: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title={title} /><div className="search-grid">{source.length ? source.map(r => <article key={r.id}>{remove && <button className="remove-saved" aria-label={`Remove ${r.title} from saved`} onClick={() => remove(r)}><Trash2 size={17} /></button>}<img src={r.image} alt="" /><div><h2>{r.title}</h2><p>{r.reason}</p><div className="library-actions"><button className="primary" onClick={() => open(r)}>View recipe</button>{share && <button className="secondary icon-only" aria-label={`Share ${r.title} to community`} onClick={() => share(r)}><Share2 size={17} /></button>}</div></div></article>) : <div className="empty-state"><Heart /><h2>No saved recipes yet</h2><p>Save recipes that feel like good future answers.</p></div>}</div></div>;
}
