import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target:
            env.VITE_API_PROXY_TARGET ||
            "https://jebryxapi-production.up.railway.app",
          changeOrigin: true,
        },
      },
    },
    build: { sourcemap: false },
  };
});
