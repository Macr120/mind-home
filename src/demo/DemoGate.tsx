import { useEffect, useState, type ReactNode } from 'react'
import { esDemo, esDemoAutor } from '../core/edicion'
import { borrarDemoDb, demoConstruido, demoSucia } from './modo'
import { ejecutarIntentDemo } from './intent'
import { PantallaDemo } from './PantallaDemo'

type Fase = 'preparando' | 'construyendo' | 'listo'

/**
 * Compuerta del demo (envuelve a <App/> en main.tsx): fuera
 * del demo es transparente; dentro, decide entre la construcción y la casa
 * lista (+ ejecutar el tour pendiente). No pregunta nada: la casa de Pep@ se
 * construye siempre entera.
 *
 * `preparando`: los builders exigen BD VIRGEN con los stores hidratados de
 * ella. Si la BD trae restos (build interrumpido, versión vieja), se borra y
 * se recarga — al volver, este gate construye directo.
 */
export function DemoGate({ children }: { children: ReactNode }) {
  if (!esDemo()) return <>{children}</>
  return <GateActivo>{children}</GateActivo>
}

function GateActivo({ children }: { children: ReactNode }) {
  const [fase, setFase] = useState<Fase>(() => (demoConstruido() ? 'listo' : 'preparando'))

  useEffect(() => {
    if (fase !== 'preparando') return
    let viva = true
    void demoSucia().then(async (sucia) => {
      if (!viva) return
      if (sucia) {
        // En modo AUTORÍA la casa demo es trabajo a mano sin respaldo: borrarla
        // para reconstruirla se lleva por delante lo editado, y basta con subir
        // `DEMO_VERSION` en el bundle para que este camino se dispare en la
        // siguiente recarga. Pasó (ago 2026): se perdieron unas ediciones del
        // mapa. Aquí se detiene y se pide exportar primero; para reconstruir a
        // propósito está el botón «Reiniciar» de la BarraDemo.
        if (esDemoAutor()) {
          console.warn(
            '[MPH demo] Autoría: la casa demo NO se reconstruyó para no perder lo editado. ' +
              'Exporta con window.mhExportarCasaDemo() y luego usa «Reiniciar» en la BarraDemo.',
          )
          setFase('listo')
          return
        }
        await borrarDemoDb()
        location.reload()
        return
      }
      setFase('construyendo')
    })
    return () => {
      viva = false
    }
  }, [fase])

  useEffect(() => {
    if (fase === 'listo') void ejecutarIntentDemo()
  }, [fase])

  if (fase === 'listo') return <>{children}</>
  if (fase === 'construyendo') return <PantallaDemo />
  // `preparando`: un instante en negro mientras se decide si la BD está limpia.
  return <div className="ui-app fixed inset-0 z-50" />
}
