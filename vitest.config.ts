import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // node_modules_old é lixo de uma limpeza anterior (ver CLAUDE.md); sem
    // isso o vitest varria os próprios testes internos do @opentelemetry.
    exclude: ['**/node_modules/**', '**/node_modules_old/**', '**/dist/**'],
  },
});
