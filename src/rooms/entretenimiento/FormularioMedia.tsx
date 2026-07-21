import { useState } from 'react'
import type { MediaArchivo, TipoMedia } from '../../core/data/db'
import { mediaArchivoRepo } from '../../core/data/repository'
import { COLOR, ESTADOS_MEDIA, TIPOS_MEDIA } from './constantes'
import { Estrellas } from './Estrellas'
import { hoyISO } from './fecha'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

export function FormularioMedia({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: MediaArchivo
  onGuardado?: () => void
  onCancelar?: () => void
}) {
  const t = useT()
  const [tipo, setTipo] = useState<TipoMedia>(inicial?.tipo ?? 'pelicula')
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [genero, setGenero] = useState(inicial?.genero ?? '')
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const [estado, setEstado] = useState<MediaArchivo['estado']>(
    inicial?.estado ?? 'completado',
  )
  const [calificacion, setCalificacion] = useState(inicial?.calificacion ?? 0)
  const [resena, setResena] = useState(inicial?.resena ?? '')
  const [autor, setAutor] = useState(inicial?.autor ?? '')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !genero.trim()) return

    const datos = {
      tipo,
      titulo: titulo.trim(),
      genero: genero.trim(),
      fecha,
      estado,
      calificacion,
      resena: resena.trim(),
      autor: autor.trim() || undefined,
      creadoEn: inicial?.creadoEn ?? hoyISO(),
    }

    if (inicial?.id) await mediaArchivoRepo.update(inicial.id, datos)
    else await mediaArchivoRepo.add(datos)

    onGuardado?.()
  }

  const input =
    'w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-emerald-400/50'

  return (
    <form
      onSubmit={guardar}
      className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
    >
      <p className="text-sm font-semibold">
        <Icono nombre={inicial ? 'editar' : 'agregar'} />{' '}
        {inicial ? t('entre.form.editarTitulo', 'Editar entrada') : t('entre.form.añadirTitulo', 'Añadir al archivo')}
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {TIPOS_MEDIA.map((tipoItem) => (
          <button
            key={tipoItem.id}
            type="button"
            onClick={() => setTipo(tipoItem.id)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              tipo === tipoItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tipo === tipoItem.id ? { background: COLOR } : undefined}
          >
            <Icono emoji={tipoItem.icon} /> {tipoItem.label}
          </button>
        ))}
      </div>

      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t('entre.form.titulo', 'Título')} required className={input} />

      <input
        value={autor}
        onChange={(e) => setAutor(e.target.value)}
        placeholder={t('entre.form.autor', 'Autor / director / desarrollador (opcional)')}
        className={input}
      />

      <input
        value={genero}
        onChange={(e) => setGenero(e.target.value)}
        placeholder={t('entre.form.genero', 'Género')}
        required
        className={input}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/50">
          {t('entre.form.fecha', 'Fecha (consumo o estreno)')}
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`mt-0.5 ${input}`} />
        </label>
        <label className="text-xs text-white/50">
          {t('entre.form.estado', 'Estado')}
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as MediaArchivo['estado'])}
            className={`mt-0.5 ${input}`}
          >
            {ESTADOS_MEDIA.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="text-xs text-white/50 mb-1">{t('entre.form.calificacion', 'Tu calificación')}</p>
        <Estrellas valor={calificacion} onChange={setCalificacion} />
      </div>

      <textarea
        value={resena}
        onChange={(e) => setResena(e.target.value)}
        placeholder={t('entre.form.ph.resena', 'Tu reseña…')}
        rows={4}
        className={`${input} resize-none`}
      />

      <div className="flex gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="flex-1 rounded-xl py-2.5 font-semibold bg-white/5 hover:bg-white/10">
            {t('entre.form.cancelar', 'Cancelar')}
          </button>
        )}
        <button type="submit" className="flex-1 rounded-xl py-2.5 font-bold text-black hover:opacity-90" style={{ background: COLOR }}>
          {inicial ? t('entre.form.guardar', 'Guardar cambios') : t('entre.form.guardarNuevo', 'Añadir al archivo')}
        </button>
      </div>
    </form>
  )
}
