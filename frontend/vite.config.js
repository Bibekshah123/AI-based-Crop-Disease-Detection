/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Vitest transforms JSX with esbuild; force the automatic runtime there so
  // test files need no explicit React import. (The production build uses oxc,
  // which already defaults to the automatic runtime.)
  ...(mode === 'test' ? { esbuild: { jsx: 'automatic' } } : {}),
  server: {
    proxy: {
      '/predict': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
  },
}))
