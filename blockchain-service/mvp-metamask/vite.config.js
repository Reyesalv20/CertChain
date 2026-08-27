import { defineConfig } from "vite";

// Proxy de desarrollo: el navegador le pega a "/config" (misma URL, sin CORS)
// y Vite lo reenvía al blockchain-service en localhost:6000 por atrás.
export default defineConfig({
  server: {
    proxy: {
      "/config": {
        target: "http://localhost:6000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        explorer: "explorer.html",
      },
    },
  },
});
