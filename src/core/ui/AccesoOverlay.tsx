import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useT } from '../i18n/useT'

/**
 * Prompt 2D para subir/bajar de nivel cuando el personaje está al alcance de un acceso.
 * Botón fijo abajo-centro (no se proyecta a la estructura, para no estorbar el raycast).
 */
export function AccesoOverlay() {
  const t = useT()
  const nearAcceso = useHouse((s) => s.nearAcceso)
  const nearDir = useHouse((s) => s.nearDir)
  const subirNivel = useHouse((s) => s.subirNivel)
  const bajarNivel = useHouse((s) => s.bajarNivel)
  const activeRoom = useHouse((s) => s.activeRoom)
  const editMode = useLayout((s) => s.editMode)

  if (!nearAcceso || !nearDir || activeRoom || editMode) return null

  const subir = nearDir === 'subir'
  const nivelDestino = subir ? nearAcceso.nivel : nearAcceso.nivel - 1
  const texto = subir
    ? t('acceso.subir', 'Subir al nivel {n}', { n: nivelDestino })
    : nivelDestino === 0
      ? t('acceso.bajarPlanta', 'Bajar a planta baja')
      : t('acceso.bajar', 'Bajar al nivel {n}', { n: nivelDestino })

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center">
      <button
        type="button"
        onClick={subir ? subirNivel : bajarNivel}
        className="ui-panel-glass pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-400/60 px-5 py-2.5 text-sm font-black text-amber-300 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
      >
        <span className="text-lg leading-none">{subir ? '⬆️' : '⬇️'}</span>
        {texto}
      </button>
    </div>
  )
}
