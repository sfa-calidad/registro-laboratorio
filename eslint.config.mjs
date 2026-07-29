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
    // Subproyecto Electron (CommonJS, con su propio package.json):
    // no aplican las reglas de la app Next.
    "desktop/**",
    // Lanzador de los tests: script de Node en CommonJS, no código de la app.
    "scripts/test.js",
  ]),
]);

export default eslintConfig;
