import { useHuerto } from '../state/huertoStore'
import { useGranja } from '../state/granjaStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

export type CampoId = 'huerto' | 'granja'

/**
 * Conmutador de la cabecera de los editores de Comida (huerto) y Granja
 * (animales): comparten la misma cadena —cosechas → cesta → animales—, así que
 * se salta de uno a otro sin salir al mapa y volver a construir.
 */
export function PestanasCampo({ activa }: { activa: CampoId }) {
  const t = useT()

  const cambiar = (destino: CampoId) => {
    if (destino === activa) return
    // Salir del actual primero: `iniciar` se ignora si ya hay un editor abierto.
    if (activa === 'huerto') useHuerto.getState().salir()
    else useGranja.getState().salir()
    if (destino === 'huerto') useHuerto.getState().iniciar()
    else useGranja.getState().iniciar()
  }

  const pestana = (id: CampoId, icono: NombreIcono, etiqueta: string) => (
    <button
      type="button"
      data-tut={`infra.campo.${id}`}
      onClick={() => cambiar(id)}
      title={etiqueta}
      aria-current={activa === id}
      className={`flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition active:scale-95 ${
        activa === id
          ? 'border-emerald-400/60 bg-emerald-600 texto-cta'
          : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      <Icono nombre={icono} /> <span className="truncate">{etiqueta}</span>
    </button>
  )

  return (
    <div data-tut="infra.campos" className="flex min-w-0 flex-1 items-center gap-1.5">
      {pestana('huerto', 'sembrar', t('room.huerto.nombre', 'Comida'))}
      {pestana('granja', 'granja', t('room.granja.nombre', 'Granja'))}
    </div>
  )
}
