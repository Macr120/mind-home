import type { ProgresoTema } from '../../core/data/db'
import { COLOR, ESTADOS_TEMA } from './constantes'
import { estadisticasEnciclopedia } from './stats'
import { PILARES, todosLosTemas } from './pilares'

export function ResumenTab({ progreso }: { progreso: ProgresoTema[] }) {
  const stats = estadisticasEnciclopedia(progreso)
  const temaPorId = new Map(todosLosTemas().map((t) => [t.id, t]))
  const maxPilar = Math.max(1, ...stats.porPilar.map((p) => p.marcados))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border border-white/10 p-4 col-span-2"
          style={{ background: `${COLOR}18` }}
        >
          <p className="text-xs text-white/50">Índice enciclopédico</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
            {stats.pilares} pilares
          </p>
          <p className="text-sm text-white/55 mt-1">
            {stats.ramas} ramas temáticas · {stats.temas} entradas en el índice
          </p>
        </div>
        <MiniStat label="Temas marcados" valor={String(stats.marcados)} />
        <MiniStat label="Cobertura del índice" valor={`${stats.cobertura}%`} />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Tu progreso de exploración</p>
        <div className="grid grid-cols-3 gap-2">
          {ESTADOS_TEMA.map((e) => (
            <div key={e.id} className="rounded-lg bg-black/25 p-3 text-center">
              <p className="text-lg">{e.icon}</p>
              <p className="text-xl font-black" style={{ color: COLOR }}>
                {stats.porEstado[e.id]}
              </p>
              <p className="text-[10px] text-white/45">{e.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${stats.cobertura}%`,
              background: COLOR,
            }}
          />
        </div>
        <p className="text-[10px] text-white/40 mt-1 text-center">
          {stats.temas - stats.marcados} temas sin explorar aún
        </p>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Actividad por pilar</p>
        <div className="space-y-2">
          {stats.porPilar.map((p) => (
            <div key={p.id}>
              <div className="flex justify-between text-sm mb-0.5">
                <span>
                  {p.icon} {p.titulo}
                </span>
                <span className="text-white/40">
                  {p.marcados}/{p.total}
                  {p.revisados > 0 && ` · ${p.revisados} ✓`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(p.marcados / maxPilar) * 100}%`,
                    background: COLOR,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2">Volumen del índice por pilar</p>
        <div className="grid grid-cols-2 gap-2">
          {PILARES.map((p) => {
            const n = p.ramas.reduce((s, r) => s + r.temas.length, 0)
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-2"
              >
                <span className="text-lg">{p.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.titulo}</p>
                  <p className="text-[10px] text-white/40">{n} temas</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {stats.recientes.length > 0 && (
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">Últimos temas tocados</p>
          <ul className="space-y-1.5 text-sm">
            {stats.recientes.map((p) => {
              const t = temaPorId.get(p.temaId)
              const est = ESTADOS_TEMA.find((e) => e.id === p.estado)
              return (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="text-white/85 truncate">{t?.titulo ?? p.temaId}</span>
                  <span className="text-white/40 shrink-0">
                    {est?.icon} {p.actualizadoEn}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-white/35 text-center leading-relaxed px-2">
        Próximamente: artículos enlazados a cada tema. El archivo de películas y libros está en{' '}
        <strong className="text-white/55">Sala de entretenimiento</strong>.
      </p>
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
