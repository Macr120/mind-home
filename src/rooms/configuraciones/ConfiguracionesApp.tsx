import { useState, useEffect } from 'react'
import { db } from '../../core/data/db'
import { perfilUsuarioRepo } from '../../core/data/repository'
import type { PerfilUsuario } from '../../core/data/db'

const EMOJIS = ['😊', '😎', '🧠', '🦊', '🐼', '🦁', '🐲', '🚀', '🌙', '⭐', '🔥', '💎']

// ─── Pestaña Perfil ────────────────────────────────────────────────────────────

function PerfilTab() {
  const perfiles = perfilUsuarioRepo.useAll() ?? []
  const perfil: PerfilUsuario = perfiles[0] ?? { nombre: '', emoji: '😊', bio: '' }

  const [nombre, setNombre] = useState(perfil.nombre)
  const [emoji, setEmoji] = useState(perfil.emoji)
  const [nacimiento, setNacimiento] = useState(perfil.nacimiento ?? '')
  const [bio, setBio] = useState(perfil.bio)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    setNombre(perfil.nombre)
    setEmoji(perfil.emoji)
    setNacimiento(perfil.nacimiento ?? '')
    setBio(perfil.bio)
  }, [perfiles.length])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = { nombre: nombre.trim(), emoji, nacimiento: nacimiento || undefined, bio: bio.trim() }
    if (perfil.id) await perfilUsuarioRepo.update(perfil.id, datos)
    else await perfilUsuarioRepo.add(datos)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const edad = nacimiento
    ? Math.floor((Date.now() - new Date(nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <div className="space-y-5">
      {/* Vista previa del perfil */}
      <div className="flex items-center gap-4 rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl">
          {emoji}
        </div>
        <div>
          <p className="text-xl font-bold">{nombre || 'Tu nombre'}</p>
          {edad !== null && (
            <p className="text-sm text-white/50">{edad} años</p>
          )}
          {bio && <p className="mt-1 text-sm text-white/60">{bio}</p>}
        </div>
      </div>

      <form onSubmit={guardar} className="rounded-xl bg-white/5 p-4 space-y-4 border border-white/10">
        {/* Selector de emoji */}
        <div>
          <p className="mb-2 text-sm font-semibold">Avatar</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-10 w-10 rounded-lg text-2xl transition ${
                  emoji === e ? 'bg-white/20 ring-2 ring-white/40' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="font-semibold">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="¿Cómo te llamas?"
            maxLength={40}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Fecha de nacimiento</span>
          <input
            type="date"
            value={nacimiento}
            onChange={(e) => setNacimiento(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Bio corta</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Una frase sobre ti..."
            rows={2}
            maxLength={120}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30 resize-none"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg py-2 font-bold transition"
          style={{
            background: guardado ? '#34d399' : '#60a5fa',
            color: '#0f1115',
          }}
        >
          {guardado ? '✓ Guardado' : 'Guardar perfil'}
        </button>
      </form>
    </div>
  )
}

// ─── Pestaña Datos ─────────────────────────────────────────────────────────────

function DatosTab() {
  const [stats, setStats] = useState<{ tabla: string; filas: number }[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [borrado, setBorrado] = useState(false)

  useEffect(() => {
    const tablas = [
      'transacciones', 'sueno', 'anecdotas', 'metas', 'presupuestos',
      'registrosComida', 'planComidas', 'registrosAgua', 'alimentosFavoritos',
      'sesionesEjercicio', 'seriesFuerza', 'mediaArchivo', 'juegosMesa',
      'progresoTema', 'noticias', 'viajes', 'actividadesViaje',
      'sesionesMindfulness', 'registroAnimo', 'gratitudDiaria',
      'vehiculos', 'registrosMantenimiento',
    ] as const
    Promise.all(
      tablas.map(async (t) => ({
        tabla: t,
        filas: await (db as unknown as Record<string, { count(): Promise<number> }>)[t].count(),
      }))
    ).then((r) => setStats(r.filter((s) => s.filas > 0)))
  }, [borrado])

  const exportar = async () => {
    const tablas = Object.keys(db._dbSchema) as string[]
    const datos: Record<string, unknown[]> = {}
    for (const t of tablas) {
      datos[t] = await (db as unknown as Record<string, { toArray(): Promise<unknown[]> }>)[t].toArray()
    }
    const json = JSON.stringify(datos, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mind-home-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const borrarTodo = async () => {
    const tablas = Object.keys(db._dbSchema) as string[]
    await Promise.all(
      tablas.map((t) => (db as unknown as Record<string, { clear(): Promise<void> }>)[t].clear())
    )
    setBorrado(true)
    setConfirmando(false)
    setStats([])
  }

  const total = stats.reduce((a, s) => a + s.filas, 0)

  return (
    <div className="space-y-5">
      {/* Estadísticas */}
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Tu base de datos local</p>
        {stats.length === 0 ? (
          <p className="text-sm text-white/40">Aún no hay datos guardados.</p>
        ) : (
          <>
            <div className="space-y-2">
              {stats.map((s) => (
                <div key={s.tabla} className="flex justify-between text-sm">
                  <span className="text-white/60 capitalize">{s.tabla.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-semibold text-white/90">{s.filas}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 flex justify-between font-bold">
              <span>Total de registros</span>
              <span className="text-blue-400">{total}</span>
            </div>
          </>
        )}
      </div>

      {/* Exportar */}
      <button
        onClick={exportar}
        className="w-full rounded-xl bg-blue-400 py-3 font-bold text-black hover:bg-blue-300 transition"
      >
        ⬇️ Exportar todo como JSON
      </button>

      {/* Limpiar datos */}
      <div className="rounded-xl bg-white/5 p-4 border border-red-500/20 space-y-3">
        <p className="text-sm font-semibold text-red-400">Zona de peligro</p>
        <p className="text-xs text-white/50">
          Esto borrará TODOS tus datos de Mind Home de forma permanente. No se puede deshacer.
        </p>
        {!confirmando ? (
          <button
            onClick={() => setConfirmando(true)}
            className="w-full rounded-lg bg-red-400/10 border border-red-400/30 py-2 text-sm font-semibold text-red-400 hover:bg-red-400/20 transition"
          >
            Borrar todos mis datos
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-bold text-red-400 text-center">¿Estás seguro?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold hover:bg-white/20 transition"
              >
                Cancelar
              </button>
              <button
                onClick={borrarTodo}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white hover:bg-red-400 transition"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        )}
        {borrado && (
          <p className="text-center text-xs text-green-400">✓ Datos borrados correctamente.</p>
        )}
      </div>
    </div>
  )
}

// ─── Pestaña Acerca de ─────────────────────────────────────────────────────────

function AcercaDeTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-5 border border-white/10 text-center">
        <div className="text-5xl mb-3">🏠</div>
        <h2 className="text-xl font-black">Mind Home</h2>
        <p className="text-white/50 text-sm mt-1">v0.1.0 · Versión de desarrollo</p>
      </div>
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3 text-sm text-white/70">
        <p>
          <span className="font-semibold text-white">Tecnología</span>
          <br />React 19 · TypeScript · Vite · React Three Fiber · Zustand · Dexie · Tailwind CSS
        </p>
        <p>
          <span className="font-semibold text-white">Datos</span>
          <br />Todo se guarda localmente en tu dispositivo (IndexedDB). Nunca sale de aquí.
        </p>
        <p>
          <span className="font-semibold text-white">Próximamente</span>
          <br />Sincronización en la nube · iOS / Android con Capacitor · Más cuartos
        </p>
      </div>
    </div>
  )
}

// ─── Orquestador ──────────────────────────────────────────────────────────────

type Tab = 'perfil' | 'datos' | 'acerca'
const TABS: { id: Tab; label: string }[] = [
  { id: 'perfil', label: '👤 Perfil' },
  { id: 'datos', label: '💾 Datos' },
  { id: 'acerca', label: 'ℹ️ Acerca de' },
]

export function ConfiguracionesApp() {
  const [tab, setTab] = useState<Tab>('perfil')
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-slate-400 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'perfil' && <PerfilTab />}
      {tab === 'datos' && <DatosTab />}
      {tab === 'acerca' && <AcercaDeTab />}
    </div>
  )
}
