import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PMU_HOST = ["offline", "turfinfo", "api", "pmu", "fr"].join(".");
const PMU_TARGET = "https://" + PMU_HOST + "/rest/client/7/programme";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api/pmu": {
        target: PMU_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/pmu/, ""),
      },
    },
  },
});
