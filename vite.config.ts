import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildCsp } from "./csp.config.js";

/**
 * Replaces the <meta http-equiv="Content-Security-Policy"> tag in index.html
 * with the policy generated from csp.config.js. The dev server gets the "dev"
 * variant (allows the HMR websocket); builds get the "prod" variant.
 */
function cspMeta() {
  return {
    name: "moodfood-csp-meta",
    transformIndexHtml(html: string, ctx: { server?: unknown }) {
      const csp = buildCsp(ctx.server ? "dev" : "prod");
      return html.replace(
        /<meta http-equiv="Content-Security-Policy"[^>]*>/,
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), cspMeta()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-vendor", test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: "supabase-vendor", test: /node_modules\/@supabase\// },
            { name: "icons-vendor", test: /node_modules\/lucide-react\// },
          ],
        },
      },
    },
  },
});
