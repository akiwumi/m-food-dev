import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("community mobile UI contract", () => {
  it("uses a keyboard-safe full-screen composer", () => {
    const source = readFileSync("src/components/community/CommunityComposer.tsx", "utf8");
    expect(source).toContain('className="community-composer-screen"');
    expect(source).toContain('inputMode="text"');
    expect(source).toContain('enterKeyHint="enter"');
    expect(source).toContain("textareaRef.current?.focus()");
    const screen = readFileSync("src/screens/CommunityScreen.tsx", "utf8");
    expect(screen).toContain("flushSync");
    expect(screen).toContain('getElementById("community-post-message")?.focus()');
    expect(source).not.toContain("onTouchStart");
  });

  it("shows personalized dishes with an explicit not-interested control", () => {
    const source = readFileSync("src/components/community/TrendingRail.tsx", "utf8");
    expect(source).toContain("Popular with your people");
    expect(source).toContain("Not interested in");
    expect(source).toContain('>Not interested</button>');
    expect(source).toContain("openRecipe(item.recipe)");
  });

  it("keeps avatars, reactions, and post detail in the social flow", () => {
    const source = readFileSync("src/components/community/CommunityFeed.tsx", "utf8");
    expect(source).toContain("<Avatar");
    expect(source).toContain("REACTIONS.map");
    expect(source).toContain('className="community-post-detail"');
    expect(source).toContain("Reply as");
    expect(source).toContain("openRecipe(item.recipe)");
    expect(source).toContain("Visible to everyone");
    expect(source).toContain(">Retry</button>");
  });

  it("lets the user silence post notifications and reset hidden dishes", () => {
    const source = readFileSync("src/screens/SettingsScreen.tsx", "utf8");
    expect(source).toContain("communityPostNotifications");
    expect(source).toContain("Show hidden community dishes again");
    expect(source).toContain("resetDismissedRecipes");
    expect(source).toContain("communityIdentity");
  });

  it("serializes reaction writes and keeps the feed ref current", () => {
    const source = readFileSync("src/hooks/useCommunity.ts", "utf8");
    expect(source).toContain("reactionWrites");
    expect(source).toContain("previousWrite");
    expect(source).toContain("feedRef.current = feedRef.current.map");
  });
});
