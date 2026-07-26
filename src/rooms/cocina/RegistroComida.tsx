import { useMemo, useState } from 'react'
import type { MomentoComida, Receta, RegistroComida } from '../../core/data/db'
import { comidasRepo } from '../../core/data/repository'
import { MOMENTOS } from './constantes'
import { getMomento } from './momentos'
import { caloriasDesdeMacros } from './macros'
import { estimarMacros } from './estimarMacros'
import { iaActiva } from '../../core/chat/ia'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

/** Cuántos platillos repetidos se ofrecen como atajo. */
const FRECUENTES = 5

/**
 * Registrar lo que comiste. El camino principal es escribirlo y que la IA
 * calcule los macros; los campos a mano quedan como ajuste, salvo que no haya
 * IA, en cuyo caso son el camino único y salen abiertos.
 */
export function RegistroComida({
  fecha,
  comidas,
  recetas,
}: {
  fecha: string
  comidas: RegistroComida[]
  recetas: Receta[]
}) {
  const t = useT()
  const conIA = iaActiva()
  const [momento, setMomento] = useState<MomentoComida>('desayuno')
  const [nombre, setNombre] = useState('')
  const [calorias, setCalorias] = useState('')
  const [proteinas, setProteinas] = useState('')
  const [carbos, setCarbos] = useState('')
  const [grasas, setGrasas] = useState('')
  const [nota, setNota] = useState('')
  const [estimando, setEstimando] = useState(false)
  const [errorIA, setErrorIA] = useState('')
  const [manual, setManual] = useState(!conIA)
  const [conValores, setConValores] = useState(false)

  // Los platillos que más repites, del más reciente hacia atrás.
  const frecuentes = useMemo(() => {
    const cuenta = new Map<string, { comida: RegistroComida; veces: number }>()
    for (const c of comidas) {
      const clave = c.nombre.trim().toLowerCase()
      if (!clave) continue
      const previo = cuenta.get(clave)
      cuenta.set(clave, {
        comida: !previo || (c.id ?? 0) > (previo.comida.id ?? 0) ? c : previo.comida,
        veces: (previo?.veces ?? 0) + 1,
      })
    }
    return [...cuenta.values()]
      .filter((x) => x.veces > 1)
      .sort((a, b) => b.veces - a.veces)
      .slice(0, FRECUENTES)
      .map((x) => x.comida)
  }, [comidas])

  const rellenar = (v: { nombre: string; calorias: number; proteinas: number; carbohidratos: number; grasas: number }) => {
    setNombre(v.nombre)
    setCalorias(String(Math.round(v.calorias)))
    setProteinas(String(Math.round(v.proteinas)))
    setCarbos(String(Math.round(v.carbohidratos)))
    setGrasas(String(Math.round(v.grasas)))
    setConValores(true)
    setErrorIA('')
  }

  const estimar = async () => {
    if (!nombre.trim() || estimando) return
    setEstimando(true)
    setErrorIA('')
    try {
      const m = await estimarMacros(nombre.trim())
      setCalorias(String(m.calorias))
      setProteinas(String(m.proteinas))
      setCarbos(String(m.carbohidratos))
      setGrasas(String(m.grasas))
      setConValores(true)
    } catch {
      setErrorIA(t('cocina.estimar.error', 'No se pudo estimar. Escribe los valores a mano.'))
      setManual(true)
    } finally {
      setEstimando(false)
    }
  }

  const desdeReceta = (id: string) => {
    const r = recetas.find((x) => String(x.id) === id)
    if (r) rellenar(r)
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
    setConValores(false)
    setManual(!conIA)
  }

  const mostrarCampos = manual || conValores

  return (
    <form onSubmit={agregar} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
      <div className="grid grid-cols-4 gap-1.5">
        {MOMENTOS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMomento(m.id)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              momento === m.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono emoji={m.icon} />
          </button>
        ))}
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={t('cocina.ph.comiste', '¿Qué comiste? Ej: 2 tacos de pastor')}
        className="w-full rounded-lg bg-black/30 px-3 py-3 text-base border border-white/10 outline-none focus:border-amber-400/50"
      />

      {conIA && (
        <button
          type="button"
          onClick={estimar}
          disabled={!nombre.trim() || estimando}
          className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-bold texto-cta hover:brightness-110 disabled:opacity-40"
        >
          <Icono nombre="brillo" />{' '}
          {estimando
            ? t('cocina.estimar.cargando', 'Estimando…')
            : t('cocina.registro.ia', 'Calcular calorías y macros')}
        </button>
      )}

      {errorIA && <p className="text-xs text-amber-400">{errorIA}</p>}

      {frecuentes.length > 0 && !conValores && (
        <div className="flex flex-wrap gap-1.5">
          {frecuentes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => rellenar(c)}
              className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              {c.nombre} · {c.calorias}
            </button>
          ))}
        </div>
      )}

      {recetas.length > 0 && (
        <select
          value=""
          onChange={(e) => desdeReceta(e.target.value)}
          className="w-full rounded-lg bg-black/30 px-2 py-2 text-sm border border-white/10"
        >
          <option value="">{t('cocina.registro.desdeReceta', 'Desde una receta…')}</option>
          {recetas.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.emoji} {r.nombre} · {r.calorias} kcal
            </option>
          ))}
        </select>
      )}

      {mostrarCampos ? (
        <>
          {conValores && conIA && (
            <p className="text-[10px] text-white/40">
              {t('cocina.registro.confirmar', 'Revisa los valores y confirma; puedes corregirlos.')}
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            <Campo label="kcal" value={calorias} onChange={setCalorias} />
            <Campo label={t('cocina.proteina', 'Prot') + ' g'} value={proteinas} onChange={setProteinas} />
            <Campo label={t('cocina.carbos', 'Carb') + ' g'} value={carbos} onChange={setCarbos} />
            <Campo label={t('cocina.grasas', 'Gras') + ' g'} value={grasas} onChange={setGrasas} />
          </div>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={t('cocina.ph.nota', 'Nota (opcional)')}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="text-xs font-semibold text-white/50 hover:text-white/80"
        >
          {t('cocina.registro.manual', 'Ajustar a mano')}
        </button>
      )}

      <button
        type="submit"
        className={`w-full rounded-xl py-2.5 font-bold hover:brightness-110 ${
          conValores || !conIA ? 'bg-amber-600 texto-cta' : 'bg-white/10'
        }`}
      >
        {t('cocina.añadir', `Añadir a ${getMomento(momento).label}`, { momento: getMomento(momento).label })}
      </button>
    </form>
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
