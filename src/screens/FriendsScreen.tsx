import { useEffect, useState } from "react";
import { Search, UserPlus, Check, X, UserMinus, Users, Clock, Sparkles } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { Avatar } from "../components/misc";
import {
  searchUsers, sendFriendRequest, respondFriendRequest, removeFriend,
  listFriends, listFriendRequests, suggestFriends, listRecommendations,
  type UserResult, type Friend, type FriendRequest, type Relationship,
  type Suggestion, type Recommendation,
} from "../community";

// Facebook-style people search + friend management. Search a name → send a
// request; accept/decline incoming requests; see your friends; get suggestions
// from a shared food profile and recommendations from friends. Backed by the
// Supabase social RPCs (migrations 018, 021). Tapping anyone opens their profile.
export function FriendsScreen({ back, openMember }: { back: () => void; openMember: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [rel, setRel] = useState<Record<string, Relationship>>({}); // local overrides after actions

  const loadFriends = async () => {
    const [f, r, s, rec] = await Promise.all([listFriends(), listFriendRequests(), suggestFriends(), listRecommendations()]);
    setFriends(f); setRequests(r); setSuggestions(s); setRecommendations(rec);
  };
  useEffect(() => { void loadFriends(); }, []);

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      setResults(await searchUsers(q));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const relationshipOf = (u: UserResult): Relationship => rel[u.id] ?? u.relationship;

  const addById = async (id: string) => {
    setRel(m => ({ ...m, [id]: "pending_out" }));
    await sendFriendRequest(id);
  };
  const respond = async (userId: string, accept: boolean) => {
    setRel(m => ({ ...m, [userId]: accept ? "friends" : "none" }));
    await respondFriendRequest(userId, accept);
    await loadFriends();
  };
  const unfriend = async (userId: string) => {
    setRel(m => ({ ...m, [userId]: "none" }));
    await removeFriend(userId);
    setFriends(fs => fs.filter(f => f.id !== userId));
  };

  const incoming = requests.filter(r => r.direction === "incoming");

  return (
    <div className="screen friends">
      <TopBar title="Friends" back={back} />

      <section className="friend-search">
        <div className="fs-input">
          <Search size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people by name" autoFocus />
        </div>
        {query.trim() && (
          <div className="fs-results">
            {searching && <p className="quiet">Searching…</p>}
            {!searching && results.length === 0 && <p className="quiet">No one found by that name.</p>}
            {results.map(u => {
              const r = relationshipOf(u);
              return (
                <div className="friend-row" key={u.id}>
                  <button className="friend-open" onClick={() => openMember(u.id)}><Avatar name={u.name} image={u.avatar} /><b>{u.name}</b></button>
                  {r === "friends" && <span className="friend-tag"><Check size={14} />Friends</span>}
                  {r === "pending_out" && <span className="friend-tag muted"><Clock size={14} />Requested</span>}
                  {r === "pending_in" && <button className="primary sm" onClick={() => respond(u.id, true)}><Check size={15} />Accept</button>}
                  {r === "none" && <button className="secondary sm" onClick={() => addById(u.id)}><UserPlus size={15} />Add</button>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {!query.trim() && (
        <>
          {incoming.length > 0 && (
            <section className="friend-block">
              <h2>Friend requests</h2>
              {incoming.map(r => (
                <div className="friend-row" key={r.id}>
                  <button className="friend-open" onClick={() => openMember(r.id)}><Avatar name={r.name} image={r.avatar} /><b>{r.name}</b></button>
                  <button className="primary sm" onClick={() => respond(r.id, true)} aria-label={`Accept ${r.name}`}><Check size={15} /></button>
                  <button className="secondary sm" onClick={() => respond(r.id, false)} aria-label={`Decline ${r.name}`}><X size={15} /></button>
                </div>
              ))}
            </section>
          )}

          {recommendations.length > 0 && (
            <section className="friend-block">
              <h2>Recommended to you</h2>
              {recommendations.map(rec => {
                const r = rel[rec.recommendedId] ?? rec.relationship;
                return (
                  <div className="friend-row" key={rec.recommendedId}>
                    <button className="friend-open" onClick={() => openMember(rec.recommendedId)}>
                      <Avatar name={rec.recommendedName} image={rec.recommendedAvatar} />
                      <span className="fr-text"><b>{rec.recommendedName}</b><small>{rec.recommenderName} thinks you'd connect</small></span>
                    </button>
                    {r === "pending_out" ? <span className="friend-tag muted"><Clock size={14} />Requested</span>
                      : <button className="secondary sm" onClick={() => addById(rec.recommendedId)}><UserPlus size={15} />Add</button>}
                  </div>
                );
              })}
            </section>
          )}

          {suggestions.length > 0 && (
            <section className="friend-block">
              <h2><Sparkles size={15} /> Suggested for you</h2>
              <p className="fb-sub">People with a similar taste in food.</p>
              {suggestions.map(s => {
                const r = rel[s.id];
                return (
                  <div className="friend-row" key={s.id}>
                    <button className="friend-open" onClick={() => openMember(s.id)}>
                      <Avatar name={s.name} image={s.avatar} />
                      <span className="fr-text"><b>{s.name}</b>{s.sharedCuisines > 0 && <small>{s.sharedCuisines} shared cuisine{s.sharedCuisines > 1 ? "s" : ""}</small>}</span>
                    </button>
                    {r === "pending_out" ? <span className="friend-tag muted"><Clock size={14} />Requested</span>
                      : <button className="secondary sm" onClick={() => addById(s.id)}><UserPlus size={15} />Add</button>}
                  </div>
                );
              })}
            </section>
          )}

          <section className="friend-block">
            <h2>Your friends {friends.length > 0 && <span className="count">{friends.length}</span>}</h2>
            {friends.length === 0
              ? <div className="empty-state" style={{ margin: "12px 0" }}><Users /><p>Search for people by name to add your first friends.</p></div>
              : friends.map(f => (
                <div className="friend-row" key={f.id}>
                  <button className="friend-open" onClick={() => openMember(f.id)}><Avatar name={f.name} image={f.avatar} /><b>{f.name}</b></button>
                  <button className="ghost sm" onClick={() => unfriend(f.id)} aria-label={`Remove ${f.name}`}><UserMinus size={15} /></button>
                </div>
              ))}
          </section>
        </>
      )}
    </div>
  );
}
