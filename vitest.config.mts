import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Espelha o "@/*" -> "./src/*" do tsconfig.json — sem isso, todo import
  // "@/..." dentro de um arquivo testado falha na resolução do Vite/Vitest
  // (Next.js resolve via tsconfig, mas o Vitest não lê isso sozinho).
  // Achado ao escrever o 1º teste de serviço puro que importa um util
  // compartilhado por "@/" (FaturamentoImportService.ts, 15/09/2026) —
  // nenhum teste anterior precisou disso.
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // node_modules_old é lixo de uma limpeza anterior (ver CLAUDE.md); sem
    // isso o vitest varria os próprios testes internos do @opentelemetry.
    exclude: ['**/node_modules/**', '**/node_modules_old/**', '**/dist/**'],
  },
});
