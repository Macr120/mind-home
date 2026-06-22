import { useEffect } from 'react'
import { useCam, type Vista } from '../state/cameraStore'
import { useLayout, mapFocusPos } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useT } from '../i18n/useT'
import { ViewCube, VIEW_CUBE_PX } from './ViewCube'
import { LookPad } from './MoveControls'

/**
 * Controles de vista 3D: selector iso/3ª/1ª, cubo y rotación debajo (mismo ancho).
 */
export function NavControls() {
  const t = useT()
  const editMode = useLayout((s) => s.editMode)
  const planosActivo = usePlanos((s) => s.activo)
  const vista = useCam((s) => s.vista)
  const setVista = useCam((s) => s.setVista)
  const centrarIso = useCam((s) => s.centrarIso)
  const rotar = useCam((s) => s.rotar)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'v') return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      if (useLayout.getState().editMode) return
      useCam.getState().ciclarVista()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reiniciarVista = () => centrarIso(mapFocusPos())
  const vistaIso = vista === 'iso'
  const vistaInterior = vista === 'interior'
  // El cubo y la rotación se muestran en iso y en la vista interior del cuarto.
  const mostrarCubo = vistaIso || vistaInterior

  const vistas: { id: Vista; etiqueta: string; title: string }[] = [
    { id: 'iso', etiqueta: t('nav3d.vistaIsoCorta', 'Iso'), title: t('nav3d.vistaIso', 'Vista isométrica') },
    { id: 'tercera', etiqueta: t('nav3d.vista3Corta', '3ª'), title: t('nav3d.vistaTercera', 'Tercera persona') },
    { id: 'primera', etiqueta: t('nav3d.vista1Corta', '1ª'), title: t('nav3d.vistaPrimera', 'Primera persona') },
  ]

  const ancho = { width: VIEW_CUBE_PX }

  const posControles = !editMode
    ? 'right-4'
    : planosActivo
      ? 'right-[21rem]'
      : 'left-4'

  return (
    <div
      className={`absolute bottom-4 z-10 flex flex-col items-stretch gap-1 ${posControles}`}
      style={ancho}
      aria-label={t('nav3d.aria', 'Controles de vista')}
    >
      {!editMode && (
        <div
          className="flex w-full overflow-hidden rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm"
          title={t('nav3d.cambiarVista', 'Cambiar vista (tecla V)')}
        >
          {vistas.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              title={v.title}
              className={`h-8 flex-1 text-xs font-semibold transition active:scale-95 ${
                vista === v.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
      )}

      {editMode && mostrarCubo && (
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-white/40">
          {vistaInterior
            ? t('nav3d.vistaInterior', 'Mirando la pared')
            : t('nav3d.vistaCuarto', 'Vista del cuarto')}
        </p>
      )}

      {mostrarCubo && (
        <>
          <ViewCube />
          <div className="flex w-full overflow-hidden rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => rotar(-1)}
              title={t('nav3d.rotarIzq', 'Rotar vista a la izquierda')}
              className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
            >
              ⟲
            </button>
            <button
              type="button"
              onClick={() => rotar(1)}
              title={t('nav3d.rotarDer', 'Rotar vista a la derecha')}
              className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
            >
              ⟳
            </button>
            <button
              type="button"
              onClick={reiniciarVista}
              title={t('nav3d.centrarMapa', 'Centrar en el mapa')}
              className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
            >
              ⌂
            </button>
          </div>
        </>
      )}

      {!vistaIso && (
        <>
          <p className="text-center text-[10px] leading-tight text-white/45">
            {vista === 'tercera'
              ? t('nav3d.ayuda3P', 'Clic derecho o joystick; rueda para zoom')
              : t('nav3d.ayuda1P', 'Clic derecho o joystick; rueda para zoom')}
          </p>
          <div className="flex justify-center">
            <LookPad />
          </div>
        </>
      )}
    </div>
  )
}
