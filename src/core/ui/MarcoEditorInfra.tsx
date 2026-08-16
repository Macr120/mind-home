import type { ReactNode } from 'react'
import type { NombreIcono } from './iconos/catalogo'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { useTopeHud } from './hudMedida'

/**
 * Marco común de los editores de infraestructura (Caminos, Canchas, Huerto y
 * Granja): un solo panel abajo con el nombre y la salida como cabecera y las
 * herramientas debajo (antes el encabezado flotaba aparte y gastaba una franja
 * de alto). Mientras están abiertos, el HUD de la casa pliega sus esquinas
 * superiores (ver `FloatingMenuButton` y `ToolbarPermanente`).
 */
export function MarcoEditorInfra({
  icono,
  titulo,
  /** Prefijo de los `data-tut` del editor (p. ej. 'caminos'). */
  tut,
  onSalir,
  /** Clases de ancho del panel; por defecto una columna fija cómoda. */
  ancho = 'w-full max-w-md',
  /** Conmutador que sustituye al icono + título (Comida ↔ Granja). */
  pestanas,
  children,
}: {
  icono: NombreIcono
  titulo: string
  tut: string
  onSalir: () => void
  ancho?: string
  pestanas?: ReactNode
  children: ReactNode
}) {
  const t = useT()
  // Su panel ocupa el bajo: los prompts contextuales se apilan por encima.
  const refTope = useTopeHud('editorInfra')

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div ref={refTope} className="absolute bottom-3 start-0 end-0 flex justify-center px-2">
        <div
          data-tut={`${tut}.barra`}
          data-tut-zona={`app:${tut}`}
          className={`ui-hud ui-pop pointer-events-auto flex ${ancho} flex-col gap-2 rounded-xl border border-white/10 p-2`}
        >
          <div
            data-tut={`${tut}.header`}
            className="flex items-center gap-2 border-b border-white/10 px-1 pb-1.5 text-sm font-semibold text-white"
          >
            {pestanas ?? (
              <>
                <Icono nombre={icono} />
                <span className="min-w-0 flex-1 truncate">{titulo}</span>
              </>
            )}
            <button
              type="button"
              data-tut={`${tut}.salir`}
              onClick={onSalir}
              title={t('infra.salirEditor', 'Salir del editor')}
              aria-label={t('infra.salirEditor', 'Salir del editor')}
              className="rounded px-1 text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              <Icono nombre="cerrar" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
