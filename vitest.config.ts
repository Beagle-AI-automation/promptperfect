import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Must not be "production" or react-dom/test-utils loads the prod bundle (React.act breaks with RTL).
    env: {
      NODE_ENV: "test",
    },
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    // React 19 + RTL: avoid production react-dom/test-utils (breaks React.act in tests).
    conditions: ["development", "browser", "module"],
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
