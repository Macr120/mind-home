import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // El prefijo _ marca parámetros/variables intencionalmente sin usar
      // (firmas que deben conservar su forma, destructuring parcial).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Escena three.js: el patrón imperativo de R3F (mutar cámara/gl/texturas en
    // useFrame/useEffect) dispara falsos positivos del compilador de React.
    files: ['src/core/house/**'],
    rules: {
      'react-hooks/immutability': 'off',
      // Math.random para variación visual (partículas, poses de animales) es
      // idiomático en la escena; la regla de pureza lo marcaría como impuro.
      'react-hooks/purity': 'off',
    },
  },
  {
    // Juegos arcade con canvas: mutan su mundo (en un ref) dentro del bucle de
    // requestAnimationFrame, el mismo patrón imperativo que useFrame de R3F.
    files: ['src/rooms/entretenimiento/juegos/**'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
])
