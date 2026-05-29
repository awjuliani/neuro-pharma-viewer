import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { InlineConfig } from "vitest";

const config = {
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["node_modules", "dist", "e2e"],
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
} satisfies UserConfig & { test: InlineConfig };

export default defineConfig(config);
