import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/admin': BACKEND,
      '/qr': BACKEND,
      '/menus': BACKEND,
      '/sessions': BACKEND,
      '/ads': BACKEND,
      '/sse': BACKEND,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
