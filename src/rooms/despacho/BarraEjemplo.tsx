import { useState } from 'react'
import { useEjemplos, useSeccionDecidida } from '../../core/data/ejemplos'
import { esDemo, esVisita } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * El ejemplo de fábrica de una sección, desde la propia sección.
 *
 * Se pone solo al abrir Finanzas por primera vez (`ponerEjemplosPrimeraVez`).
 * Mientras esté, el pie ofrece borrarlo; pide confirmación porque se lleva TODO
 * el ejemplo de esa sección, no solo la fila que estés mirando. Cuando ya no
 * queda nada de él, ofrece restaurarlo.
 */
export function BarraEjemplo({
  seccion,
  cargado,
  onCargar,
  onBorrar,
}: {
  seccion: string
  cargado: boolean
  onCargar: () => Promise<void>
  onBorrar: () => Promise<void>
}) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const decidida = useSeccionDecidida(seccion)

  // Casa demo: el año de Pep@ YA es el ejemplo. Casa visitada: no es tuya.
  if (esDemo() || esVisita()) return null
  // Poniéndose por primera vez: en un momento aparece el ejemplo.
  if (!cargado && !decidida) return null

  const correr = async (fn: () => Promise<void>) => {
    if (ocupado) return
    setOcupado(true)
    try {
      await fn()
    } finally {
      setOcupado(false)
      setConfirmando(false)
    }
  }

  const restaurar = async () => {
    useEjemplos.getState().decidir(seccion)
    await onCargar()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2">
      {cargado && (
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/40">
          {t('despacho.ejemplo.cargado', 'Lo que ves de ejemplo se puede borrar de golpe.')}
        </p>
      )}

      {!cargado && (
        <button
          type="button"
          onClick={() => void correr(restaurar)}
          disabled={ocupado}
          className="ml-auto shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/55 transition hover:bg-white/10 disabled:opacity-40"
        >
          <Icono nombre="restaurar" /> {t('ejemplo.restaurar', 'Restaurar ejemplo de fábrica')}
        </button>
      )}

      {cargado &&
        (confirmando ? (
          <button
            type="button"
            onClick={() => void correr(onBorrar)}
            onBlur={() => setConfirmando(false)}
            disabled={ocupado}
            className="shrink-0 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300 disabled:opacity-40"
          >
            {t('despacho.ejemplo.confirmar', 'Sí, borrar el ejemplo')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/55 transition hover:bg-white/10 hover:text-red-300"
          >
            <Icono nombre="basura" /> {t('despacho.ejemplo.borrar', 'Borrar el ejemplo')}
          </button>
        ))}
    </div>
  )
}
