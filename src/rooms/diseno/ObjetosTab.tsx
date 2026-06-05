import { useState } from 'react'
import { rooms } from '../../core/registry'
import { useDiseño, MAX_OBJETOS } from '../../core/state/disenoStore'
import { CATALOGO } from '../../core/house/catalogo'
import { ColorPicker } from './ColorPicker'

export function ObjetosTab({
  roomId: roomIdProp,
  onRoomChange,
}: {
  /** Si se pasa, el cuarto lo controla el padre (editor 3D). */
  roomId?: string
  onRoomChange?: (id: string) => void
}) {
  const [roomIdLocal, setRoomIdLocal] = useState(rooms[0].id)
  const roomId = roomIdProp ?? roomIdLocal
  const setRoomId = (id: string) => {
    if (onRoomChange) onRoomChange(id)
    else setRoomIdLocal(id)
  }
  const {
    furnitureColors,
    objetos,
    setFurnitureColor,
    addObjeto,
    setObjetoColor,
    removeObjeto,
  } = useDiseño()

  const room = rooms.find((r) => r.id === roomId)!
  const muebleColor = furnitureColors[roomId] ?? '#7a5230'
  const objetosCuarto = objetos.filter((o) => o.roomId === roomId)
  const lleno = objetosCuarto.length >= MAX_OBJETOS

  return (
    <div className="space-y-5">
      {/* Selector de cuarto */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">
          Cuarto
        </p>
        <div className="flex flex-wrap gap-1.5">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoomId(r.id)}
              className="rounded-lg px-2 py-1.5 text-sm transition"
              style={{
                background: roomId === r.id ? `${r.color}33` : 'rgba(255,255,255,0.05)',
                boxShadow: roomId === r.id ? `inset 0 0 0 1px ${r.color}` : 'none',
              }}
              title={r.nombre}
            >
              {r.icon}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-sm font-semibold text-white/80">
          {room.icon} {room.nombre.split(' · ')[0]}
        </p>
      </div>

      {/* Color del mueble principal */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="mb-3 text-sm font-semibold">Color del mueble principal</p>
        <ColorPicker
          value={muebleColor}
          onChange={(c) => setFurnitureColor(roomId, c)}
        />
      </div>

      {/* Agregar decoración */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Agregar decoración</p>
          <span className="text-xs text-white/40">
            {objetosCuarto.length}/{MAX_OBJETOS}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CATALOGO.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={lleno}
              onClick={() => addObjeto(roomId, item.id, item.defaultColor)}
              className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-2.5 text-xs transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white/70">{item.nombre}</span>
            </button>
          ))}
        </div>
        {lleno && (
          <p className="mt-2 text-center text-[11px] text-amber-400/80">
            Cuarto lleno ({MAX_OBJETOS} objetos). Quita alguno para agregar más.
          </p>
        )}
      </div>

      {/* Decoración colocada */}
      {objetosCuarto.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">
            En este cuarto
          </p>
          {objetosCuarto.map((o) => {
            const item = CATALOGO.find((i) => i.id === o.tipo)
            return (
              <div
                key={o.id}
                className="rounded-xl bg-white/5 p-3 border border-white/10"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">{item?.icon}</span>
                  <span className="text-sm font-semibold">{item?.nombre}</span>
                  <button
                    onClick={() => o.id && removeObjeto(o.id)}
                    className="ml-auto text-white/30 hover:text-red-400"
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
                <ColorPicker
                  value={o.color}
                  onChange={(c) => o.id && setObjetoColor(o.id, c)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
