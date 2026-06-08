// Writes the production CSP from csp.config.js into vercel.json.
//
// Runs automatically via the "prebuild" npm hook, so `npm run build` always
// emits a vercel.json whose Content-Security-Policy header matches the single
// source of truth. Pass --check to fail (exit 1) instead of writing when the
// file is out of sync -- useful in CI.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildCsp } from "../csp.config.js";

const vercelPath = fileURLToPath(new URL("../vercel.json", import.meta.url));
const checkOnly = process.argv.includes("--check");

const csp = buildCsp("prod");
const original = readFileSync(vercelPath, "utf8");

// Targeted replacement of just the CSP value preserves the file's formatting.
// The policy never contains a double quote, so [^"]* is a safe value matcher.
const pattern = /("key": "Content-Security-Policy", "value": ")[^"]*(")/;

if (!pattern.test(original)) {
  console.error("sync-vercel-csp: could not find a Content-Security-Policy header in vercel.json");
  process.exit(1);
}

const updated = original.replace(pattern, `$1${csp}$2`);

if (updated === original) {
  console.log("vercel.json CSP already in sync");
  process.exit(0);
}

if (checkOnly) {
  console.error("vercel.json CSP is out of sync with csp.config.js (run `npm run csp:sync`)");
  process.exit(1);
}

writeFileSync(vercelPath, updated);
console.log("vercel.json CSP updated from csp.config.js");
