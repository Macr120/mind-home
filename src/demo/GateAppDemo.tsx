import { useEffect, useState, type ReactNode } from 'react'
import { esDemo, esDemoAutor } from '../core/edicion'
import { useT } from '../core/i18n/useT'
import { BUILDERS_DEMO } from './builders'
import { construirAppDemo } from './construir'
import { appsConstruidas } from './modo'

const faltaConstruir = (app: string) => !!BUILDERS_DEMO[app] && !appsConstruidas().has(app)

/**
 * Envuelve el montaje de una app dentro de la casa demo: si su año todavía no
 * está en la BD —el visitante entró por el tutorial de OTRA app, así que solo se
 * construyó aquella— lo construye antes de mostrarla. Fuera del demo (y en modo
 * autor, donde la casa se edita a mano) es transparente.
 */
export function GateAppDemo({
  plantillaId,
  children,
}: {
  plantillaId: string
  children: ReactNode
}) {
  if (!esDemo() || esDemoAutor()) return <>{children}</>
  // `key`: cambiar de app en un cuarto con varias tiene que reiniciar el gate.
  return (
    <GateActivo key={plantillaId} plantillaId={plantillaId}>
      {children}
    </GateActivo>
  )
}

function GateActivo({ plantillaId, children }: { plantillaId: string; children: ReactNode }) {
  const t = useT()
  const [listo, setListo] = useState(() => !faltaConstruir(plantillaId))

  useEffect(() => {
    if (listo) return
    let viva = true
    construirAppDemo(plantillaId)
      .catch((e) => console.error('[MPH demo] No se pudo construir el año de', plantillaId, e))
      // Aunque falle se monta la app, vacía: mejor eso que una pantalla de error,
      // y como no quedó marcada, volver a abrirla lo reintenta.
      .finally(() => {
        if (viva) setListo(true)
      })
    return () => {
      viva = false
    }
  }, [plantillaId, listo])

  if (!listo) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/50">
        {t('demo.cargandoApp', 'Acomodando el año de Pep@…')}
      </div>
    )
  }
  return <>{children}</>
}
