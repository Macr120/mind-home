import { useState } from 'react'
import { esDemo } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/**
 * Cargar y tirar el ejemplo de una sección desde la propia sección.
 *
 * Sirve para ver la sección con algo dentro la primera vez, y estorba en
 * cuanto ya tienes lo tuyo. Borrar pide confirmación porque se lleva TODO el
 * ejemplo de esa sección, no solo la fila que estés mirando.
 */
export function BarraEjemplo({
  cargado,
  onCargar,
  onBorrar,
}: {
  cargado: boolean
  onCargar: () => Promise<void>
  onBorrar: () => Promise<void>
}) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  // Casa demo: el año de Pep@ YA es el ejemplo (y cargar/borrar está bloqueado).
  if (esDemo()) return null

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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2">
      <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/40">
        {cargado
          ? t('despacho.ejemplo.cargado', 'Lo que ves de ejemplo se puede borrar de golpe.')
          : t('despacho.ejemplo.vacio', '¿No sabes por dónde empezar? Carga un ejemplo y míralo por dentro.')}
      </p>

      {!cargado && (
        <button
          type="button"
          onClick={() => void correr(onCargar)}
          disabled={ocupado}
          className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-40"
        >
          <Icono nombre="ayuda" /> {t('despacho.ejemplo.cargar', 'Cargar un ejemplo')}
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
            className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-red-300"
          >
            <Icono nombre="basura" /> {t('despacho.ejemplo.borrar', 'Borrar el ejemplo')}
          </button>
        ))}
    </div>
  )
}
