import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
      "@hub": fileURLToPath(new URL("./src/hub", import.meta.url)),
      "@worlds": fileURLToPath(new URL("./src/worlds", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
