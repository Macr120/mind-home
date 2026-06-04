import { useState } from 'react'
import { rooms } from '../../core/registry'
import { useDiseño, AVATAR_DEFAULT } from '../../core/state/disenoStore'

// ─── Selector de color compacto ────────────────────────────────────────────────

const PALETA = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#64748b', '#94a3b8', '#cbd5e1', '#fbbf24', '#34d399',
  '#ffd23b', '#2f5fd0', '#e23b3b', '#60a5fa', '#a78bfa', '#fb7185',
]

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (c: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {PALETA.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-7 w-7 rounded-md transition hover:scale-110"
            style={{
              background: c,
              boxShadow: value === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
            }}
          />
        ))}
      </div>
      {/* Color personalizado */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          title="Color personalizado"
        />
        <span className="text-xs text-white/40">Color personalizado: {value}</span>
      </div>
    </div>
  )
}

// ─── Pestaña Cuartos ──────────────────────────────────────────────────────────

function CuartosTab() {
  const { roomColors, roomNames, setRoomColor, setRoomName, resetRoom } = useDiseño()
  const [expandido, setExpandido] = useState<string | null>(null)
  const [nombres, setNombres] = useState<Record<string, string>>({})

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40 mb-3">
        Los cambios se reflejan en la casa 3D en tiempo real.
      </p>
      {rooms.map((room) => {
        const colorActual = roomColors[room.id] ?? room.color
        const nombreActual = roomNames[room.id] ?? ''
        const abierto = expandido === room.id
        const modificado = !!roomColors[room.id] || !!roomNames[room.id]

        return (
          <div
            key={room.id}
            className="rounded-xl border overflow-hidden transition"
            style={{ borderColor: abierto ? colorActual : 'rgba(255,255,255,0.08)' }}
          >
            {/* Cabecera del cuarto */}
            <button
              type="button"
              onClick={() => setExpandido(abierto ? null : room.id)}
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/5"
            >
              <span
                className="h-8 w-8 rounded-lg flex-shrink-0 border-2"
                style={{ background: colorActual, borderColor: colorActual + '88' }}
              />
              <span className="flex-1 min-w-0">
                <span className="text-sm font-semibold block truncate">
                  {room.icon} {nombreActual || room.nombre.split(' · ')[0]}
                </span>
                {nombreActual && (
                  <span className="text-xs text-white/40">Original: {room.nombre.split(' · ')[0]}</span>
                )}
              </span>
              {modificado && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">editado</span>
              )}
              <span className="text-white/30">{abierto ? '▲' : '▼'}</span>
            </button>

            {/* Panel de edición */}
            {abierto && (
              <div className="border-t border-white/10 px-3 pb-4 pt-3 space-y-4">
                {/* Color */}
                <div>
                  <p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Color</p>
                  <ColorPicker
                    value={colorActual}
                    onChange={(c) => setRoomColor(room.id, c)}
                  />
                </div>
                {/* Nombre */}
                <div>
                  <p className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Nombre personalizado</p>
                  <div className="flex gap-2">
                    <input
                      value={nombres[room.id] ?? nombreActual}
                      onChange={(e) => setNombres((n) => ({ ...n, [room.id]: e.target.value }))}
                      placeholder={room.nombre.split(' · ')[0]}
                      maxLength={30}
                      className="flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-sm outline-none border border-white/10 focus:border-white/30"
                    />
                    <button
                      onClick={() => {
                        const n = nombres[room.id] ?? ''
                        setRoomName(room.id, n)
                      }}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 transition"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
                {/* Reset */}
                {modificado && (
                  <button
                    onClick={() => {
                      resetRoom(room.id)
                      setNombres((n) => { const c = { ...n }; delete c[room.id]; return c })
                    }}
                    className="text-xs text-white/40 hover:text-white/70 transition"
                  >
                    ↺ Restaurar valores originales
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Pestaña Avatar ──────────────────────────────────────────────────────────

function AvatarTab() {
  const { avatar, setAvatarColor, resetAvatar } = useDiseño()
  const [parte, setParte] = useState<'cabeza' | 'torso' | 'piernas'>('cabeza')

  const partes: { id: typeof parte; label: string }[] = [
    { id: 'cabeza', label: '🟡 Cabeza' },
    { id: 'torso', label: '🔴 Torso' },
    { id: 'piernas', label: '🔵 Piernas' },
  ]

  const esDefault =
    avatar.cabeza === AVATAR_DEFAULT.cabeza &&
    avatar.torso === AVATAR_DEFAULT.torso &&
    avatar.piernas === AVATAR_DEFAULT.piernas

  return (
    <div className="space-y-5">
      {/* Vista previa del avatar (simplificado 2D) */}
      <div className="flex justify-center py-4">
        <div className="flex flex-col items-center gap-0.5">
          {/* cabeza */}
          <div
            className="w-10 h-10 rounded-lg"
            style={{ background: avatar.cabeza, boxShadow: `0 2px 8px ${avatar.cabeza}88` }}
          />
          {/* torso + brazos */}
          <div className="flex items-center gap-0.5">
            <div className="w-4 h-8 rounded-sm" style={{ background: avatar.torso }} />
            <div className="w-8 h-10 rounded-lg" style={{ background: avatar.torso }} />
            <div className="w-4 h-8 rounded-sm" style={{ background: avatar.torso }} />
          </div>
          {/* piernas */}
          <div className="flex gap-0.5">
            <div className="w-4 h-9 rounded-b-md" style={{ background: avatar.piernas }} />
            <div className="w-4 h-9 rounded-b-md" style={{ background: avatar.piernas }} />
          </div>
        </div>
      </div>

      {/* Selector de parte */}
      <div className="flex gap-2">
        {partes.map((p) => (
          <button
            key={p.id}
            onClick={() => setParte(p.id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              parte === p.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <ColorPicker
        value={avatar[parte]}
        onChange={(c) => setAvatarColor(parte, c)}
      />

      {!esDefault && (
        <button
          onClick={resetAvatar}
          className="w-full rounded-xl bg-white/5 py-2 text-sm text-white/50 hover:bg-white/10 transition"
        >
          ↺ Restaurar colores originales
        </button>
      )}
    </div>
  )
}

// ─── Orquestador ──────────────────────────────────────────────────────────────

type Tab = 'cuartos' | 'avatar'
const TABS: { id: Tab; label: string }[] = [
  { id: 'cuartos', label: '🎨 Cuartos' },
  { id: 'avatar', label: '🧑 Avatar' },
]

export function DisenoApp() {
  const [tab, setTab] = useState<Tab>('cuartos')
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-slate-300 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'cuartos' && <CuartosTab />}
      {tab === 'avatar' && <AvatarTab />}
    </div>
  )
}
