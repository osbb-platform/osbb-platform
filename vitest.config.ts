import path from "node:path";
import { defineConfig } from "vitest/config";

// tsconfig.json declares `"@/*": ["./*"]`, but a standalone `vitest run` (no
// Next.js/webpack in the loop) does not read tsconfig `paths` on its own.
// Without this, any test file that transitively imports something via `@/`
// fails at module resolution the moment it actually runs — which several
// suites masked by only ever checking for the string "@/..." in source text
// instead of importing through it for real.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
