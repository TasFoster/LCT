import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // пример сцены лежит уровнем выше, рядом с контрактом
  server: { host: "127.0.0.1", port: 5173, strictPort: true, fs: { allow: [".."] } },
});
