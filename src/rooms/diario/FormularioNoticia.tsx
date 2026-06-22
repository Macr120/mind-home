import { useState } from 'react'
import type { Noticia } from '../../core/data/db'
import { noticiasRepo } from '../../core/data/repository'
import { CATEGORIAS, COLOR } from './constantes'
import { hoyISO } from './fecha'
import { useT } from '../../core/i18n/useT'

export function FormularioNoticia({
  inicial,
  onGuardado,
  onCancelar,
}: {
  inicial?: Noticia
  onGuardado?: () => void
  onCancelar?: () => void
}) {
  const t = useT()
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoyISO())
  const [categoria, setCategoria] = useState<Noticia['categoria']>(
    inicial?.categoria ?? 'nacional',
  )
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '')
  const [resumen, setResumen] = useState(inicial?.resumen ?? '')
  const [fuente, setFuente] = useState(inicial?.fuente ?? '')
  const [url, setUrl] = useState(inicial?.url ?? '')
  const [destacada, setDestacada] = useState(inicial?.destacada ?? false)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !resumen.trim()) return

    const datos = {
      fecha,
      categoria,
      titulo: titulo.trim(),
      resumen: resumen.trim(),
      fuente: fuente.trim() || undefined,
      url: url.trim() || undefined,
      leido: inicial?.leido ?? false,
      destacada,
      creadoEn: inicial?.creadoEn ?? hoyISO(),
    }

    if (inicial?.id) await noticiasRepo.update(inicial.id, datos)
    else await noticiasRepo.add(datos)

    onGuardado?.()
  }

  const input =
    'w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none'

  return (
    <form onSubmit={guardar} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
      <p className="text-sm font-semibold">
        {inicial ? t('diario.form.editar', '✏️ Editar noticia') : t('diario.form.nuevo', '📰 Añadir noticia')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/50">
          {t('diario.form.fecha', 'Fecha')}
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`mt-0.5 ${input}`} required />
        </label>
        <label className="text-xs text-white/50">
          {t('diario.form.cat', 'Categoría')}
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Noticia['categoria'])}
            className={`mt-0.5 ${input}`}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t('diario.form.ph.titular', 'Titular *')} required className={input} />

      <textarea
        value={resumen}
        onChange={(e) => setResumen(e.target.value)}
        placeholder={t('diario.form.ph.resumen', 'Resumen o nota *')}
        rows={4}
        required
        className={`${input} resize-none`}
      />

      <input value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder={t('diario.form.ph.fuente', 'Fuente (medio, autor…)')} className={input} />

      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('diario.form.ph.url', 'Enlace (opcional)')} type="url" className={input} />

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={destacada} onChange={(e) => setDestacada(e.target.checked)} />
        {t('diario.form.destacar', 'Destacar en portada')}
      </label>

      <div className="flex gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="flex-1 rounded-xl py-2.5 bg-white/5">
            {t('diario.form.cancelar', 'Cancelar')}
          </button>
        )}
        <button type="submit" className="flex-1 rounded-xl py-2.5 font-bold text-black" style={{ background: COLOR }}>
          {t('diario.form.guardar', 'Guardar')}
        </button>
      </div>
    </form>
  )
}
