import { useMemo, useState } from 'react'
import type { ProgresoTema } from '../../core/data/db'
import { progresoTemaRepo } from '../../core/data/repository'
import { COLOR, SIGUIENTE_ESTADO, getEstadoTema } from './constantes'
import { hoyISO } from './fecha'
import { PILARES } from './pilares'

export function IndiceTab({ progreso }: { progreso: ProgresoTema[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [pilarAbierto, setPilarAbierto] = useState<string | null>(PILARES[0]?.id ?? null)

  const mapa = useMemo(
    () => new Map(progreso.map((p) => [p.temaId, p])),
    [progreso],
  )

  const q = busqueda.trim().toLowerCase()

  const pilaresFiltrados = useMemo(() => {
    if (!q) return PILARES
    return PILARES.map((pilar) => {
      const coincidePilar =
        pilar.titulo.toLowerCase().includes(q) ||
        pilar.descripcion.toLowerCase().includes(q)
      const ramas = pilar.ramas
        .map((rama) => {
          const temas = rama.temas.filter(
            (t) =>
              coincidePilar ||
              rama.titulo.toLowerCase().includes(q) ||
              t.titulo.toLowerCase().includes(q) ||
              t.descripcion.toLowerCase().includes(q),
          )
          return temas.length ? { ...rama, temas } : null
        })
        .filter(Boolean) as typeof pilar.ramas
      return ramas.length ? { ...pilar, ramas } : null
    }).filter(Boolean) as typeof PILARES
  }, [q])

  const avanzarTema = async (pilarId: string, temaId: string) => {
    const actual = mapa.get(temaId)
    if (!actual) {
      await progresoTemaRepo.add({
        pilarId,
        temaId,
        estado: 'explorado',
        actualizadoEn: hoyISO(),
      })
      return
    }
    if (actual.id && actual.estado === 'revisado') {
      await progresoTemaRepo.remove(actual.id)
      return
    }
    const next = SIGUIENTE_ESTADO[actual.estado]
    if (actual.id && next) {
      await progresoTemaRepo.update(actual.id, {
        estado: next,
        actualizadoEn: hoyISO(),
      })
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-4 text-sm"
        style={{ background: `${COLOR}18`, borderColor: `${COLOR}44` }}
      >
        <p className="font-bold text-white/90">Mapa del conocimiento</p>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">
          Índice temático inspirado en los grandes pilares de la enciclopedia occidental y las
          ramas UNESCO. Toca un tema para marcarlo: explorado → en estudio → revisado.
        </p>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar pilar, rama o tema…"
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-indigo-400/40"
      />

      {pilaresFiltrados.length === 0 ? (
        <p className="text-center text-sm text-white/40 py-8">Sin resultados para tu búsqueda.</p>
      ) : (
        <div className="space-y-2">
          {pilaresFiltrados.map((pilar) => {
            const abierto = pilarAbierto === pilar.id
            const temasPilar = pilar.ramas.flatMap((r) => r.temas)
            const marcados = temasPilar.filter((t) => mapa.has(t.id)).length

            return (
              <section
                key={pilar.id}
                className="rounded-xl border border-white/10 overflow-hidden bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => setPilarAbierto(abierto ? null : pilar.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5"
                >
                  <span className="text-3xl">{pilar.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white/95">{pilar.titulo}</h3>
                    <p className="text-xs text-white/45 mt-0.5 line-clamp-2">{pilar.descripcion}</p>
                    <p className="text-[10px] mt-1.5" style={{ color: COLOR }}>
                      {pilar.ramas.length} ramas · {temasPilar.length} temas
                      {marcados > 0 && ` · ${marcados} marcados`}
                    </p>
                  </div>
                  <span className="text-white/30 text-lg shrink-0">{abierto ? '▾' : '▸'}</span>
                </button>

                {abierto && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-3">
                    {pilar.ramas.map((rama) => (
                      <div key={rama.id}>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                          {rama.titulo}
                        </p>
                        <ul className="space-y-2">
                          {rama.temas.map((tema) => {
                            const prog = mapa.get(tema.id)
                            const est = prog ? getEstadoTema(prog.estado) : null
                            return (
                              <li key={tema.id}>
                                <button
                                  type="button"
                                  onClick={() => void avanzarTema(pilar.id, tema.id)}
                                  className="w-full rounded-lg bg-black/25 border border-white/10 px-3 py-2.5 text-left hover:border-white/20 transition"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white/90">
                                        {tema.titulo}
                                      </p>
                                      <p className="text-xs text-white/45 mt-0.5 line-clamp-2">
                                        {tema.descripcion}
                                      </p>
                                    </div>
                                    {est ? (
                                      <span
                                        className="shrink-0 text-[10px] font-bold rounded-md px-2 py-0.5 text-black"
                                        style={{ background: COLOR }}
                                        title="Toca para avanzar o quitar"
                                      >
                                        {est.icon} {est.label}
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[10px] text-white/30">
                                        + marcar
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
