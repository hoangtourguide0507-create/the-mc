import { defineConfig } from 'vite';

// GitHub Actions sets GITHUB_ACTIONS=true. The Pages site lives at /the-mc/,
// so the production build must use that base path. Local dev keeps '/'.
const onActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: onActions ? '/the-mc/' : '/',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
