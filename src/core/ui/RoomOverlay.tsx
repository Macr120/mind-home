import { Suspense, useState } from 'react'
import { useHouse } from '../state/houseStore'
import { getCuarto } from '../state/cuartosStore'
import { getPlantilla, type Plantilla } from '../registry'
import { useDiseño, useRoomVisual } from '../state/disenoStore'
import { ErrorBoundary } from './ErrorBoundary'
import { useT } from '../i18n/useT'

/**
 * Cuando hay un cuarto activo, dibuja la app de la plantilla asignada a sus objetos.
 * Si el cuarto tiene una sola app, se abre directo; si tiene varias, muestra un
 * lanzador para elegir cuál abrir.
 */
export function RoomOverlay({ menuFlotante = false }: { menuFlotante?: boolean }) {
  const t = useT()
  const activeRoom = useHouse((s) => s.activeRoom)
  const closeRoom = useHouse((s) => s.closeRoom)
  const objetos = useDiseño((s) => s.objetos)
  const cuarto = activeRoom ? getCuarto(activeRoom) : null
  // Color/nombre efectivos (ligados con el menú y la casa). Hooks antes de cualquier return.
  const { color, nombre } = useRoomVisual(
    cuarto?.id ?? '',
    cuarto?.color ?? '#94a3b8',
    cuarto?.nombre ?? '',
  )
  const [seleccionada, setSeleccionada] = useState<string | null>(null)

  if (!cuarto) return null

  // Plantillas únicas asignadas a los objetos del cuarto.
  const mapa = new Map<string, Plantilla>()
  for (const o of objetos) {
    if (o.roomId !== cuarto.id || !o.plantillaId) continue
    const p = getPlantilla(o.plantillaId)
    if (p) mapa.set(p.id, p)
  }
  const apps = [...mapa.values()]

  const activa =
    apps.length === 1 ? apps[0] : apps.find((p) => p.id === seleccionada) ?? null
  const App = activa?.App

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#0f1115]">
      <header
        className={`flex items-center gap-3 border-b border-white/10 py-3 pr-4 ${menuFlotante ? 'pl-52' : 'pl-4'}`}
        style={{ borderTopColor: color }}
      >
        {activa && apps.length > 1 && (
          <button
            type="button"
            onClick={() => setSeleccionada(null)}
            className="shrink-0 rounded-lg bg-white/10 px-2 py-1.5 text-sm font-semibold transition hover:bg-white/20"
            title={t('ui.volverApps', '‹ Apps del cuarto')}
          >
            ‹
          </button>
        )}
        <h1 className="min-w-0 truncate text-lg font-bold" style={{ color }}>
          {nombre}
          {activa && (
            <span className="text-white/40">
              {' · '}
              {t(`room.${activa.id}.nombre`, activa.nombre).split(' · ')[0]}
            </span>
          )}
        </h1>
        <button
          type="button"
          onClick={closeRoom}
          className="ml-auto shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
        >
          {t('ui.volverCasa', '‹ Volver a la casa')}
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {apps.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-white/50">
            <p>{t('ui.sinApp', 'Este cuarto no tiene ninguna app asignada.')}</p>
            <p className="text-xs text-white/35">
              {t('ui.sinAppAyuda', 'Edita el cuarto y asigna una app a un objeto.')}
            </p>
          </div>
        ) : App ? (
          <ErrorBoundary
            titulo={`Error en ${nombre}`}
            textoReintentar={t('ui.reintentar', 'Reintentar')}
          >
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-white/50">
                  {t('ui.cargando', 'Cargando…')}
                </div>
              }
            >
              <App />
            </Suspense>
          </ErrorBoundary>
        ) : (
          // Lanzador: el cuarto tiene varias apps, elige cuál abrir.
          <div className="mx-auto grid max-w-md grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
            {apps.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSeleccionada(p.id)}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 transition hover:bg-white/8"
                style={{ borderColor: `${p.color}44`, background: `${p.color}10` }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                  style={{ background: `${p.color}33` }}
                >
                  {p.icon}
                </span>
                <span className="text-center text-sm font-semibold text-white/90">
                  {t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
