import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useSeccionDecidida } from '../../../core/data/ejemplos'
import { esDemo, esVisita } from '../../../core/edicion'
import { useT } from '../../../core/i18n/useT'
import { useAjustes } from '../../../core/state/ajustesStore'
import { Icono } from '../../../core/ui/iconos/Icono'
import {
  borrarEjemplo,
  estadoSeccion,
  ponerPrimeraVez,
  restaurarEjemplo,
  type PaqueteEjemplo,
} from './tipos'

/**
 * El ejemplo de fábrica de una sección, desde la propia sección.
 *
 * La primera vez que se abre vacía, el ejemplo se pone solo. Mientras esté, el
 * pie ofrece borrarlo entero (cada fila también se borra sola, como cualquier
 * otra); cuando ya no queda nada de él, ofrece restaurarlo.
 */
export function BarraEjemplo({ paquete }: { paquete: PaqueteEjemplo }) {
  const t = useT()
  // Casa demo: el año de Pep@ YA es el ejemplo. Casa visitada: no es tuya.
  const fuera = esDemo() || esVisita()
  const estado = useLiveQuery(() => (fuera ? undefined : estadoSeccion(paquete)), [paquete, fuera])
  const decidida = useSeccionDecidida(paquete.id)
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [impedimento, setImpedimento] = useState<string | null>(null)
  // El primer intento de poner el ejemplo ya terminó (se haya podido o no).
  const [intentado, setIntentado] = useState(false)
  const cargado = estado !== undefined
  const hayEjemplo = !!estado?.ejemplo

  useEffect(() => {
    if (!cargado || decidida) return
    let vivo = true
    void ponerPrimeraVez(paquete).then((razon) => {
      if (!vivo) return
      setImpedimento(razon)
      // Lo que siembra la propia app puede estar aún escribiéndose: sin esto,
      // «Restaurar» asomaría un instante antes del ejemplo.
      setIntentado(paquete.auto !== false)
    })
    return () => {
      vivo = false
    }
    // `hayEjemplo`: en cuanto aparece (lo sembró la app), la sección queda decidida.
  }, [cargado, decidida, paquete, hayEjemplo])

  // Las filas del ejemplo se crean en el idioma de ese momento: si cambió, lo
  // que siga siendo texto de fábrica se reescribe al activo (retraducir); lo
  // editado por el usuario se queda como está.
  const idioma = useAjustes((s) => s.idioma)
  useEffect(() => {
    if (hayEjemplo) void paquete.retraducir?.()
  }, [idioma, paquete, hayEjemplo])

  if (fuera || !cargado) return null
  // Poniéndose por primera vez: en un momento aparece el ejemplo.
  if (!hayEjemplo && !decidida && !intentado) return null

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

  const boton =
    'shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-40'

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2"
      data-tut={`ejemplo.${paquete.id}`}
    >
      {(hayEjemplo || impedimento) && (
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/40">
          {impedimento
            ? t(impedimento, 'Ahora mismo no hay sitio para el ejemplo.')
            : t('ejemplo.puesto', 'Esto es un ejemplo de fábrica: bórralo cuando quieras.')}
        </p>
      )}

      {hayEjemplo ? (
        confirmando ? (
          <button
            type="button"
            onClick={() => void correr(() => borrarEjemplo(paquete))}
            onBlur={() => setConfirmando(false)}
            disabled={ocupado}
            className="shrink-0 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300 disabled:opacity-40"
          >
            {t('ejemplo.confirmar', 'Sí, borrar el ejemplo')}
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className={`${boton} hover:text-red-300`}>
            <Icono nombre="basura" /> {t('ejemplo.borrar', 'Borrar el ejemplo')}
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={() => void correr(async () => setImpedimento(await restaurarEjemplo(paquete)))}
          disabled={ocupado}
          className={`${boton} ml-auto`}
        >
          <Icono nombre="restaurar" /> {t('ejemplo.restaurar', 'Restaurar ejemplo de fábrica')}
        </button>
      )}
    </div>
  )
}
