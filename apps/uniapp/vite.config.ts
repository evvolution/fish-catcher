import { fileURLToPath, URL } from "node:url";

import uniModule from "@dcloudio/vite-plugin-uni";
import { defineConfig } from "vite";

const uni = (uniModule as unknown as { default?: typeof uniModule }).default ?? uniModule;

export default defineConfig({
  base: "./",
  plugins: [uni()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@moyu-core": fileURLToPath(new URL("../../src/lib", import.meta.url)),
    },
  },
  server: {
    fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
  },
});
