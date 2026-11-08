import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions sets GITHUB_ACTIONS=true. The Pages site lives at /the-mc/,
// so the production build must use that base path. Local dev keeps '/'.
const onActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: onActions ? '/the-mc/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
