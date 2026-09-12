import type { ReactNode } from 'react'
import type { ProyectoVideo } from '../../core/data/db'
import { proyectosVideoRepo, VACIO } from '../../core/data/repository'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, FILA_INTERACTIVA, Modal, TARJETA } from '../_shared/ui'
import { COLOR } from './constantes'
import { clipsDe, duracionTotal, finPrincipal, migrarProyecto } from './modelo'
import { crearProyecto } from './ProyectosTab'

/**
 * Elegir (o estrenar) un proyecto del Studio desde dentro del editor: las
 * animaciones 3D desde un video («Animación 3D» de Añadir y editar: se rueda
 * en el mapa y la toma vuelve como clip) o el video al que va una toma
 * («A un proyecto de video» del Exportar de película). `fin` = segundo donde
 * acaba su pista principal (0 en uno nuevo): ahí entra el clip.
 */
export function SelectorProyecto({
  escenario,
  intro,
  onElegir,
  onCerrar,
  extra,
}: {
  escenario: 'video' | '3d'
  intro: string
  onElegir: (id: number, fin: number) => void
  onCerrar: () => void
  /** Acción propia de cada fila (p. ej. usar la toma ya guardada de una animación). */
  extra?: (p: ProyectoVideo & { id: number }) => ReactNode
}) {
  const t = useT()
  const todos = proyectosVideoRepo.useAll() ?? VACIO
  const es3d = escenario === '3d'
  const proyectos = todos.filter((p) => (p.escenario === '3d') === es3d && p.id != null) as (ProyectoVideo & { id: number })[]
  const nuevo = es3d ? t('video.lista.nuevo3d', 'Nueva animación 3D') : t('video.lista.nuevo', 'Nuevo video')
  return (
    <Modal titulo={es3d ? t('video.tab.animacion3d', 'Animación 3D') : t('video.pelicula.elegirVideo', '¿En qué video?')} onCerrar={onCerrar} ancho="max-w-lg">
      <p className="text-xs text-white/50">{intro}</p>
      <div className="flex justify-end">
        <BotonPrimario
          type="button"
          pequeno
          app={COLOR}
          onClick={() => {
            void crearProyecto(escenario).then((id) => {
              if (id != null) onElegir(id, 0)
            })
          }}
        >
          <Icono nombre="agregar" /> {nuevo}
        </BotonPrimario>
      </div>
      {proyectos.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/45">{es3d ? t('video.lista.vacio3d', 'Aún no hay animaciones 3D') : t('video.lista.vacio', 'Aún no hay videos')}</p>
      ) : (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {proyectos.map((p) => {
            // Resumen en cualquier formato: migra en memoria (nunca persiste aquí).
            const { clips } = migrarProyecto(p, () => undefined).proyecto
            return (
              <li key={p.id} className={`${TARJETA} ${FILA_INTERACTIVA} flex items-center gap-3 p-3`}>
                <button type="button" onClick={() => onElegir(p.id, finPrincipal(clips))} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{p.nombre}</p>
                  <p className="text-xs text-white/45">
                    {t('video.lista.meta', '{escenas} escenas · {seg} s · {aspecto}', {
                      escenas: clipsDe(clips, 'video').length,
                      seg: Math.round(duracionTotal(clips)),
                      aspecto: p.aspecto,
                    })}{' '}
                    · {new Date(p.actualizadoEn).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })}
                  </p>
                </button>
                {extra?.(p)}
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
