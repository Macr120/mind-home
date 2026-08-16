import { MODELOS } from '../house/modelosRecursos'
import { RECURSOS } from '../house/recursos'
import { useDiseño } from '../state/disenoStore'
import { getTema } from '../house/temas'
import { MiniaturaModelo } from '../house/Miniatura'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

const nombreRecurso = (id: number): string =>
  RECURSOS.find((r) => r.id === id)?.nombre ?? `Recurso ${id}`

// Mismo orden de carpetas que Inventario › Objetos (ObjetosCatalogo.tsx): orden
// manual guardado por el usuario, y si no hay, el de primera aparición en RECURSOS.
const ORDEN_CATS_KEY = 'mh_libreria_orden_categorias'
const ORDEN_CATALOGO = [...new Set(RECURSOS.map((r) => r.categoria))]

function leerOrdenCategorias(): string[] {
  try {
    const raw = localStorage.getItem(ORDEN_CATS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Ids de recurso con modelo 3D, agrupados por categoría en el mismo orden que las carpetas del inventario. */
function porCategoria(): { categoria: string; ids: number[] }[] {
  const grupos = new Map<string, number[]>()
  for (const id of Object.keys(MODELOS).map(Number)) {
    const cat = RECURSOS.find((r) => r.id === id)?.categoria ?? 'Otros'
    const arr = grupos.get(cat) ?? []
    arr.push(id)
    grupos.set(cat, arr)
  }
  const manual = leerOrdenCategorias()
  const categorias = [...grupos.keys()].sort((a, b) => {
    const ia = manual.indexOf(a)
    const ib = manual.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    const oa = ORDEN_CATALOGO.indexOf(a)
    const ob = ORDEN_CATALOGO.indexOf(b)
    return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob) || a.localeCompare(b)
  })
  return categorias.map((categoria) => ({ categoria, ids: grupos.get(categoria)! }))
}

/**
 * Selector de un objeto 3D (todos los del juego, en carpetas por categoría —
 * el mismo orden que Inventario › Objetos) para agregarlo al conjunto de una
 * plantilla.
 */
export function SelectorObjeto3D({
  onElegir,
  onCerrar,
}: {
  onElegir: (recurso: number) => void
  onCerrar: () => void
}) {
  const t = useT()
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const grupos = porCategoria()

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="ui-panel ui-pop flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-base font-black text-white/90">
            {t('selObjeto.titulo', 'Agregar objeto')}
          </span>
          <button
            type="button"
            onClick={onCerrar}
            className="ms-auto rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-white/80 transition hover:bg-white/20"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto p-3">
          {grupos.map(({ categoria, ids }) => (
            <div key={categoria}>
              <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                <Icono emoji="📁" />
                {categoria}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {ids.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onElegir(id)}
                    title={nombreRecurso(id)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1.5 transition hover:border-white/30 hover:bg-white/10"
                  >
                    <MiniaturaModelo
                      tipo={`recurso:${id}`}
                      color={MODELOS[id].defaultColor}
                      tema={tema}
                      className="h-12 w-full object-contain"
                    />
                    <span className="w-full truncate text-center text-[9px] leading-tight text-white/60">
                      {nombreRecurso(id)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
