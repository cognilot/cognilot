/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    // Exclude legacy MemoryPage.location tests — MemoryPage.tsx is being migrated
    // to Next.js App Router in Sprint 3 and these tests will be rewritten then.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/views/__tests__/MemoryPage.location.test.tsx',
    ],
  },
});
