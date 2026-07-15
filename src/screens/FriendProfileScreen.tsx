import { useEffect, useState } from "react";
import { UserPlus, Check, Clock, Share2, Star, ChefHat, Heart, X, Sparkles } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { Avatar } from "../components/misc";
import {
  getMemberProfile, getMemberCooked, getMemberFavorites,
  sendFriendRequest, listFriends, recommendFriend, buildFoodPersonalityCard,
  type MemberProfile, type MemberRecipe, type Friend,
} from "../community";
import type { Profile } from "../store";

// Curated food-profile fields to surface, in order, with friendly labels.
const FOOD_FIELDS: [string, string][] = [
  ["cuisines", "Loves cooking"], ["proteins", "Go-to proteins"], ["vegetables", "Veg they reach for"],
  ["carbs", "Carb bases"], ["flavorLikes", "Flavours they love"], ["flavorAvoids", "Flavours they avoid"],
  ["textureLikes", "Textures they like"], ["dislikedIngredients", "Won't cook with"],
  ["nutritionGoals", "Working toward"], ["foodValues", "What drives their choices"], ["dietReligious", "Dietary practice"],
];

export function FriendProfileScreen({ memberId, back, openRecipeRef, viewerProfile }: {
  memberId: string; back: () => void; openRecipeRef: (ref: string) => void; viewerProfile?: Profile;
}) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [cooked, setCooked] = useState<MemberRecipe[]>([]);
  const [favorites, setFavorites] = useState<MemberRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"favorites" | "cooked">("favorites");
  const [added, setAdded] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recommendedTo, setRecommendedTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      const [p, c, f] = await Promise.all([getMemberProfile(memberId), getMemberCooked(memberId), getMemberFavorites(memberId)]);
      if (!alive) return;
      setProfile(p); setCooked(c); setFavorites(f); setLoading(false);
    })();
    return () => { alive = false; };
  }, [memberId]);

  const openRecommend = async () => { setRecommendOpen(true); if (!friends.length) setFriends(await listFriends()); };
  const doRecommend = async (friendId: string) => {
    setRecommendedTo(s => new Set(s).add(friendId));
    await recommendFriend(memberId, friendId);
  };

  const food = profile?.foodProfile ?? {};
  const personality = buildFoodPersonalityCard(food, viewerProfile ?? {});
  const arr = (k: string): string[] => (Array.isArray(food[k]) ? (food[k] as string[]).filter(Boolean) : []);
  const diet = typeof food.diet === "string" ? food.diet : "";
  const spice = typeof food.spiceTolerance === "number" ? food.spiceTolerance : undefined;

  if (loading) return <div className="screen"><TopBar title="Profile" back={back} /><p className="quiet" style={{ margin: 24 }}>Loading…</p></div>;
  if (!profile) return <div className="screen"><TopBar title="Profile" back={back} /><div className="empty-state" style={{ margin: 24 }}><X /><h2>Profile unavailable</h2><p>This profile is private, or you need to be friends to view it.</p></div></div>;

  const list = tab === "favorites" ? favorites : cooked;

  return (
    <div className="screen friend-profile">
      <TopBar title={profile.name || "Profile"} back={back} />

      <section className="fp-hero">
        <Avatar name={profile.name} image={profile.avatar} />
        <h1>{profile.name}</h1>
        {profile.location && <span className="fp-loc">{profile.location}</span>}
        {profile.bio && <p className="fp-bio">{profile.bio}</p>}
        <div className="fp-stats"><span><b>{profile.favoriteCount}</b> favourites</span><span><b>{profile.cookedCount}</b> cooked</span></div>
        <div className="fp-actions">
          {profile.isFriend
            ? <span className="friend-tag"><Check size={15} />Friends</span>
            : added
              ? <span className="friend-tag muted"><Clock size={15} />Requested</span>
              : <button className="primary sm" onClick={() => { setAdded(true); void sendFriendRequest(memberId); }}><UserPlus size={15} />Add friend</button>}
          <button className="secondary sm" onClick={openRecommend}><Share2 size={15} />Recommend</button>
        </div>
      </section>

      <section className="food-personality-card">
        <div className="fpc-head">
          <Sparkles size={17} />
          <div><span>Shared food personality</span><h2>{personality.phenotype}</h2></div>
        </div>
        <div className="fpc-grid">
          <div><small>Comfort cues</small><div className="chips">{personality.comfortCues.map(v => <span className="chip" key={v}>{v}</span>)}</div></div>
          <div><small>Signature moods</small><div className="chips">{personality.signatureMoods.map(v => <span className="chip" key={v}>{v}</span>)}</div></div>
        </div>
        {personality.sharedSignals.length > 0 && <div className="fpc-overlap"><b>{personality.overlap}</b><div className="chips">{personality.sharedSignals.map(v => <span className="chip" key={v}>{v}</span>)}</div></div>}
        <p>{personality.privacyNote}</p>
      </section>

      {(diet || spice !== undefined || FOOD_FIELDS.some(([k]) => arr(k).length)) && (
        <section className="fp-block">
          <h2>Profile signals</h2>
          {diet && <div className="fp-field"><span className="fp-label">Diet</span><div className="chips"><span className="chip">{diet}</span></div></div>}
          {spice !== undefined && <div className="fp-field"><span className="fp-label">Spice tolerance</span><div className="spice-bar"><div style={{ width: `${spice}%` }} /></div></div>}
          {FOOD_FIELDS.map(([k, label]) => {
            const vals = arr(k);
            if (!vals.length) return null;
            return <div className="fp-field" key={k}><span className="fp-label">{label}</span><div className="chips">{vals.slice(0, 12).map(v => <span className="chip" key={v}>{v}</span>)}</div></div>;
          })}
        </section>
      )}

      <section className="fp-block">
        <div className="fp-tabs">
          <button className={tab === "favorites" ? "active" : ""} onClick={() => setTab("favorites")}><Heart size={15} />Favourites</button>
          <button className={tab === "cooked" ? "active" : ""} onClick={() => setTab("cooked")}><ChefHat size={15} />Cooked & reviewed</button>
        </div>
        {list.length === 0
          ? <p className="quiet" style={{ padding: "8px 0" }}>{tab === "favorites" ? "No favourites shared yet." : "No cooked meals shared yet."}</p>
          : <div className="fp-recipes">{list.map((r, i) => (
              <button className="fp-recipe" key={`${r.recipeRef}-${i}`} onClick={() => r.recipeRef && openRecipeRef(r.recipeRef)}>
                {r.image ? <img src={r.image} alt="" /> : <div className="fp-recipe-noimg"><ChefHat size={20} /></div>}
                <div><b>{r.title}</b>{r.cuisine && <small>{r.cuisine}</small>}{typeof r.rating === "number" && <span className="fp-rating">{Array.from({ length: r.rating }).map((_, n) => <Star key={n} size={11} fill="currentColor" />)}</span>}</div>
              </button>
            ))}</div>}
      </section>

      {recommendOpen && (
        <div className="panel-bg" onClick={() => setRecommendOpen(false)}>
          <div className="recommend-sheet" onClick={e => e.stopPropagation()}>
            <div className="rs-handle" />
            <h3>Recommend {profile.name} to…</h3>
            {friends.length === 0
              ? <p className="quiet">Add some friends first, then you can recommend people to them.</p>
              : friends.map(f => (
                <div className="friend-row" key={f.id}>
                  <Avatar name={f.name} image={f.avatar} /><b>{f.name}</b>
                  {recommendedTo.has(f.id)
                    ? <span className="friend-tag"><Check size={14} />Sent</span>
                    : <button className="secondary sm" onClick={() => doRecommend(f.id)}>Recommend</button>}
                </div>
              ))}
            <button className="ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => setRecommendOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
