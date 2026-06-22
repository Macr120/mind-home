import { useState } from 'react'
import type { RoomModule } from '../../registry'
import { useDiseño } from '../../state/disenoStore'
import { ColorPicker } from './ColorPicker'
import { useT } from '../../i18n/useT'

/** Color y nombre del cuarto que se está editando. */
export function EditorRoomStyleSection({
  room,
  embed,
}: {
  room: RoomModule
  embed?: boolean
}) {
  const t = useT()
  const { roomColors, roomNames, setRoomColor, setRoomName, resetRoom } = useDiseño()
  const colorActual = roomColors[room.id] ?? room.color
  const nombreActual = roomNames[room.id] ?? ''
  const [nombre, setNombre] = useState(nombreActual)
  const modificado = !!roomColors[room.id] || !!roomNames[room.id]

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && (
        <p className="text-sm font-semibold">
          {room.icon} Apariencia del cuarto
        </p>
      )}
      <div>
        <p className="text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
          {t('editor.room.color', 'Color del cuarto')}
        </p>
        <ColorPicker
          value={colorActual}
          onChange={(c) => setRoomColor(room.id, c)}
        />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
          {t('editor.room.nombre', 'Nombre personalizado')}
        </p>
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={room.nombre.split(' · ')[0]}
            maxLength={30}
            className="flex-1 rounded-lg bg-black/30 px-2 py-1.5 text-sm outline-none border border-white/10 focus:border-white/30"
          />
          <button
            type="button"
            onClick={() => setRoomName(room.id, nombre)}
            className="rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20 transition"
          >
            {t('editor.room.aplicar', 'Aplicar')}
          </button>
        </div>
      </div>
      {modificado && (
        <button
          type="button"
          onClick={() => {
            resetRoom(room.id)
            setNombre('')
          }}
          className="text-[11px] text-white/40 hover:text-white/70 transition"
        >
          {t('editor.room.reset', '↺ Restaurar apariencia original')}
        </button>
      )}
    </div>
  )
}
