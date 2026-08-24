import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `android/` y `ios/` son las plataformas nativas generadas por Capacitor
  // (incluyen el `native-bridge.js` y los checkouts de SPM de sus builds):
  // código de terceros, no se lintea.
  // `.claude/` puede contener worktrees de sesiones con su propio tsconfig:
  // si ESLint entra ahí, ve dos tsconfigRootDir candidatos y deja de parsear
  // TODO el proyecto (1554 errores idénticos, 0 reglas evaluadas).
  globalIgnores(['dist', 'dist-web', 'android', 'ios', '.claude']),
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
      // El proyecto agrupa a propósito el componente con sus datos/helpers afines
      // (catálogos 3D, slides del Wrapped, editores con sus plantillas). El único
      // costo es que Fast Refresh recarga ese módulo entero en vez de un componente.
      'react-refresh/only-export-components': 'off',
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
      // Los refs de la escena (marcha del avatar, marcador de una cancha) se
      // escriben en useFrame y se leen al pintar el frame siguiente: ahí el ref
      // ES la fuente por frame, no un valor que deba disparar re-render.
      'react-hooks/refs': 'off',
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
