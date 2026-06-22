import { useState } from 'react'
import { getRoom } from '../registry'
import { useConstruir } from '../state/construirStore'
import { useLayout, roomFocusPos } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useCam } from '../state/cameraStore'
import type { TipoAcceso } from '../house/walls'
import { useT } from '../i18n/useT'

const ACCESOS: { tipo: TipoAcceso; icon: string }[] = [
  { tipo: 'escalera', icon: '🌀' },
  { tipo: 'elevador', icon: '🛗' },
  { tipo: 'resbaladilla', icon: '💨' },
]

const nombreCorto = (id: string) => getRoom(id)?.nombre.split(' · ')[0] ?? id

/** Diálogo modal para elegir dónde se construye un cuarto nuevo: planta baja o encima. */
export function ConstruirCuartoDialog() {
  const t = useT()
  const roomId = useConstruir((s) => s.roomId)
  const cerrar = useConstruir((s) => s.cerrar)
  const focusRoom = useCam((s) => s.focusRoom)
  const roomColors = useDiseño((s) => s.roomColors)
  // Suscripciones para recomputar los helpers cuando cambia el layout.
  useLayout((s) => s.placed)
  useLayout((s) => s.accesos)
  const { hayPlantaBaja, basesDisponibles, nivelTieneAcceso, niveles, addRoomGround, addRoomOnTop } =
    useLayout.getState()

  const [paso, setPaso] = useState<'donde' | 'base' | 'acceso'>('donde')
  const [baseId, setBaseId] = useState<string | null>(null)
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null)

  // Reinicia el flujo cada vez que se abre para otro cuarto (el componente no se
  // desmonta: renderiza null al cerrar, así que el estado persistiría sin esto).
  if (roomId !== abiertoPara) {
    setAbiertoPara(roomId)
    setPaso('donde')
    setBaseId(null)
  }

  if (!roomId) return null
  const room = getRoom(roomId)
  if (!room) return null

  const color = roomColors[roomId] ?? room.color
  const bases = basesDisponibles()
  const conPlantaBaja = hayPlantaBaja()

  const cerrarTodo = () => {
    setPaso('donde')
    setBaseId(null)
    cerrar()
  }

  const enfocar = () => focusRoom(roomFocusPos(roomId))

  const construirPlantaBaja = async () => {
    await addRoomGround(roomId)
    enfocar()
    cerrarTodo()
  }

  const elegirBase = (id: string) => {
    const nivel = (niveles[id] ?? 0) + 1
    if (nivelTieneAcceso(nivel)) {
      addRoomOnTop(roomId, id).then(() => {
        enfocar()
        cerrarTodo()
      })
      return
    }
    setBaseId(id)
    setPaso('acceso')
  }

  const elegirAcceso = async (tipo: TipoAcceso) => {
    if (!baseId) return
    await addRoomOnTop(roomId, baseId, tipo)
    enfocar()
    cerrarTodo()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={cerrarTodo}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12151c] p-5 shadow-2xl"
        style={{ boxShadow: `0 8px 40px ${color}33` }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
            style={{ background: `${color}33` }}
          >
            {room.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{nombreCorto(roomId)}</p>
            <p className="text-[11px] text-white/45">{t('construir.donde', '¿Dónde lo construyes?')}</p>
          </div>
          <button
            onClick={cerrarTodo}
            className="ml-auto rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          >
            ✕
          </button>
        </header>

        {/* Paso 1: planta baja o encima */}
        {paso === 'donde' && (
          <div className="space-y-2">
            <button
              onClick={construirPlantaBaja}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
            >
              <span className="text-2xl">🏠</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t('construir.plantaBaja', 'Planta baja')}</span>
                <span className="block text-[11px] text-white/45">{t('construir.plantaDesc', 'Al nivel del suelo, junto a los demás.')}</span>
              </span>
            </button>
            <button
              onClick={() => setPaso('base')}
              disabled={!conPlantaBaja || bases.length === 0}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-2xl">🔼</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t('construir.encima', 'Encima de un cuarto')}</span>
                <span className="block text-[11px] text-white/45">
                  {!conPlantaBaja
                    ? t('construir.sinBase', 'Primero necesitas un cuarto en planta baja.')
                    : bases.length === 0
                      ? t('construir.sinLibres', 'No hay cuartos libres para apilar encima.')
                      : t('construir.apilar', 'Se apila sobre otro y flota hasta que teches la casa.')}
                </span>
              </span>
            </button>
          </div>
        )}

        {/* Paso 2: elegir el cuarto base */}
        {paso === 'base' && (
          <div className="space-y-2">
            <p className="text-[11px] text-white/45">{t('construir.eligeBase', 'Elige sobre qué cuarto se apila:')}</p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {bases.map((b) => {
                const bc = roomColors[b.id] ?? b.color
                const nivel = (niveles[b.id] ?? 0) + 1
                return (
                  <button
                    key={b.id}
                    onClick={() => elegirBase(b.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/10"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                      style={{ background: `${bc}33` }}
                    >
                      {b.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{nombreCorto(b.id)}</span>
                      <span className="block text-[11px] text-white/45">
                        {t('construir.enNivel', `Quedará en el nivel ${nivel}`, { n: String(nivel) })}
                      </span>
                    </span>
                    <span className="text-white/30">→</span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPaso('donde')}
              className="mt-1 text-[11px] text-white/40 transition hover:text-white/70"
            >
              {t('construir.volver', '← Volver')}
            </button>
          </div>
        )}

        {/* Paso 3: elegir el acceso del nuevo nivel */}
        {paso === 'acceso' && (
          <div className="space-y-2">
            <p className="text-[11px] text-white/45">
              {t('construir.elegirAcceso', '¿Cómo se sube a este nivel nuevo? (se elige una vez por nivel)')}
            </p>
            {ACCESOS.map((a) => (
              <button
                key={a.tipo}
                onClick={() => elegirAcceso(a.tipo)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">
                    {t(`construir.${a.tipo}.label` as Parameters<typeof t>[0], a.tipo)}
                  </span>
                  <span className="block text-[11px] text-white/45">
                    {t(`construir.${a.tipo}.desc` as Parameters<typeof t>[0], '')}
                  </span>
                </span>
              </button>
            ))}
            <button
              onClick={() => setPaso('base')}
              className="mt-1 text-[11px] text-white/40 transition hover:text-white/70"
            >
              {t('construir.volver', '← Volver')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
