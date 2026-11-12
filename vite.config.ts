import { defineConfig } from 'vite';

// GitHub Actions sets GITHUB_ACTIONS=true. The Pages site lives at /the-mc/,
// so the production build must use that base path. Local dev keeps '/'.
const onActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: onActions ? '/the-mc/' : '/',
  // Dấu thời gian lúc build, hiện ở cuối màn chính để biết máy đang chạy bản nào
  define: { __APP_BUILD__: JSON.stringify(new Date().toISOString().slice(5, 16).replace('T', ' ')) },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
