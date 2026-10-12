import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // lib/ modules guard against client imports; tests run them directly.
      "server-only": fileURLToPath(new URL("./test/empty.ts", import.meta.url)),
    },
  },
  // .env.local (OPENAI_API_KEY, model overrides) for `npm run eval`, same as `next dev`.
  test: { env: loadEnv("test", process.cwd(), "") },
});
