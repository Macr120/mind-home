import { useState, type FormEvent } from 'react'
import type { TipoMedia } from '../../core/data/db'
import { rutinasRepo } from '../../core/data/repository'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { colorDe, colorPorProfundidad, COLORES_RUTINA } from '../../core/ui/coloresRutina'
import { Icono } from '../../core/ui/iconos/Icono'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { crearMeta, esMeta, hijasDe, raices } from '../../core/metas'
import { COLOR, TIPOS_MEDIA } from './constantes'
import { generarPrograma, type ProgramaPropuesto } from './programaIA'
import { Creditos } from '../../core/ui/Creditos'
import { OP_PROGRAMA } from './costosIA'

/**
 * Programas para ver/leer/jugar: la IA arma una lista de obras por tema, género
 * o autor y se guarda como una meta con sub-metas — el mismo cronograma del
 * calendario. Calendarizarlo es opcional: sin fechas el programa vive solo en
 * la lista; con fechas (a mano o con el planificador ✨ de cada meta) ocupa su
 * sitio en el calendario.
 */
export function ProgramasSection() {
  const t = useT()
  const todas = rutinasRepo.useAll()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoMedia>('pelicula')
  const [tema, setTema] = useState('')
  const [cantidad, setCantidad] = useState(8)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [propuesta, setPropuesta] = useState<ProgramaPropuesto | null>(null)
  const [nombre, setNombre] = useState('')
  // Índices desmarcados de la propuesta: lo normal es querer casi todos.
  const [fuera, setFuera] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState(false)

  const generar = async (e: FormEvent) => {
    e.preventDefault()
    if (generando || !tema.trim()) return
    setError('')
    setGenerando(true)
    try {
      const p = await generarPrograma(tipo, tema.trim(), cantidad)
      setPropuesta(p)
      setNombre(p.nombre)
      setFuera(new Set())
    } catch (err) {
      console.warn('[MPH] No se pudo generar el programa:', err)
      setError(err instanceof Error ? err.message : t('entre.prog.error', 'No se pudo generar el programa.'))
    } finally {
      setGenerando(false)
    }
  }

  const guardar = async () => {
    if (!propuesta || guardando) return
    const elegidos = propuesta.items.filter((_, i) => !fuera.has(i))
    if (elegidos.length === 0) return
    setGuardando(true)
    try {
      const mias = (todas ?? []).filter((r) => esMeta(r) && r.plantillaId === 'entretenimiento')
      const raiz = await crearMeta(
        mias,
        nombre.trim() || propuesta.nombre,
        undefined,
        COLORES_RUTINA[raices(mias).length % COLORES_RUTINA.length],
        'entretenimiento',
      )
      if (!raiz) return
      // Del último al primero: `crearMeta` mete cada nueva al INICIO de sus
      // hermanas, y `vivas` va espejando cada alta (mismo truco que `aceptarPlan`).
      let vivas = [...mias, raiz]
      for (const item of [...elegidos].reverse()) {
        const hija = await crearMeta(vivas, item.titulo, raiz, colorPorProfundidad(colorDe(raiz), 1))
        if (!hija) continue
        const orden = new Map(hijasDe(vivas, raiz.id).map((r, i) => [r.id, i + 1]))
        vivas = [...vivas.map((r) => (orden.has(r.id) ? { ...r, orden: orden.get(r.id)! } : r)), hija]
        if (item.detalle && hija.id != null) await rutinasRepo.update(hija.id, { nota: item.detalle })
      }
      setPropuesta(null)
      setTema('')
      setAbierto(false)
    } finally {
      setGuardando(false)
    }
  }

  const marcar = (i: number) => {
    setFuera((prev) => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })
  }

  const elegidos = propuesta ? propuesta.items.length - fuera.size : 0

  return (
    <div data-tut="entretenimiento.programas" className="space-y-2 pt-2">
      <p className="text-sm font-semibold">
        <Icono nombre="calendario" /> {t('entre.prog.titulo', 'Programas')}
      </p>
      <p className="text-[11px] leading-relaxed text-white/40">
        {t(
          'entre.prog.desc',
          'Pídele a la IA un programa para ver, leer o jugar por tema, género o autor (p. ej. «películas de terror de los 80s»). Cada título es una meta del cronograma: palomea lo que completes y, si quieres, ponle fechas o pídele el plan al ✨ para verlo en el calendario.',
        )}
      </p>

      {/* Sin IA configurada no se anuncia el generador: el cronograma queda igual de usable a mano. */}
      {iaActiva() && !propuesta && (
        <>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
          >
            <Icono nombre="brillo" />{' '}
            {abierto ? t('entre.prog.ocultar', 'Ocultar generador') : t('entre.prog.nuevo', 'Generar programa con IA')}
            <Creditos op={OP_PROGRAMA} />
          </button>

          {abierto && (
            <form onSubmit={generar} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
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

              <input
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder={t('entre.prog.tema', 'Tema, género o autor (p. ej. terror de los 80s)')}
                required
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />

              <div className="flex items-center gap-2">
                <label className="text-xs text-white/50" htmlFor="prog-cantidad">
                  {t('entre.prog.cuantos', 'Títulos')}
                </label>
                <select
                  id="prog-cantidad"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none"
                >
                  {[5, 8, 10, 12, 15].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={generando}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                style={{ background: COLOR }}
              >
                {generando ? (
                  t('entre.prog.generando', 'Armando el programa…')
                ) : (
                  <><Icono nombre="brillo" /> {t('entre.prog.generar', 'Generar programa')}</>
                )}
              </button>
              {error && <p className="text-[10px] text-red-300">{error}</p>}
            </form>
          )}
        </>
      )}

      {propuesta && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t('entre.prog.nombre', 'Nombre del programa')}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold outline-none focus:border-white/30"
          />

          <div className="space-y-1.5">
            {propuesta.items.map((item, i) => (
              <label
                key={`${item.titulo}-${i}`}
                className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/5 ${
                  fuera.has(i) ? 'opacity-40' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={!fuera.has(i)}
                  onChange={() => marcar(i)}
                  className="mt-0.5 accent-emerald-400"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {i + 1}. {item.titulo}
                  </span>
                  {item.detalle && <span className="block text-xs text-white/50">{item.detalle}</span>}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || elegidos === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
              style={{ background: COLOR }}
            >
              {guardando
                ? t('entre.prog.guardando', 'Guardando…')
                : t('entre.prog.guardar', 'Guardar programa ({n})', { n: String(elegidos) })}
            </button>
            <button
              type="button"
              onClick={() => setPropuesta(null)}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
            >
              {t('entre.prog.descartar', 'Descartar')}
            </button>
          </div>
        </div>
      )}

      <div data-tut="entretenimiento.programas.cronograma">
        <CronogramaApp plantillaId="entretenimiento" />
      </div>
    </div>
  )
}
