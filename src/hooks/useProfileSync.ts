import { useEffect, useMemo } from "react";
import { useStoredState, defaultProfile, clearStored, type Profile } from "../store";
import { supabase } from "../supabase";
import { isSupabaseConfigured, signOut as authSignOut } from "../auth";
import { deleteAccount, MOODFOOD_KEYS } from "../api/backend";
import { cancelScheduled } from "../notifications";

// photoLogs carry base64 image data (megabytes). They must never travel in
// preferences_json: they bloat the profiles row, the debounced upsert, and the
// sign-in restore payload. Photos stay on-device (a later step moves them to Storage).
export function prefsForUpsert(p: Profile): Omit<Profile, "photoLogs"> {
  const { photoLogs: _photoLogs, ...prefs } = p;
  return prefs;
}

// Owns the localStorage-backed profile, its referentially-stable derived value,
// the debounced Supabase upsert, and the account-deletion flow.
export function useProfileSync() {
  const [storedProfile, setProfile] = useStoredState<Profile>("moodfood-profile", defaultProfile);
  // Memoized so its reference is stable across renders. Without this, every
  // render produced a new `profile` object, which cascaded into `sharedProfile`
  // and re-fired the recipe-fetch effect on a loop, hammering the edge function
  // into 502s and silently falling back to local recipes. (H2)
  const profile = useMemo(() => ({ ...defaultProfile, ...storedProfile }), [storedProfile]);

  // Debounced upsert: save the full profile to Supabase 1.5 s after any change.
  // This keeps preferences_json current so the user's profile is restored when
  // they sign in on a new device.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !profile.accountCreated) return;
    const t = setTimeout(async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;
      await supabase!.from("profiles").upsert({
        id: user.id,
        display_name: profile.name,
        onboarded: profile.onboarded,
        // Only persist the avatar once it's an uploaded URL, never a giant data URL.
        ...(profile.avatar?.startsWith("http") ? { avatar_url: profile.avatar } : {}),
        preferences_json: prefsForUpsert(profile),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }, 1500);
    return () => clearTimeout(t);
  }, [profile]);

  // Cancel (permanently delete) the account. With a backend, delete server-side
  // first and bail on failure. Then sign out, wipe every local key, and reload
  // to a guaranteed-clean first-launch state.
  const cancelAccount = async (): Promise<{ ok: boolean; error?: string }> => {
    if (isSupabaseConfigured) {
      const res = await deleteAccount();
      if (!res.ok) return res;
    }
    try { await authSignOut(); } catch { /* already signed out */ }
    cancelScheduled();
    MOODFOOD_KEYS.forEach(clearStored);
    window.location.reload();
    return { ok: true };
  };

  return { storedProfile, setProfile, profile, cancelAccount };
}
