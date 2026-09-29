import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Two pages share one Vite project:
//   /            → ASCII Self-Portrait
//   /music-map/  → Music Map prototype
export default defineConfig({
  server: {
    // Spotify no longer accepts "localhost" redirect URIs; use the loopback IP.
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        musicMap: resolve(__dirname, 'music-map/index.html'),
      },
    },
  },
});
