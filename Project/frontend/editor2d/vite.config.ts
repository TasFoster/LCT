import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // пример сцены лежит в Project/, двумя уровнями выше (editor2d теперь под frontend/)
  server: { host: "127.0.0.1", port: 5173, strictPort: true, fs: { allow: ["../.."] } },
});
