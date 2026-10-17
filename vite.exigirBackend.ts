import type { Plugin } from 'vite'

/**
 * Un build de producción SIN `VITE_SUPABASE_*` no falla: sale una app 100%
 * local que dice «Esta instalación no tiene backend» y nadie puede entrar.
 * Pasó tres veces (16-17 oct 2026) al compilar desde un worktree limpio sin
 * copiar `.env.local`. Este candado aborta el build en ese caso.
 * Escape a propósito: `MPH_SIN_BACKEND=1`.
 */
export function exigirBackend(): Plugin {
  return {
    name: 'mph-exigir-backend',
    apply: 'build',
    configResolved(config) {
      if (config.mode !== 'production' || process.env.MPH_SIN_BACKEND === '1') return
      if (config.env.VITE_SUPABASE_URL && config.env.VITE_SUPABASE_ANON_KEY) return
      throw new Error(
        `Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (envDir: ${config.envDir}). ` +
          'Copia .env.local y .env.production al worktree antes de compilar; ' +
          'si de verdad quieres un build sin backend, usa MPH_SIN_BACKEND=1.',
      )
    },
  }
}
