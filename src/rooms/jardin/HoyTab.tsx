import { useState } from 'react'
import type {
  GratitudDiaria,
  RegistroAnimo,
  SesionMindfulness,
} from '../../core/data/db'
import {
  gratitudDiariaRepo,
  registroAnimoRepo,
  sesionesMindfulnessRepo,
} from '../../core/data/repository'
import { EMOCIONES, PRESETS, COLOR } from './constantes'
import { hoyISO, nombreDia } from './fecha'
import { minutosDelDia, rachaDias } from './stats'

export function HoyTab({
  sesiones,
  animoHoy,
  gratitudHoy,
  objetivoMin,
}: {
  sesiones: SesionMindfulness[]
  animoHoy?: RegistroAnimo
  gratitudHoy?: GratitudDiaria
  objetivoMin: number
}) {
  const hoy = hoyISO()
  const minHoy = minutosDelDia(sesiones, hoy)
  const racha = rachaDias(sesiones)
  const pct = objetivoMin > 0 ? Math.min(100, (minHoy / objetivoMin) * 100) : 0

  const [nivel, setNivel] = useState(animoHoy?.nivel ?? 3)
  const [emocion, setEmocion] = useState(animoHoy?.emocion ?? '🙂')
  const [notaAnimo, setNotaAnimo] = useState(animoHoy?.nota ?? '')
  const [g1, setG1] = useState(gratitudHoy?.item1 ?? '')
  const [g2, setG2] = useState(gratitudHoy?.item2 ?? '')
  const [g3, setG3] = useState(gratitudHoy?.item3 ?? '')

  const guardarAnimo = async () => {
    const datos = { fecha: hoy, nivel, emocion, nota: notaAnimo.trim() || undefined }
    if (animoHoy?.id) await registroAnimoRepo.update(animoHoy.id, datos)
    else await registroAnimoRepo.add(datos)
  }

  const guardarGratitud = async () => {
    if (!g1.trim() && !g2.trim() && !g3.trim()) return
    const datos = {
      fecha: hoy,
      item1: g1.trim(),
      item2: g2.trim(),
      item3: g3.trim(),
    }
    if (gratitudHoy?.id) await gratitudDiariaRepo.update(gratitudHoy.id, datos)
    else await gratitudDiariaRepo.add(datos)
  }

  const inicioRapido = async (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId)
    if (!p) return
    await sesionesMindfulnessRepo.add({
      fecha: hoy,
      tipo: p.tipo,
      titulo: p.titulo,
      duracionMin: p.duracionMin,
      presetId: p.id,
    })
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-white/10 p-4"
        style={{ background: `${COLOR}15` }}
      >
        <p className="text-xs text-white/50 capitalize">{nombreDia(hoy)}</p>
        <p className="text-2xl font-black mt-1" style={{ color: COLOR }}>
          {minHoy} <span className="text-base font-semibold text-white/50">/ {objetivoMin} min</span>
        </p>
        <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: COLOR }}
          />
        </div>
        <p className="text-xs text-white/45 mt-2">🔥 Racha: {racha} días</p>
      </div>

      <section className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        <p className="text-sm font-semibold">¿Cómo te sientes hoy?</p>
        <div className="flex gap-2 flex-wrap">
          {EMOCIONES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmocion(e)}
              className={`text-2xl p-1 rounded-lg ${emocion === e ? 'bg-white/15 scale-110' : 'opacity-50'}`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={nivel}
          onChange={(e) => setNivel(parseInt(e.target.value, 10))}
          className="w-full"
        />
        <p className="text-xs text-white/40 text-center">Nivel {nivel}/5</p>
        <input
          value={notaAnimo}
          onChange={(e) => setNotaAnimo(e.target.value)}
          placeholder="Nota breve (opcional)"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <button
          type="button"
          onClick={guardarAnimo}
          className="w-full rounded-lg py-2 text-sm font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-500/30"
        >
          Guardar estado de ánimo
        </button>
      </section>

      <section className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-2">
        <p className="text-sm font-semibold">🙏 Tres gratitudes</p>
        <input
          value={g1}
          onChange={(e) => setG1(e.target.value)}
          placeholder="1."
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <input
          value={g2}
          onChange={(e) => setG2(e.target.value)}
          placeholder="2."
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <input
          value={g3}
          onChange={(e) => setG3(e.target.value)}
          placeholder="3."
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <button
          type="button"
          onClick={guardarGratitud}
          className="w-full rounded-lg py-2 text-sm font-semibold bg-white/10 hover:bg-white/15"
        >
          Guardar gratitud
        </button>
      </section>

      <section>
        <p className="text-sm font-semibold mb-2">Inicio rápido</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESETS.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => inicioRapido(p.id)}
              className="shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/25 px-3 py-2 text-left text-xs hover:bg-emerald-500/25"
            >
              <span className="font-bold text-emerald-200">{p.titulo}</span>
              <p className="text-white/40">{p.duracionMin} min</p>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-white/35 mt-1">
          Registra la sesión al instante. Para temporizador, ve a Practicar.
        </p>
      </section>
    </div>
  )
}
