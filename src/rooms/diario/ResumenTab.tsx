import { useMemo } from 'react'
import type { Noticia } from '../../core/data/db'
import { CATEGORIAS, COLOR } from './constantes'
import { hoyISO } from './fecha'

export function ResumenTab({ noticias }: { noticias: Noticia[] }) {
  const hoy = hoyISO()

  const porCategoria = useMemo(() => {
    return CATEGORIAS.map((c) => ({
      ...c,
      count: noticias.filter((n) => n.categoria === c.id).length,
    })).filter((c) => c.count > 0)
  }, [noticias])

  const hoyCount = noticias.filter((n) => n.fecha === hoy).length
  const noLeidas = noticias.filter((n) => !n.leido).length
  const destacadas = noticias.filter((n) => n.destacada).length

  const porFecha = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const n of noticias) mapa.set(n.fecha, (mapa.get(n.fecha) ?? 0) + 1)
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7)
  }, [noticias])

  const maxCat = Math.max(1, ...porCategoria.map((c) => c.count))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border p-4 col-span-2"
          style={{ background: `${COLOR}18`, borderColor: `${COLOR}44` }}
        >
          <p className="text-xs text-white/50">Tu central</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
            {noticias.length}{' '}
            <span className="text-lg font-semibold text-white/50">noticias</span>
          </p>
        </div>
        <MiniStat label="Hoy" valor={String(hoyCount)} />
        <MiniStat label="Sin leer" valor={String(noLeidas)} />
        <MiniStat label="Destacadas" valor={String(destacadas)} />
        <MiniStat label="Categorías usadas" valor={String(porCategoria.length)} />
      </div>

      {porCategoria.length > 0 && (
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-3">Por categoría</p>
          <div className="space-y-2">
            {porCategoria.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-sm mb-0.5">
                  <span>
                    {c.icon} {c.label}
                  </span>
                  <span className="text-white/40">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.count / maxCat) * 100}%`, background: COLOR }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {porFecha.length > 0 && (
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">Actividad por fecha</p>
          <div className="flex flex-wrap gap-2">
            {porFecha.map(([fecha, count]) => (
              <span key={fecha} className="rounded-lg bg-pink-500/15 border border-pink-500/30 px-3 py-1.5 text-sm">
                <strong className="text-pink-200">{fecha}</strong>
                <span className="text-white/50 ml-1">· {count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {noticias.length === 0 && (
        <p className="text-center text-sm text-white/40 py-6">
          Añade noticias en la central para ver estadísticas.
        </p>
      )}
    </div>
  )
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-xl font-bold text-white/90">{valor}</p>
    </div>
  )
}
