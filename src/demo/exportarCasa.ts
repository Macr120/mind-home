/**
 * Exportación de la casa demo como `casa.json` (SOLO desarrollo).
 *
 * Flujo de autoría (temporal, hasta congelar el modelo ideal):
 *   `mhDemo(true)` → se construye la casa → `mhDemoAutor(true)` → editarla en
 *   el editor completo → «Exportar casa.json» (BarraDemo o
 *   `window.mhExportarCasaDemo()`) → commitear a `public/demo/casa.json` →
 *   subir `DEMO_VERSION`. Desde entonces el JSON manda y `casaPep.ts` queda de
 *   fallback: la casa de Pep@ es la misma para todos.
 */
import { exportarSnapshot } from './casaSnapshot'

/** Serializa la casa ACTUAL y la descarga como casa.json. */
export async function descargarCasaJson(): Promise<void> {
  const snap = await exportarSnapshot()
  const blob = new Blob([JSON.stringify(snap)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'casa.json'
  a.click()
  URL.revokeObjectURL(url)
  console.info('[MPH demo] casa.json exportada — commitéala a public/demo/casa.json')
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { mhExportarCasaDemo?: () => Promise<void> }).mhExportarCasaDemo =
    descargarCasaJson
}
