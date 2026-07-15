import { normalizeMood, type MoodName } from "./moodRules";

// Moody's *voice*, deterministic and free — no network, no model, zero latency.
// Keyed to mood × energy band so the signature warmth ("something simple that
// won't make you want to cry") lands on the home answer even for users who never
// open the chat (concept-recovery Phase 3). This is tone, not food logic — the
// ranking still comes from moodRules/recommendation.

type EnergyBand = "low" | "mid" | "high";

function energyBand(energy: number): EnergyBand {
  if (energy < 35) return "low";
  if (energy > 70) return "high";
  return "mid";
}

const VOICE: Record<MoodName, Record<EnergyBand, string>> = {
  Tired: {
    low: "Rough one, huh? Here's something simple that won't make you want to cry — least effort, most comfort.",
    mid: "Low on fuel but not empty. These stay easy, warm, and forgiving — nothing that fights back.",
    high: "Tired but game. A little more to sink into, still gentle on the cleanup.",
  },
  Stressed: {
    low: "Let's keep it calm — few steps, nothing to time perfectly, just something warm to land on.",
    mid: "Something steadying: simple, gentle flavours, no surprises to manage tonight.",
    high: "Channel it somewhere good. Calming to cook, and still worth the effort.",
  },
  Happy: {
    low: "Good mood, low battery — let's keep the joy and skip the work. Bright and easy.",
    mid: "Riding a good one. Colourful, fresh, a little fun — food that matches the mood.",
    high: "Let's celebrate it: vibrant, generous, a bit of a show. Go on.",
  },
  Romantic: {
    low: "Something special without the sweat — elegant on the plate, easy in the kitchen.",
    mid: "A little occasion. Beautiful, shareable, worth slowing down for.",
    high: "Make a night of it — restaurant-at-home, worth every minute.",
  },
  Healthy: {
    low: "Nourishing but effortless — fresh, balanced, and kind to a low-energy night.",
    mid: "Clean and balanced — vegetables, whole grains, the good stuff, without the fuss.",
    high: "Feeling it — let's build something properly good for you and worth the chopping.",
  },
  Focused: {
    low: "Brain needs fuel, hands need a break — steady energy, minimal steps.",
    mid: "Steady fuel for a working night: protein, slow-release carbs, nothing sleepy.",
    high: "Locked in. Prep-friendly, protein-forward, clean energy to keep you sharp.",
  },
};

// An empathetic one-liner for the given mood + energy. Returns "" for an unknown
// mood so callers can render nothing rather than a wrong tone.
export function moodVoice(mood: string, energy: number): string {
  const rule = VOICE[normalizeMood(mood) as MoodName];
  if (!rule) return "";
  return rule[energyBand(energy)];
}
