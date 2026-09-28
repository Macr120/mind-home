import { useEffect, useState } from 'react'
import type {
  AreaAgenda,
  ContactoAgenda,
  Cuidado,
  EventoAgenda,
  Mascota,
  Medicamento,
} from '../../core/data/db'
import { useEjemplos, useSeccionDecidida } from '../../core/data/ejemplos'
import { esDemo, esVisita } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { borrarEjemplo, cargarEjemplo, hayEjemplo, ponerEjemploPrimeraVez, seccionEjemplo } from './ejemplos'

/**
 * El ejemplo de fábrica de una sección, desde la propia sección.
 *
 * La primera vez que se abre vacía, el ejemplo se pone solo. Mientras esté, el
 * pie ofrece borrarlo entero; pide confirmación porque se lleva TODO el ejemplo
 * (y sus bloques del calendario), no solo la fila que estés mirando. Cuando ya
 * no queda nada de él, ofrece restaurarlo.
 */
export function BarraEjemplo({
  area,
  eventos,
  // Cada sección pasa solo lo suyo: el ejemplo de Trabajo no toca medicamentos.
  contactos = [],
  medicinas = [],
  mascotas = [],
  cuidados = [],
}: {
  area: AreaAgenda
  eventos: EventoAgenda[]
  contactos?: ContactoAgenda[]
  medicinas?: Medicamento[]
  mascotas?: Mascota[]
  cuidados?: Cuidado[]
}) {
  const t = useT()
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const decidida = useSeccionDecidida(seccionEjemplo(area))
  // Casa demo: el año de Pep@ YA es el ejemplo. Casa visitada: no es tuya.
  const fuera = esDemo() || esVisita()

  useEffect(() => {
    if (!fuera && !decidida) void ponerEjemploPrimeraVez(area)
  }, [area, decidida, fuera])

  if (fuera) return null
  const cargado = hayEjemplo(area, eventos, contactos, medicinas, mascotas, cuidados)
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
    useEjemplos.getState().decidir(seccionEjemplo(area))
    await cargarEjemplo(area)
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2"
      data-tut={`agenda.ejemplo.${area}`}
    >
      {cargado && (
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/40">
          {t('agenda.ejemplo.cargado', 'Lo que ves de ejemplo se puede borrar de golpe, con sus bloques del calendario.')}
        </p>
      )}

      {!cargado && (
        <button
          type="button"
          onClick={() => void correr(restaurar)}
          disabled={ocupado}
          className="ml-auto shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 disabled:opacity-40"
        >
          <Icono nombre="restaurar" /> {t('ejemplo.restaurar', 'Restaurar ejemplo de fábrica')}
        </button>
      )}

      {cargado &&
        (confirmando ? (
          <button
            type="button"
            onClick={() =>
              void correr(() => borrarEjemplo(area, eventos, contactos, medicinas, mascotas, cuidados))
            }
            onBlur={() => setConfirmando(false)}
            disabled={ocupado}
            className="shrink-0 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-300 disabled:opacity-40"
          >
            {t('agenda.ejemplo.confirmar', 'Sí, borrar el ejemplo')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-red-300"
          >
            <Icono nombre="basura" /> {t('agenda.ejemplo.borrar', 'Borrar el ejemplo')}
          </button>
        ))}
    </div>
  )
}
