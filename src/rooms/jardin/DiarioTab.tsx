import type { RegistroAnimo, SesionMindfulness } from '../../core/data/db'
import { sesionesMindfulnessRepo } from '../../core/data/repository'
import { getTipo } from './constantes'

export function DiarioTab({
  sesiones,
  animos,
}: {
  sesiones: SesionMindfulness[]
  animos: RegistroAnimo[]
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Historial de sesiones</p>
        {sesiones.length === 0 ? (
          <p className="text-sm text-white/40">Sin sesiones registradas.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {sesiones.slice(0, 30).map((s) => {
              const t = getTipo(s.tipo)
              return (
                <li
                  key={s.id}
                  className="flex items-start gap-2 text-sm rounded-lg bg-black/20 px-3 py-2"
                >
                  <span>{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{s.titulo}</p>
                    <p className="text-xs text-white/40">
                      {s.fecha} · {s.duracionMin} min
                      {s.nota ? ` · ${s.nota}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => s.id && sesionesMindfulnessRepo.remove(s.id)}
                    className="text-white/30 hover:text-red-400"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Estado de ánimo</p>
        {animos.length === 0 ? (
          <p className="text-sm text-white/40">Registra tu ánimo en la pestaña Hoy.</p>
        ) : (
          <ul className="space-y-2">
            {animos.slice(0, 14).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-sm rounded-lg bg-black/20 px-3 py-2"
              >
                <span className="text-xl">{a.emocion}</span>
                <div className="flex-1">
                  <p className="text-white/80">{a.fecha}</p>
                  {a.nota && <p className="text-xs text-white/40">{a.nota}</p>}
                </div>
                <span className="text-emerald-300 font-semibold">{a.nivel}/5</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
