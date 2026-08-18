import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules_old/**",
    "temp-init/**",
    // Scripts Node CJS standalone (seed, migração pontual, debug) — rodam via
    // `node arquivo.js` fora do build do Next, não fazem parte do app.
    // require() é a forma correta ali, não um problema a corrigir.
    "scripts/**",
    "test_*.js",
    "fix_*.js",
    // Worktrees isolados de outras sessões do Claude Code (agentes rodando
    // em paralelo) têm seu próprio .next/** — mas ".next/**" acima só
    // ignora a raiz, não casa em subpastas. Sem isso, o lint do repo
    // principal varre e falha em build output de OUTRA sessão (achado
    // 17/08/2026: pre-commit quebrou lintando .js gerado de um worktree
    // de task em background, nada a ver com o código deste commit).
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
