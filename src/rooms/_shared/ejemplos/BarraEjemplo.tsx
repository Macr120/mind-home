import { useEffect, useState } from 'react'
import { useEjemplos, useEjemploEncendido } from '../../../core/data/ejemplos'
import { esDemo } from '../../../core/edicion'
import { useT } from '../../../core/i18n/useT'
import { useAjustes } from '../../../core/state/ajustesStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import type { PaqueteEjemplo } from './tipos'

/**
 * Encender y apagar el ejemplo de una sección desde la propia sección.
 *
 * Es el pie de la pestaña, no un botón grande: sirve para ver la app con cosas
 * dentro la primera vez y estorba en cuanto ya tienes las tuyas. Apagarlo NO
 * borra nada —las filas se quedan guardadas—, así que no pide confirmación:
 * volver a encenderlo devuelve exactamente lo mismo.
 */
export function BarraEjemplo({ paquete }: { paquete: PaqueteEjemplo }) {
  const t = useT()
  const encendido = useEjemploEncendido(paquete.id)
  const [ocupado, setOcupado] = useState(false)
  const [impedimento, setImpedimento] = useState<string | null>(null)

  // Las filas del ejemplo se crean UNA sola vez (materializar): si el idioma
  // cambió desde entonces, lo que siga siendo texto de fábrica se reescribe al
  // activo (retraducir); lo editado por el usuario se queda como está.
  const idioma = useAjustes((s) => s.idioma)
  useEffect(() => {
    if (!esDemo() && useEjemplos.getState().encendidos.includes(paquete.id)) void paquete.retraducir?.()
  }, [idioma, paquete])

  // Casa demo: el año de Pep@ YA es el ejemplo (y materializar está bloqueado).
  if (esDemo()) return null

  const alternar = async () => {
    if (ocupado) return
    const { encender, apagar } = useEjemplos.getState()
    if (encendido) {
      apagar(paquete.id)
      return
    }
    setOcupado(true)
    try {
      const razon = (await paquete.impedimento?.()) ?? null
      setImpedimento(razon)
      if (razon) return
      await paquete.materializar()
      // Filas que quedaron guardadas de un idioma anterior: al idioma activo.
      await paquete.retraducir?.()
      encender(paquete.id)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2"
      data-tut={`ejemplo.${paquete.id}`}
    >
      <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/40">
        {impedimento
          ? t(impedimento, 'Ahora mismo no hay sitio para el ejemplo.')
          : encendido
            ? t('ejemplo.puesto', 'Esto es un ejemplo: escóndelo cuando quieras y tus datos siguen intactos.')
            : t('ejemplo.vacio', '¿No sabes por dónde empezar? Mira cómo se ve con un ejemplo dentro.')}
      </p>

      <button
        type="button"
        onClick={() => void alternar()}
        disabled={ocupado}
        className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-40"
      >
        <Icono nombre={encendido ? 'ocultar' : 'ver'} />{' '}
        {encendido ? t('ejemplo.ocultar', 'Ocultar el ejemplo') : t('ejemplo.mostrar', 'Ver un ejemplo')}
      </button>
    </div>
  )
}
