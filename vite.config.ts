import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so production assets must be prefixed with the repo name. The CI workflow
// sets VITE_BASE_PATH="/PLEXUS/"; local dev and other hosts default to "/".
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
  },
});
