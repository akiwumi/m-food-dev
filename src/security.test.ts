import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { cleanText, validateImage, validateEmail } from "./security";

describe("validateEmail (signup bounce prevention)", () => {
  it("accepts well-formed real addresses", () => {
    for (const e of ["akiwumi@gmail.com", "a.b+tag@sub.domain.co.uk", "x@outlook.com"]) {
      expect(validateEmail(e).ok).toBe(true);
    }
  });
  it("rejects malformed addresses", () => {
    for (const e of ["", "nope", "no@domain", "a b@gmail.com", "@gmail.com", "a@@b.com"]) {
      expect(validateEmail(e).ok).toBe(false);
    }
  });
  it("rejects undeliverable placeholder domains", () => {
    expect(validateEmail("you@example.com").ok).toBe(false);
    expect(validateEmail("dev@test.com").ok).toBe(false);
    expect(validateEmail("ci@foo.test").ok).toBe(false);
  });
  it("flags common domain typos and suggests the fix", () => {
    const r = validateEmail("jess@gmail.con");
    expect(r.ok).toBe(false);
    expect(r.suggestion).toBe("jess@gmail.com");
    expect(validateEmail("sam@hotmial.com").suggestion).toBe("sam@hotmail.com");
    expect(validateEmail("k@yaho.com").suggestion).toBe("k@yahoo.com");
  });
});

describe("client security controls", () => {
  it("bounds and strips control characters from public text", () => {
    expect(cleanText(" hello\u0000world ", 20)).toBe("helloworld");
    expect(cleanText("x".repeat(100), 12)).toHaveLength(12);
  });

  it("rejects executable and oversized image uploads", () => {
    expect(() => validateImage(new File(["<svg/>"], "attack.svg", { type: "image/svg+xml" }))).toThrow();
    expect(() => validateImage(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }))).toThrow();
  });

  it("keeps the service worker away from cross-origin and API responses", () => {
    const worker = readFileSync("public/sw.js", "utf8");
    expect(worker).toContain("url.origin !== self.location.origin");
    expect(worker).toContain('url.pathname.startsWith("/api/")');
  });

  it("enables RLS on privileged global tables", () => {
    const migration = readFileSync("supabase/migrations/004_security_hardening.sql", "utf8");
    expect(migration).toContain("alter table public.recipes enable row level security");
    expect(migration).toContain("alter table public.invites enable row level security");
    expect(migration).toContain("revoke insert, update, delete on public.recipes");
    expect(migration).toContain("auth.uid() = requester_id and status = 'pending'");
    expect(migration).toContain("grant update(status) on public.connections to authenticated");
    expect(migration).toContain("posts_image_owner_path");
  });

  it("keeps user-uploaded images private and owner-scoped", () => {
    const migration = readFileSync("supabase/migrations/005_private_image_storage.sql", "utf8");
    expect(migration).toContain("'avatars', 'avatars', false");
    expect(migration).toContain("'community-images', 'community-images', false");
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });

  it("uses function-level auth for asymmetric Supabase user tokens", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    for (const slug of ["ai-gateway", "recipes"]) {
      expect(config).toContain(`[functions.${slug}]`);
      expect(config).toMatch(new RegExp(`\\[functions\\.${slug}\\][\\s\\S]*?verify_jwt = false`));

      const source = readFileSync(`supabase/functions/${slug}/index.ts`, "utf8");
      expect(source).toContain("/auth/v1/user");
      expect(source).toContain('request.headers.get("authorization")');
    }
  });

  it("keeps slow recipe enrichment out of the search response path", () => {
    const source = readFileSync("supabase/functions/recipes/index.ts", "utf8");
    expect(source).not.toContain("enrichRecipeInstructions");
    expect(source).not.toContain("attachVideos");
  });

  it("limits Moody recipe links to structured supplied catalog candidates", () => {
    const source = readFileSync("supabase/functions/ai-gateway/index.ts", "utf8");
    expect(source).toContain("api.anthropic.com/v1/messages");
    expect(source).toContain("claude-haiku-4-5");
    expect(source).not.toContain('const CHAT_MODEL = "gpt-4o-mini"');
    expect(source).toContain('response_format: { type: "json_object" }');
    expect(source).toContain("allCandidateIds.has(rawRecipeId)");
    expect(source).toContain("recipeId: selectedRecipeId");
  });

  it("keeps original recipe source links out of the in-app recipe experience", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    expect(source).not.toContain("View original recipe");
    expect(source).not.toContain('className="source-link" href={recipe.sourceUrl}');
  });

  it("prevents mobile form focus zoom and horizontal form overflow", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toContain("font-size:16px");
    expect(styles).toContain("max-width:100%");
    expect(styles).toContain("overflow-x:hidden");
  });
});
