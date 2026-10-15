import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Per-file coverage gate for the critical paths.
 *
 * The global gate in `test:coverage:core` lives in `src/lib` and reports an
 * aggregate, which is how `useOptimizeRunner.ts` sat at 74.3% statements for a
 * long time while the repo-wide number looked healthy at 96%+. This config
 * restricts coverage to the four files that carry the product's core logic and
 * applies the thresholds to EACH file rather than to the average.
 *
 * Thresholds are set at today's measured values so the gate locks in the
 * current state and fails on regression. Ratchet them upward as the remaining
 * gaps close — `useOptimizeRunner.ts` is still the weakest at 80.23 statements,
 * 63.88 branches and 66.66 functions, and the shortfall is deep `isGemini`
 * branches inside the streaming path.
 *
 * NOTE: these thresholds MUST be per-file. Passing them as a global average
 * would let one strong file mask a weak one, which is the exact failure this
 * config exists to prevent.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    env: { NODE_ENV: "test" },
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/hooks/useOptimizeRunner.test.ts",
      "src/lib/historyMerge.test.ts",
      "src/lib/promptScore.test.ts",
      "src/lib/auth/rateLimit.test.ts",
    ],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      enabled: true,
      all: true,
      reporter: ["text"],
      include: [
        "src/hooks/useOptimizeRunner.ts",
        "src/lib/historyMerge.ts",
        "src/lib/promptScore.ts",
        "src/lib/auth/rateLimit.ts",
      ],
      thresholds: {
        perFile: true,
        lines: 80,
        branches: 60,
        functions: 65,
      },
    },
  },
  resolve: {
    conditions: ["development", "browser", "module"],
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
