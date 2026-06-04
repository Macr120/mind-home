import { useMemo } from 'react'
import type { JuegoMesa, MediaArchivo } from '../../core/data/db'
import { COLOR, CATEGORIAS_MESA, TIPOS_MEDIA, getCategoriaMesa } from './constantes'
import { añoDe } from './fecha'

export function ResumenTab({
  media,
  juegos,
}: {
  media: MediaArchivo[]
  juegos: JuegoMesa[]
}) {
  const porTipoMedia = useMemo(
    () =>
      TIPOS_MEDIA.map((t) => ({
        ...t,
        count: media.filter((i) => i.tipo === t.id).length,
      })),
    [media],
  )

  const porCategoriaMesa = useMemo(
    () =>
      CATEGORIAS_MESA.map((c) => ({
        ...c,
        count: juegos.filter((j) => j.categoria === c.id).length,
      })).filter((c) => c.count > 0),
    [juegos],
  )

  const partidasTotal = juegos.reduce((s, j) => s + j.vecesJugado, 0)
  const calificadosMedia = media.filter((i) => i.calificacion > 0)
  const promedioMedia =
    calificadosMedia.length > 0
      ? calificadosMedia.reduce((s, i) => s + i.calificacion, 0) / calificadosMedia.length
      : 0

  const masJugados = [...juegos]
    .filter((j) => j.vecesJugado > 0)
    .sort((a, b) => b.vecesJugado - a.vecesJugado)
    .slice(0, 5)

  const destacadosMedia = [...media]
    .filter((i) => i.calificacion >= 4 && i.resena.trim())
    .sort((a, b) => b.calificacion - a.calificacion)
    .slice(0, 3)

  const porAño = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const i of media) {
      const a = añoDe(i.fecha)
      mapa.set(a, (mapa.get(a) ?? 0) + 1)
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4)
  }, [media])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 p-4 col-span-2" style={{ background: `${COLOR}18` }}>
          <p className="text-xs text-white/50">Tu sala de entretenimiento</p>
          <p className="text-2xl font-black" style={{ color: COLOR }}>
            {media.length} títulos · {juegos.length} juegos de mesa
          </p>
        </div>
        <MiniStat label="Partidas registradas" valor={String(partidasTotal)} />
        <MiniStat
          label="Nota media (archivo)"
          valor={promedioMedia > 0 ? `${promedioMedia.toFixed(1)} ★` : '—'}
        />
      </div>

      {porTipoMedia.some((t) => t.count > 0) && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-3">📺 Archivo multimedia</p>
          <div className="grid grid-cols-2 gap-2">
            {porTipoMedia.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2">
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-white/40">{t.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {porCategoriaMesa.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-3">🎲 Ludoteca por categoría</p>
          <div className="flex flex-wrap gap-2">
            {porCategoriaMesa.map((c) => (
              <span
                key={c.id}
                className="rounded-lg px-3 py-1.5 text-sm border"
                style={{ background: `${COLOR}22`, borderColor: `${COLOR}55` }}
              >
                {c.icon} {c.label} <strong>{c.count}</strong>
              </span>
            ))}
          </div>
        </section>
      )}

      {masJugados.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">🏆 Más jugados en mesa</p>
          <ul className="space-y-1.5">
            {masJugados.map((j) => {
              const c = getCategoriaMesa(j.categoria)
              return (
                <li key={j.id} className="text-sm flex justify-between gap-2">
                  <span>
                    {c.icon} {j.nombre}
                  </span>
                  <span className="text-white/45 shrink-0">{j.vecesJugado} partidas</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {destacadosMedia.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">⭐ Favoritos del archivo</p>
          <ul className="space-y-2 text-sm">
            {destacadosMedia.map((i) => {
              const t = TIPOS_MEDIA.find((x) => x.id === i.tipo)
              return (
                <li key={i.id}>
                  {t?.icon} {i.titulo}{' '}
                  <span className="text-amber-400">{i.calificacion}★</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {porAño.length > 0 && (
        <section className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">Por año (archivo)</p>
          <div className="flex flex-wrap gap-2">
            {porAño.map(([año, count]) => (
              <span key={año} className="rounded-lg bg-white/10 px-3 py-1 text-sm">
                <strong>{año}</strong> · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {media.length === 0 && juegos.length === 0 && (
        <p className="text-center text-sm text-white/40 py-6">
          Usa las pestañas Archivo y Juegos de mesa para empezar tu colección.
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
