import { useEffect, useState } from 'react'
import type { PerfilDescanso, RegistroSueno } from '../../core/data/db'
import { suenoRepo } from '../../core/data/repository'
import { FranjaNoche } from './FranjaNoche'
import { HorarioObjetivo } from './HorarioObjetivo'
import { TendenciaDescanso } from './TendenciaDescanso'
import { usePerfilDescanso } from './usePerfilDescanso'
import { diaCorto, hoyISO } from './fecha'
import {
  deficitSemana,
  desviacionHorario,
  duracionHoras,
  etiquetaConsistencia,
  formatHoras,
  horasObjetivo,
  nivelPuntuacion,
  promedioHoras,
  puntuacionNoche,
  rachaNoches,
  tendencia,
} from './descanso'

export function DescansoTab() {
  const registros = suenoRepo.useAll() ?? []
  const perfil = usePerfilDescanso()
  const objetivo = horasObjetivo(perfil)

  const ultima = registros[0]
  const registroHoy = registros.find((r) => r.fecha === hoyISO())

  const prom7 = promedioHoras(registros, 7)
  const { deficit } = deficitSemana(registros, objetivo)
  const racha = rachaNoches(registros)
  const consistencia = etiquetaConsistencia(desviacionHorario(registros))
  const datos = tendencia(registros, objetivo, 14)

  const scoreUlt = ultima ? puntuacionNoche(ultima, objetivo) : 0
  const nivelUlt = nivelPuntuacion(scoreUlt)

  const consejo = generarConsejo({ prom7, deficit, objetivo, consistencia, hay: registros.length > 0 })

  return (
    <div className="space-y-4">
      {/* HERO — última noche */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-5"
        style={{ background: 'linear-gradient(135deg,#151b34,#0e1226)' }}
      >
        {ultima ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/45">
                  Puntuación · {ultima.fecha === hoyISO() ? 'hoy' : diaCorto(ultima.fecha)}
                </p>
                <div className="flex items-end gap-1.5">
                  <span
                    className="text-5xl font-black leading-none"
                    style={{ color: nivelUlt.color }}
                  >
                    {scoreUlt}
                  </span>
                  <span className="mb-1 text-sm text-white/40">/100</span>
                </div>
                <p className="text-sm font-semibold" style={{ color: nivelUlt.color }}>
                  {nivelUlt.label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-cyan-300">
                  {formatHoras(ultima.horas)}
                </p>
                <p className="text-sm">
                  <span className="text-amber-300">{'★'.repeat(ultima.calidad)}</span>
                  <span className="text-white/15">{'★'.repeat(5 - ultima.calidad)}</span>
                </p>
              </div>
            </div>

            <div className="mt-3">
              <BarraSegmentada score={scoreUlt} color={nivelUlt.color} />
            </div>

            <div className="mt-4">
              <FranjaNoche
                dormir={ultima.horaAcostarse}
                despertar={ultima.horaDespertar}
                refDormir={perfil?.horaObjetivoDormir}
                refDespertar={perfil?.horaObjetivoDespertar}
              />
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-4xl">🌙</p>
            <p className="mt-2 text-sm font-semibold">Aún no registras tu descanso</p>
            <p className="text-xs text-white/45">
              Registra a qué hora te acostaste y despertaste para ver tu puntuación.
            </p>
          </div>
        )}
      </div>

      {/* MINI-STATS */}
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label="Promedio · 7 días"
          valor={prom7 != null ? formatHoras(prom7) : '—'}
          color="#67e8f9"
        />
        <MiniStat
          label="Déficit · 7 días"
          valor={
            deficit > 0.2
              ? `−${formatHoras(deficit)}`
              : deficit < -0.2
                ? `+${formatHoras(-deficit)}`
                : 'Al día'
          }
          color={deficit > 0.2 ? '#f87171' : '#4ade80'}
        />
        <MiniStat label="Racha de noches" valor={`${racha}`} sufijo="🔥" color="#a78bfa" />
        <MiniStat
          label="Consistencia"
          valor={consistencia?.label ?? '—'}
          sub={consistencia?.detalle}
          color="#818cf8"
        />
      </div>

      {consejo && (
        <div className="flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
          <span className="text-base">💡</span>
          <p className="text-sm text-cyan-100/90">{consejo}</p>
        </div>
      )}

      {/* REGISTRAR */}
      <RegistroForm perfil={perfil} registroHoy={registroHoy} />

      {/* TENDENCIA */}
      <TendenciaDescanso datos={datos} objetivo={objetivo} />

      {/* HORARIO OBJETIVO */}
      {perfil && <HorarioObjetivo perfil={perfil} />}

      {/* HISTORIAL */}
      {registros.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-white/70">Historial</p>
          {registros.slice(0, 12).map((r) => (
            <HistorialNoche key={r.id} r={r} objetivo={objetivo} />
          ))}
        </section>
      )}
    </div>
  )
}

// ----- Registro de la noche (upsert por día) -----

function RegistroForm({
  perfil,
  registroHoy,
}: {
  perfil?: PerfilDescanso
  registroHoy?: RegistroSueno
}) {
  const [acostarse, setAcostarse] = useState(
    registroHoy?.horaAcostarse ?? perfil?.horaObjetivoDormir ?? '23:00',
  )
  const [despertar, setDespertar] = useState(
    registroHoy?.horaDespertar ?? perfil?.horaObjetivoDespertar ?? '07:00',
  )
  const [calidad, setCalidad] = useState(registroHoy?.calidad ?? 4)
  const [nota, setNota] = useState(registroHoy?.nota ?? '')

  // Cargar los valores cuando aparece/cambia el registro de hoy.
  useEffect(() => {
    if (!registroHoy) return
    setAcostarse(registroHoy.horaAcostarse ?? perfil?.horaObjetivoDormir ?? '23:00')
    setDespertar(registroHoy.horaDespertar ?? perfil?.horaObjetivoDespertar ?? '07:00')
    setCalidad(registroHoy.calidad)
    setNota(registroHoy.nota ?? '')
  }, [registroHoy, perfil?.horaObjetivoDormir, perfil?.horaObjetivoDespertar])

  const horas = duracionHoras(acostarse, despertar)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (horas == null) return
    const datos = {
      fecha: hoyISO(),
      horas,
      calidad,
      nota: nota.trim() || undefined,
      horaAcostarse: acostarse,
      horaDespertar: despertar,
    }
    if (registroHoy?.id) await suenoRepo.update(registroHoy.id, datos)
    else await suenoRepo.add(datos)
  }

  return (
    <form
      onSubmit={guardar}
      className="rounded-2xl bg-white/5 p-4 space-y-3 border border-white/10"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">
          {registroHoy ? '✏️ Editar el descanso de hoy' : '➕ Registrar tu descanso'}
        </p>
        <p className="text-[11px] text-white/45">
          Dormiste{' '}
          <span className="font-bold text-cyan-300">
            {horas != null ? formatHoras(horas) : '—'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-white/60">
          🌙 Me acosté
          <input
            type="time"
            value={acostarse}
            onChange={(e) => setAcostarse(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-cyan-400/40 [color-scheme:dark]"
          />
        </label>
        <label className="block text-xs text-white/60">
          ☀️ Desperté
          <input
            type="time"
            value={despertar}
            onChange={(e) => setDespertar(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-cyan-400/40 [color-scheme:dark]"
          />
        </label>
      </div>

      <div>
        <span className="text-xs text-white/60">Calidad del sueño</span>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCalidad(n)}
              className={`text-2xl transition ${n <= calidad ? 'text-amber-300 scale-105' : 'text-white/20 hover:text-white/40'}`}
              title={`${n} de 5`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota (ej. desperté a media noche)"
        className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
      />

      <button
        type="submit"
        className="w-full rounded-lg bg-cyan-400 py-2.5 font-bold text-black hover:bg-cyan-300 transition"
      >
        {registroHoy ? 'Actualizar descanso' : 'Registrar descanso'}
      </button>
    </form>
  )
}

// ----- Historial -----

function HistorialNoche({ r, objetivo }: { r: RegistroSueno; objetivo: number }) {
  const score = puntuacionNoche(r, objetivo)
  const nivel = nivelPuntuacion(score)
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-black"
        style={{ background: `${nivel.color}22`, color: nivel.color }}
      >
        {score}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-cyan-200">
          {formatHoras(r.horas)}{' '}
          <span className="text-xs text-amber-300/80">{'★'.repeat(r.calidad)}</span>
        </p>
        <p className="truncate text-[11px] text-white/40">
          {r.horaAcostarse && r.horaDespertar ? `${r.horaAcostarse}–${r.horaDespertar} · ` : ''}
          {r.fecha}
          {r.nota ? ` · ${r.nota}` : ''}
        </p>
      </div>
      <button
        onClick={() => r.id && suenoRepo.remove(r.id)}
        className="ml-auto text-white/30 hover:text-white/70"
        title="Eliminar"
      >
        ✕
      </button>
    </div>
  )
}

// ----- Piezas visuales -----

function BarraSegmentada({ score, color }: { score: number; color: string }) {
  const segmentos = 10
  const llenos = Math.round((score / 100) * segmentos)
  return (
    <div className="flex gap-1">
      {Array.from({ length: segmentos }, (_, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-full"
          style={{ background: i < llenos ? color : 'rgba(255,255,255,0.1)' }}
        />
      ))}
    </div>
  )
}

function MiniStat({
  label,
  valor,
  sub,
  sufijo,
  color,
}: {
  label: string
  valor: string
  sub?: string
  sufijo?: string
  color: string
}) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {valor} {sufijo && <span className="text-base">{sufijo}</span>}
      </p>
      {sub && <p className="text-[10px] text-white/35">{sub}</p>}
    </div>
  )
}

// ----- Consejo (insight) -----

function generarConsejo({
  prom7,
  deficit,
  objetivo,
  consistencia,
  hay,
}: {
  prom7: number | null
  deficit: number
  objetivo: number
  consistencia: { label: string; detalle: string } | null
  hay: boolean
}): string | null {
  if (!hay) return null
  if (deficit > 1) {
    return `Llevas ${formatHoras(deficit)} de déficit esta semana. Intenta adelantar tu hora de acostarte para recuperarlo.`
  }
  if (consistencia && consistencia.label === 'Irregular') {
    return 'Tu horario fue irregular estos días. Dormir y despertar a horas parecidas mejora el descanso.'
  }
  if (prom7 != null && prom7 >= objetivo) {
    return `Vas muy bien: promedias ${formatHoras(prom7)} por noche, en tu meta de ${formatHoras(objetivo)}.`
  }
  if (prom7 != null) {
    return `Promedias ${formatHoras(prom7)} por noche; tu meta es ${formatHoras(objetivo)}. Vas en camino.`
  }
  return null
}
