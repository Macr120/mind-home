import { plantillasCuarto, DESCRIPCIONES } from '../registry'
import { useAsignar } from '../state/asignarStore'
import { useDiseño } from '../state/disenoStore'
import { getCuarto } from '../state/cuartosStore'
import { iniciarAsignacion } from '../state/amueblarStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Catálogo de plantillas (apps) para asignar a un cuarto u objeto. Solo lista
 * las apps LIBRES (cada app vive en un solo cuarto a la vez).
 * La app llega con su conjunto de objetos (el asistente que la atiende se elige
 * en el catálogo de Plantillas del inventario).
 * - Si `objetoId` viene definido, fija la plantilla en ese objeto.
 * - Si no, siembra el conjunto y liga la app al objeto principal.
 */
export function AsignarPlantillaDialog() {
  const t = useT()
  const cuartoId = useAsignar((s) => s.cuartoId)
  const objetoId = useAsignar((s) => s.objetoId)
  const cerrar = useAsignar((s) => s.cerrar)
  const objetos = useDiseño((s) => s.objetos)

  if (!cuartoId) return null
  const cuarto = getCuarto(cuartoId)

  const asignadas = new Set(objetos.map((o) => o.plantillaId).filter(Boolean))
  const disponibles = plantillasCuarto().filter((p) => !asignadas.has(p.id))

  const elegir = async (plantillaId: string) => {
    cerrar()
    await iniciarAsignacion(cuartoId, plantillaId, objetoId)
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <div
        className="ui-panel ui-pop flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
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

        {disponibles.length === 0 && (
          <p className="px-4 py-6 text-center text-xs leading-relaxed text-white/45">
            {t(
              'plantillas.todasAsignadas',
              'Todas las apps ya viven en un cuarto. Si borras un cuarto, su plantilla vuelve aquí.',
            )}
          </p>
        )}
        <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3">
          {disponibles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => elegir(p.id)}
              className="flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition hover:bg-white/8"
              style={{ borderColor: `${p.color}44`, background: `${p.color}10` }}
              title={DESCRIPCIONES[p.id] ?? p.nombre}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md text-lg"
                style={{ background: `${p.color}33` }}
              >
                <Icono emoji={p.icon} />
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
