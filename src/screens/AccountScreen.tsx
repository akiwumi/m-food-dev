import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { AvatarResizeEditor } from "../components/AvatarResizeEditor";
import { ProfileEditor, Choice } from "../components/misc";
import { IMAGE_FILE_ACCEPT, readSafeImage, cleanText } from "../security";
import { uploadAvatar } from "../community";
import type { Profile, SocialPost } from "../store";

export function AccountScreen({ profile, save, posts, back, cancelAccount }: { profile: Profile; save: (p: Profile) => void; posts: SocialPost[]; back: () => void; cancelAccount: () => Promise<{ ok: boolean; error?: string }> }) {
  const update = (patch: Partial<Profile>) => save({ ...profile, ...patch });
  const [uploadError, setUploadError] = useState("");
  const [pendingAvatar, setPendingAvatar] = useState("");
  const upload = async (file?: File) => {
    if (!file) return;
    try {
      setPendingAvatar(await readSafeImage(file));
      setUploadError("");
    } catch (error) { setUploadError((error as Error).message); }
  };
  const saveAvatar = async (dataUrl: string) => {
    try {
      update({ avatar: dataUrl }); // instant local preview
      setPendingAvatar("");
      setUploadError("");
      // With a real backend, push to storage so the photo shows in community + search.
      const url = await uploadAvatar(dataUrl);
      if (url) update({ avatar: url });
    } catch (error) { setUploadError((error as Error).message); }
  };
  return <div className="screen account"><TopBar title="Your account" back={back} /><section className="account-hero"><label>{profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span>{profile.name.slice(0, 2).toUpperCase()}</span>}<i><Camera size={16} /></i><input type="file" accept={IMAGE_FILE_ACCEPT} onChange={e => upload(e.target.files?.[0])} /></label>{uploadError && <em>{uploadError}</em>}{pendingAvatar && <AvatarResizeEditor image={pendingAvatar} name={profile.name} onCancel={() => setPendingAvatar("")} onSave={saveAvatar} />}<h1>{profile.name}</h1><p>{profile.bio}</p><small>{posts.length} posts · Profile linked to your shared cooks</small></section><ProfileEditor title="Public profile" text="This is what people you connect with can see."><label className="account-field">Display name<input maxLength={80} value={profile.name} onChange={e => update({ name: cleanText(e.target.value, 80) })} /></label><label className="account-field">Bio<textarea maxLength={300} value={profile.bio} onChange={e => update({ bio: cleanText(e.target.value, 300) })} /></label><label className="account-field">Location<input maxLength={100} value={profile.location} onChange={e => update({ location: cleanText(e.target.value, 100) })} placeholder="Optional" /></label></ProfileEditor><ProfileEditor title="Privacy and sharing" text="Your psychological profile, raw mood entries, and private diary are never shown here."><Choice values={["connections", "public", "private"]} active={profile.profileVisibility} pick={v => update({ profileVisibility: v as Profile["profileVisibility"] })} /><label className="toggle-row"><span><b>Offer to share completed cooks</b><small>You always confirm before anything is posted.</small></span><input type="checkbox" checked={profile.shareCookedMeals} onChange={e => update({ shareCookedMeals: e.target.checked })} /></label></ProfileEditor>{posts.length > 0 && <ProfileEditor title="Posts linked to your profile" text="Images and tips you chose to share."><div className="profile-gallery">{posts.map(p => <img src={p.image} alt="" key={p.id} />)}</div></ProfileEditor>}<CancelAccount cancelAccount={cancelAccount} /></div>;
}

function CancelAccount({ cancelAccount }: { cancelAccount: () => Promise<{ ok: boolean; error?: string }> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    setBusy(true); setError("");
    const res = await cancelAccount();
    if (!res.ok) { setBusy(false); setError(res.error || "We couldn't cancel your account. Please try again."); }
    // On success the app reloads, so no need to reset state here.
  };
  return <section className="cancel-account">
    <h2>Cancel account</h2>
    <p>Permanently delete your MoodFood account, food profile, diary, and saved recipes. Any active subscription is cancelled. This can't be undone.</p>
    {!confirming
      ? <button className="cancel-account-btn" onClick={() => setConfirming(true)}><Trash2 size={16} /> Cancel my account</button>
      : <div className="cancel-account-confirm">
          <b>Are you sure? This is permanent.</b>
          {error && <span className="err">{error}</span>}
          <div className="cancel-account-actions">
            <button className="secondary" onClick={() => { setConfirming(false); setError(""); }} disabled={busy}>Keep my account</button>
            <button className="cancel-account-btn" onClick={run} disabled={busy}>{busy ? "Cancelling…" : "Yes, delete everything"}</button>
          </div>
        </div>}
  </section>;
}
