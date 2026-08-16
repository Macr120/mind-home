import { Suspense, useState, useSyncExternalStore } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useHouse } from '../state/houseStore'
import { getCuarto } from '../state/cuartosStore'
import { catalogoPlantillasStore, getPlantilla, type Plantilla } from '../registry'
import { acento, tono } from '../../rooms/_shared/acento'
import { intencionAppActiva } from '../state/intencionApp'
import { useDiseño, useRoomVisual } from '../state/disenoStore'
import { ErrorBoundary } from './ErrorBoundary'
import { ListaHoy } from './hoy/ListaHoy'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { BotonTutorialApp } from '../tutorial/BotonTutorialApp'
import { ControlMusica } from './ControlMusica'
import { vivo } from './estilos'
import { GateAppDemo } from '../../demo/GateAppDemo'

/**
 * Cuando hay un cuarto activo, dibuja la app de la plantilla asignada a sus objetos.
 * Si el cuarto tiene una sola app, se abre directo; si tiene varias, muestra un
 * lanzador para elegir cuál abrir.
 */
export function RoomOverlay({ menuFlotante = false }: { menuFlotante?: boolean }) {
  const t = useT()
  const activeRoom = useHouse((s) => s.activeRoom)
  const closeRoom = useHouse((s) => s.closeRoom)
  // Solo las apps asignadas al cuarto activo (estables al mover objetos).
  const appIds = useDiseño(
    useShallow((s) => {
      const ids: string[] = []
      for (const o of s.objetos)
        if (o.roomId === activeRoom && o.plantillaId && !ids.includes(o.plantillaId)) ids.push(o.plantillaId)
      return ids
    }),
  )
  const cuarto = activeRoom ? getCuarto(activeRoom) : null
  // Color/nombre efectivos (ligados con el menú y la casa). Hooks antes de cualquier return.
  const { color, nombre } = useRoomVisual(
    cuarto?.id ?? '',
    cuarto?.color ?? '#94a3b8',
    cuarto?.nombre ?? '',
  )
  const [seleccionada, setSeleccionada] = useState<string | null>(null)
  // Marca de la última intención de chat aplicada (para aplicarla una sola vez).
  const [intencionVista, setIntencionVista] = useState<number | null>(null)
  // Re-render cuando llegan las plantillas custom de Dexie: sin esto, entrar al
  // cuarto antes de que resuelvan dejaba «sin app asignada» hasta recargar.
  useSyncExternalStore(catalogoPlantillasStore.subscribe, catalogoPlantillasStore.getSnapshot)

  if (!cuarto) return null

  // Plantillas únicas asignadas a los objetos del cuarto.
  const mapa = new Map<string, Plantilla>()
  for (const pid of appIds) {
    const p = getPlantilla(pid)
    if (p) mapa.set(p.id, p)
  }
  const apps = [...mapa.values()]

  // La intención del chat («abre las compras») preselecciona su app en el
  // lanzador aunque el cuarto tenga varias (ajuste en render, sin efecto).
  const intencion = intencionAppActiva()
  if (intencion && intencion.creada !== intencionVista && mapa.has(intencion.appId)) {
    setIntencionVista(intencion.creada)
    setSeleccionada(intencion.appId)
  }

  const activa =
    apps.length === 1 ? apps[0] : apps.find((p) => p.id === seleccionada) ?? null
  const App = activa?.App

  return (
    // El color de la app abierta baja como acento a todo su 2D (`--ui-accent*`):
    // los `ui-accent-bg` de formularios y chips heredan el tono de formularios
    // sin que cada archivo tenga que importar su color.
    <div
      className="ui-app ui-app-entra absolute inset-0 z-20 flex flex-col"
      style={activa ? acento(tono(activa.color, 3)) : undefined}
    >
      {/* El hueco del menú flotante se reserva a la medida del móvil (su chip
          plegado mide ~114 px) y solo a partir de `sm` al ancho completo: con
          208 px reservados en 375 no cabían ni el chip ni «Volver a la casa». */}
      <header
        data-tut="room.header"
        className={`flex items-center gap-2 border-b border-white/10 pb-3 pt-[calc(0.75rem+var(--safe-top))] pe-4 sm:gap-3 ${
          menuFlotante ? 'ps-32 sm:ps-52' : 'ps-4'
        }`}
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
        <h1 className="texto-vivo min-w-0 flex-1 truncate text-lg font-bold" style={vivo(color)}>
          {nombre}
          {activa && (
            <span className="text-white/40">
              {' · '}
              {t(`room.${activa.id}.nombre`, activa.nombre).split(' · ')[0]}
            </span>
          )}
        </h1>
        {/* El `ms-auto` va en el grupo y no en la música: la checklist se esconde
            sola (sin pasos, o apagada en esa app) y se llevaría el empuje. */}
        <div className="ms-auto flex shrink-0 items-center gap-3">
          {/* La checklist diaria de la app abierta (objetivos, lo agendado y sus
              metas): un chip aquí, montado una vez y no en cada app. */}
          {activa && <ListaHoy plantillaId={activa.id} color={activa.color} />}
          {/* Música: el tema de este cuarto y la ambiental, sin salir de la app. */}
          <ControlMusica cuartoId={cuarto.id} />
        </div>
        {/* Tutorial de la app abierta, a la izquierda de «Volver a la casa». */}
        {activa && <BotonTutorialApp plantilla={activa} montada />}
        {/* En móvil solo la flecha: con el chip de la checklist, la etiqueta
            entera empujaba este botón fuera de la pantalla. */}
        <button
          type="button"
          data-tut="room.volver"
          onClick={closeRoom}
          title={t('ui.volverCasa', '‹ Volver a la casa')}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
        >
          <span className="sm:hidden">‹</span>
          <span className="hidden sm:inline">{t('ui.volverCasa', '‹ Volver a la casa')}</span>
        </button>
      </header>
      <main
        data-tut-zona={activa ? `app:${activa.id}` : undefined}
        className="min-h-0 flex-1 overflow-auto p-4 md:p-6"
      >
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
              <GateAppDemo plantillaId={activa.id}>
                <App />
              </GateAppDemo>
            </Suspense>
          </ErrorBoundary>
        ) : (
          // Lanzador: el cuarto tiene varias apps, elige cuál abrir.
          <div data-tut="room.lanzador" className="mx-auto grid max-w-md grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
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
                  <Icono emoji={p.icon} />
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
