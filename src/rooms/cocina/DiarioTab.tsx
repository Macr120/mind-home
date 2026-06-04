import { useState } from 'react'
import type { AlimentoFavorito, MomentoComida, RegistroComida } from '../../core/data/db'
import { aguaRepo, comidasRepo } from '../../core/data/repository'
import { MOMENTOS } from './constantes'
import { getMomento } from './momentos'
import { caloriasDesdeMacros } from './macros'

export function DiarioTab({
  fecha,
  comidas,
  aguaMl,
  aguaObjetivo,
  favoritos,
}: {
  fecha: string
  comidas: RegistroComida[]
  aguaMl: number
  aguaObjetivo: number
  favoritos: AlimentoFavorito[]
}) {
  const [momento, setMomento] = useState<MomentoComida>('desayuno')
  const [nombre, setNombre] = useState('')
  const [calorias, setCalorias] = useState('')
  const [proteinas, setProteinas] = useState('')
  const [carbos, setCarbos] = useState('')
  const [grasas, setGrasas] = useState('')
  const [nota, setNota] = useState('')

  const delDia = comidas
    .filter((c) => c.fecha === fecha)
    .sort((a, b) => a.momento.localeCompare(b.momento))

  const aplicarFavorito = (f: AlimentoFavorito) => {
    setNombre(f.nombre)
    setCalorias(String(f.calorias))
    setProteinas(String(f.proteinas))
    setCarbos(String(f.carbohidratos))
    setGrasas(String(f.grasas))
  }

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseFloat(proteinas) || 0
    const c = parseFloat(carbos) || 0
    const f = parseFloat(grasas) || 0
    let kcal = parseFloat(calorias) || 0
    if (!kcal && (p || c || f)) kcal = caloriasDesdeMacros(p, c, f)
    if (!nombre.trim() || kcal <= 0) return

    await comidasRepo.add({
      fecha,
      momento,
      nombre: nombre.trim(),
      calorias: Math.round(kcal),
      proteinas: Math.round(p),
      carbohidratos: Math.round(c),
      grasas: Math.round(f),
      nota: nota.trim() || undefined,
    })
    setNombre('')
    setCalorias('')
    setProteinas('')
    setCarbos('')
    setGrasas('')
    setNota('')
  }

  const agregarAgua = async (ml: number) => {
    await aguaRepo.add({ fecha, ml })
  }

  const pctAgua = aguaObjetivo > 0 ? Math.min(100, (aguaMl / aguaObjetivo) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">💧 Hidratación</span>
          <span className="text-sm text-white/60">
            {aguaMl} / {aguaObjetivo} ml
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${pctAgua}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => agregarAgua(ml)}
              className="flex-1 rounded-lg bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={agregar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">Registrar comida</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MOMENTOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMomento(m.id)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                momento === m.id ? 'bg-amber-400 text-black' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {m.icon}
            </button>
          ))}
        </div>

        {favoritos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoritos.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => aplicarFavorito(f)}
                className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs border border-white/10 hover:bg-white/10"
              >
                {f.nombre}
              </button>
            ))}
          </div>
        )}

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Qué comiste..."
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none focus:border-amber-400/50"
        />
        <div className="grid grid-cols-4 gap-2">
          <Campo label="kcal" value={calorias} onChange={setCalorias} />
          <Campo label="Prot g" value={proteinas} onChange={setProteinas} />
          <Campo label="Carb g" value={carbos} onChange={setCarbos} />
          <Campo label="Gras g" value={grasas} onChange={setGrasas} />
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nota (opcional)"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 font-bold bg-amber-400 text-black hover:bg-amber-300"
        >
          Añadir a {getMomento(momento).label}
        </button>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Registro del día</p>
        {delDia.length === 0 && (
          <p className="text-sm text-white/40">Sin comidas registradas.</p>
        )}
        {MOMENTOS.map((m) => {
          const items = delDia.filter((c) => c.momento === m.id)
          if (items.length === 0) return null
          const kcal = items.reduce((s, i) => s + i.calorias, 0)
          return (
            <div key={m.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 text-sm font-semibold">
                <span>{m.icon}</span>
                <span>{m.label}</span>
                <span className="ml-auto text-amber-400">{kcal} kcal</span>
              </div>
              <ul className="divide-y divide-white/5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 px-3 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/90">{item.nombre}</p>
                      <p className="text-xs text-white/40">
                        P {item.proteinas}g · C {item.carbohidratos}g · G {item.grasas}g
                        {item.nota ? ` · ${item.nota}` : ''}
                      </p>
                    </div>
                    <span className="text-white/70 font-semibold">{item.calorias}</span>
                    <button
                      type="button"
                      onClick={() => item.id && comidasRepo.remove(item.id)}
                      className="text-white/30 hover:text-red-400 px-1"
                      aria-label="Eliminar"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/40">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10 outline-none"
      />
    </label>
  )
}
