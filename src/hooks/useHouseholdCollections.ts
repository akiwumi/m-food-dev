import { useMemo, useState } from "react";
import { useStoredState, defaultDiners, type Diner, type Profile, type SocialPost } from "../store";
import { profileForDiners } from "../recommendation";
import type { Recipe } from "../data";

// Pure localStorage-backed household collections (saved, diary, grocery, posts,
// connections, diners) plus the safety-merged `sharedProfile` for the currently
// selected diners. No effects. Takes `profile` so sharedProfile can merge in the
// hard constraints of every selected diner.
export function useHouseholdCollections(profile: Profile) {
  const [saved, setSaved] = useStoredState<string[]>("moodfood-saved", []);
  const [diary, setDiary] = useStoredState("moodfood-diary", [] as { recipe: Recipe; rating: number; when: string }[]);
  const [groceries, setGroceries] = useStoredState("moodfood-groceries", [] as string[]);
  const [posts, setPosts] = useStoredState<SocialPost[]>("moodfood-posts", []);
  const [connections, setConnections] = useStoredState<string[]>("moodfood-connections", []);
  const [diners, setDiners] = useStoredState<Diner[]>("moodfood-diners", defaultDiners);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(["self"]);
  const [eaterCount, setEaterCount] = useStoredState<number>("moodfood-eater-count", 1);
  const sharedProfile = useMemo(() => profileForDiners(profile, diners.filter(d => selectedDiners.includes(d.id) && d.id !== "self")), [profile, diners, selectedDiners]);
  return { saved, setSaved, diary, setDiary, groceries, setGroceries, posts, setPosts, connections, setConnections, diners, setDiners, selectedDiners, setSelectedDiners, eaterCount, setEaterCount, sharedProfile };
}
