import { useMemo, useState } from 'react'
import type { AlimentoFavorito, MomentoComida, PlanComida } from '../../core/data/db'
import { comidasRepo, planComidasRepo } from '../../core/data/repository'
import { MOMENTOS } from './constantes'
import { diasSemana, etiquetaDia, hoyISO, inicioSemana } from './fecha'
import { getMomento } from './momentos'

export function PlanTab({
  semanaInicio,
  planes,
  favoritos,
}: {
  semanaInicio: string
  planes: PlanComida[]
  favoritos: AlimentoFavorito[]
}) {
  const [diaSel, setDiaSel] = useState(hoyISO())
  const [momento, setMomento] = useState<MomentoComida>('comida')
  const [nombre, setNombre] = useState('')
  const [calorias, setCalorias] = useState('')

  const dias = diasSemana(semanaInicio)
  const delDia = planes.filter((p) => p.fecha === diaSel)

  const listaCompra = useMemo(() => {
    const semana = planes.filter((p) => dias.includes(p.fecha))
    const mapa = new Map<string, number>()
    for (const p of semana) {
      mapa.set(p.nombre, (mapa.get(p.nombre) ?? 0) + 1)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [planes, dias])

  const kcalSemana = useMemo(() => {
    return dias.map((f) => {
      const total = planes
        .filter((p) => p.fecha === f)
        .reduce((s, p) => s + p.calorias, 0)
      return { fecha: f, total }
    })
  }, [planes, dias])

  const agregarPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    const kcal = parseFloat(calorias) || 0
    if (!nombre.trim() || kcal <= 0) return
    await planComidasRepo.add({
      fecha: diaSel,
      momento,
      nombre: nombre.trim(),
      calorias: Math.round(kcal),
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      preparado: false,
    })
    setNombre('')
    setCalorias('')
  }

  const togglePreparado = async (p: PlanComida) => {
    if (!p.id) return
    await planComidasRepo.update(p.id, { preparado: !p.preparado })
  }

  const copiarAlDiario = async (p: PlanComida) => {
    await comidasRepo.add({
      fecha: p.fecha,
      momento: p.momento,
      nombre: p.nombre,
      calorias: p.calorias,
      proteinas: p.proteinas,
      carbohidratos: p.carbohidratos,
      grasas: p.grasas,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {dias.map((f) => {
          const total = kcalSemana.find((k) => k.fecha === f)?.total ?? 0
          const activo = f === diaSel
          return (
            <button
              key={f}
              type="button"
              onClick={() => setDiaSel(f)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activo ? 'bg-amber-400 text-black' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div>{etiquetaDia(f)}</div>
              <div className={activo ? 'text-black/60' : 'text-white/40'}>{total} kcal</div>
            </button>
          )
        })}
      </div>

      <form
        onSubmit={agregarPlan}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">Planificar comida</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMomento(m.id)}
              className={`rounded-lg py-1.5 text-xs ${
                momento === m.id ? 'bg-amber-400/80 text-black' : 'bg-white/5'
              }`}
            >
              {m.icon}
            </button>
          ))}
        </div>
        {favoritos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {favoritos.slice(0, 6).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setNombre(f.nombre)
                  setCalorias(String(f.calorias))
                }}
                className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-[11px] border border-white/10"
              >
                {f.nombre}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Platillo planeado"
            className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          />
          <input
            type="number"
            value={calorias}
            onChange={(e) => setCalorias(e.target.value)}
            placeholder="kcal"
            className="w-20 rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10 outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl py-2 font-bold bg-amber-400/90 text-black"
        >
          Añadir al plan de {etiquetaDia(diaSel)}
        </button>
      </form>

      <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/5">
        {delDia.length === 0 && (
          <p className="p-4 text-sm text-white/40">Sin comidas planeadas este día.</p>
        )}
        {delDia.map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
            <button
              type="button"
              onClick={() => togglePreparado(p)}
              className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${
                p.preparado
                  ? 'bg-emerald-500 border-emerald-500 text-black'
                  : 'border-white/30'
              }`}
            >
              {p.preparado ? '✓' : ''}
            </button>
            <span className="text-lg">{getMomento(p.momento).icon}</span>
            <div className="flex-1 min-w-0">
              <p className={p.preparado ? 'line-through text-white/50' : 'text-white/90'}>
                {p.nombre}
              </p>
              <p className="text-xs text-white/40">{p.calorias} kcal</p>
            </div>
            <button
              type="button"
              onClick={() => copiarAlDiario(p)}
              className="text-[10px] font-semibold text-amber-400 hover:underline"
            >
              → Diario
            </button>
            <button
              type="button"
              onClick={() => p.id && planComidasRepo.remove(p.id)}
              className="text-white/30 hover:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2">🛒 Lista de compras (semana)</p>
        {listaCompra.length === 0 ? (
          <p className="text-sm text-white/40">Planifica comidas para generar la lista.</p>
        ) : (
          <ul className="space-y-1.5">
            {listaCompra.map(([nombre, veces]) => (
              <li key={nombre} className="flex items-center gap-2 text-sm">
                <span className="h-4 w-4 rounded border border-white/25 shrink-0" />
                <span className="flex-1 text-white/85">{nombre}</span>
                {veces > 1 && (
                  <span className="text-xs text-white/40">×{veces}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function semanaDesdeHoy() {
  return inicioSemana(hoyISO())
}
