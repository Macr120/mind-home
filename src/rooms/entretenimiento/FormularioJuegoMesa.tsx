import { useState } from 'react'
import type { JuegoMesa } from '../../core/data/db'
import { juegosMesaRepo } from '../../core/data/repository'
import { CATEGORIAS_MESA, COLOR, ESTADOS_MESA } from './constantes'
import { Estrellas } from './Estrellas'
import { hoyISO } from './fecha'
import { useT } from '../../core/i18n/useT'

export function FormularioJuegoMesa({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: JuegoMesa
  onGuardado?: () => void
  onCancelar?: () => void
}) {
  const t = useT()
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [categoria, setCategoria] = useState<JuegoMesa['categoria']>(
    inicial?.categoria ?? 'familiar',
  )
  const [jugadoresMin, setJugadoresMin] = useState(String(inicial?.jugadoresMin ?? 2))
  const [jugadoresMax, setJugadoresMax] = useState(String(inicial?.jugadoresMax ?? 4))
  const [duracionMin, setDuracionMin] = useState(
    inicial?.duracionMin != null ? String(inicial.duracionMin) : '',
  )
  const [editorial, setEditorial] = useState(inicial?.editorial ?? '')
  const [estado, setEstado] = useState<JuegoMesa['estado']>(inicial?.estado ?? 'coleccion')
  const [calificacion, setCalificacion] = useState(inicial?.calificacion ?? 0)
  const [vecesJugado, setVecesJugado] = useState(String(inicial?.vecesJugado ?? 0))
  const [ultimaPartida, setUltimaPartida] = useState(inicial?.ultimaPartida ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return

    const datos = {
      nombre: nombre.trim(),
      categoria,
      jugadoresMin: Math.max(1, parseInt(jugadoresMin, 10) || 1),
      jugadoresMax: Math.max(1, parseInt(jugadoresMax, 10) || 1),
      duracionMin: duracionMin ? parseInt(duracionMin, 10) : undefined,
      editorial: editorial.trim() || undefined,
      estado,
      calificacion,
      vecesJugado: parseInt(vecesJugado, 10) || 0,
      ultimaPartida: ultimaPartida || undefined,
      notas: notas.trim(),
      creadoEn: inicial?.creadoEn ?? hoyISO(),
    }

    if (inicial?.id) await juegosMesaRepo.update(inicial.id, datos)
    else await juegosMesaRepo.add(datos)

    onGuardado?.()
  }

  const input =
    'w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none'

  return (
    <form onSubmit={guardar} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
      <p className="text-sm font-semibold">
        {inicial ? t('entre.form.mesa.editar', '✏️ Editar juego') : t('entre.form.mesa.nuevo', '🎲 Añadir juego de mesa')}
      </p>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={t('entre.form.mesa.nombre', 'Nombre del juego *')}
        required
        className={input}
      />

      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORIAS_MESA.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoria(c.id)}
            className={`rounded-lg py-2 text-[10px] font-semibold ${
              categoria === c.id ? 'text-black' : 'bg-white/5'
            }`}
            style={categoria === c.id ? { background: COLOR } : undefined}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-white/50">
          {t('entre.form.mesa.jugMin', 'Jug. mín')}
          <input type="number" min={1} value={jugadoresMin} onChange={(e) => setJugadoresMin(e.target.value)} className={`mt-0.5 ${input}`} />
        </label>
        <label className="text-xs text-white/50">
          {t('entre.form.mesa.jugMax', 'Jug. máx')}
          <input type="number" min={1} value={jugadoresMax} onChange={(e) => setJugadoresMax(e.target.value)} className={`mt-0.5 ${input}`} />
        </label>
        <label className="text-xs text-white/50">
          {t('entre.form.mesa.minutos', 'Minutos')}
          <input type="number" min={0} value={duracionMin} onChange={(e) => setDuracionMin(e.target.value)} className={`mt-0.5 ${input}`} placeholder="60" />
        </label>
      </div>

      <input
        value={editorial}
        onChange={(e) => setEditorial(e.target.value)}
        placeholder={t('entre.form.mesa.editorial', 'Editorial / diseñador (opcional)')}
        className={input}
      />

      <label className="text-xs text-white/50 block">
        {t('entre.form.mesa.estado', 'Estado en tu colección')}
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as JuegoMesa['estado'])}
          className={`mt-0.5 ${input}`}
        >
          {ESTADOS_MESA.map((est) => (
            <option key={est.id} value={est.id}>
              {est.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-xs text-white/50 mb-1">{t('entre.form.mesa.calif', 'Calificación')}</p>
        <Estrellas valor={calificacion} onChange={setCalificacion} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/50">
          {t('entre.form.mesa.veces', 'Veces jugado')}
          <input type="number" min={0} value={vecesJugado} onChange={(e) => setVecesJugado(e.target.value)} className={`mt-0.5 ${input}`} />
        </label>
        <label className="text-xs text-white/50">
          {t('entre.form.mesa.ultima', 'Última partida')}
          <input type="date" value={ultimaPartida} onChange={(e) => setUltimaPartida(e.target.value)} className={`mt-0.5 ${input}`} />
        </label>
      </div>

      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder={t('entre.form.mesa.notas', 'Notas: expansiones, con quién juegas, casa rules…')}
        rows={3}
        className={`${input} resize-none`}
      />

      <div className="flex gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="flex-1 rounded-xl py-2.5 bg-white/5">
            {t('entre.form.mesa.cancelar', 'Cancelar')}
          </button>
        )}
        <button type="submit" className="flex-1 rounded-xl py-2.5 font-bold text-black" style={{ background: COLOR }}>
          {t('entre.form.mesa.guardar', 'Guardar')}
        </button>
      </div>
    </form>
  )
}
