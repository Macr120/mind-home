import { plantillas, DESCRIPCIONES } from '../registry'
import { useAsignar } from '../state/asignarStore'
import { useDiseño } from '../state/disenoStore'
import { getCuarto } from '../state/cuartosStore'
import { useT } from '../i18n/useT'

/** Objeto 3D por defecto que encarna una app cuando se asigna desde el menú. */
const TIPO_OBJETO_APP = 'mesa'

/**
 * Catálogo de plantillas (apps) para asignar a un cuarto u objeto.
 * - Si `objetoId` viene definido, fija la plantilla en ese objeto.
 * - Si no, crea un objeto-app nuevo en el cuarto con la plantilla.
 */
export function AsignarPlantillaDialog() {
  const t = useT()
  const cuartoId = useAsignar((s) => s.cuartoId)
  const objetoId = useAsignar((s) => s.objetoId)
  const cerrar = useAsignar((s) => s.cerrar)
  const addObjeto = useDiseño((s) => s.addObjeto)
  const setObjetoPlantilla = useDiseño((s) => s.setObjetoPlantilla)

  if (!cuartoId) return null
  const cuarto = getCuarto(cuartoId)

  const elegir = async (plantillaId: string, color: string) => {
    if (objetoId != null) {
      await setObjetoPlantilla(objetoId, plantillaId)
    } else {
      await addObjeto(cuartoId, TIPO_OBJETO_APP, color, plantillaId)
    }
    cerrar()
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="ui-panel flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12151c]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-base font-black text-white/90">
            {t('asignar.titulo', 'Asignar app')}
            {cuarto && <span className="text-white/40"> · {cuarto.nombre}</span>}
          </span>
          <button
            type="button"
            onClick={cerrar}
            className="ml-auto rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        <div className="scroll-sutil grid min-h-0 grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3">
          {plantillas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => elegir(p.id, p.color)}
              className="flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition hover:bg-white/8"
              style={{ borderColor: `${p.color}44`, background: `${p.color}10` }}
              title={DESCRIPCIONES[p.id] ?? p.nombre}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md text-lg"
                style={{ background: `${p.color}33` }}
              >
                {p.icon}
              </span>
              <span className="text-sm font-semibold text-white/90">
                {t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
              </span>
              <span className="line-clamp-2 text-[11px] leading-snug text-white/45">
                {t(`room.${p.id}.desc`, DESCRIPCIONES[p.id] ?? '')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
