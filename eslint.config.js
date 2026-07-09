// Flat ESLint config. Scope is deliberately the app source (src/**): that is
// where type-aware rules like no-floating-promises earn their keep — an
// unawaited postgrest builder there was a real shipped bug (roadmap 1.2).
//
// Deno edge functions (supabase/functions/**) and Node scripts run under
// different globals and are type-checked separately, so they are not linted here.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**", "node_modules/**", "ios/**", "public/**",
      "supabase/**", "scripts/**",
      "*.config.js", "*.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // High-value correctness rules — the reason linting was added. Keep as errors.
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-floating-promises": "error",

      // Intentionally warnings, never errors: several App.tsx dependency arrays
      // are deliberately incomplete (Phase 3 hazards) and must NOT be autofixed.
      "react-hooks/exhaustive-deps": "warn",

      // Pre-existing patterns across untouched code — surfaced as warnings so the
      // gate is green today; tighten incrementally. `_`-prefixed names are
      // intentional discards (e.g. destructure-and-drop) and are ignored.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
);
